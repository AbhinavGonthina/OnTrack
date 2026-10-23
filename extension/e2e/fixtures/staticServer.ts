import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

/**
 * Serves the fixture pages over http so the extension sees a real origin, a
 * real tab and a real URL. Loading them as file:// would not do: the manifest
 * has no file access, and canonicalization and the duplicate lookup both care
 * about the URL being a normal http one.
 */

const PAGES = resolve(import.meta.dirname, "pages");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export interface StaticServer {
  /** e.g. http://127.0.0.1:54321 */
  origin: string;
  url(page: string): string;
  close(): Promise<void>;
}

export async function startStaticServer(): Promise<StaticServer> {
  const server: Server = createServer(async (request, response) => {
    const path = (request.url ?? "/").split("?")[0] ?? "/";
    const name = path === "/" ? "/greenhouse-style.html" : path;

    try {
      // Only ever serves from the fixtures directory.
      const file = resolve(PAGES, `.${name}`);
      if (!file.startsWith(PAGES)) {
        response.writeHead(403).end("forbidden");
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, {
        "Content-Type": TYPES[extname(file)] ?? "text/plain; charset=utf-8",
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<!doctype html><title>Not found</title>");
    }
  });

  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("static server did not bind to a port");
  }
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    origin,
    url: (page: string) => `${origin}/${page.replace(/^\//, "")}`,
    close: () =>
      new Promise<void>((done, fail) =>
        server.close((error) => (error ? fail(error) : done())),
      ),
  };
}
