import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env.js";
import { logger } from "./lib/logger.js";
import { chatRoute } from "./routes/chat.js";
import { podcastRoute } from "./routes/podcast.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://studio.iavance.fr"],
    credentials: true,
  }),
);

app.get("/", (c) =>
  c.json({
    service: "soufi-studio-backend",
    version: "0.1.0",
    status: "ok",
    routes: ["GET /", "GET /health", "POST /chat", "POST /podcast"],
  }),
);

app.get("/health", (c) =>
  c.json({ status: "ok", uptime_sec: Math.floor(process.uptime()) }),
);

app.route("/chat", chatRoute);
app.route("/podcast", podcastRoute);

app.use("/media/*", serveStatic({ root: "./" }));

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(
    { port: info.port, env: env.NODE_ENV, model: env.CLAUDE_MODEL },
    `Soufi Studio backend ready on http://localhost:${info.port}`,
  );
});
