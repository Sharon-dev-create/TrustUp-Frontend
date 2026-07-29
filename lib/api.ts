import { getAccessToken, clearTokens } from './auth-storage';

/**
 * Base URL for the backend API, read from the public Expo env variable.
 * See `.env.example` for the expected value (already includes `/api/v1`).
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Some TrustUp endpoints wrap payloads as `{ success, data, message }`.
 * Returns the inner `data` when present; otherwise the body as-is.
 */
export const unwrapApiData = <T>(body: unknown): T => {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
};

/**
 * Registered by AuthContext on mount so apiFetch can trigger a sign-out when
 * the backend returns 401, without apiFetch importing the context directly
 * (that would create a circular import: context -> api -> context).
 */
let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

/**
 * Thin fetch wrapper that prefixes {@link API_BASE_URL}, attaches the stored
 * Bearer token, and parses JSON responses.
 *
 * @throws {ApiError} when the response status is not in the 2xx range.
 */
export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!API_BASE_URL) {
    throw new ApiError(0, 'EXPO_PUBLIC_API_URL is not configured');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    await clearTokens();
    unauthorizedHandler?.();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') {
        message = body.message;
      } else if (Array.isArray(body?.message)) {
        message = body.message.join(', ');
      }
    } catch {
      // Non-JSON error body; keep the default message.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  return unwrapApiData<T>(json);
};

/**
 * Variant of {@link apiFetch} for multipart/form-data bodies (e.g. register
 * with an optional profile image). Does not set Content-Type — fetch/RN sets
 * the multipart boundary automatically when the body is a FormData instance.
 */
export const apiFetchForm = async <T>(path: string, formData: FormData): Promise<T> => {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  if (!API_BASE_URL) {
    throw new ApiError(0, 'EXPO_PUBLIC_API_URL is not configured');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    await clearTokens();
    unauthorizedHandler?.();
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.message === 'string') message = body.message;
      else if (Array.isArray(body?.message)) message = body.message.join(', ');
    } catch {
      // keep default message
    }
    throw new ApiError(response.status, message);
  }

  const json = await response.json();
  return unwrapApiData<T>(json);
};