import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Minimal structural types for what Vercel actually passes serverless functions — avoids taking a
 * dependency on the full @vercel/node package (which pulls in a chain of vulnerable transitive
 * dev-tooling packages, e.g. an outdated `undici`/`path-to-regexp`, just for these two type shapes)
 * just for typing function parameters. The real runtime objects are plain Node IncomingMessage/
 * ServerResponse with `body`/`query` parsed on and `status()`/`json()` helpers added, which is
 * exactly what's declared here.
 */
export interface VercelRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[]>;
}

export interface VercelResponse extends ServerResponse {
  status(statusCode: number): VercelResponse;
  json(body: unknown): VercelResponse;
}
