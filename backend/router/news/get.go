package news

import (
	"context"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"

	"google-devjam-backend/model"
	"google-devjam-backend/utils/middleware"
	"google-devjam-backend/utils/mongodb"
)

type GetNewsResponse struct {
	News  []model.News `json:"news"`
	Total int64        `json:"total"`
	Page  int          `json:"page"`
	Limit int          `json:"limit"`
}

type GetSingleNewsResponse struct {
	News model.News `json:"news"`
}

// GetNews retrieves news articles with pagination and filtering
func GetNews(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	// Parse pagination parameters
	page := 1
	limit := 10

	if pageStr := c.QueryParam("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	// Parse level filter
	level := c.QueryParam("level")

	// Parse search query
	searchQuery := c.QueryParam("search")

	// Get news collection
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Build filter - only show news for this user
	filter := bson.M{
		"user_id": userID,
	}

	// Add level filter if provided
	if level != "" {
		filter["level"] = level
	}

	// Add search filter if provided
	if searchQuery != "" {
		filter["$or"] = []bson.M{
			{"title": bson.M{"$regex": searchQuery, "$options": "i"}},
			{"content": bson.M{"$regex": searchQuery, "$options": "i"}},
			{"keywords": bson.M{"$in": []string{searchQuery}}},
		}
	}

	// Count total documents
	total, err := newsCollection.CountDocuments(context.Background(), filter)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	// Calculate skip
	skip := (page - 1) * limit

	// Find documents with pagination
	findOptions := options.Find()
	findOptions.SetSort(bson.D{{Key: "created_at", Value: -1}}) // Sort by newest first
	findOptions.SetSkip(int64(skip))
	findOptions.SetLimit(int64(limit))

	cursor, err := newsCollection.Find(context.Background(), filter, findOptions)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}
	defer cursor.Close(context.Background())

	var news []model.News
	if err := cursor.All(context.Background(), &news); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	return c.JSON(http.StatusOK, GetNewsResponse{
		News:  news,
		Total: total,
		Page:  page,
		Limit: limit,
	})
}

// GetSingleNews retrieves a specific news article by ID
func GetSingleNews(c echo.Context) error {
	// Get user info from context
	userID, _ := middleware.GetUserFromContext(c)
	if userID == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "User not authenticated",
		})
	}

	newsID := c.Param("id")
	if newsID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "News ID is required",
		})
	}

	// Get news collection
	newsCollection := mongodb.GetCollection("news")
	if newsCollection == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database connection error",
		})
	}

	// Find the news article for this specific user
	var news model.News
	err := newsCollection.FindOne(context.Background(), bson.M{
		"_id":     newsID,
		"user_id": userID,
	}).Decode(&news)
	if err != nil {
		if err.Error() == "mongo: no documents in result" {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "News article not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Database error",
		})
	}

	return c.JSON(http.StatusOK, GetSingleNewsResponse{
		News: news,
	})
}
