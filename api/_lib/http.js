import { ConfigError } from "./config-model.js";
import { createSupabaseContext } from "./supabase-store.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function setHeaders(res, headers) {
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
}

export function sendJson(res, statusCode, payload) {
  setHeaders(res, CORS_HEADERS);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(statusCode).json(payload);
}

async function readStream(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJson(req) {
  if (!req.body) {
    const raw = await readStream(req);
    return raw ? JSON.parse(raw) : {};
  }
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }
  return req.body;
}

export function createHandler(handler) {
  return async function route(req, res) {
    setHeaders(res, CORS_HEADERS);

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    try {
      const body = req.method === "POST" ? await readJson(req) : {};
      let context;
      const payload = await handler({
        req,
        body,
        query: req.query || {},
        get context() {
          context ||= createSupabaseContext();
          return context;
        },
      });
      sendJson(res, 200, payload);
    } catch (error) {
      const statusCode = error instanceof ConfigError ? error.statusCode : 500;
      const message =
        error instanceof ConfigError
          ? error.message
          : "The central config API could not complete the request.";
      sendJson(res, statusCode, { error: message });
    }
  };
}
