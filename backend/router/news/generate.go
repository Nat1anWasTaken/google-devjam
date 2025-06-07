package news

import (
	"context"
	"log"
	"net/http"
	"strconv"
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
	"google-devjam-backend/utils/services"
)

type GenerateNewsResponse struct {
	AllNews []model.News `json:"all_news"`
}

// GenerateNews generates personalized news based on user preferences and vocabulary
// If user has less than 4 news, generates enough to reach 4 total
// If user has 4+ news, generates 4 new articles every 4 hours
func GenerateNews(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Step 1: Get all existing user news
	allNews, err := getAllUserNews(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user news: " + err.Error(),
		})
	}

	// Step 2: Determine how many news to generate
	var newsToGenerate int
	if len(allNews) < 4 {
		// Generate enough news to reach 4 total
		newsToGenerate = 4 - len(allNews)
	} else {
		// Check if user has recent news (within 4 hours)
		recentNews, err := getRecentUserNews(userID)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to check recent news: " + err.Error(),
			})
		}

		// If recent news exists, return existing news without generating new ones
		if recentNews != nil {
			return c.JSON(http.StatusOK, GenerateNewsResponse{
				AllNews: allNews,
			})
		}

		// Generate 4 new articles since no recent news found (every 4 hours)
		newsToGenerate = 4
	}

	// Step 3: Get user preferences
	userPreferences, err := getUserPreferences(userID)
	if err != nil {
		// Continue without preferences if not found, but log the error
		userPreferences = nil
	}

	// Step 4: Get user's vocabulary words for learning and review
	learnWords, reviewWords, err := getUserVocabularyForNews(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user vocabulary: " + err.Error(),
		})
	}

	// Step 5: Generate the required number of news
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	for i := 0; i < newsToGenerate; i++ {
		// Get existing titles to avoid duplicate topics
		existingTitles := make([]string, len(allNews))
		for j, news := range allNews {
			existingTitles[j] = news.Title
		}

		// Generate news using Gemini
		newsReq := gemini.NewsGenerationRequest{
			UserPreferences: userPreferences,
			LearnWords:      learnWords,
			ReviewWords:     reviewWords,
			ExistingTitles:  existingTitles,
		}

		newsResult, err := gemini.GeneratePersonalizedNews(newsReq)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to generate news: " + err.Error(),
			})
		}

		// Generate news ID
		newsID, err := encrypt.GenerateSnowflakeID()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to generate news ID",
			})
		}

		// Combine learning and review words that were sent to Gemini
		allVocabWords := append(learnWords, reviewWords...)

		// Convert level from string to int
		level, err := strconv.Atoi(newsResult.Level)
		if err != nil {
			log.Printf("Warning: Failed to parse level '%s', defaulting to 1: %v", newsResult.Level, err)
			level = 1 // Default to level 1 if parsing fails
		}

		now := time.Now()
		news := model.News{
			ID:         newsID,
			UserID:     userID,
			Title:      newsResult.Title,
			Content:    newsResult.Content,
			Level:      level,
			Keywords:   newsResult.Keywords,
			WordInNews: allVocabWords, // Use the words we sent to Gemini, not what Gemini returns
			Source:     newsResult.Source,
			CreatedAt:  now,
			UpdatedAt:  now,
		}

		// Generate and store audio for the news content
		audioService, err := services.NewAudioService()
		if err != nil {
			log.Printf("Warning: Failed to initialize audio service: %v", err)
			// Continue without audio generation
		} else {
			// Generate audio from the news content
			audioURL, audioKey, err := audioService.GenerateAndStoreAudio(newsResult.Content, newsID)
			if err != nil {
				log.Printf("Warning: Failed to generate audio for news %s: %v", newsID, err)
				// Continue without audio - don't fail the entire operation
			} else {
				// Add audio information to the news
				news.AudioURL = audioURL
				news.AudioKey = audioKey
				log.Printf("Audio generated successfully for news %s: %s", newsID, audioURL)
			}
		}

		// Insert news into database
		_, err = newsCollection.InsertOne(context.Background(), news)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to store news: " + err.Error(),
			})
		}

		// Add the newly generated news to allNews for the next iteration
		allNews = append([]model.News{news}, allNews...)
	}

	// Get all user news including the newly generated ones
	updatedAllNews, err := getAllUserNews(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get all user news: " + err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, GenerateNewsResponse{
		AllNews: updatedAllNews,
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

// getAllUserNews finds all the news for this specific user
func getAllUserNews(userID string) ([]model.News, error) {
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return nil, mongo.ErrClientDisconnected
	}

	// Find all the news for this specific user
	cursor, err := newsCollection.Find(
		context.Background(),
		bson.M{"user_id": userID},
		&options.FindOptions{
			Sort: bson.D{{Key: "created_at", Value: -1}}, // Get the most recent first
		},
	)

	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var newsList []model.News
	if err := cursor.All(context.Background(), &newsList); err != nil {
		return nil, err
	}

	return newsList, nil
}

// getRecentUserNews checks if user has news generated within the last 4 hours
func getRecentUserNews(userID string) (*model.News, error) {
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return nil, mongo.ErrClientDisconnected
	}

	// Calculate 4 hours ago
	fourHoursAgo := time.Now().Add(-4 * time.Hour)

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

// ForceGenerateNews generates 4 new personalized news articles regardless of existing news
func ForceGenerateNews(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Step 1: Get all existing user news for context
	allNews, err := getAllUserNews(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user news: " + err.Error(),
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

	// Step 4: Generate 4 new articles
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	var newlyGeneratedNews []model.News

	for i := 0; i < 4; i++ {
		// Get existing titles to avoid duplicate topics
		existingTitles := make([]string, len(allNews))
		for j, news := range allNews {
			existingTitles[j] = news.Title
		}
		// Also add titles from newly generated news in this batch
		for _, news := range newlyGeneratedNews {
			existingTitles = append(existingTitles, news.Title)
		}

		// Generate news using Gemini
		newsReq := gemini.NewsGenerationRequest{
			UserPreferences: userPreferences,
			LearnWords:      learnWords,
			ReviewWords:     reviewWords,
			ExistingTitles:  existingTitles,
		}

		newsResult, err := gemini.GeneratePersonalizedNews(newsReq)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to generate news: " + err.Error(),
			})
		}

		// Generate news ID
		newsID, err := encrypt.GenerateSnowflakeID()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to generate news ID",
			})
		}

		// Combine learning and review words that were sent to Gemini
		allVocabWords := append(learnWords, reviewWords...)

		// Convert level from string to int
		level, err := strconv.Atoi(newsResult.Level)
		if err != nil {
			log.Printf("Warning: Failed to parse level '%s', defaulting to 1: %v", newsResult.Level, err)
			level = 1 // Default to level 1 if parsing fails
		}

		now := time.Now()
		news := model.News{
			ID:         newsID,
			UserID:     userID,
			Title:      newsResult.Title,
			Content:    newsResult.Content,
			Level:      level,
			Keywords:   newsResult.Keywords,
			WordInNews: allVocabWords, // Use the words we sent to Gemini, not what Gemini returns
			Source:     newsResult.Source,
			CreatedAt:  now,
			UpdatedAt:  now,
		}

		// Generate and store audio for the news content
		audioService, err := services.NewAudioService()
		if err != nil {
			log.Printf("Warning: Failed to initialize audio service: %v", err)
			// Continue without audio generation
		} else {
			// Generate audio from the news content
			audioURL, audioKey, err := audioService.GenerateAndStoreAudio(newsResult.Content, newsID)
			if err != nil {
				log.Printf("Warning: Failed to generate audio for news %s: %v", newsID, err)
				// Continue without audio - don't fail the entire operation
			} else {
				// Add audio information to the news
				news.AudioURL = audioURL
				news.AudioKey = audioKey
				log.Printf("Audio generated successfully for news %s: %s", newsID, audioURL)
			}
		}

		// Insert news into database
		_, err = newsCollection.InsertOne(context.Background(), news)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to store news: " + err.Error(),
			})
		}

		// Add to newly generated news list
		newlyGeneratedNews = append(newlyGeneratedNews, news)
	}

	// Get all user news including the newly generated ones
	updatedAllNews, err := getAllUserNews(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get all user news: " + err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, GenerateNewsResponse{
		AllNews: updatedAllNews,
	})
}
