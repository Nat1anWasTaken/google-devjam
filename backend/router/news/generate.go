package news

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"google-devjam-backend/model"
	"google-devjam-backend/utils/encrypt"
	"google-devjam-backend/utils/gemini"
	"google-devjam-backend/utils/middleware"
	"google-devjam-backend/utils/mongodb"
)

type GenerateNewsResponse struct {
	News model.News `json:"news"`
}

// GenerateNews generates personalized news based on user preferences and vocabulary
// If user has news generated within 4 hours, returns existing news instead of generating new one
func GenerateNews(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Step 1: Check if user has recent news (within 4 hours)
	recentNews, err := getRecentUserNews(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to check recent news: " + err.Error(),
		})
	}

	// If recent news exists, return it instead of generating new one
	if recentNews != nil {
		return c.JSON(http.StatusOK, GenerateNewsResponse{
			News: *recentNews,
		})
	}

	// Step 2: Get user preferences
	userPreferences, err := getUserPreferences(userID)
	if err != nil {
		// Continue without preferences if not found, but log the error
		userPreferences = nil
	}

	// Step 3: Get user's vocabulary words for learning and review
	learnWords, reviewWords, err := getUserVocabularyForNews(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user vocabulary: " + err.Error(),
		})
	}

	// Step 4: Generate news using Gemini
	newsReq := gemini.NewsGenerationRequest{
		UserPreferences: userPreferences,
		LearnWords:      learnWords,
		ReviewWords:     reviewWords,
	}

	newsResult, err := gemini.GeneratePersonalizedNews(newsReq)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate news: " + err.Error(),
		})
	}

	// Step 5: Store the generated news in the database
	newsID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate news ID",
		})
	}

	// Combine learning and review words that were sent to Gemini
	allVocabWords := append(learnWords, reviewWords...)

	now := time.Now()
	news := model.News{
		ID:         newsID,
		UserID:     userID,
		Title:      newsResult.Title,
		Content:    newsResult.Content,
		Level:      newsResult.Level,
		Keywords:   newsResult.Keywords,
		WordInNews: allVocabWords, // Use the words we sent to Gemini, not what Gemini returns
		Source:     newsResult.Source,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	// Insert news into database
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	_, err = newsCollection.InsertOne(context.Background(), news)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to store news: " + err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, GenerateNewsResponse{
		News: news,
	})
}

// getUserPreferences retrieves user preferences
func getUserPreferences(userID string) (*model.UserPreferences, error) {
	preferencesCollection := mongodb.GetCollection("user_preferences")
	if preferencesCollection == nil {
		return nil, mongo.ErrClientDisconnected
	}

	var preferences model.UserPreferences
	err := preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&preferences)
	if err != nil {
		return nil, err
	}

	return &preferences, nil
}

// getUserVocabularyForNews gets user's vocabulary words for learning and review based on forgetting curve
func getUserVocabularyForNews(userID string) (learnWords []string, reviewWords []string, err error) {
	userWordsCollection := mongodb.GetCollection("user_words")
	if userWordsCollection == nil {
		return nil, nil, mongo.ErrClientDisconnected
	}

	// Build aggregation pipeline to get words with user data
	pipeline := []bson.M{
		{
			"$match": bson.M{"user_id": userID},
		},
		{
			"$lookup": bson.M{
				"from":         "words",
				"localField":   "word_id",
				"foreignField": "_id",
				"as":           "word_data",
			},
		},
		{
			"$unwind": "$word_data",
		},
		{
			"$project": bson.M{
				"word":        "$word_data.word",
				"learn_count": 1,
				"fluency":     1,
				"updated_at":  1,
			},
		},
	}

	cursor, err := userWordsCollection.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, nil, err
	}
	defer cursor.Close(context.Background())

	var results []bson.M
	if err := cursor.All(context.Background(), &results); err != nil {
		return nil, nil, err
	}

	now := time.Now()

	for _, result := range results {
		word, ok := result["word"].(string)
		if !ok {
			continue
		}

		learnCount, _ := result["learn_count"].(int32)
		fluency, _ := result["fluency"].(int32)

		// Handle MongoDB primitive.DateTime conversion
		var updatedAt time.Time
		if updatedAtRaw, exists := result["updated_at"]; exists {
			if primitiveDateTime, ok := updatedAtRaw.(primitive.DateTime); ok {
				updatedAt = primitiveDateTime.Time()
			} else if timeValue, ok := updatedAtRaw.(time.Time); ok {
				updatedAt = timeValue
			} else {
				// If we can't parse the date, skip this word
				continue
			}
		} else {
			// If no updated_at field, skip this word
			continue
		}

		// Implement forgetting curve logic
		daysSinceUpdate := int(now.Sub(updatedAt).Hours() / 24)

		// Words that are new or have low fluency are for learning
		if learnCount < 3 || fluency < 50 {
			learnWords = append(learnWords, word)
		} else {
			// Words that need review based on forgetting curve
			// The higher the fluency, the longer the interval before review
			var reviewInterval int
			switch {
			case fluency >= 90:
				reviewInterval = 30 // Review after 30 days for high fluency
			case fluency >= 70:
				reviewInterval = 14 // Review after 14 days for medium-high fluency
			case fluency >= 50:
				reviewInterval = 7 // Review after 7 days for medium fluency
			default:
				reviewInterval = 3 // Review after 3 days for low fluency
			}

			if daysSinceUpdate >= reviewInterval {
				reviewWords = append(reviewWords, word)
			}
		}
	}

	// Limit the number of words to avoid overwhelming the news generation
	if len(learnWords) > 10 {
		learnWords = learnWords[:10]
	}
	if len(reviewWords) > 10 {
		reviewWords = reviewWords[:10]
	}

	return learnWords, reviewWords, nil
}

// getRecentUserNews checks if user has news generated within the last 4 hours
func getRecentUserNews(userID string) (*model.News, error) {
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return nil, mongo.ErrClientDisconnected
	}

	// Calculate 4 hours ago
	fourHoursAgo := time.Now().Add(-4 * time.Hour)

	// Find the most recent news for this specific user within 4 hours
	var news model.News
	err := newsCollection.FindOne(
		context.Background(),
		bson.M{
			"user_id": userID,
			"created_at": bson.M{
				"$gte": fourHoursAgo,
			},
		},
		&options.FindOneOptions{
			Sort: bson.D{{Key: "created_at", Value: -1}}, // Get the most recent
		},
	).Decode(&news)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // No recent news found
		}
		return nil, err
	}

	return &news, nil
}
