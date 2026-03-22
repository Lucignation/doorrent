export interface ApiSuccessEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://doorrent-api.onrender.com";

export const API_BASE_URL = normalizeBaseUrl(configuredBaseUrl);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");
export const SWAGGER_URL = `${API_ORIGIN}/docs`;

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string;
  body?: unknown;
  headers?: HeadersInit;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  { method = "GET", token, body, headers }: ApiRequestOptions = {},
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccessEnvelope<T>
    | null;

  if (!response.ok || !payload?.data) {
    throw new ApiError(
      payload?.message ?? "We could not complete your request.",
      response.status,
    );
  }

  return {
    data: payload.data,
    message: payload.message,
  };
}
