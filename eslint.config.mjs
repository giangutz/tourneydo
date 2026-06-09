import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // All production logging must go through lib/logger (Pino) on the server,
      // or be removed from client components. console.* leaks PII in structured
      // log aggregators and violates the project's observability contract.
      "no-console": "error",
    },
  },
]);

export default eslintConfig;
