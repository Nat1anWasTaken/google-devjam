package model

import "time"

type User struct {
	ID          string    `json:"id" bson:"_id"`
	DisplayName string    `json:"display_name"`
	Email       string    `json:"email"`
	Password    string    `json:"password"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UserPreferences struct {
	ID        string    `json:"id" bson:"_id"`
	UserID    string    `json:"user_id" bson:"user_id"`
	Level     int       `json:"level" bson:"level"`
	Interests []string  `json:"interests" bson:"interests"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}
