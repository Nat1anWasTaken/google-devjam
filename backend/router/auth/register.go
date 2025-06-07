package auth

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"google-devjam-backend/model"
	"google-devjam-backend/utils/encrypt"
	"google-devjam-backend/utils/mongodb"
)

type RegisterRequest struct {
	DisplayName string `json:"display_name" validate:"required,min=1,max=50"`
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=6"`
}

type AuthResponse struct {
	User model.User `json:"user"`
}

func Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	// Validate request
	if req.DisplayName == "" || req.Email == "" || req.Password == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Display name, email and password are required",
		})
	}

	if len(req.DisplayName) < 1 || len(req.DisplayName) > 50 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Display name must be between 1 and 50 characters",
		})
	}

	if len(req.Password) < 6 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Password must be at least 6 characters long",
		})
	}

	// Check if user already exists
	collection := mongodb.GetCollection("users")
	if collection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Check if email already exists (only email needs to be unique)
	var existingUser model.User
	err := collection.FindOne(context.Background(), bson.M{"email": req.Email}).Decode(&existingUser)
	if err == nil {
		return c.JSON(http.StatusConflict, map[string]string{
			"error": "User with this email already exists",
		})
	} else if err != mongo.ErrNoDocuments {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Generate Snowflake ID
	userID, err := encrypt.GenerateSnowflakeID()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate user ID",
		})
	}

	// Hash the password using Argon2
	hashedPassword, err := encrypt.HashPassword(req.Password)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to hash password",
		})
	}

	// Create new user
	now := time.Now()
	user := model.User{
		ID:          userID,
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Password:    hashedPassword,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Insert user into database
	_, err = collection.InsertOne(context.Background(), user)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to create user",
		})
	}

	// Generate JWT token
	token, err := encrypt.GenerateJWT(user.ID, user.Email)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to generate authentication token",
		})
	}

	// Remove password from response
	user.Password = ""

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"user":  user,
		"token": token,
	})
}
