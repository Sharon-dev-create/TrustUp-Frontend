/**
 * Minimal access-token holder for the API client's Authorization header.
 *
 * @todo Back this with a real secure store once the auth flow lands (the
 *   auth PRs — nonce/verify → JWT — are not merged yet). `expo-secure-store`
 *   is the intended backend on device; keep the async signature so swapping in
 *   persistent storage requires no changes at call sites.
 */
import { getAccessToken, setTokens, clearTokens } from './auth-storage';

export const getToken = getAccessToken;
export const setToken = (token: string): Promise<void> => setTokens(token);
export const clearToken = clearTokens;
