"use client";
import { createAuthHeaders } from "./utils";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "";

interface ApiError extends Error {
  fullResponse?: unknown;
}

// Request types
type CreatePreferencesRequest = {
  level: number; // 1-10, required
  interests?: string[];
};

type UpdatePreferencesRequest = {
  level?: number; // 1-10, optional
  interests?: string[];
};

type AddInterestRequest = {
  interest: string;
};

// Response types
type PreferencesResponse = {
  preferences: UserPreferences;
};

type SuccessResponse = {
  message: string;
};

export type GetUserResponse = {
  user: User;
};

export async function getUserPreferences(): Promise<PreferencesResponse> {
  const response = await fetch(`${baseUrl}/user/preferences`, {
    credentials: "include",
    method: "GET",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to get user preferences");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function createUserPreferences(data: CreatePreferencesRequest): Promise<PreferencesResponse> {
  const response = await fetch(`${baseUrl}/user/preferences`, {
    credentials: "include",
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to create user preferences");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function updateUserPreferences(data: UpdatePreferencesRequest): Promise<PreferencesResponse> {
  const response = await fetch(`${baseUrl}/user/preferences`, {
    credentials: "include",
    method: "PUT",
    headers: createAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to update user preferences");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function deleteUserPreferences(): Promise<SuccessResponse> {
  const response = await fetch(`${baseUrl}/user/preferences`, {
    credentials: "include",
    method: "DELETE",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to delete user preferences");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function addInterest(interest: string): Promise<PreferencesResponse> {
  const data: AddInterestRequest = { interest };

  const response = await fetch(`${baseUrl}/user/preferences/interests`, {
    credentials: "include",
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to add interest");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function removeInterest(interest: string): Promise<PreferencesResponse> {
  // URL encode the interest parameter to handle special characters
  const encodedInterest = encodeURIComponent(interest);

  const response = await fetch(`${baseUrl}/user/preferences/interests/${encodedInterest}`, {
    credentials: "include",
    method: "DELETE",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to remove interest");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function getUser(): Promise<User | null> {
  const response = await fetch(`${baseUrl}/user/me`, {
    credentials: "include",
    method: "GET",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.log("getUser: 401 Unauthorized - user not authenticated");
      return null; // User not authenticated
    }

    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      console.error("getUser: Failed to parse error response:", parseError);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const error: ApiError = new Error(errorData.message || errorData.error || "Failed to fetch user");
    error.fullResponse = errorData;
    throw error;
  }

  try {
    const responseData = await response.json();
    console.log("getUser: Successfully fetched user data");
    return (responseData as GetUserResponse).user as User;
  } catch (parseError) {
    console.error("getUser: Failed to parse success response:", parseError);
    throw new Error("Invalid response format from server");
  }
}
