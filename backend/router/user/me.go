package user

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

type UserResponse struct {
	User model.User `json:"user"`
}

// Me returns the authenticated user's information
func Me(c echo.Context) error {
	// Get user info from context (set by JWT middleware)
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Get users collection
	usersCollection := mongodb.GetCollection("users")
	if usersCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Find the user by ID
	var user model.User
	err := usersCollection.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "User not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Don't return the password hash
	user.Password = ""

	return c.JSON(http.StatusOK, UserResponse{
		User: user,
	})
}
