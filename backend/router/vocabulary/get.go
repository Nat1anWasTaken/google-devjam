package vocabulary

import (
	"context"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"google-devjam-backend/model"
	"google-devjam-backend/utils/middleware"
	"google-devjam-backend/utils/mongodb"
)

type WordWithUserData struct {
	model.Word
	LearnCount   int                 `json:"learn_count"`
	Fluency      int                 `json:"fluency"`
	PartOfSpeech string              `json:"part_of_speech"`
	Examples     []model.WordExample `json:"examples"`
	RootWord     string              `json:"root_word"`
	Origin       string              `json:"origin"`
}

type GetWordsResponse struct {
	Words []WordWithUserData `json:"words"`
	Total int64              `json:"total"`
	Page  int                `json:"page"`
	Limit int                `json:"limit"`
}

// Helper functions to safely extract data from BSON
func getStringFromBSON(data bson.M, key string) string {
	if val, ok := data[key]; ok && val != nil {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// Helper function to fetch WordExample records for a word
func getWordExamples(wordID string) ([]model.WordExample, error) {
	wordExamplesCollection := mongodb.GetCollection("word_examples")
	if wordExamplesCollection == nil {
		return []model.WordExample{}, nil
	}

	cursor, err := wordExamplesCollection.Find(context.Background(), bson.M{"word_id": wordID})
	if err != nil {
		return []model.WordExample{}, err
	}
	defer cursor.Close(context.Background())

	var examples []model.WordExample
	if err := cursor.All(context.Background(), &examples); err != nil {
		return []model.WordExample{}, err
	}

	return examples, nil
}

// GetWords retrieves all words for the authenticated user with pagination
func GetWords(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Parse pagination parameters
	page := 1
	limit := 20

	if pageStr := c.QueryParam("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Parse difficulty filter
	var difficultyFilter bson.M
	if diffStr := c.QueryParam("difficulty"); diffStr != "" {
		if diff, err := strconv.Atoi(diffStr); err == nil && diff >= 1 && diff <= 10 {
			difficultyFilter = bson.M{"difficulty": diff}
		}
	}

	// Parse search query
	searchQuery := c.QueryParam("search")

	// Get user words collection
	userWordsCollection := mongodb.GetCollection("user_words")
	if userWordsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Build aggregation pipeline
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
	}

	// Add search filter if provided
	if searchQuery != "" {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"word_data.word": bson.M{
					"$regex":   searchQuery,
					"$options": "i",
				},
			},
		})
	}

	// Add difficulty filter if provided
	if difficultyFilter != nil {
		pipeline = append(pipeline, bson.M{
			"$match": bson.M{
				"word_data.difficulty": difficultyFilter["difficulty"],
			},
		})
	}

	// Add sorting
	pipeline = append(pipeline, bson.M{
		"$sort": bson.M{"created_at": -1},
	})

	// Count total documents
	countPipeline := append(pipeline, bson.M{"$count": "total"})
	countCursor, err := userWordsCollection.Aggregate(context.Background(), countPipeline)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}
	defer countCursor.Close(context.Background())

	var countResult []bson.M
	if err := countCursor.All(context.Background(), &countResult); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	total := int64(0)
	if len(countResult) > 0 {
		if count, ok := countResult[0]["total"].(int32); ok {
			total = int64(count)
		}
	}

	// Add pagination
	skip := (page - 1) * limit
	pipeline = append(pipeline,
		bson.M{"$skip": skip},
		bson.M{"$limit": limit},
	)

	// Execute aggregation
	cursor, err := userWordsCollection.Aggregate(context.Background(), pipeline)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}
	defer cursor.Close(context.Background())

	var results []bson.M
	if err := cursor.All(context.Background(), &results); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Transform results
	words := make([]WordWithUserData, 0, len(results))
	for _, result := range results {
		wordData := result["word_data"].(bson.M)
		wordID := getStringFromBSON(wordData, "_id")

		// Fetch examples for this word
		examples, _ := getWordExamples(wordID) // Ignore error, continue with empty examples

		word := WordWithUserData{
			Word: model.Word{
				ID:         wordID,
				Word:       getStringFromBSON(wordData, "word"),
				Definition: getStringFromBSON(wordData, "definition"),
				Difficulty: int(wordData["difficulty"].(int32)),
				CreatedAt:  wordData["created_at"].(primitive.DateTime).Time(),
				UpdatedAt:  wordData["updated_at"].(primitive.DateTime).Time(),
			},
			LearnCount:   int(result["learn_count"].(int32)),
			Fluency:      int(result["fluency"].(int32)),
			PartOfSpeech: getStringFromBSON(result, "part_of_speech"),
			Examples:     examples, // Use fetched WordExample records
			RootWord:     getStringFromBSON(result, "root_word"),
			Origin:       getStringFromBSON(result, "origin"),
		}

		words = append(words, word)
	}

	return c.JSON(http.StatusOK, GetWordsResponse{
		Words: words,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetWord retrieves a specific word for the authenticated user
func GetWord(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	wordID := c.Param("id")
	if wordID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Word ID is required",
		})
	}

	// Get user words collection
	userWordsCollection := mongodb.GetCollection("user_words")
	if userWordsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Build aggregation pipeline to get word with user data
	pipeline := []bson.M{
		{
			"$match": bson.M{
				"user_id": userID,
				"word_id": wordID,
			},
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
	}

	cursor, err := userWordsCollection.Aggregate(context.Background(), pipeline)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}
	defer cursor.Close(context.Background())

	var results []bson.M
	if err := cursor.All(context.Background(), &results); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	if len(results) == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Word not found in your vocabulary",
		})
	}

	result := results[0]
	wordData := result["word_data"].(bson.M)
	wordIDStr := getStringFromBSON(wordData, "_id")

	// Fetch examples for this word
	examples, _ := getWordExamples(wordIDStr) // Ignore error, continue with empty examples

	word := WordWithUserData{
		Word: model.Word{
			ID:         wordIDStr,
			Word:       getStringFromBSON(wordData, "word"),
			Definition: getStringFromBSON(wordData, "definition"),
			Difficulty: int(wordData["difficulty"].(int32)),
			CreatedAt:  wordData["created_at"].(primitive.DateTime).Time(),
			UpdatedAt:  wordData["updated_at"].(primitive.DateTime).Time(),
		},
		LearnCount:   int(result["learn_count"].(int32)),
		Fluency:      int(result["fluency"].(int32)),
		PartOfSpeech: getStringFromBSON(result, "part_of_speech"),
		Examples:     examples, // Use fetched WordExample records
		RootWord:     getStringFromBSON(result, "root_word"),
		Origin:       getStringFromBSON(result, "origin"),
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"word": word,
	})
}
