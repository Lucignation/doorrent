import {
  buildOfflineCacheKey,
  clearOfflineMutationQueue,
  flushOfflineMutations,
  getOfflineCachedResponse,
  queueOfflineMutation,
  setOfflineCachedResponse,
} from "./offline-store";
import { getSafeWorkspaceHostFromWindow } from "./frontend-security";

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

const defaultApiOrigin =
  process.env.NODE_ENV === "production"
    ? "https://api.usedoorrent.com"
    : "http://localhost:4000";

const configuredBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiOrigin;

export const API_BASE_URL = normalizeBaseUrl(configuredBaseUrl);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");
export const BROWSER_API_BASE_PATH =
  process.env.NODE_ENV === "production" ? "/api/v1" : API_BASE_URL;
export const SWAGGER_URL = `${API_ORIGIN}/docs`;

export function getApiRequestBaseUrl() {
  return typeof window === "undefined" ? API_BASE_URL : BROWSER_API_BASE_PATH;
}

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

function mergeRequestHeaders(headers?: HeadersInit, body?: unknown, token?: string) {
  const requestHeaders: Record<string, string> = {};

  if (body) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      requestHeaders[key] = value;
    });
  } else if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value === "string") {
        requestHeaders[key] = value;
      }
    });
  }

  const safeWorkspaceHost = getSafeWorkspaceHostFromWindow();

  if (
    safeWorkspaceHost &&
    !Object.keys(requestHeaders).some((key) => key.toLowerCase() === "x-workspace-host")
  ) {
    requestHeaders["x-workspace-host"] = safeWorkspaceHost;
  }

  return requestHeaders;
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
  const requestHeaders = mergeRequestHeaders(headers, body, token);
  const requestBody =
    body === undefined
      ? undefined
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  const cacheEnabled = offline?.cache ?? method === "GET";
  const cacheKey = buildOfflineCacheKey(path, token);
  const requestBaseUrl = getApiRequestBaseUrl();

  try {
    const response = await fetch(`${requestBaseUrl}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
      cache: token || method !== "GET" ? "no-store" : "default",
      credentials: "omit",
      mode: "cors",
      redirect: "error",
      referrerPolicy: "strict-origin-when-cross-origin",
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

    void flushOfflineMutations(requestBaseUrl);

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
