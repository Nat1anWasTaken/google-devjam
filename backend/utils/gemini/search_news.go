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
	LearnWords      []string               `json:"learn_words"`     // Words user is currently learning
	ReviewWords     []string               `json:"review_words"`    // Words that need review based on forgetting curve
	ExistingTitles  []string               `json:"existing_titles"` // Previously generated titles to avoid duplicate topics
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

	// Determine user level with adaptive difficulty
	numericLevel, adaptiveLevel := determineAdaptiveLevel(req)
	difficultyInstruction := generateDifficultyInstruction(numericLevel, adaptiveLevel, req)

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

	// Prepare existing titles string
	existingTitlesStr := "none"
	if len(req.ExistingTitles) > 0 {
		existingTitlesStr = strings.Join(req.ExistingTitles, "\n- ")
		existingTitlesStr = "- " + existingTitlesStr
	}

	// Construct the prompt
	prompt := fmt.Sprintf(`You are a casual, friendly news presenter creating content for English language learners. Write like you're having a relaxed conversation or hosting a podcast - be natural, engaging, and approachable.

FIRST: Use the Google Search tool to find current, real news about: %s. Look for recent news articles, updates, or developments related to these topics.

USER PROFILE (ONLY use this information, don't assume anything else):
- Learning Level: %s (1-10 scale)
- Interests: %s
- Words Currently Learning: %s
- Words Needing Review: %s

ADAPTIVE DIFFICULTY INSTRUCTION:
%s

IMPORTANT: AVOID DUPLICATE TOPICS AND CONTENT
Previously generated news titles (DO NOT cover the same topics or themes):
%s

You MUST choose a COMPLETELY DIFFERENT topic/theme from the ones listed above. If previous news covered technology, choose sports, health, environment, culture, science, business, etc. Make sure the main subject matter is entirely different.

ARTICLE STYLE - Make it like a CASUAL PODCAST/CONVERSATION:
1. Write a comprehensive article (800-1200 words) in a relaxed, conversational tone
2. Use phrases like "Hey, did you hear about...", "So here's what's happening...", "You know what's interesting..."
3. Be friendly and approachable - like talking to a friend over coffee
4. Include personal touches like "I think this is pretty cool because..." or "What caught my attention was..."
5. Use everyday language appropriate for learning level %s (1-10 scale)
6. MUST naturally include vocabulary words from learning and review lists
7. Base content on REAL current news (search the web first)
8. Don't be too formal or official - keep it light and engaging
9. Structure like a casual chat with smooth transitions

TONE GUIDELINES:
- Level 1-3: Very friendly, simple explanations, like talking to a new friend
- Level 4-6: Conversational but informative, like a casual discussion
- Level 7-10: Natural conversation with depth, like chatting with a peer

CONTENT APPROACH:
- Start with current news about: %s (but choose a DIFFERENT topic/theme from previously generated news)
- Make it feel like daily conversation, not a formal news report
- Include "by the way" moments and natural tangents
- Use contractions and casual expressions appropriately
- Keep it informative but relaxed and enjoyable
- Ensure the main topic is completely different from previous news

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
- Make it feel like daily conversation, not a formal presentation
- CRITICAL: Choose a completely different TOPIC/THEME from the previously generated news. Don't just change the title - change the entire subject matter and focus area`, interestsStr, numericLevel, interestsStr, learnWordsStr, reviewWordsStr, difficultyInstruction, existingTitlesStr, numericLevel, interestsStr, numericLevel)

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

	// Find the JSON object boundaries
	startIdx := strings.Index(responseText, "{")
	endIdx := strings.LastIndex(responseText, "}")

	if startIdx == -1 || endIdx == -1 || startIdx >= endIdx {
		return nil, fmt.Errorf("failed to find valid JSON in Gemini response. Full response: %s", responseText)
	}

	jsonStr := responseText[startIdx : endIdx+1]

	// Clean up common JSON formatting issues
	jsonStr = cleanJSONString(jsonStr)

	var result NewsGenerationResult
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		// Try to provide more detailed error information
		return nil, fmt.Errorf("failed to parse Gemini response as JSON: %v. Extracted JSON: %s. Full response: %s", err, jsonStr, responseText)
	}

	// Validate the result
	if result.Title == "" || result.Content == "" {
		return nil, fmt.Errorf("invalid response: missing title or content")
	}

	return &result, nil
}

// cleanJSONString cleans up common JSON formatting issues from Gemini responses
func cleanJSONString(jsonStr string) string {
	// Remove any trailing commas before closing braces or brackets
	jsonStr = strings.ReplaceAll(jsonStr, ",}", "}")
	jsonStr = strings.ReplaceAll(jsonStr, ",]", "]")

	// Fix common quote issues - replace smart quotes with regular quotes
	jsonStr = strings.ReplaceAll(jsonStr, "\u201c", "\\\"") // left double quotation mark -> escaped quote
	jsonStr = strings.ReplaceAll(jsonStr, "\u201d", "\\\"") // right double quotation mark -> escaped quote
	jsonStr = strings.ReplaceAll(jsonStr, "\u2018", "'")    // left single quotation mark
	jsonStr = strings.ReplaceAll(jsonStr, "\u2019", "'")    // right single quotation mark

	// Handle other common smart quote variations using hex codes
	jsonStr = strings.ReplaceAll(jsonStr, "\u201C", "\\\"") // left double quotation mark (uppercase)
	jsonStr = strings.ReplaceAll(jsonStr, "\u201D", "\\\"") // right double quotation mark (uppercase)

	return jsonStr
}

// determineAdaptiveLevel analyzes user's vocabulary progress and determines appropriate difficulty level
func determineAdaptiveLevel(req NewsGenerationRequest) (string, string) {
	baseLevel := 1
	if req.UserPreferences != nil {
		baseLevel = req.UserPreferences.Level
		// Ensure level is within valid range
		if baseLevel < 1 {
			baseLevel = 1
		} else if baseLevel > 10 {
			baseLevel = 10
		}
	}

	// Convert numeric level to text level for processing
	var baseLevelText string
	switch {
	case baseLevel >= 8:
		baseLevelText = "advanced"
	case baseLevel >= 5:
		baseLevelText = "intermediate"
	default:
		baseLevelText = "beginner"
	}

	// Analyze vocabulary progress to determine if we should increase difficulty
	totalWords := len(req.LearnWords) + len(req.ReviewWords)
	reviewRatio := 0.0
	if totalWords > 0 {
		reviewRatio = float64(len(req.ReviewWords)) / float64(totalWords)
	}

	// Determine adaptive level based on vocabulary progress
	adaptiveLevel := baseLevelText
	adaptiveNumericLevel := baseLevel

	// If user has many review words (good progress), consider increasing difficulty
	if reviewRatio > 0.6 && totalWords >= 10 {
		switch baseLevelText {
		case "beginner":
			adaptiveLevel = "intermediate"
			adaptiveNumericLevel = min(baseLevel+2, 10)
		case "intermediate":
			adaptiveLevel = "advanced"
			adaptiveNumericLevel = min(baseLevel+2, 10)
		case "advanced":
			adaptiveLevel = "expert"
			adaptiveNumericLevel = 10
		}
	} else if reviewRatio > 0.8 && totalWords >= 20 {
		// Very high progress - increase difficulty more
		switch baseLevelText {
		case "beginner":
			adaptiveLevel = "advanced"
			adaptiveNumericLevel = min(baseLevel+3, 10)
		case "intermediate":
			adaptiveLevel = "expert"
			adaptiveNumericLevel = 10
		case "advanced":
			adaptiveLevel = "expert"
			adaptiveNumericLevel = 10
		}
	}

	// Return both the numeric level for display and text level for internal processing
	return fmt.Sprintf("%d", adaptiveNumericLevel), adaptiveLevel
}

// generateDifficultyInstruction creates specific instructions for adaptive difficulty
func generateDifficultyInstruction(numericLevel, adaptiveLevel string, req NewsGenerationRequest) string {
	// Convert back to text level for comparison
	baseLevel := "beginner"
	if req.UserPreferences != nil {
		switch {
		case req.UserPreferences.Level >= 8:
			baseLevel = "advanced"
		case req.UserPreferences.Level >= 5:
			baseLevel = "intermediate"
		default:
			baseLevel = "beginner"
		}
	}

	if baseLevel == adaptiveLevel {
		return fmt.Sprintf("Maintain current difficulty level (%s - Level %s). User is still building vocabulary at this level.", baseLevel, numericLevel)
	}

	totalWords := len(req.LearnWords) + len(req.ReviewWords)
	reviewRatio := 0.0
	if totalWords > 0 {
		reviewRatio = float64(len(req.ReviewWords)) / float64(totalWords)
	}

	switch adaptiveLevel {
	case "intermediate":
		return fmt.Sprintf("INCREASE DIFFICULTY: User shows good progress (%.1f%% review words, %d total words). Gradually introduce intermediate-level vocabulary (Level %s) and slightly more complex sentence structures while maintaining conversational tone.", reviewRatio*100, totalWords, numericLevel)
	case "advanced":
		return fmt.Sprintf("INCREASE DIFFICULTY: User demonstrates strong vocabulary progress (%.1f%% review words, %d total words). Use more sophisticated vocabulary (Level %s), complex sentence structures, and introduce idiomatic expressions while keeping it engaging.", reviewRatio*100, totalWords, numericLevel)
	case "expert":
		return fmt.Sprintf("MAXIMUM DIFFICULTY: User shows excellent mastery (%.1f%% review words, %d total words). Use advanced vocabulary (Level %s), complex grammatical structures, nuanced expressions, and sophisticated concepts while maintaining readability.", reviewRatio*100, totalWords, numericLevel)
	default:
		return fmt.Sprintf("Maintain current difficulty level (%s - Level %s).", baseLevel, numericLevel)
	}
}

// Helper function for min since Go doesn't have it built-in for int
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
