package vocabulary

import (
	"google-devjam-backend/utils/middleware"

	"github.com/labstack/echo/v4"
)

func InitRoutes(e *echo.Echo) {
	// All vocabulary routes require authentication
	v := e.Group("/vocabulary", middleware.JWTMiddleware())

	v.POST("", CreateWord)       // POST /vocabulary - Create new word
	v.GET("", GetWords)          // GET /vocabulary - Get user's words
	v.GET("/:id", GetWord)       // GET /vocabulary/:id - Get specific word
	v.PUT("/:id", UpdateWord)    // PUT /vocabulary/:id - Update word
	v.DELETE("/:id", DeleteWord) // DELETE /vocabulary/:id - Delete word

	// User word learning endpoints
	v.POST("/:id/learn", LearnWord) // POST /vocabulary/:id/learn - Mark word as learned

	// Example management endpoints
	v.POST("/:id/examples", AddExample)                 // POST /vocabulary/:id/examples - Add example to word
	v.DELETE("/:id/examples/:exampleId", DeleteExample) // DELETE /vocabulary/:id/examples/:exampleId - Delete specific example

	// Recommendation endpoint
	v.GET("/recommend", GetRecommendations) // GET /vocabulary/recommend - Get word recommendations
}
