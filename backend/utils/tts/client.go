package tts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

type TTSRequest struct {
	Text string `json:"text"`
}

// NewClient creates a new TTS client
func NewClient(baseURL string) *Client {
	return &Client{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 180 * time.Second, // Increased timeout for longer texts and Mac processing
		},
	}
}

// GenerateAudio converts text to speech and returns the audio data
func (c *Client) GenerateAudio(text string) ([]byte, string, error) {
	// Generate the audio
	reqBody := TTSRequest{Text: text}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, "", fmt.Errorf("failed to marshal request: %v", err)
	}

	resp, err := c.HTTPClient.Post(
		c.BaseURL+"/api/tts",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, "", fmt.Errorf("failed to make TTS request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, "", fmt.Errorf("TTS request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Read the audio data directly from response
	audioData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read audio data: %v", err)
	}

	// Extract filename from Content-Disposition header if available
	filename := "audio.wav"
	if contentDisposition := resp.Header.Get("Content-Disposition"); contentDisposition != "" {
		// Parse filename from "attachment; filename=xxx.wav"
		if start := bytes.Index([]byte(contentDisposition), []byte("filename=")); start != -1 {
			start += len("filename=")
			if end := bytes.Index([]byte(contentDisposition[start:]), []byte(";")); end != -1 {
				filename = contentDisposition[start : start+end]
			} else {
				filename = contentDisposition[start:]
			}
		}
	}

	return audioData, filename, nil
}

// HealthCheck checks if the TTS service is healthy
func (c *Client) HealthCheck() error {
	resp, err := c.HTTPClient.Get(c.BaseURL + "/health")
	if err != nil {
		return fmt.Errorf("failed to check TTS health: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("TTS service unhealthy, status: %d", resp.StatusCode)
	}

	return nil
}
