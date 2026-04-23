# 01 — Configuration projet

**Module** : 01 — Configuration projet
**Version** : 2.1 (tag `v2.1-release`)

Fichiers de config racine : package.json, TypeScript, Next.js, PostCSS, ESLint.

---

## `package.json`

```json
{
  "name": "mcva-audit",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.80.0",
    "@base-ui/react": "^1.3.0",
    "@react-pdf/renderer": "^4.3.2",
    "@sparticuz/chromium": "^143.0.4",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.100.0",
    "cheerio": "^1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "inngest": "^4.0.4",
    "lucide-react": "^1.0.1",
    "next": "16.2.1",
    "puppeteer-core": "^24.40.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.8.0",
    "shadcn": "^4.1.0",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.19.37",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "typescript": "^5",
    "wawoff2": "^2.0.1"
  }
}

```


## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```


## `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize Chromium + Puppeteer so their binaries survive bundling
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {},

  // Force include Chromium brotli binaries in the serverless function
  outputFileTracingIncludes: {
    "/api/audit/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },

  // Allow external images if needed
  images: {
    remotePatterns: [],
  },

  // Ensure Inngest route is not cached
  async headers() {
    return [
      {
        source: "/api/inngest",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;

```


## `postcss.config.mjs`

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```


## `eslint.config.mjs`

```javascript
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
]);

export default eslintConfig;

```


## `.gitignore`

```typescript
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env
.env*.local
!.env.local.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

```

