package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"google-devjam-backend/utils/encrypt"
)

// JWTMiddleware validates JWT tokens from cookies and adds user info to context
func JWTMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get token from cookie
			cookie, err := c.Cookie("auth_token")
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Authentication cookie not found",
				})
			}

			// Validate token
			claims, err := encrypt.ValidateJWT(cookie.Value)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Invalid or expired token",
				})
			}

			// Add user info to context
			c.Set("user_id", claims.UserID)
			c.Set("user_email", claims.Email)

			return next(c)
		}
	}
}

// GetUserFromContext extracts user information from echo context
func GetUserFromContext(c echo.Context) (userID, email string) {
	userID, _ = c.Get("user_id").(string)
	email, _ = c.Get("user_email").(string)
	return userID, email
}
