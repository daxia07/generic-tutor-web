import { redirect } from "next/navigation";

/**
 * /session/new — redirects to the session flow page.
 * The session flow page at /session/[sessionId] fetches a new session
 * from the API on mount. We use a placeholder "new" as the sessionId
 * since the actual session ID is generated server-side by the API.
 */
export default function NewSessionPage() {
  redirect("/session/new-session");
}
