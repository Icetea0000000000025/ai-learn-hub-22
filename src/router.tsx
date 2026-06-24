import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6 text-center">
          <div className="mb-6 h-20 w-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <span className="text-4xl text-indigo-500 font-black">?</span>
          </div>
          <h1 className="text-6xl font-black mb-4 tracking-tighter">404</h1>
          <p className="text-zinc-400 mb-8 font-medium max-w-xs">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          <a
            href="/"
            className="px-8 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center justify-center font-bold shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
          >
            Back to Home
          </a>
        </div>
      );
    },
  });

  return router;
};
