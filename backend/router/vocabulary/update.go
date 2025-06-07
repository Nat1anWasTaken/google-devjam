package vocabulary

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"google-devjam-backend/model"
	"google-devjam-backend/utils/encrypt"
	"google-devjam-backend/utils/middleware"
	"google-devjam-backend/utils/mongodb"
)

type UpdateWordRequest struct {
	Difficulty   int      `json:"difficulty,omitempty"`
	PartOfSpeech string   `json:"part_of_speech,omitempty"`
	Examples     []string `json:"examples,omitempty"`
	RootWord     string   `json:"root_word,omitempty"`
	Origin       string   `json:"origin,omitempty"`
}

type LearnWordRequest struct {
	Correct bool `json:"correct"` // Whether the user got the word correct
}

type AddExampleRequest struct {
	Sentence string `json:"sentence" validate:"required"`
}

// Helper function to update WordExample records for a word
func updateWordExamples(wordID string, examples []string) error {
	wordExamplesCollection := mongodb.GetCollection("word_examples")
	if wordExamplesCollection == nil {
		return mongo.ErrClientDisconnected
	}

	// Delete existing examples for this word
	_, err := wordExamplesCollection.DeleteMany(context.Background(), bson.M{"word_id": wordID})
	if err != nil {
		return err
	}

	// Add new examples if provided
	if len(examples) == 0 {
		return nil
	}

	var wordExamples []interface{}
	for _, example := range examples {
		if strings.TrimSpace(example) == "" {
			continue
		}

		exampleID, err := encrypt.GenerateSnowflakeID()
		if err != nil {
			continue // Skip this example if ID generation fails
		}

		wordExample := model.WordExample{
			ID:       exampleID,
			WordID:   wordID,
			Sentence: strings.TrimSpace(example),
		}
		wordExamples = append(wordExamples, wordExample)
	}

	if len(wordExamples) > 0 {
		_, err := wordExamplesCollection.InsertMany(context.Background(), wordExamples)
		return err
	}

	return nil
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

	// Validate difficulty if provided
	if req.Difficulty != 0 && (req.Difficulty < 1 || req.Difficulty > 10) {
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

	// Prepare update data for user word
	updateData := bson.M{
		"updated_at": time.Now(),
	}

	// Add UserWord fields to update
	if req.PartOfSpeech != "" {
		updateData["part_of_speech"] = req.PartOfSpeech
	}
	if req.RootWord != "" {
		updateData["root_word"] = req.RootWord
	}
	if req.Origin != "" {
		updateData["origin"] = req.Origin
	}

	// Update the user word
	_, err = userWordsCollection.UpdateOne(
		context.Background(),
		bson.M{
			"user_id": userID,
			"word_id": wordID,
		},
		bson.M{"$set": updateData},
	)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update user word",
		})
	}

	// Update examples if provided
	if req.Examples != nil {
		if err := updateWordExamples(wordID, req.Examples); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to update word examples",
			})
		}
	}

	// Update the word's difficulty in the global words collection if provided
	if req.Difficulty != 0 {
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
				"error": "Failed to update word difficulty",
			})
		}
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Word updated successfully",
	})
}

// AddExample adds a new example sentence to a word
func AddExample(c echo.Context) error {
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

	var req AddExampleRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	if strings.TrimSpace(req.Sentence) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Example sentence is required",
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

	// Create new example
	wordExamplesCollection := mongodb.GetCollection("word_examples")
	if wordExamplesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	exampleID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate example ID",
		})
	}

	wordExample := model.WordExample{
		ID:       exampleID,
		WordID:   wordID,
		Sentence: strings.TrimSpace(req.Sentence),
	}

	_, err = wordExamplesCollection.InsertOne(context.Background(), wordExample)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to add example",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "Example added successfully",
		"example": wordExample,
	})
}

// DeleteExample removes an example sentence from a word
func DeleteExample(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	wordID := c.Param("id")
	exampleID := c.Param("exampleId")

	if wordID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Word ID is required",
		})
	}

	if exampleID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Example ID is required",
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

	// Delete the example
	wordExamplesCollection := mongodb.GetCollection("word_examples")
	if wordExamplesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	result, err := wordExamplesCollection.DeleteOne(context.Background(), bson.M{
		"_id":     exampleID,
		"word_id": wordID,
	})

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete example",
		})
	}

	if result.DeletedCount == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Example not found",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Example deleted successfully",
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
