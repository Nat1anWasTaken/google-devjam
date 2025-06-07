package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"google-devjam-backend/router/auth"
	"google-devjam-backend/router/news"
	"google-devjam-backend/router/user"
	"google-devjam-backend/router/vocabulary"
	mongoUtils "google-devjam-backend/utils/mongodb"
)

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading .env file:", err)
	}

	// Initialize MongoDB
	if err := mongoUtils.Connect(); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	// Create echo instance
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{os.Getenv("FRONTEND_URL")},
		AllowMethods:     []string{echo.GET, echo.POST, echo.PUT, echo.DELETE, echo.PATCH, echo.OPTIONS},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))

	// Routes
	e.GET("/", hello)
	e.GET("/health", health)
	auth.InitRoutes(e)
	news.InitRoutes(e)
	vocabulary.InitRoutes(e)
	user.InitUserRouter(e)

	// Get port from environment or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start server
	e.Logger.Fatal(e.Start(":" + port))
}

// Handler functions
func hello(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Hello, World!",
	})
}

func health(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"status": "OK",
	})
}
