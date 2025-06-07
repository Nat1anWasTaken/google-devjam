package auth

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"google-devjam-backend/utils/encrypt"
)

func Logout(c echo.Context) error {
	// Get token from cookie
	cookie, err := c.Cookie("auth_token")
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Authentication cookie not found",
		})
	}

	// Validate token
	_, err = encrypt.ValidateJWT(cookie.Value)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Invalid or expired token",
		})
	}

	// Clear the auth cookie
	clearCookie := &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1, // Expire immediately
	}
	c.SetCookie(clearCookie)

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Logout successful",
	})
}
