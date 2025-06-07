package mongodb

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	Client   *mongo.Client
	Database *mongo.Database
)

// Connect initializes MongoDB connection using environment variables
func Connect() error {
	// Get MongoDB URI from environment
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		return fmt.Errorf("MONGODB_URI environment variable is not set")
	}

	// Get database name from environment (optional, defaults to "devjam")
	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		dbName = "devjam"
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %v", err)
	}

	// Ping the database to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return fmt.Errorf("failed to ping MongoDB: %v", err)
	}

	// Set global variables
	Client = client
	Database = client.Database(dbName)

	log.Printf("MongoDB connected successfully to database: %s", dbName)
	return nil
}

// Disconnect closes the MongoDB connection
func Disconnect() error {
	if Client == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := Client.Disconnect(ctx); err != nil {
		return fmt.Errorf("failed to disconnect from MongoDB: %v", err)
	}

	log.Println("MongoDB disconnected successfully")
	return nil
}

// GetClient returns the MongoDB client
func GetClient() *mongo.Client {
	return Client
}

// GetDatabase returns the MongoDB database
func GetDatabase() *mongo.Database {
	return Database
}

// GetCollection returns a MongoDB collection
func GetCollection(collectionName string) *mongo.Collection {
	if Database == nil {
		log.Printf("Database is not initialized")
		return nil
	}
	return Database.Collection(collectionName)
}
