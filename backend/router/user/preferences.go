package user

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

type CreatePreferencesRequest struct {
	Level     int      `json:"level" validate:"required"`
	Interests []string `json:"interests"`
}

type UpdatePreferencesRequest struct {
	Level     *int     `json:"level,omitempty"`
	Interests []string `json:"interests,omitempty"`
}

type PreferencesResponse struct {
	Preferences model.UserPreferences `json:"preferences"`
}

// GetPreferences retrieves the user's preferences
func GetPreferences(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Get preferences collection
	preferencesCollection := mongodb.GetCollection("user_preferences")
	if preferencesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Find user preferences
	var preferences model.UserPreferences
	err := preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&preferences)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User preferences not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	return c.JSON(http.StatusOK, PreferencesResponse{
		Preferences: preferences,
	})
}

// CreatePreferences creates new user preferences
func CreatePreferences(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	var req CreatePreferencesRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Validate level (1-10)
	if req.Level < 1 || req.Level > 10 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Level must be between 1 and 10",
		})
	}

	// Clean up interests
	var cleanInterests []string
	for _, interest := range req.Interests {
		cleaned := strings.TrimSpace(interest)
		if cleaned != "" {
			cleanInterests = append(cleanInterests, cleaned)
		}
	}

	// Get preferences collection
	preferencesCollection := mongodb.GetCollection("user_preferences")
	if preferencesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Check if preferences already exist
	var existing model.UserPreferences
	err := preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&existing)
	if err == nil {
		return c.JSON(http.StatusConflict, map[string]string{
			"error": "User preferences already exist. Use PUT to update.",
		})
	} else if err != mongo.ErrNoDocuments {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Generate ID
	preferencesID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate preferences ID",
		})
	}

	// Create preferences
	now := time.Now()
	preferences := model.UserPreferences{
		ID:        preferencesID,
		UserID:    userID,
		Level:     req.Level,
		Interests: cleanInterests,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Insert into database
	_, err = preferencesCollection.InsertOne(context.Background(), preferences)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create preferences",
		})
	}

	return c.JSON(http.StatusCreated, PreferencesResponse{
		Preferences: preferences,
	})
}

// UpdatePreferences updates user preferences
func UpdatePreferences(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	var req UpdatePreferencesRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Get preferences collection
	preferencesCollection := mongodb.GetCollection("user_preferences")
	if preferencesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Check if preferences exist
	var existing model.UserPreferences
	err := preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&existing)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User preferences not found. Use POST to create.",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Prepare update data
	updateData := bson.M{
		"updated_at": time.Now(),
	}

	// Update level if provided
	if req.Level != nil {
		if *req.Level < 1 || *req.Level > 10 {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Level must be between 1 and 10",
			})
		}
		updateData["level"] = *req.Level
	}

	// Update interests if provided
	if req.Interests != nil {
		var cleanInterests []string
		for _, interest := range req.Interests {
			cleaned := strings.TrimSpace(interest)
			if cleaned != "" {
				cleanInterests = append(cleanInterests, cleaned)
			}
		}
		updateData["interests"] = cleanInterests
	}

	// Update in database
	_, err = preferencesCollection.UpdateOne(
		context.Background(),
		bson.M{"user_id": userID},
		bson.M{"$set": updateData},
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update preferences",
		})
	}

	// Fetch updated preferences
	var updatedPreferences model.UserPreferences
	err = preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&updatedPreferences)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch updated preferences",
		})
	}

	return c.JSON(http.StatusOK, PreferencesResponse{
		Preferences: updatedPreferences,
	})
}

// DeletePreferences deletes user preferences
func DeletePreferences(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Get preferences collection
	preferencesCollection := mongodb.GetCollection("user_preferences")
	if preferencesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Check if preferences exist
	var existing model.UserPreferences
	err := preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&existing)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User preferences not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Delete preferences
	_, err = preferencesCollection.DeleteOne(context.Background(), bson.M{"user_id": userID})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete preferences",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "User preferences deleted successfully",
	})
}

// AddInterest adds a new interest to user preferences
func AddInterest(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	var req struct {
		Interest string `json:"interest" validate:"required"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	interest := strings.TrimSpace(req.Interest)
	if interest == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Interest is required",
		})
	}

	// Get preferences collection
	preferencesCollection := mongodb.GetCollection("user_preferences")
	if preferencesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Check if preferences exist
	var existing model.UserPreferences
	err := preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&existing)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User preferences not found. Create preferences first.",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Check if interest already exists
	for _, existingInterest := range existing.Interests {
		if strings.EqualFold(existingInterest, interest) {
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Interest already exists",
			})
		}
	}

	// Add interest
	updatedInterests := append(existing.Interests, interest)
	_, err = preferencesCollection.UpdateOne(
		context.Background(),
		bson.M{"user_id": userID},
		bson.M{"$set": bson.M{
			"interests":  updatedInterests,
			"updated_at": time.Now(),
		}},
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to add interest",
		})
	}

	// Fetch updated preferences
	var updatedPreferences model.UserPreferences
	err = preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&updatedPreferences)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch updated preferences",
		})
	}

	return c.JSON(http.StatusOK, PreferencesResponse{
		Preferences: updatedPreferences,
	})
}

// RemoveInterest removes an interest from user preferences
func RemoveInterest(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	interest := c.Param("interest")
	if interest == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Interest parameter is required",
		})
	}

	// Get preferences collection
	preferencesCollection := mongodb.GetCollection("user_preferences")
	if preferencesCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Check if preferences exist
	var existing model.UserPreferences
	err := preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&existing)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User preferences not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Remove interest
	var updatedInterests []string
	found := false
	for _, existingInterest := range existing.Interests {
		if !strings.EqualFold(existingInterest, interest) {
			updatedInterests = append(updatedInterests, existingInterest)
		} else {
			found = true
		}
	}

	if !found {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "Interest not found",
		})
	}

	// Update in database
	_, err = preferencesCollection.UpdateOne(
		context.Background(),
		bson.M{"user_id": userID},
		bson.M{"$set": bson.M{
			"interests":  updatedInterests,
			"updated_at": time.Now(),
		}},
	)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to remove interest",
		})
	}

	// Fetch updated preferences
	var updatedPreferences model.UserPreferences
	err = preferencesCollection.FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&updatedPreferences)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to fetch updated preferences",
		})
	}

	return c.JSON(http.StatusOK, PreferencesResponse{
		Preferences: updatedPreferences,
	})
}
