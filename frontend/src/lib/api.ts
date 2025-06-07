import { LoginData } from "@/components/login-form";
import { RegisterData } from "@/components/register-form";

export const registerUser = async (userData: RegisterData) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "";
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
};

export const loginUser = async (userData: LoginData) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "";
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
    const error = new Error(errorData.message || "Failed to login");
    (error as any).fullResponse = errorData;
    throw error;
  }

  return await response.json();
};
