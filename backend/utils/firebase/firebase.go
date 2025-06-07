package utils

import (
	"context"
	"fmt"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/db"
	"google.golang.org/api/option"
)

var (
	FirebaseApp     *firebase.App
	FirestoreClient *db.Client
)

// InitFirebase initializes Firebase app using environment variables
func InitFirebase() error {
	ctx := context.Background()

	// Get Firebase configuration from environment variables
	projectID := os.Getenv("FIREBASE_PROJECT_ID")
	if projectID == "" {
		log.Printf("FIREBASE_PROJECT_ID environment variable is not set")
		return fmt.Errorf("FIREBASE_PROJECT_ID is required")
	}

	// Firebase configuration
	config := &firebase.Config{
		ProjectID: projectID,
	}

	// Check if service account key path is provided
	serviceAccountPath := os.Getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
	var app *firebase.App
	var err error

	if serviceAccountPath != "" {
		// Use service account file if provided
		opt := option.WithCredentialsFile(serviceAccountPath)
		app, err = firebase.NewApp(ctx, config, opt)
	} else {
		// Use default credentials (useful for Google Cloud environments)
		// or Application Default Credentials (ADC)
		app, err = firebase.NewApp(ctx, config)
	}

	if err != nil {
		log.Printf("Error initializing Firebase app: %v", err)
		return err
	}

	FirebaseApp = app

	// Initialize Firestore client
	client, err := app.Database(ctx)
	if err != nil {
		log.Printf("Error getting Firestore client: %v", err)
		return err
	}

	FirestoreClient = client
	log.Printf("Firebase initialized successfully with project ID: %s", projectID)
	return nil
}

// GetFirebaseApp returns the Firebase app instance
func GetFirebaseApp() *firebase.App {
	return FirebaseApp
}

// GetFirestoreClient returns the Firestore client
func GetFirestoreClient() *db.Client {
	return FirestoreClient
}
