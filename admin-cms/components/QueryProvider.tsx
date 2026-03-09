"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const isDev = process.env.NODE_ENV === "development";

// Lazy-load devtools only in development to avoid memory overhead in production
const ReactQueryDevtools = isDev
  ? React.lazy(() =>
    import("@tanstack/react-query-devtools").then((mod) => ({
      default: mod.ReactQueryDevtools,
    }))
  )
  : () => null;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 15, // 15 minutes
          gcTime: 1000 * 60 * 30,   // 30 minutes — garbage-collect inactive cache entries
          retry: 1,
        },
        mutations: {
          retry: 0,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDev && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  );
}
