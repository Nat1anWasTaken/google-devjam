package services

import (
	"fmt"
	"log"
	"os"

	"google-devjam-backend/utils/s3"
	"google-devjam-backend/utils/tts"
)

type AudioService struct {
	ttsClient *tts.Client
	s3Client  *s3.Client
}

// NewAudioService creates a new audio service with TTS and S3 clients
func NewAudioService() (*AudioService, error) {
	// Initialize TTS client with Mac GPU support
	ttsURL := os.Getenv("TTS_SERVICE_URL")
	if ttsURL == "" {
		// Check if we're in Docker environment (has TTS container)
		if _, inDocker := os.LookupEnv("DOCKER_ENV"); inDocker {
			ttsURL = "http://tts:5002" // Use Docker service name
		} else {
			// Try TTS services in order of preference: Simple Mac (5004) > GPU Mac (5003) > Docker (5002)
			log.Printf("🔍 Checking for available TTS services...")

			// Try simple Mac TTS first (most reliable)
			simpleMacClient := tts.NewClient("http://localhost:5004")
			if err := simpleMacClient.HealthCheck(); err == nil {
				log.Printf("🍎 Using simple Mac native TTS service on port 5004")
				ttsURL = "http://localhost:5004"
			} else {
				// Try Mac GPU TTS
				gpuMacClient := tts.NewClient("http://localhost:5003")
				if err := gpuMacClient.HealthCheck(); err == nil {
					log.Printf("🚀 Using Mac GPU TTS service on port 5003")
					ttsURL = "http://localhost:5003"
				} else {
					log.Printf("⚠️  Native Mac TTS not available, using Docker TTS on port 5002")
					ttsURL = "http://localhost:5002"
				}
			}
		}
	}
	ttsClient := tts.NewClient(ttsURL)

	// Initialize S3 client
	minioEndpoint := getEnvOrDefault("MINIO_ENDPOINT", "")
	if minioEndpoint == "" {
		// Check if we're in Docker environment
		if _, inDocker := os.LookupEnv("DOCKER_ENV"); inDocker {
			minioEndpoint = "minio:9000" // Use Docker service name
		} else {
			minioEndpoint = "localhost:9002" // Use correct port mapping for development
		}
	}

	s3Config := s3.Config{
		Endpoint:        minioEndpoint,
		AccessKeyID:     getEnvOrDefault("MINIO_ACCESS_KEY", "minioadmin"),
		SecretAccessKey: getEnvOrDefault("MINIO_SECRET_KEY", "minioadmin123"),
		BucketName:      getEnvOrDefault("MINIO_BUCKET", "devjam-audio"),
		UseSSL:          getEnvOrDefault("MINIO_USE_SSL", "false") == "true",
	}

	s3Client, err := s3.NewClient(s3Config)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize S3 client: %v", err)
	}

	return &AudioService{
		ttsClient: ttsClient,
		s3Client:  s3Client,
	}, nil
}

// GenerateAndStoreAudio converts text to speech and stores it in S3
func (a *AudioService) GenerateAndStoreAudio(text string, newsID string) (audioURL string, audioKey string, err error) {
	// Check TTS service health first
	if err := a.ttsClient.HealthCheck(); err != nil {
		return "", "", fmt.Errorf("TTS service is not available: %v", err)
	}

	// Generate audio from text
	log.Printf("Generating audio for news ID: %s", newsID)
	audioData, filename, err := a.ttsClient.GenerateAudio(text)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate audio: %v", err)
	}

	// Upload audio to S3
	log.Printf("Uploading audio to S3 for news ID: %s, filename: %s", newsID, filename)
	objectKey, publicURL, err := a.s3Client.UploadAudio(audioData, filename, newsID)
	if err != nil {
		return "", "", fmt.Errorf("failed to upload audio to S3: %v", err)
	}

	log.Printf("Audio successfully stored. URL: %s, Key: %s", publicURL, objectKey)
	return publicURL, objectKey, nil
}

// DeleteAudio removes audio file from S3
func (a *AudioService) DeleteAudio(audioKey string) error {
	return a.s3Client.DeleteAudio(audioKey)
}

// GeneratePresignedURL creates a presigned URL for private access
func (a *AudioService) GeneratePresignedURL(audioKey string) (string, error) {
	// 24 hours expiry for presigned URLs
	return a.s3Client.GeneratePresignedURL(audioKey, 24*3600)
}

// getEnvOrDefault returns environment variable value or default if not set
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
