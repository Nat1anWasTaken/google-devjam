package gemini

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

type RecommendationResult struct {
	Words []string `json:"words"`
}

// GetWordRecommendations uses Gemini API to get 10 recommended words based on user's vocabulary
func GetWordRecommendations(userWords []string) (*RecommendationResult, error) {
	apiKey := os.Getenv("GEMINI_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_KEY environment variable is not set")
	}

	// Create a string of user's words
	wordsStr := strings.Join(userWords, ", ")

	// Handle different scenarios based on user's vocabulary size
	var analysisContext string
	if len(userWords) == 0 {
		analysisContext = "The user has no vocabulary yet. Recommend 10 common, basic English words that beginners should learn first (everyday objects, basic verbs, common adjectives)."
		wordsStr = "no words yet - beginner level"
	} else if len(userWords) < 5 {
		analysisContext = "The user has very few words. Recommend words that are related to their existing words but also include some fundamental vocabulary they might be missing."
	} else if len(userWords) < 15 {
		analysisContext = "The user has a small vocabulary. Focus on expanding their vocabulary with words that are closely related to what they already know."
	} else {
		analysisContext = "The user has a good vocabulary base. Recommend more advanced words that fit the themes and patterns in their existing vocabulary."
	}

	// Construct the prompt
	prompt := fmt.Sprintf(`You are a vocabulary learning assistant. Analyze the user's current vocabulary and recommend 10 new English words that are SIMILAR, RELATED, or in the SAME THEME as the words they already know.

%s

User's current vocabulary: %s

ANALYSIS INSTRUCTIONS:
1. Look at the patterns in their vocabulary (topics, themes, difficulty levels, word types)
2. Identify what subjects/domains they're interested in (e.g., if they have "computer, internet, software" suggest more tech words)
3. Find words that are semantically related or in similar categories
4. Consider synonyms, antonyms, or words from the same word family
5. If they have basic words in a topic, suggest intermediate words in the same topic
6. If they have intermediate words, suggest more advanced words in similar areas

RECOMMENDATION REQUIREMENTS:
1. Recommend exactly 10 words that are THEMATICALLY RELATED to their existing vocabulary
2. Words should be slightly more challenging than their current level but not too difficult
3. Only recommend REAL English words that exist in standard dictionaries
4. Only recommend BASE FORMS of words (not verb tenses, plurals, or conjugations)
5. Do NOT recommend proper nouns (names of people, places, brands, etc.)
6. Do NOT recommend words that are already in their vocabulary
7. Focus on words that fit the same themes/topics as their existing words
8. Maintain logical progression in difficulty within the same topic areas

EXAMPLES:
- If user has: "cat, dog, bird" → recommend: "rabbit, hamster, turtle, fish, horse, sheep, cow, pig, duck, chicken"
- If user has: "happy, sad, angry" → recommend: "excited, nervous, calm, worried, proud, disappointed, surprised, confused, grateful, anxious"
- If user has: "computer, internet, email" → recommend: "software, website, download, password, keyboard, monitor, database, network, server, digital"
- If user has: "run, walk, jump" → recommend: "climb, swim, dance, exercise, stretch, sprint, jog, skip, crawl, march"

Respond in this exact JSON format:
{
  "words": ["word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8", "word9", "word10"]
  }`, analysisContext, wordsStr)

	// Create request
	reqBody := GeminiRequest{
		Contents: []Content{
			{
				Parts: []Part{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %v", err)
	}

	// Make API call
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", apiKey)
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

	var result RecommendationResult
	if err := json.Unmarshal([]byte(responseText), &result); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response as JSON: %v", err)
	}

	// Validate that we got exactly 10 words
	if len(result.Words) == 0 {
		return nil, fmt.Errorf("no words returned from Gemini")
	}

	// Limit to 10 words if more were returned
	if len(result.Words) > 10 {
		result.Words = result.Words[:10]
	}

	return &result, nil
}
