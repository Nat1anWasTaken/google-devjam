package model

import "time"

type User struct {
	ID        string    `json:"id" bson:"_id"`
	DisplayName  string    `json:"display_name"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}