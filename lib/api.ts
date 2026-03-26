import {
  buildOfflineCacheKey,
  clearOfflineMutationQueue,
  flushOfflineMutations,
  getOfflineCachedResponse,
  queueOfflineMutation,
  setOfflineCachedResponse,
} from "./offline-store";

export interface ApiSuccessEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  issues?: Array<{ message?: string }>;
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
  offline?: {
    cache?: boolean;
    queue?: boolean;
    dedupeKey?: string;
    invalidatePaths?: string[];
  };
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
  { method = "GET", token, body, headers, offline }: ApiRequestOptions = {},
) {
  const requestHeaders = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };
  const requestBody = body ? JSON.stringify(body) : undefined;
  const cacheEnabled = offline?.cache ?? method === "GET";
  const cacheKey = buildOfflineCacheKey(path, token);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });

    const payload = (await response.json().catch(() => null)) as ApiSuccessEnvelope<T> | null;
    const issuesMessage = payload?.issues?.find((issue) => issue.message)?.message;
    const message =
      payload?.message ?? issuesMessage ?? "We could not complete your request.";

    if (!response.ok) {
      throw new ApiError(message, response.status);
    }

    const result = {
      data: payload?.data as T,
      message,
    };

    if (cacheEnabled) {
      await setOfflineCachedResponse(cacheKey, result);
    }

    void flushOfflineMutations(API_BASE_URL);

    return result;
  } catch (error) {
    if (method === "GET" && cacheEnabled) {
      const cached = await getOfflineCachedResponse<{ data: T; message: string }>(cacheKey);

      if (cached) {
        return {
          ...cached,
          offline: true as const,
        };
      }
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (method !== "GET" && offline?.queue) {
      await queueOfflineMutation({
        method,
        path,
        body,
        headers: requestHeaders,
        token,
        dedupeKey: offline.dedupeKey,
        invalidatePaths: offline.invalidatePaths,
      });

      return {
        data: (body as T) ?? (null as T),
        message: "Saved offline. We will sync your latest change once the network is back.",
        offline: true as const,
      };
    }

    throw new ApiError("Network error. Please check your connection.", 0);
  }
}

export { clearOfflineMutationQueue };
