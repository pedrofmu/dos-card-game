import { Router } from "@oak/oak";
import { manageForm } from "./manageForm.ts";
import { onConnectionWS } from "./game.ts";

// Crear una nueva instancia del Router
const router = new Router();

router.post("/contact_form", async (ctx) => {
    const body = await ctx.request.body.formData();

    manageForm(body);

    ctx.response.redirect("/enviar_sugerencias/enviar_sugerencias.html");
});

router.get("/ws", (ctx) => {
    if (!ctx.isUpgradable) {
        ctx.throw(501);
    }
    const ws: WebSocket = ctx.upgrade();
    
    onConnectionWS(ws);
});

router.post("/", async (context) => {
    const body: string = await context.request.body.text();

    console.log("Mensaje recibido:", body);

    context.response.status = 200;
    context.response.body = { mensaje: "Hola desde el backend" };
});

// Exportar el router
export default router;
