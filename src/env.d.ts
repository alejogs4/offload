/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    APP_PASSWORD?: string;
    AI_PROVIDER?: string;
    GEMINI_API_KEY?: string;
    OPENAI_API_KEY?: string;
    TURSO_DATABASE_URL?: string;
    TURSO_AUTH_TOKEN?: string;
    DATABASE_URL?: string;
  }
}
