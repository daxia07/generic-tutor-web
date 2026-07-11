const AUTH_USER = "ming";
const AUTH_PASS = "ping";
const AUTH_SECRET = process.env.AUTH_SECRET || "tutor-local-dev";

export const COOKIE_NAME = "mingli_auth";
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

async function computeToken(): Promise<string> {
  const data = new TextEncoder().encode(
    `${AUTH_USER}:${AUTH_PASS}:${AUTH_SECRET}`
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateAuthTokenEdge(token: string): Promise<boolean> {
  const expected = await computeToken();
  return token === expected;
}
