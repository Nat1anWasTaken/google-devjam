package vocabulary

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"google-devjam-backend/model"
	"google-devjam-backend/utils/middleware"
	"google-devjam-backend/utils/mongodb"
)

type UpdateWordRequest struct {
	Difficulty int `json:"difficulty,omitempty"`
}

type LearnWordRequest struct {
	Correct bool `json:"correct"` // Whether the user got the word correct
}

// UpdateWord updates a word's difficulty for the authenticated user
func UpdateWord(c echo.Context) error {
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

	var req UpdateWordRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Validate difficulty
	if req.Difficulty < 1 || req.Difficulty > 10 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Difficulty must be between 1 and 10",
		})
	}

	// Check if user owns this word
	userWordsCollection := mongodb.GetCollection("user_words")
	if userWordsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	var userWord model.UserWord
	err := userWordsCollection.FindOne(context.Background(), bson.M{
		"user_id": userID,
		"word_id": wordID,
	}).Decode(&userWord)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Word not found in your vocabulary",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Update the word's difficulty in the global words collection
	wordsCollection := mongodb.GetCollection("words")
	if wordsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	_, err = wordsCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": wordID},
		bson.M{
			"$set": bson.M{
				"difficulty": req.Difficulty,
				"updated_at": time.Now(),
			},
		},
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update word",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Word updated successfully",
	})
}

// LearnWord tracks learning progress for a word
func LearnWord(c echo.Context) error {
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

	var req LearnWordRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Get user words collection
	userWordsCollection := mongodb.GetCollection("user_words")
	if userWordsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Find the user word
	var userWord model.UserWord
	err := userWordsCollection.FindOne(context.Background(), bson.M{
		"user_id": userID,
		"word_id": wordID,
	}).Decode(&userWord)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Word not found in your vocabulary",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Update learning statistics
	newLearnCount := userWord.LearnCount + 1
	newFluency := userWord.Fluency

	if req.Correct {
		// Increase fluency if correct (max 100)
		newFluency += 10
		if newFluency > 100 {
			newFluency = 100
		}
	} else {
		// Decrease fluency if incorrect (min 0)
		newFluency -= 5
		if newFluency < 0 {
			newFluency = 0
		}
	}

	// Update the user word
	_, err = userWordsCollection.UpdateOne(
		context.Background(),
		bson.M{
			"user_id": userID,
			"word_id": wordID,
		},
		bson.M{
			"$set": bson.M{
				"learn_count": newLearnCount,
				"fluency":     newFluency,
				"updated_at":  time.Now(),
			},
		},
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update learning progress",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":     "Learning progress updated",
		"learn_count": newLearnCount,
		"fluency":     newFluency,
	})
}
