import { LoginData } from "@/components/login-form";
import { RegisterData } from "@/components/register-form";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "";

export async function registerUser(userData: RegisterData): Promise<User> {
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
    const error = new Error(errorData.message || "Failed to register");
    (error as any).fullResponse = errorData;
    throw error;
  }

  return await response.json();
}
export async function loginUser(userData: LoginData): Promise<User> {
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
    throw new Error(errorData.message || "Failed to login");
  }

  return await response.json();
}

export async function getUser(): Promise<User | null> {
  const response = await fetch(`${baseUrl}/auth/me`, {
    credentials: "include",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null; // User not authenticated
    }
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch user");
  }

  // return await response.json();

  return {
    // Mock user data before backend is ready
    id: "Mock user",
    display_name: "Mock User",
    email: "",
    password: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
