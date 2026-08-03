import { db, lemlistTokensTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const LEMLIST_AUTHORIZE_URL = "https://app.lemlist.com/oauth/authorize";
const LEMLIST_TOKEN_URL = "https://api.lemlist.com/api/oauth/token";
const LEMLIST_API_BASE = "https://api.lemlist.com/api";

function getClientId(): string {
  const id = process.env.LEMLIST_CLIENT_ID;
  if (!id) throw new Error("LEMLIST_CLIENT_ID env var is not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.LEMLIST_CLIENT_SECRET;
  if (!secret) throw new Error("LEMLIST_CLIENT_SECRET env var is not set");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.LEMLIST_REDIRECT_URI;
  if (!uri) throw new Error("LEMLIST_REDIRECT_URI env var is not set");
  return uri;
}

/** Build the Lemlist authorization URL to redirect the user to. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    state,
  });
  return `${LEMLIST_AUTHORIZE_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
}

/** Exchange an authorization code for an access token. */
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
  });

  const response = await fetch(LEMLIST_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Lemlist token exchange failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/** Refresh an expired access token using a refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getClientId(),
    client_secret: getClientSecret(),
  });

  const response = await fetch(LEMLIST_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Lemlist token refresh failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<TokenResponse>;
}

/** Persist a token response to the database (upsert: keep only the latest token). */
export async function saveToken(tokenData: TokenResponse): Promise<void> {
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  // Delete any existing token rows so there is always at most one record.
  await db.delete(lemlistTokensTable);

  await db.insert(lemlistTokensTable).values({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? null,
    tokenType: tokenData.token_type ?? "Bearer",
    expiresIn: tokenData.expires_in ?? null,
    expiresAt: expiresAt ?? undefined,
    scope: tokenData.scope ?? null,
  });
}

/** Load the stored token, refreshing it first if it is expired. */
export async function getValidToken(): Promise<string | null> {
  const [row] = await db
    .select()
    .from(lemlistTokensTable)
    .orderBy(desc(lemlistTokensTable.createdAt))
    .limit(1);

  if (!row) return null;

  // Check expiry — refresh if we have a refresh token and the token expires in < 60 s.
  const isExpiredSoon =
    row.expiresAt && row.expiresAt.getTime() - Date.now() < 60_000;

  if (isExpiredSoon && row.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(row.refreshToken);
      await saveToken(refreshed);
      return refreshed.access_token;
    } catch {
      // Refresh failed — return the (potentially expired) token and let the
      // caller decide how to handle the downstream error.
    }
  }

  return row.accessToken;
}

/** Delete all stored Lemlist tokens (disconnect). */
export async function deleteToken(): Promise<void> {
  await db.delete(lemlistTokensTable);
}

/** Make an authenticated GET request to the Lemlist API. */
export async function lemlistApiGet<T = unknown>(path: string): Promise<T> {
  const token = await getValidToken();
  if (!token) {
    throw new Error("No Lemlist token stored — complete OAuth first");
  }

  const response = await fetch(`${LEMLIST_API_BASE}${path}`, {
    headers: { Authorization: "Bearer " + token },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Lemlist API error on GET ${path} (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}
