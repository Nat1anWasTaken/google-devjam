package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"google-devjam-backend/utils/encrypt"
)

// JWTMiddleware validates JWT tokens from Authorization header and adds user info to context
func JWTMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Get token from Authorization header
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Authorization header is required",
				})
			}

			// Check if it starts with "Bearer "
			const bearerPrefix = "Bearer "
			if len(authHeader) < len(bearerPrefix) || authHeader[:len(bearerPrefix)] != bearerPrefix {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Authorization header must start with 'Bearer '",
				})
			}

			// Extract token
			token := authHeader[len(bearerPrefix):]
			if token == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Bearer token is required",
				})
			}

			// Validate token
			claims, err := encrypt.ValidateJWT(token)
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
