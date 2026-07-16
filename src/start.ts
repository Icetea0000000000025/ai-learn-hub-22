import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Client-side middleware that attaches the current Supabase access token
 * to every server function invocation as an Authorization: Bearer header.
 * Server functions read it via getRequestHeader() to verify identity.
 */
const attachAuthMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      if (typeof window === "undefined") return next();
      const { supabase } = await import("./lib/supabase");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        return next({ headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (e) {
      // Fall through unauthenticated on any client-side error
    }
    return next();
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
  functionMiddleware: [attachAuthMiddleware],
}));
