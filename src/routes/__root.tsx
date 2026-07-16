import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { WebAvatar } from "@/components/web-avatar";
import { pushDebugLog } from "@/lib/debug";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Route Error:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20 text-left">
          <p className="text-xs font-mono text-destructive break-all whitespace-pre-wrap leading-relaxed">
            <strong>Error:</strong> {error.message || "Unknown Runtime Error"}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      {
        name: "description",
        content:
          "AI Course Creator is an AI-powered learning platform for creating and consuming online courses.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      {
        property: "og:description",
        content:
          "AI Course Creator is an AI-powered learning platform for creating and consuming online courses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lovable App" },
      {
        name: "twitter:description",
        content:
          "AI Course Creator is an AI-powered learning platform for creating and consuming online courses.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bf77e9ff-9198-4b07-af3c-872afb391e64/id-preview-68cce308--dbfc471c-2e3a-4397-887b-aec7338b4c07.lovable.app-1778143608267.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bf77e9ff-9198-4b07-af3c-872afb391e64/id-preview-68cce308--dbfc471c-2e3a-4397-887b-aec7338b4c07.lovable.app-1778143608267.png",
      },
      { name: "description", content: "AI Course Creator is an AI-powered learning platform for creating and consuming online courses." },
      { property: "og:description", content: "AI Course Creator is an AI-powered learning platform for creating and consuming online courses." },
      { name: "twitter:description", content: "AI Course Creator is an AI-powered learning platform for creating and consuming online courses." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a819fdf7-f01f-4b81-aa4b-2fee6c1b6fe0/id-preview-225aaa2c--dbfc471c-2e3a-4397-887b-aec7338b4c07.lovable.app-1781520233238.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a819fdf7-f01f-4b81-aa4b-2fee6c1b6fe0/id-preview-225aaa2c--dbfc471c-2e3a-4397-887b-aec7338b4c07.lovable.app-1781520233238.png" },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    pushDebugLog(`__root.tsx mounted`);

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      pushDebugLog(`window.beforeunload triggered`);
    };
    const onPageHide = (e: PageTransitionEvent) => {
      pushDebugLog(`window.pagehide triggered`);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      pushDebugLog(`window.pageshow triggered`);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      pushDebugLog(`__root.tsx unmounted`);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const router = useRouter();
  useEffect(() => {
    const unsubscribe = router.history.subscribe((newLocation: any) => {
      pushDebugLog(`TanStack Router location changed to: ${newLocation.location.href}`);
    });
    return () => unsubscribe();
  }, [router]);


  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Toaster />
        <WebAvatar />
      </I18nProvider>
    </QueryClientProvider>
  );
}
