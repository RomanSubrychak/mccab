const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type AuthUser = {
  id: number;
  email: string;
  name: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export class ApiError extends Error {}

export async function login(email: string, password: string): Promise<LoginResponse> {
  if (!API_URL) {
    throw new ApiError("EXPO_PUBLIC_API_URL is not set. Check mccab_mobile/.env.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError("Incorrect email or password.");
    }
    if (response.status === 404) {
      throw new ApiError("Login isn't available on the server yet.");
    }
    throw new ApiError(data?.error ?? `Something went wrong (${response.status}). Try again.`);
  }

  return data as LoginResponse;
}
