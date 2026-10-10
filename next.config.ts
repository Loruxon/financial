import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components (+ Partial Prefetching) are a Next.js 16 experiment for
  // optimizing instant navigation. This whole app is cookie-gated and reads
  // in-memory mocks on every request — there is nothing to statically cache —
  // and in testing it exhibited a correctness bug: `notFound()` from a
  // per-user auth check was dropped on the real response while still firing
  // in the background prefetch/validation pass, letting a manager without a
  // section's permission reach that section's page. Left off until that's resolved.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
