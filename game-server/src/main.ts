import { Application } from "@oak/oak";
// deno-lint-ignore no-import-prefix
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import router from "./routes.ts";

const allowedOrigins = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsMiddleware = allowedOrigins.length
  ? oakCors({
    origin: (requestOrigin) =>
      requestOrigin ? allowedOrigins.includes(requestOrigin) : false,
  })
  : oakCors();

// Create a new Oak instance
const app = new Application();

// Wire the router into the app
app.use(corsMiddleware);
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server on port 8000
console.log("Servidor escuchando en http://localhost:8000");
await app.listen({ port: 8000, hostname: "0.0.0.0" });
