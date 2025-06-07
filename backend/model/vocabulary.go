package model

import "time"

type Word struct {
	ID         string    `json:"id" bson:"_id"`
	Word       string    `json:"word" bson:"word"`
	Definition string    `json:"definition" bson:"definition"`
	Difficulty int       `json:"difficulty" bson:"difficulty"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" bson:"updated_at"`
}

type UserWord struct {
	ID         string    `json:"id" bson:"_id"`
	UserID     string    `json:"user_id" bson:"user_id"`
	WordID     string    `json:"word_id" bson:"word_id"`
	LearnCount int       `json:"learn_count" bson:"learn_count"`
	Fluency    int       `json:"fluency" bson:"fluency"`
	CreatedAt  time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" bson:"updated_at"`
}
