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

type ErrorMessages = {
  // Message to show for specific HTTP status codes.
  byStatus?: Record<number, string>;
  // Feature name used when the server doesn't have the endpoint yet (404).
  feature: string;
};

async function postJson<T>(path: string, body: unknown, messages: ErrorMessages): Promise<T> {
  if (!API_URL) {
    throw new ApiError("EXPO_PUBLIC_API_URL is not set. Check mccab_mobile/.env.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const statusMessage = messages.byStatus?.[response.status];
    if (statusMessage) {
      throw new ApiError(statusMessage);
    }
    if (response.status === 404) {
      throw new ApiError(`${messages.feature} isn't available on the server yet.`);
    }
    throw new ApiError(data?.error ?? `Something went wrong (${response.status}). Try again.`);
  }

  return data as T;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>(
    "/auth/login",
    { email, password },
    { feature: "Sign in", byStatus: { 401: "Incorrect email or password." } },
  );
}

export function register(name: string, email: string, password: string): Promise<LoginResponse> {
  return postJson<LoginResponse>(
    "/auth/register",
    { name, email, password },
    { feature: "Sign up", byStatus: { 409: "An account with this email already exists." } },
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  await postJson<unknown>("/auth/forgot-password", { email }, { feature: "Password reset" });
}
