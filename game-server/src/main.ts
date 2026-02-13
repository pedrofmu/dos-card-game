import { Application, type Context, type Next } from "@oak/oak";
import router from "./routes.ts";

const rawAllowedOrigins = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "*").trim();
const allowAllOrigins = rawAllowedOrigins === "*" || rawAllowedOrigins === "";
const allowedOrigins = allowAllOrigins
  ? []
  : rawAllowedOrigins.split(",").map((origin) => origin.trim()).filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) {
    return true;
  }

  if (allowAllOrigins) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

async function corsMiddleware(ctx: Context, next: Next) {
  const origin = ctx.request.headers.get("origin");
  const allowed = isAllowedOrigin(origin);

  if (origin && allowed) {
    ctx.response.headers.set("Access-Control-Allow-Origin", origin);
    ctx.response.headers.set("Vary", "Origin");
  } else if (!origin && allowAllOrigins) {
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  }

  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );

  const requestHeaders = ctx.request.headers.get("access-control-request-headers");
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    requestHeaders ?? "Content-Type, Authorization",
  );

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = allowed ? 204 : 403;
    return;
  }

  if (!allowed) {
    ctx.response.status = 403;
    ctx.response.body = { error: "Origin not allowed" };
    return;
  }

  await next();
}

// Create a new Oak instance
const app = new Application();

// Wire the router into the app
app.use(corsMiddleware);
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server on port 8000
console.log("Servidor escuchando en http://localhost:8000");
await app.listen({ port: 8000, hostname: "0.0.0.0" });
