import { readFileSync } from 'node:fs';

/**
 * Loads .env.local into process.env for CLI scripts run via `npx vite-node`. Vite's own env loading
 * only exposes VITE_-prefixed keys (and only to import.meta.env, for the browser build) — server-only
 * keys like SUPABASE_URL or OPENAI_API_KEY never reach process.env on their own. An explicit shell
 * value always wins over the file, so `KEY=... npx vite-node ...` still overrides it.
 */
export function loadEnvLocal(fileUrl: URL = new URL('../.env.local', import.meta.url)): void {
  let contents: string;
  try {
    contents = readFileSync(fileUrl, 'utf-8');
  } catch {
    return; // No .env.local — nothing to load, rely on whatever's already in the shell environment.
  }

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
