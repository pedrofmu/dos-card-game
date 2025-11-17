import { Application } from "@oak/oak";
// deno-lint-ignore no-import-prefix
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import router from "./routes.ts";

// Crear una nueva instancia de la aplicación Oak
const app = new Application();

// Usar el router en la app
app.use(router.routes());
app.use(router.allowedMethods());
app.use(oakCors());

// Iniciar el servidor en el puerto 8000
console.log("Servidor escuchando en http://localhost:8000");
await app.listen({ port: 8000, hostname: "0.0.0.0" });
