package s3

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	minioClient *minio.Client
	bucketName  string
}

// Config holds MinIO configuration
type Config struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	UseSSL          bool
}

// NewClient creates a new MinIO S3 client
func NewClient(config Config) (*Client, error) {
	minioClient, err := minio.New(config.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AccessKeyID, config.SecretAccessKey, ""),
		Secure: config.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %v", err)
	}

	// Ensure bucket exists
	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, config.BucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket existence: %v", err)
	}

	if !exists {
		return nil, fmt.Errorf("bucket %s does not exist", config.BucketName)
	}

	return &Client{
		minioClient: minioClient,
		bucketName:  config.BucketName,
	}, nil
}

// UploadAudio uploads audio data to S3 and returns the object key and public URL
func (c *Client) UploadAudio(audioData []byte, filename string, newsID string) (string, string, error) {
	// Create object key with news ID prefix for organization
	objectKey := fmt.Sprintf("news/%s/%s", newsID, filename)

	// Upload the audio file
	ctx := context.Background()
	reader := bytes.NewReader(audioData)

	_, err := c.minioClient.PutObject(ctx, c.bucketName, objectKey, reader, int64(len(audioData)), minio.PutObjectOptions{
		ContentType: "audio/wav",
		UserMetadata: map[string]string{
			"news-id":    newsID,
			"created-at": time.Now().Format(time.RFC3339),
		},
	})
	if err != nil {
		return "", "", fmt.Errorf("failed to upload audio to S3: %v", err)
	}

	// Generate public URL path only (no hostname/protocol)
	// This ensures we return only the path part: /bucket/path/to/file
	// Use simple string concatenation to avoid any MinIO URL generation
	publicURL := "/" + c.bucketName + "/" + objectKey

	log.Printf("S3 UploadAudio returning URL: '%s' (length: %d)", publicURL, len(publicURL))

	return objectKey, publicURL, nil
}

// DeleteAudio deletes an audio file from S3
func (c *Client) DeleteAudio(objectKey string) error {
	ctx := context.Background()
	err := c.minioClient.RemoveObject(ctx, c.bucketName, objectKey, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete audio from S3: %v", err)
	}
	return nil
}

// GeneratePresignedURL generates a presigned URL for private access (if needed)
func (c *Client) GeneratePresignedURL(objectKey string, expiry time.Duration) (string, error) {
	ctx := context.Background()
	presignedURL, err := c.minioClient.PresignedGetObject(ctx, c.bucketName, objectKey, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %v", err)
	}
	return presignedURL.String(), nil
}

// ListAudioFiles lists all audio files for a specific news ID
func (c *Client) ListAudioFiles(newsID string) ([]string, error) {
	ctx := context.Background()
	prefix := fmt.Sprintf("news/%s/", newsID)

	objectCh := c.minioClient.ListObjects(ctx, c.bucketName, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})

	var files []string
	for object := range objectCh {
		if object.Err != nil {
			return nil, fmt.Errorf("error listing objects: %v", object.Err)
		}
		files = append(files, object.Key)
	}

	return files, nil
}
