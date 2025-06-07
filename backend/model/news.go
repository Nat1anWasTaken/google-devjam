package model

import (
	"time"
)

type News struct {
	ID         string    `json:"id" bson:"_id"`
	Title      string    `json:"title" bson:"title"`
	Content    string    `json:"content" bson:"content"`
	Level      string    `json:"level" bson:"level"`
	Keywords   []string  `json:"keywords" bson:"keywords"`
	WordInNews []string  `json:"word_in_news" bson:"word_in_news"`
	Source     []string  `json:"source" bson:"source"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" bson:"updated_at"`
}
