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
	"google-devjam-backend/utils/gemini"
	"google-devjam-backend/utils/middleware"
	"google-devjam-backend/utils/mongodb"
)

type CreateWordRequest struct {
	Word string `json:"word" validate:"required"`
}

type WordResponse struct {
	Word model.Word `json:"word"`
}

// Helper function to create WordExample records
func createWordExamples(wordID string, examples []string) error {
	if len(examples) == 0 {
		return nil
	}

	wordExamplesCollection := mongodb.GetCollection("word_examples")
	if wordExamplesCollection == nil {
		return mongo.ErrClientDisconnected
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

func CreateWord(c echo.Context) error {
	var req CreateWordRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Validate request
	if req.Word == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Word is required",
		})
	}

	// Clean and normalize the word
	word := strings.TrimSpace(strings.ToLower(req.Word))
	if word == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Word cannot be empty",
		})
	}

	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Check if word already exists in global words collection
	wordsCollection := mongodb.GetCollection("words")
	if wordsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	var existingWord model.Word
	err := wordsCollection.FindOne(context.Background(), bson.M{"word": word}).Decode(&existingWord)
	if err == nil {
		// Word exists, check if user already has it
		userWordsCollection := mongodb.GetCollection("user_words")
		if userWordsCollection == nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Database connection error",
			})
		}

		var existingUserWord model.UserWord
		err = userWordsCollection.FindOne(context.Background(), bson.M{
			"user_id": userID,
			"word_id": existingWord.ID,
		}).Decode(&existingUserWord)

		if err == nil {
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Word already exists in your vocabulary",
			})
		} else if err != mongo.ErrNoDocuments {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Database error",
			})
		}

		// Generate examples for existing word using Gemini
		translation, err := gemini.TranslateWord(word)
		if err != nil {
			// If Gemini fails, continue without examples
			translation = &gemini.TranslationResult{Examples: []string{}}
		}

		// Add existing word to user's vocabulary
		userWordID, err := encrypt.GenerateSnowflakeID()
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to generate ID",
			})
		}

		now := time.Now()
		userWord := model.UserWord{
			ID:           userWordID,
			UserID:       userID,
			WordID:       existingWord.ID,
			LearnCount:   0,
			Fluency:      0,
			PartOfSpeech: "",
			RootWord:     "",
			Origin:       "",
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		_, err = userWordsCollection.InsertOne(context.Background(), userWord)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to add word to vocabulary",
			})
		}

		// Create WordExample records if available
		if len(translation.Examples) > 0 {
			if err := createWordExamples(existingWord.ID, translation.Examples); err != nil {
				// Log error but don't fail the request
				// Examples are not critical for word creation
			}
		}

		return c.JSON(http.StatusCreated, WordResponse{
			Word: existingWord,
		})
	} else if err != mongo.ErrNoDocuments {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Word doesn't exist, validate and translate using Gemini
	translation, err := gemini.TranslateWord(word)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to validate word: " + err.Error(),
		})
	}

	if !translation.IsValid {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid word: " + translation.Reason,
		})
	}

	if translation.Definition == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Could not generate definition for this word",
		})
	}

	// Use difficulty determined by Gemini
	difficulty := translation.Difficulty
	if difficulty <= 0 || difficulty > 10 {
		difficulty = 1 // Fallback to 1 if invalid difficulty from Gemini
	}

	// Generate IDs
	wordID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate word ID",
		})
	}

	userWordID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate user word ID",
		})
	}

	// Create new word
	now := time.Now()
	newWord := model.Word{
		ID:         wordID,
		Word:       word,
		Definition: translation.Definition,
		Difficulty: difficulty,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	// Insert word into global words collection
	_, err = wordsCollection.InsertOne(context.Background(), newWord)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create word",
		})
	}

	// Add word to user's vocabulary
	userWordsCollection := mongodb.GetCollection("user_words")
	if userWordsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	userWord := model.UserWord{
		ID:           userWordID,
		UserID:       userID,
		WordID:       wordID,
		LearnCount:   0,
		Fluency:      0,
		PartOfSpeech: "",
		RootWord:     "",
		Origin:       "",
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	_, err = userWordsCollection.InsertOne(context.Background(), userWord)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to add word to vocabulary",
		})
	}

	// Create WordExample records if available
	if len(translation.Examples) > 0 {
		if err := createWordExamples(wordID, translation.Examples); err != nil {
			// Log error but don't fail the request
			// Examples are not critical for word creation
		}
	}

	return c.JSON(http.StatusCreated, WordResponse{
		Word: newWord,
	})
}
