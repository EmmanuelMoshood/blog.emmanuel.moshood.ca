/**
 * Minimal Cloudflare Pages Functions types, so the project needs no
 * @cloudflare/workers-types dependency. They cover what these functions use
 * and match the shape of the official `PagesFunction` / `EventContext`.
 *
 * Pages only creates routes for files that export `onRequest*`, so this module
 * (and everything in `_lib/`) is never served.
 */
export interface EventContext<Env, Params extends string = string, Data = Record<string, unknown>> {
  request: Request;
  env: Env;
  params: Record<Params, string | string[]>;
  data: Data;
  functionPath: string;
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
}

export type PagesFunction<Env = unknown, Params extends string = string, Data = Record<string, unknown>> = (
  context: EventContext<Env, Params, Data>,
) => Response | Promise<Response>;
