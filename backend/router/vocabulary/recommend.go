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

type RecommendResponse struct {
	Words []WordWithUserData `json:"words"`
}

// GetRecommendations gets word recommendations for the user
func GetRecommendations(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Step 1: Get all user's current words
	userWords, err := getUserWords(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get user words: " + err.Error(),
		})
	}

	// Step 2: Get user preferences to enhance recommendations
	userPreferences, err := getUserPreferences(userID)
	if err != nil {
		// Continue without preferences if not found
		userPreferences = nil
	}

	// Step 3: Get recommendations from Gemini
	recommendations, err := gemini.GetWordRecommendationsWithPreferences(userWords, userPreferences)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get recommendations: " + err.Error(),
		})
	}

	// Step 3: Process each recommended word
	var recommendedWords []WordWithUserData
	for _, word := range recommendations.Words {
		processedWord, err := processRecommendedWord(word, userID)
		if err != nil {
			// Log error but continue with other words
			continue
		}
		if processedWord != nil {
			recommendedWords = append(recommendedWords, *processedWord)
		}
	}

	return c.JSON(http.StatusOK, RecommendResponse{
		Words: recommendedWords,
	})
}

// getUserWords retrieves all words for a user
func getUserWords(userID string) ([]string, error) {
	userWordsCollection := mongodb.GetCollection("user_words")
	if userWordsCollection == nil {
		return nil, mongo.ErrClientDisconnected
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
				"word": "$word_data.word",
			},
		},
	}

	cursor, err := userWordsCollection.Aggregate(context.Background(), pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(context.Background())

	var results []bson.M
	if err := cursor.All(context.Background(), &results); err != nil {
		return nil, err
	}

	var words []string
	for _, result := range results {
		if word, ok := result["word"].(string); ok {
			words = append(words, word)
		}
	}

	return words, nil
}

// processRecommendedWord processes a single recommended word
func processRecommendedWord(word, userID string) (*WordWithUserData, error) {
	// Clean and normalize the word
	word = strings.TrimSpace(strings.ToLower(word))
	if word == "" {
		return nil, nil
	}

	// Check if word already exists in global words collection
	wordsCollection := mongodb.GetCollection("words")
	if wordsCollection == nil {
		return nil, mongo.ErrClientDisconnected
	}

	var existingWord model.Word
	err := wordsCollection.FindOne(context.Background(), bson.M{"word": word}).Decode(&existingWord)

	if err == nil {
		// Word exists, check if user already has it
		userWordsCollection := mongodb.GetCollection("user_words")
		if userWordsCollection == nil {
			return nil, mongo.ErrClientDisconnected
		}

		var existingUserWord model.UserWord
		err = userWordsCollection.FindOne(context.Background(), bson.M{
			"user_id": userID,
			"word_id": existingWord.ID,
		}).Decode(&existingUserWord)

		if err == nil {
			// User already has this word, skip it
			return nil, nil
		} else if err != mongo.ErrNoDocuments {
			return nil, err
		}

		// Add to RecommendWord collection
		if err := addToRecommendWords(userID, existingWord.ID); err != nil {
			// Log error but continue
		}

		// Get examples for this word
		examples, _ := getWordExamples(existingWord.ID)

		// Return the existing word with user data
		return &WordWithUserData{
			Word:       existingWord,
			LearnCount: 0,
			Fluency:    0,
			Examples:   examples,
		}, nil
	} else if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// Word doesn't exist, translate using Gemini
	translation, err := gemini.TranslateWord(word)
	if err != nil {
		return nil, err
	}

	if !translation.IsValid {
		// Skip invalid words
		return nil, nil
	}

	if translation.DefinitionEn == "" || translation.DefinitionZh == "" {
		// Skip words without definition
		return nil, nil
	}

	// Use difficulty determined by Gemini
	difficulty := translation.Difficulty
	if difficulty <= 0 || difficulty > 10 {
		difficulty = 1 // Fallback to 1 if invalid difficulty from Gemini
	}

	// Generate word ID
	wordID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return nil, err
	}

	// Create new word
	now := time.Now()
	newWord := model.Word{
		ID:            wordID,
		Word:          word,
		Translation:   translation.Translation,
		Definition_zh: translation.DefinitionZh,
		Definition_en: translation.DefinitionEn,
		Difficulty:    difficulty,
		PartOfSpeech:  translation.PartOfSpeech,
		RootWord:      translation.RootWord,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Insert word into global words collection
	_, err = wordsCollection.InsertOne(context.Background(), newWord)
	if err != nil {
		return nil, err
	}

	// Create WordExample records if available
	if len(translation.Examples) > 0 {
		if err := createWordExamples(wordID, translation.Examples); err != nil {
			// Log error but don't fail the request
		}
	}

	// Add to RecommendWord collection
	if err := addToRecommendWords(userID, wordID); err != nil {
		// Log error but continue
	}

	// Get examples for this word
	examples, _ := getWordExamples(wordID)

	return &WordWithUserData{
		Word:       newWord,
		LearnCount: 0,
		Fluency:    0,
		Examples:   examples,
	}, nil
}

// addToRecommendWords adds a word to the recommend_words collection
func addToRecommendWords(userID, wordID string) error {
	recommendWordsCollection := mongodb.GetCollection("recommend_words")
	if recommendWordsCollection == nil {
		return mongo.ErrClientDisconnected
	}

	// Check if already exists
	var existing model.RecommendWord
	err := recommendWordsCollection.FindOne(context.Background(), bson.M{
		"user_id": userID,
		"word_id": wordID,
	}).Decode(&existing)

	if err == nil {
		// Already exists, skip
		return nil
	} else if err != mongo.ErrNoDocuments {
		return err
	}

	// Generate ID
	recommendID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return err
	}

	// Create new recommend word record
	recommendWord := model.RecommendWord{
		ID:     recommendID,
		UserID: userID,
		WordID: wordID,
	}

	_, err = recommendWordsCollection.InsertOne(context.Background(), recommendWord)
	return err
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
