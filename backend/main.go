package main

import (
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	firebaseUtils "google-devjam-backend/utils/firebase"
)

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading .env file:", err)
	}

	// Initialize Firebase
	if err := firebaseUtils.InitFirebase(); err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}

	// Create echo instance
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// Routes
	e.GET("/", hello)
	e.GET("/health", health)
	e.GET("/config", config) // New route to check environment variables

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

// New handler to check if environment variables are loaded
func config(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{
		"firebase_project_name":   os.Getenv("FIREBASE_PROJECT_NAME"),
		"firebase_project_id":     os.Getenv("FIREBASE_PROJECT_ID"),
		"firebase_project_number": os.Getenv("FIREBASE_PROJECT_NUMBER"),
		"firebase_environment":    os.Getenv("FIREBASE_PROJECT_ENVIRONMENT"),
		"port":                    os.Getenv("PORT"),
	})
}
