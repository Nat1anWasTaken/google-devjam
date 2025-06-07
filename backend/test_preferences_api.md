# User Preferences API Test Guide

This guide shows how to test the User Preferences CRUD API endpoints.

## Prerequisites
- Server running on `http://localhost:8080`
- Valid JWT token for authentication
- User account created

## API Endpoints

### 1. Create User Preferences
```bash
curl -X POST http://localhost:8080/user/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "level": "intermediate",
    "interests": ["technology", "science", "travel"]
  }'
```

**Expected Response (201):**
```json
{
  "preferences": {
    "id": "1234567890123456789",
    "user_id": "1234567890123456788",
    "level": "intermediate",
    "interests": ["technology", "science", "travel"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Get User Preferences
```bash
curl -X GET http://localhost:8080/user/preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200):**
```json
{
  "preferences": {
    "id": "1234567890123456789",
    "user_id": "1234567890123456788",
    "level": "intermediate",
    "interests": ["technology", "science", "travel"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Update User Preferences
```bash
curl -X PUT http://localhost:8080/user/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "level": "advanced",
    "interests": ["technology", "science", "travel", "business"]
  }'
```

**Expected Response (200):**
```json
{
  "preferences": {
    "id": "1234567890123456789",
    "user_id": "1234567890123456788",
    "level": "advanced",
    "interests": ["technology", "science", "travel", "business"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:30:00Z"
  }
}
```

### 4. Add Interest
```bash
curl -X POST http://localhost:8080/user/preferences/interests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "interest": "music"
  }'
```

**Expected Response (200):**
```json
{
  "preferences": {
    "id": "1234567890123456789",
    "user_id": "1234567890123456788",
    "level": "advanced",
    "interests": ["technology", "science", "travel", "business", "music"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T12:30:00Z"
  }
}
```

### 5. Remove Interest
```bash
curl -X DELETE http://localhost:8080/user/preferences/interests/music \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200):**
```json
{
  "preferences": {
    "id": "1234567890123456789",
    "user_id": "1234567890123456788",
    "level": "advanced",
    "interests": ["technology", "science", "travel", "business"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T12:35:00Z"
  }
}
```

### 6. Delete User Preferences
```bash
curl -X DELETE http://localhost:8080/user/preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (200):**
```json
{
  "message": "User preferences deleted successfully"
}
```

## Error Cases

### 1. Invalid Level
```bash
curl -X POST http://localhost:8080/user/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "level": "expert",
    "interests": ["technology"]
  }'
```

**Expected Response (400):**
```json
{
  "error": "Level must be one of: beginner, intermediate, advanced"
}
```

### 2. Preferences Already Exist
```bash
# Try to create preferences when they already exist
curl -X POST http://localhost:8080/user/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "level": "beginner",
    "interests": ["technology"]
  }'
```

**Expected Response (409):**
```json
{
  "error": "User preferences already exist. Use PUT to update."
}
```

### 3. Preferences Not Found
```bash
# Try to get preferences when they don't exist
curl -X GET http://localhost:8080/user/preferences \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (404):**
```json
{
  "error": "User preferences not found"
}
```

### 4. Interest Already Exists
```bash
# Try to add an interest that already exists
curl -X POST http://localhost:8080/user/preferences/interests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "interest": "technology"
  }'
```

**Expected Response (409):**
```json
{
  "error": "Interest already exists"
}
```

### 5. Interest Not Found
```bash
# Try to remove an interest that doesn't exist
curl -X DELETE http://localhost:8080/user/preferences/interests/nonexistent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response (404):**
```json
{
  "error": "Interest not found"
}
```

## Test Flow

1. **Create preferences** with level "beginner" and interests ["technology", "science"]
2. **Get preferences** to verify creation
3. **Update preferences** to level "intermediate" and add "travel" interest
4. **Add interest** "music"
5. **Remove interest** "science"
6. **Get preferences** to verify final state
7. **Delete preferences** to clean up

## Database Collections

The API uses the following MongoDB collections:
- `user_preferences`: Stores user learning preferences

## Validation Rules

- **Level**: Must be one of "beginner", "intermediate", "advanced" (case-insensitive)
- **Interests**: Array of strings, empty strings are filtered out
- **Interest names**: Case-insensitive comparison for duplicates
- **Authentication**: All endpoints require valid JWT token 