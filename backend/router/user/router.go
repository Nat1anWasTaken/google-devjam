package user

import (
	"google-devjam-backend/utils/middleware"

	"github.com/labstack/echo/v4"
)

func InitUserRouter(e *echo.Echo) {
	// Public routes

	// Protected routes for user preferences
	userGroup := e.Group("/user", middleware.JWTMiddleware())
	// Get user info
	userGroup.GET("/me", Me)
	// CRUD operations for user preferences
	userGroup.GET("/preferences", GetPreferences)       // GET /user/preferences - Get user preferences
	userGroup.POST("/preferences", CreatePreferences)   // POST /user/preferences - Create user preferences
	userGroup.PUT("/preferences", UpdatePreferences)    // PUT /user/preferences - Update user preferences
	userGroup.DELETE("/preferences", DeletePreferences) // DELETE /user/preferences - Delete user preferences

	// Interest management
	userGroup.POST("/preferences/interests", AddInterest)                // POST /user/preferences/interests - Add interest
	userGroup.DELETE("/preferences/interests/:interest", RemoveInterest) // DELETE /user/preferences/interests/:interest - Remove interest
}
