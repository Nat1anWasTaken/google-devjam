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
	Translation  string   `json:"translation"`
	DefinitionZh string   `json:"definition_zh"`
	DefinitionEn string   `json:"definition_en"`
	IsValid      bool     `json:"is_valid"`
	Difficulty   int      `json:"difficulty"`
	PartOfSpeech string   `json:"part_of_speech,omitempty"`
	RootWord     string   `json:"root_word,omitempty"`
	Examples     []string `json:"examples,omitempty"`
	Reason       string   `json:"reason,omitempty"`
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
6. REJECT word fragments, partial words, or incorrectly split vocabulary (e.g., "tion", "ing", "pre", "un", "ful")
7. REJECT prefixes, suffixes, or word parts that are not complete words by themselves
8. Accept: base verbs (run, eat, go), base nouns (cat, house, book), base adjectives (big, small, happy)

EXAMPLES OF WORDS TO REJECT:
- Random strings: "asdfgh", "xyzabc", "qwerty"
- Nonsensical words: "flibber", "zoomzoom", "blahblah"
- Proper nouns: "John", "Paris", "Google", "iPhone"
- Non-base forms: "running", "cats", "bigger", "went"
- Misspellings: "helo" (instead of "hello"), "recieve" (instead of "receive")
- Word fragments/parts: "tion", "ing", "pre", "un", "ful", "ness", "ly", "ed", "er", "est"
- Partial words: "beauti" (from "beautiful"), "import" (from "important"), "comput" (from "computer")

EXAMPLES OF WORDS TO ACCEPT:
- Common nouns: "cat", "house", "book", "water"
- Base verbs: "run", "eat", "go", "think"
- Base adjectives: "big", "small", "happy", "difficult"

If the word IS valid, provide:
1. TRANSLATION: Chinese translations in traditional Chinese characters, separated by spaces (e.g., "說話 聊天 談論 交談")
2. DEFINITION_ZH: Chinese definition in traditional Chinese explaining what the word means (e.g., "大聲說出話語；與某人交談")
3. DEFINITION_EN: Clear English definition explaining what the word means (e.g., "to say words aloud; to speak to someone")
4. DIFFICULTY: Level from 1-10 based on word complexity and frequency:
   - 1-3: Very common, basic words (cat, run, big)
   - 4-6: Intermediate words (beautiful, important, develop)
   - 7-10: Advanced, complex, or rare words (sophisticated, phenomenon, ubiquitous)
5. PART_OF_SPEECH: The grammatical category of the word (noun, verb, adjective, adverb, preposition, conjunction, interjection, pronoun, determiner)
6. ROOT_WORD: The base form of the word (same as the input word since we only accept base forms)
7. EXAMPLES: 2-3 simple, clear English sentences that demonstrate the word's usage

For examples, create simple, clear English sentences that demonstrate the word's usage. Keep sentences short and easy to understand.

Word to analyze: "%s"

Respond in this exact JSON format:
{
  "translation": "Chinese translations separated by spaces (only if valid)",
  "definition_zh": "Chinese definition in traditional Chinese (only if valid)",
  "definition_en": "English definition explaining what the word means (only if valid)",
  "is_valid": true/false,
  "difficulty": 1-10 (only if valid, otherwise 0),
  "part_of_speech": "grammatical category (only if valid)",
  "root_word": "base form of the word (only if valid)",
  "examples": ["English example sentence 1", "English example sentence 2", "English example sentence 3"] (only if valid, otherwise empty array),
  "reason": "explanation if invalid (e.g., 'This is not a real English word', 'This is a proper noun', 'This is past tense of run', 'This is plural form of cat')"
}

Examples:
- "asdfgh" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is not a real English word - appears to be random characters"}
- "John" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is a proper noun (person's name)"}
- "ran" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is past tense of 'run'"}
- "cats" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is plural form of 'cat'"}
- "running" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is present participle of 'run'"}
- "tion" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is a word fragment/suffix, not a complete word"}
- "beauti" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is a partial word fragment from 'beautiful'"}
- "pre" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is a prefix, not a complete word"}
- "un" → {"translation": "", "definition_zh": "", "definition_en": "", "is_valid": false, "difficulty": 0, "examples": [], "reason": "This is a prefix, not a complete word"}
- "run" → {"translation": "跑 奔跑 經營 運行", "definition_zh": "快速移動雙腿；經營管理；運作執行", "definition_en": "to move quickly on foot; to manage or operate; to function", "is_valid": true, "difficulty": 2, "examples": ["I run every morning.", "She can run very fast.", "Let's run to the store."]}
- "cat" → {"translation": "貓 貓咪", "definition_zh": "一種小型家養哺乳動物，通常作為寵物飼養", "definition_en": "a small domesticated mammal, typically kept as a pet", "is_valid": true, "difficulty": 1, "examples": ["The cat is sleeping.", "I have a black cat.", "My cat likes fish."]}
- "talk" → {"translation": "說話 聊天 談論 交談", "definition_zh": "大聲說出話語；與某人進行對話或討論", "definition_en": "to say words aloud; to speak to someone in conversation", "is_valid": true, "difficulty": 2, "examples": ["Let's talk about it.", "I need to talk to you.", "They talk every day."]}
- "sophisticated" → {"translation": "複雜的 精密的 老練的 世故的", "definition_zh": "具有高度發展或複雜性；經驗豐富且有教養的", "definition_en": "having great knowledge or experience; complex and refined", "is_valid": true, "difficulty": 8, "examples": ["This is a sophisticated system.", "She has sophisticated taste.", "The technology is very sophisticated."]}`, word)

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
