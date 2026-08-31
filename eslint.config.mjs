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
    files: ["src/components/**/*.tsx", "src/components/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db/server",
              message:
                "Server-only Supabase client must not be imported in client components.",
            },
            {
              name: "src/lib/db/server",
              message:
                "Server-only Supabase client must not be imported in client components.",
            },
          ],
          patterns: [
            {
              group: ["@/lib/db/server*", "src/lib/db/server*"],
              message:
                "Server-only Supabase client must not be imported in client components.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
