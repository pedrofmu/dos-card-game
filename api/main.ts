import { Application } from "@oak/oak";
import router from "./routes.ts";

// Crear una nueva instancia de la aplicación
const app = new Application();

// Usar el router en la app
app.use(router.routes());
app.use(router.allowedMethods());

// Iniciar el servidor en el puerto 8000
console.log("Servidor escuchando en http://localhost:8000");
await app.listen({ port: 8000, hostname: "0.0.0.0" });
