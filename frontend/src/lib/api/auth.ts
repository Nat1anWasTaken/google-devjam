"use client";

import { LoginData } from "@/components/login-form";
import { RegisterData } from "@/components/register-form";

export const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "";

interface ApiError extends Error {
  fullResponse?: unknown;
}

type LoginResponse = User & {
  token: string;
};

type RegisterResponse = LoginResponse;

// Token management utilities
export function getStoredToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

export function storeToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token);
  }
}

export function removeStoredToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

export function logout(): void {
  removeStoredToken();
  // You can also call a backend logout endpoint here if needed
}

export async function registerUser(
  userData: RegisterData
): Promise<RegisterResponse> {
  const response = await fetch(`${baseUrl}/auth/register`, {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      display_name: userData.displayName,
      email: userData.email,
      password: userData.password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(
      errorData.message || "Failed to register"
    );
    error.fullResponse = errorData;
    throw error;
  }

  const data = await response.json();
  return data;
}

export async function loginUser(userData: LoginData): Promise<LoginResponse> {
  const response = await fetch(`${baseUrl}/auth/login`, {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: userData.email,
      password: userData.password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error: ApiError = new Error(errorData.message || "Failed to login");
    error.fullResponse = errorData;
    throw error;
  }

  const data = await response.json();
  return data;
}
