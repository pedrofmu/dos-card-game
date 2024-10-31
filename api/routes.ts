import { Router } from "@oak/oak";

// Crear una nueva instancia del Router
const router = new Router();

// Definir la ruta POST
router.post("/contact_form", async (ctx) => {
    const body = await ctx.request.body.formData();

    const name = body.get("name");
    const email = body.get("email");
    const message = body.get("message");

    console.log("datos: ", {name, email, message});

    ctx.response.redirect("/enviar_sugerencias/enviar_sugerencias.html");
});

router.post("/", async (context) => {
    const body: string = await context.request.body.text();

    console.log("Mensaje recibido:", body);

    context.response.status = 200;
    context.response.body = { mensaje: "Hola desde el backend" };
});

// Exportar el router
export default router;
