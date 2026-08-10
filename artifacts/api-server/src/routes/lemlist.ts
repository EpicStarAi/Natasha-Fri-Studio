import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  saveToken,
  getValidToken,
  deleteToken,
  lemlistApiGet,
} from "../lib/lemlist";
import { db, lemlistTokensTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

// Rate limiter: max 10 OAuth authorize attempts per IP per 15 minutes.
const oauthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authorization attempts, please try again later." },
});

// In-memory store for pending OAuth state tokens (CSRF protection).
// Each entry expires after 10 minutes.
const pendingStates = new Map<string, number>();
const STATE_TTL_MS = 10 * 60 * 1000;

function generateState(): string {
  const state = crypto.randomBytes(24).toString("hex");
  pendingStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

function consumeState(state: string): boolean {
  const expiry = pendingStates.get(state);
  if (!expiry) return false;
  pendingStates.delete(state);
  if (Date.now() > expiry) return false;
  return true;
}

/**
 * GET /api/lemlist/oauth/authorize
 * Redirects the browser to Lemlist's OAuth consent screen.
 */
router.get("/lemlist/oauth/authorize", oauthRateLimit, (_req, res) => {
  const state = generateState();
  const url = buildAuthorizeUrl(state);
  res.redirect(302, url);
});

/**
 * GET /api/lemlist/oauth/callback
 * Lemlist redirects back here after the user grants or denies access.
 * Exchanges the authorization code for a token and stores it.
 */
router.get("/lemlist/oauth/callback", async (req, res) => {
  const frontendBase = process.env.FRONTEND_URL ?? "";

  const { code, state, error, error_description } = req.query as Record<string, string>;

  if (error) {
    const msg = error_description ?? error;
    res.redirect(302, `${frontendBase}/?lemlist_error=${encodeURIComponent(msg)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(302, `${frontendBase}/?lemlist_error=${encodeURIComponent("Missing code or state parameter")}`);
    return;
  }

  if (!consumeState(state)) {
    res.redirect(302, `${frontendBase}/?lemlist_error=${encodeURIComponent("Invalid or expired state — please try again")}`);
    return;
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    await saveToken(tokenData);
    res.redirect(302, `${frontendBase}/?lemlist_connected=true`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    res.redirect(302, `${frontendBase}/?lemlist_error=${encodeURIComponent(message)}`);
  }
});

/**
 * GET /api/lemlist/oauth/status
 * Returns whether a Lemlist token is stored and whether it is still valid.
 */
router.get("/lemlist/oauth/status", async (_req, res) => {
  const [row] = await db
    .select()
    .from(lemlistTokensTable)
    .orderBy(desc(lemlistTokensTable.createdAt))
    .limit(1);

  if (!row) {
    res.json({ connected: false });
    return;
  }

  const expired = row.expiresAt ? row.expiresAt.getTime() < Date.now() : false;
  res.json({
    connected: true,
    expired,
    scope: row.scope ?? null,
    connectedAt: row.createdAt.toISOString(),
  });
});

/**
 * DELETE /api/lemlist/oauth/disconnect
 * Deletes the stored Lemlist token (revoke local access).
 */
router.delete("/lemlist/oauth/disconnect", async (_req, res) => {
  await deleteToken();
  res.json({ disconnected: true });
});

/**
 * GET /api/lemlist/campaigns
 * Proxy: list all Lemlist campaigns using the stored OAuth token.
 */
router.get("/lemlist/campaigns", async (_req, res) => {
  const token = await getValidToken();
  if (!token) {
    res.status(401).json({ error: "Not connected to Lemlist — complete OAuth first" });
    return;
  }

  const data = await lemlistApiGet("/campaigns");
  res.json(data);
});

export default router;
