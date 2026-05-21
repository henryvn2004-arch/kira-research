// ============================================================
// KIRA RESEARCH — ESLint flat config
//
// Minimal QC gate. Deliberately just two rules so CI failures
// always have an obvious fix:
//   • no-undef        — catches typos, missing imports, removed globals
//   • no-unused-vars  — catches dead code, dangling helpers
//
// We don't run a "recommended" preset — codebase is plain JS without
// a bundler, and stylistic rules would create churn without catching
// real bugs. Tighten this later only if a class of bugs slips past.
// ============================================================

import globals from "globals";

const unusedVarsRule = ["error", {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  caughtErrorsIgnorePattern: "^_"
}];

export default [
  // public/ — browser scripts loaded directly via <script src=…>.
  // IIFE pattern, not modules.
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        // Provided by other public/ scripts or the Supabase CDN bundle.
        supabase: "readonly",
        kiraAuth: "readonly",
        db: "readonly",
        kira: "writable"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": unusedVarsRule
    }
  },

  // api/ — Vercel serverless functions. ESM, Node runtime, global fetch.
  {
    files: ["api/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        fetch: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": unusedVarsRule
    }
  },

  // tests/ — Playwright specs. Node-side, but `page.evaluate(() => …)`
  // callbacks run in the browser context. ESLint can't tell statically,
  // so we declare the browser globals it'll need to reference there.
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        document: "readonly",
        window: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": unusedVarsRule
    }
  },

  {
    ignores: [
      "node_modules/**",
      ".vercel/**",
      "playwright-report/**",
      "test-results/**"
    ]
  }
];
