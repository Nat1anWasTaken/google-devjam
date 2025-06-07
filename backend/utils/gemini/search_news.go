package gemini

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"google-devjam-backend/model"
)

type NewsGenerationRequest struct {
	UserPreferences *model.UserPreferences `json:"user_preferences"`
	LearnWords      []string               `json:"learn_words"`  // Words user is currently learning
	ReviewWords     []string               `json:"review_words"` // Words that need review based on forgetting curve
}

type NewsGenerationResult struct {
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	Level    string   `json:"level"`
	Keywords []string `json:"keywords"`
	Source   []string `json:"source"`
}

// Tool represents a tool that can be used by Gemini
type Tool struct {
	GoogleSearch *GoogleSearchTool `json:"google_search,omitempty"`
}

// GoogleSearchTool represents the Google Search tool configuration
type GoogleSearchTool struct {
	// Empty struct for basic Google Search functionality
}

// Enhanced GeminiRequest with tools support
type GeminiRequestWithTools struct {
	Contents []Content `json:"contents"`
	Tools    []Tool    `json:"tools,omitempty"`
}

// We'll remove the placeholder function since Gemini 2.0 has built-in search

// GeneratePersonalizedNews uses Gemini API to generate personalized news based on user preferences and vocabulary
func GeneratePersonalizedNews(req NewsGenerationRequest) (*NewsGenerationResult, error) {
	apiKey := os.Getenv("GEMINI_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_KEY environment variable is not set")
	}

	// Determine user level
	userLevel := "beginner"
	if req.UserPreferences != nil {
		switch {
		case req.UserPreferences.Level >= 8:
			userLevel = "advanced"
		case req.UserPreferences.Level >= 5:
			userLevel = "intermediate"
		default:
			userLevel = "beginner"
		}
	}

	// Prepare interests string
	interests := []string{"general news"}
	if req.UserPreferences != nil && len(req.UserPreferences.Interests) > 0 {
		interests = req.UserPreferences.Interests
	}
	interestsStr := strings.Join(interests, ", ")

	// Prepare vocabulary words
	learnWordsStr := "none"
	if len(req.LearnWords) > 0 {
		learnWordsStr = strings.Join(req.LearnWords, ", ")
	}

	reviewWordsStr := "none"
	if len(req.ReviewWords) > 0 {
		reviewWordsStr = strings.Join(req.ReviewWords, ", ")
	}

	// Construct the prompt
	prompt := fmt.Sprintf(`You are a casual, friendly news presenter creating content for English language learners. Write like you're having a relaxed conversation or hosting a podcast - be natural, engaging, and approachable.

FIRST: Use the Google Search tool to find current, real news about: %s. Look for recent news articles, updates, or developments related to these topics.

USER PROFILE (ONLY use this information, don't assume anything else):
- Learning Level: %s
- Interests: %s
- Words Currently Learning: %s
- Words Needing Review: %s

ARTICLE STYLE - Make it like a CASUAL PODCAST/CONVERSATION:
1. Write a comprehensive article (800-1200 words) in a relaxed, conversational tone
2. Use phrases like "Hey, did you hear about...", "So here's what's happening...", "You know what's interesting..."
3. Be friendly and approachable - like talking to a friend over coffee
4. Include personal touches like "I think this is pretty cool because..." or "What caught my attention was..."
5. Use everyday language appropriate for their learning level (%s)
6. MUST naturally include vocabulary words from learning and review lists
7. Base content on REAL current news (search the web first)
8. Don't be too formal or official - keep it light and engaging
9. Structure like a casual chat with smooth transitions

TONE GUIDELINES:
- Beginner: Very friendly, simple explanations, like talking to a new friend
- Intermediate: Conversational but informative, like a casual discussion
- Advanced: Natural conversation with depth, like chatting with a peer

CONTENT APPROACH:
- Start with current news about: %s
- Make it feel like daily conversation, not a formal news report
- Include "by the way" moments and natural tangents
- Use contractions and casual expressions appropriately
- Keep it informative but relaxed and enjoyable

Respond in this exact JSON format:
{
  "title": "Catchy, conversational title (like a podcast episode)",
  "content": "Full casual, podcast-style article (800-1200 words) that feels like a friendly conversation while naturally incorporating vocabulary words",
  "level": "%s",
  "keywords": ["key", "topic", "words", "from", "article"],
  "source": ["Google Search", "Real-time News", "AI Generated Content"]
}

IMPORTANT NOTES:
- Keywords should be 8-12 important topic words from the article
- Make sure the content is factual and educational but presented casually
- Avoid controversial or sensitive topics unless specifically requested
- The article should feel like chatting with a friend, not a vocabulary exercise
- Use casual connectors like "So anyway...", "Oh, and another thing...", "You know what else is cool?"
- Try to incorporate vocabulary words naturally in conversation
- Structure like a casual chat with smooth, natural transitions
- Include personal reactions like "I found this pretty interesting..." or "This made me think..."
- Use everyday expressions and contractions appropriate for the learning level
- Make it feel like daily conversation, not a formal presentation`, interestsStr, userLevel, interestsStr, learnWordsStr, reviewWordsStr, userLevel, interestsStr, userLevel)

	// Create request with Google Search tool
	reqBody := GeminiRequestWithTools{
		Contents: []Content{
			{
				Parts: []Part{
					{Text: prompt},
				},
			},
		},
		Tools: []Tool{
			{
				GoogleSearch: &GoogleSearchTool{},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Make API call using Gemini 2.0 which supports Google Search
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %v", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from Gemini API")
	}

	// Extract and parse the JSON response from Gemini
	responseText := geminiResp.Candidates[0].Content.Parts[0].Text

	// Clean up the response text (remove markdown formatting if present)
	responseText = strings.TrimSpace(responseText)
	responseText = strings.TrimPrefix(responseText, "```json")
	responseText = strings.TrimSuffix(responseText, "```")
	responseText = strings.TrimSpace(responseText)

	var result NewsGenerationResult
	if err := json.Unmarshal([]byte(responseText), &result); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response as JSON: %v", err)
	}

	// Validate the result
	if result.Title == "" || result.Content == "" {
		return nil, fmt.Errorf("invalid response: missing title or content")
	}

	return &result, nil
}
