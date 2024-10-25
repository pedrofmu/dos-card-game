import { Router } from "@oak/oak";

// Crear una nueva instancia del Router
const router = new Router();

// Definir la ruta POST
router.post("/mensaje", async (context) => {
    const body: string = await context.request.body.json();

    console.log("Mensaje recibido:", body);

    context.response.status = 200;
    context.response.body = { mensaje: "Mensaje recibido con éxito" };
});

router.get("/", async (context) => {
    const body: string = await context.request.body.text();

    console.log("Mensaje recibido:", body);

    context.response.status = 200;
    context.response.body = { mensaje: "Hola desde el backend" };
});

// Exportar el router
export default router;
