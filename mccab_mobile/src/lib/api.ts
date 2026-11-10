import type {
  Campus,
  ChatPreference,
  PhoneVisibility,
  RideRole,
  Weekday,
} from "@/constants/profile-options";

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

export type Vehicle = {
  make: string;
  model: string;
  year: number | null;
  color: string;
  plate: string;
  seats: number;
};

// The signed-in user's profile, as returned by GET /me.
export type Profile = AuthUser & {
  createdAt: string;
  phone: string | null;
  bio: string | null;
  major: string | null;
  graduationYear: number | null;
  // null until the student picks one after accepting the terms.
  rideRole: RideRole | null;
  // When the student agreed to the Terms and Conditions, or null.
  termsAcceptedAt: string | null;
  campus: Campus | null;
  homeArea: string | null;
  rideDays: Weekday[];
  arriveBy: string | null;
  leaveAt: string | null;
  pricePerSeatCents: number | null;
  chatPreference: ChatPreference;
  musicOk: boolean;
  smokingOk: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  phoneVisibility: PhoneVisibility;
  notifyRideUpdates: boolean;
  notifyMessages: boolean;
  notifyNews: boolean;
  vehicle: Vehicle | null;
  stats: {
    ratingAverage: number | null;
    ratingCount: number;
    ridesGiven: number;
    ridesTaken: number;
  };
};

// The profile fields PATCH /me accepts. Send only the ones that change.
export type ProfileChanges = Partial<
  Omit<Profile, "id" | "email" | "createdAt" | "termsAcceptedAt" | "vehicle" | "stats" | "rideRole">
> & {
  // A role can be chosen or changed, but not cleared.
  rideRole?: RideRole;
};

export type VehicleInput = Vehicle;

export class ApiError extends Error {
  readonly status?: number;
  // The form field the server blamed, e.g. "phone". Set for 400 responses that name one.
  readonly field?: string;

  constructor(message: string, status?: number, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  // Login token for routes that need a signed-in user.
  token?: string;
  // Message to show for specific HTTP status codes.
  byStatus?: Record<number, string>;
  // Feature name used when the server doesn't have the endpoint yet (404).
  feature: string;
};

async function request<T>(path: string, options: RequestOptions): Promise<T> {
  if (!API_URL) {
    throw new ApiError("EXPO_PUBLIC_API_URL is not set. Check mccab_mobile/.env.");
  }

  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.");
  }

  // 204 No Content has no body.
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const statusMessage = options.byStatus?.[response.status];
    if (statusMessage) {
      throw new ApiError(statusMessage, response.status);
    }
    if (response.status === 404) {
      throw new ApiError(`${options.feature} isn't available on the server yet.`, response.status);
    }
    throw new ApiError(
      data?.error ?? `Something went wrong (${response.status}). Try again.`,
      response.status,
      typeof data?.field === "string" ? data.field : undefined,
    );
  }

  return data as T;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    feature: "Sign in",
    byStatus: { 401: "Incorrect email or password." },
  });
}

export function register(name: string, email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/register", {
    method: "POST",
    body: { name, email, password },
    feature: "Sign up",
    byStatus: { 409: "An account with this email already exists." },
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request<unknown>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    feature: "Password reset",
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await request<unknown>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
    feature: "Password reset",
  });
}

// ---- Signed-in routes. A 401 means the token is no longer valid: sign out. ----

export async function getProfile(token: string): Promise<Profile> {
  const data = await request<{ profile: Profile }>("/me", { token, feature: "Profile" });
  return data.profile;
}

export async function updateProfile(token: string, changes: ProfileChanges): Promise<Profile> {
  const data = await request<{ profile: Profile }>("/me", {
    method: "PATCH",
    body: changes,
    token,
    feature: "Profile",
  });
  return data.profile;
}

export async function acceptTerms(token: string): Promise<Profile> {
  const data = await request<{ profile: Profile }>("/me/terms", {
    method: "POST",
    token,
    feature: "Terms",
  });
  return data.profile;
}

export async function saveVehicle(token: string, vehicle: VehicleInput): Promise<Profile> {
  const data = await request<{ profile: Profile }>("/me/vehicle", {
    method: "PUT",
    body: vehicle,
    token,
    feature: "My car",
  });
  return data.profile;
}

export async function removeVehicle(token: string): Promise<Profile> {
  const data = await request<{ profile: Profile }>("/me/vehicle", {
    method: "DELETE",
    token,
    feature: "My car",
  });
  return data.profile;
}

// Returns a new login token: changing the password signs out every other device.
export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const data = await request<{ token: string }>("/me/password", {
    method: "POST",
    body: { currentPassword, newPassword },
    token,
    feature: "Change password",
  });
  return data.token;
}

export async function deleteAccount(token: string, password: string): Promise<void> {
  await request<null>("/me", {
    method: "DELETE",
    body: { password },
    token,
    feature: "Delete account",
  });
}
