import { Router } from "@oak/oak";
import { manageForm } from "./manageForm.ts";

// Crear una nueva instancia del Router
const router = new Router();

// Definir la ruta para el formulario de contacto
router.post("/contact_form", async (ctx) => {
    const body = await ctx.request.body.formData();

    manageForm(body);

    ctx.response.redirect("/enviar_sugerencias/enviar_sugerencias.html");
});

router.get("/ws", (ctx) => {
    if (!ctx.isUpgradable) {
        ctx.throw(501);
    }
    const ws = ctx.upgrade();

    ws.onopen = () => {
        console.log("Connected to client");
        ws.send("Hello from server!");
    };

    ws.onmessage = (m) => {
        console.log("Got message from client: ", m.data);
        ws.send(m.data as string);
        ws.close();
    };

    ws.onclose = () => console.log("Disconncted from client");
});

router.post("/", async (context) => {
    const body: string = await context.request.body.text();

    console.log("Mensaje recibido:", body);

    context.response.status = 200;
    context.response.body = { mensaje: "Hola desde el backend" };
});

// Exportar el router
export default router;
