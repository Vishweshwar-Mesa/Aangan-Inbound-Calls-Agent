import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/gemini.ts reads rubric.txt from disk at request time; Next's file
  // tracing only bundles files it can see imported, so this route needs an
  // explicit include or rubric.txt goes missing in the deployed function.
  outputFileTracingIncludes: {
    "/api/vani/call-ended/route": ["./rubric.txt"],
  },
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
