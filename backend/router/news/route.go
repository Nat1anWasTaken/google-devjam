package news

import (
	"google-devjam-backend/utils/middleware"

	"github.com/labstack/echo/v4"
)

func InitRoutes(e *echo.Echo) {
	// All news routes require authentication
	newsGroup := e.Group("/news", middleware.JWTMiddleware())

	// News generation endpoint
	newsGroup.POST("/generate", GenerateNews) // POST /news/generate - Generate personalized news

	// News retrieval endpoints
	newsGroup.GET("", GetNews)           // GET /news - Get news articles with pagination and filtering
	newsGroup.GET("/:id", GetSingleNews) // GET /news/:id - Get specific news article
}
