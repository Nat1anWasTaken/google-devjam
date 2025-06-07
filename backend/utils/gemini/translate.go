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

type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

type Content struct {
	Parts []Part `json:"parts"`
}

type Part struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []Candidate `json:"candidates"`
}

type Candidate struct {
	Content Content `json:"content"`
}

type TranslationResult struct {
	Definition string `json:"definition"`
	IsValid    bool   `json:"is_valid"`
	Difficulty int    `json:"difficulty"`
	Reason     string `json:"reason,omitempty"`
}

// TranslateWord uses Gemini API to translate and validate a word
func TranslateWord(word string) (*TranslationResult, error) {
	apiKey := os.Getenv("GEMINI_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_KEY environment variable is not set")
	}

	// Construct the prompt with careful instructions
	prompt := fmt.Sprintf(`You are a vocabulary learning assistant. Your task is to analyze the given English word and provide a Chinese translation ONLY if it's a valid, real English word suitable for vocabulary learning.

STRICT VALIDATION RULES:
1. ONLY accept REAL English words that exist in standard dictionaries
2. REJECT random strings, nonsensical combinations, made-up words, or gibberish
3. REJECT proper nouns (names of people, places, brands, etc.)
4. ONLY accept BASE FORMS of words (not verb tenses, plurals, or conjugations)
5. Do NOT accept: past tense (ed), future tense (will + verb), present continuous (ing), plurals (s/es), comparative/superlative forms
6. Accept: base verbs (run, eat, go), base nouns (cat, house, book), base adjectives (big, small, happy)

EXAMPLES OF WORDS TO REJECT:
- Random strings: "asdfgh", "xyzabc", "qwerty"
- Nonsensical words: "flibber", "zoomzoom", "blahblah"
- Proper nouns: "John", "Paris", "Google", "iPhone"
- Non-base forms: "running", "cats", "bigger", "went"
- Misspellings: "helo" (instead of "hello"), "recieve" (instead of "receive")

EXAMPLES OF WORDS TO ACCEPT:
- Common nouns: "cat", "house", "book", "water"
- Base verbs: "run", "eat", "go", "think"
- Base adjectives: "big", "small", "happy", "difficult"

If the word IS valid, provide Chinese translation using traditional Chinese characters and assign a difficulty level from 1-10 based on word complexity and frequency:
   - 1-3: Very common, basic words (cat, run, big)
   - 4-6: Intermediate words (beautiful, important, develop)
   - 7-10: Advanced, complex, or rare words (sophisticated, phenomenon, ubiquitous)

Word to analyze: "%s"

Respond in this exact JSON format:
{
  "definition": "Chinese translation in traditional Chinese (only if valid)",
  "is_valid": true/false,
  "difficulty": 1-10 (only if valid, otherwise 0),
  "reason": "explanation if invalid (e.g., 'This is not a real English word', 'This is a proper noun', 'This is past tense of run', 'This is plural form of cat')"
}

Examples:
- "asdfgh" → {"definition": "", "is_valid": false, "difficulty": 0, "reason": "This is not a real English word - appears to be random characters"}
- "John" → {"definition": "", "is_valid": false, "difficulty": 0, "reason": "This is a proper noun (person's name)"}
- "ran" → {"definition": "", "is_valid": false, "difficulty": 0, "reason": "This is past tense of 'run'"}
- "cats" → {"definition": "", "is_valid": false, "difficulty": 0, "reason": "This is plural form of 'cat'"}
- "running" → {"definition": "", "is_valid": false, "difficulty": 0, "reason": "This is present participle of 'run'"}
- "run" → {"definition": "跑", "is_valid": true, "difficulty": 2}
- "cat" → {"definition": "貓", "is_valid": true, "difficulty": 1}
- "sophisticated" → {"definition": "複雜的", "is_valid": true, "difficulty": 8}`, word)

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

	var result TranslationResult
	if err := json.Unmarshal([]byte(responseText), &result); err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response as JSON: %v", err)
	}

	return &result, nil
}
