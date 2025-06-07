"use client";

import { createAuthHeaders } from "./utils";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "";

interface ApiError extends Error {
  fullResponse?: unknown;
}

// Request types
type GetNewsParams = {
  page?: number;
  limit?: number;
  level?: "beginner" | "intermediate" | "advanced";
  search?: string;
};

// Response types
type GenerateNewsResponse = {
  all_news: News[];
};

type GetNewsResponse = {
  news: News[];
  total: number;
  page: number;
  limit: number;
};

type GetSingleNewsResponse = {
  news: News;
};

// Helper function to build query string
function buildQueryString(params: GetNewsParams): string {
  const searchParams = new URLSearchParams();

  if (params.page !== undefined) {
    searchParams.append("page", params.page.toString());
  }
  if (params.limit !== undefined) {
    searchParams.append("limit", params.limit.toString());
  }
  if (params.level !== undefined) {
    searchParams.append("level", params.level);
  }
  if (params.search !== undefined) {
    searchParams.append("search", params.search);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export async function generateNews(): Promise<GenerateNewsResponse> {
  const response = await fetch(`${baseUrl}/news/generate`, {
    credentials: "include",
    method: "POST",
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(
      errorData.error || "Failed to generate news"
    );
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function getNews(
  params?: GetNewsParams
): Promise<GetNewsResponse> {
  const queryString = params ? buildQueryString(params) : "";

  const response = await fetch(`${baseUrl}/news${queryString}`, {
    credentials: "include",
    method: "GET",
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to get news");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}

export async function getSingleNews(
  id: string
): Promise<GetSingleNewsResponse> {
  const response = await fetch(`${baseUrl}/news/${id}`, {
    credentials: "include",
    method: "GET",
    headers: createAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.error || "Failed to get news");
    error.fullResponse = errorData;
    throw error;
  }

  const responseData = await response.json();
  return responseData;
}
