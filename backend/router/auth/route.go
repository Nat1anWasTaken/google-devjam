package auth

import (
	"google-devjam-backend/utils/middleware"

	"github.com/labstack/echo/v4"
)

func InitRoutes(e *echo.Echo) {
	e.POST("/auth/register", Register)
	e.POST("/auth/login", Login)
	e.POST("/auth/logout", Logout, middleware.JWTMiddleware())
}
