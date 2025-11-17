import { Router } from "@oak/oak";
import { onConnectionWS } from "./game.ts";

const router = new Router();

router.get("/ws", (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501);
  }
  const ws: WebSocket = ctx.upgrade();

  onConnectionWS(ws);
});

router.post("/", async (context) => {
  const body: string = await context.request.body.text();

  console.log("Received message:", body);

  context.response.status = 200;
  context.response.body = { mensaje: "Hi from backend :)" };
});

export default router;
