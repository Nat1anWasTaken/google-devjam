package auth

import (
	"google-devjam-backend/utils/middleware"

	"github.com/labstack/echo/v4"
)

func InitRoutes(e *echo.Echo) {
	auth := e.Group("/auth")

	auth.POST("/register", Register)
	auth.POST("/login", Login)
	auth.GET("/me", Me, middleware.JWTMiddleware())
}
