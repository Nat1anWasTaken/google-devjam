"use client";

import { createAuthHeaders } from "./utils";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "";

interface ApiError extends Error {
  fullResponse?: unknown;
}

// Request types
type CreateWordRequest = {
  word: string;
};

type UpdateWordRequest = {
  difficulty?: number;
  part_of_speech?: string;
  examples?: string[];
  root_word?: string;
};

type LearnWordRequest = {
  correct: boolean;
};

type AddExampleRequest = {
  sentence: string;
};

type GetWordsParams = {
  page?: number;
  limit?: number;
  search?: string;
  difficulty?: number;
};

// Response types
type GetWordsResponse = {
  words: WordWithUserData[];
  total: number;
  page: number;
  limit: number;
};

type WordResponse = {
  word: Word;
};

type WordWithUserDataResponse = {
  word: WordWithUserData;
};

type LearnWordResponse = {
  message: string;
  learn_count: number;
  fluency: number;
};

type SuccessResponse = {
  message: string;
};

type AddExampleResponse = {
  message: string;
  example: WordExample;
};

type RecommendResponse = {
  words: WordWithUserData[];
};

// Helper function to build query string
function buildQueryString(params: GetWordsParams): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.append("page", params.page.toString());
  }
  if (params.limit !== undefined) {
    searchParams.append("limit", params.limit.toString());
  }
  if (params.search !== undefined) {
    searchParams.append("search", params.search);
  }
  if (params.difficulty !== undefined) {
    searchParams.append("difficulty", params.difficulty.toString());
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function createWord(data: CreateWordRequest): Promise<WordResponse> {
  const response = await fetch(`${baseUrl}/vocabulary`, {
    credentials: "include",
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to create word");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function getWords(params?: GetWordsParams): Promise<GetWordsResponse> {
  const queryString = params ? buildQueryString(params) : "";

  const response = await fetch(`${baseUrl}/vocabulary${queryString}`, {
    credentials: "include",
    method: "GET",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to get words");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function getWord(id: string): Promise<WordWithUserDataResponse> {
  const response = await fetch(`${baseUrl}/vocabulary/${id}`, {
    credentials: "include",
    method: "GET",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to get word");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function updateWord(id: string, data: UpdateWordRequest): Promise<SuccessResponse> {
  const response = await fetch(`${baseUrl}/vocabulary/${id}`, {
    credentials: "include",
    method: "PUT",
    headers: createAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to update word");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function deleteWord(id: string): Promise<SuccessResponse> {
  const response = await fetch(`${baseUrl}/vocabulary/${id}`, {
    credentials: "include",
    method: "DELETE",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to delete word");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function learnWord(id: string, data: LearnWordRequest): Promise<LearnWordResponse> {
  const response = await fetch(`${baseUrl}/vocabulary/${id}/learn`, {
    credentials: "include",
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to update learning progress");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function addExample(wordId: string, data: AddExampleRequest): Promise<AddExampleResponse> {
  const response = await fetch(`${baseUrl}/vocabulary/${wordId}/examples`, {
    credentials: "include",
    method: "POST",
    headers: createAuthHeaders(),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to add example");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function deleteExample(wordId: string, exampleId: string): Promise<SuccessResponse> {
  const response = await fetch(`${baseUrl}/vocabulary/${wordId}/examples/${exampleId}`, {
    credentials: "include",
    method: "DELETE",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to delete example");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function getRecommendations(): Promise<RecommendResponse> {
  const response = await fetch(`${baseUrl}/vocabulary/recommend`, {
    credentials: "include",
    method: "GET",
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to get recommendations");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}
