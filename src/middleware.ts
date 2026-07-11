import { middleware as authMiddleware } from "@mingli/auth/middleware";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

export { authMiddleware as middleware };
