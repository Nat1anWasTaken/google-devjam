package vocabulary

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"google-devjam-backend/model"
	"google-devjam-backend/utils/middleware"
	"google-devjam-backend/utils/mongodb"
)

// DeleteWord removes a word from the user's vocabulary
func DeleteWord(c echo.Context) error {
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

	// Check if user owns this word
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

	// Delete the user word relationship
	_, err = userWordsCollection.DeleteOne(context.Background(), bson.M{
		"user_id": userID,
		"word_id": wordID,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete word from vocabulary",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Word removed from vocabulary successfully",
	})
}
