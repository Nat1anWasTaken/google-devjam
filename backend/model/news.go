package model

import (
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

type News struct {
	ID         string    `json:"id" bson:"_id"`
	UserID     string    `json:"user_id" bson:"user_id"`
	Title      string    `json:"title" bson:"title"`
	Content    string    `json:"content" bson:"content"`
	Level      int       `json:"level" bson:"level"`
	Keywords   []string  `json:"keywords" bson:"keywords"`
	WordInNews []string  `json:"word_in_news" bson:"word_in_news"`
	Source     []string  `json:"source" bson:"source"`
	AudioURL   string    `json:"audio_url,omitempty" bson:"audio_url,omitempty"`
	AudioKey   string    `json:"audio_key,omitempty" bson:"audio_key,omitempty"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" bson:"updated_at"`
}

// UnmarshalBSON implements custom BSON unmarshaling for News
func (n *News) UnmarshalBSON(data []byte) error {
	// Define a temporary struct with Level as interface{} to handle both string and int
	type TempNews struct {
		ID         string      `bson:"_id"`
		UserID     string      `bson:"user_id"`
		Title      string      `bson:"title"`
		Content    string      `bson:"content"`
		Level      interface{} `bson:"level"`
		Keywords   []string    `bson:"keywords"`
		WordInNews []string    `bson:"word_in_news"`
		Source     []string    `bson:"source"`
		AudioURL   string      `bson:"audio_url,omitempty"`
		AudioKey   string      `bson:"audio_key,omitempty"`
		CreatedAt  time.Time   `bson:"created_at"`
		UpdatedAt  time.Time   `bson:"updated_at"`
	}

	var temp TempNews
	if err := bson.Unmarshal(data, &temp); err != nil {
		return err
	}

	// Copy all fields except Level
	n.ID = temp.ID
	n.UserID = temp.UserID
	n.Title = temp.Title
	n.Content = temp.Content
	n.Keywords = temp.Keywords
	n.WordInNews = temp.WordInNews
	n.Source = temp.Source
	n.AudioURL = temp.AudioURL
	n.AudioKey = temp.AudioKey
	n.CreatedAt = temp.CreatedAt
	n.UpdatedAt = temp.UpdatedAt

	// Handle Level conversion
	switch v := temp.Level.(type) {
	case int:
		n.Level = v
	case int32:
		n.Level = int(v)
	case int64:
		n.Level = int(v)
	case string:
		if level, err := strconv.Atoi(v); err == nil {
			n.Level = level
		} else {
			n.Level = 1 // Default to level 1 if conversion fails
		}
	default:
		n.Level = 1 // Default to level 1 for any other type
	}

	return nil
}
