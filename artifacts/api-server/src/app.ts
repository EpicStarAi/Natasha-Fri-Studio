import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "node:path";
import { existsSync } from "node:fs";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Optional single-process local deployment. API misses must never return HTML.
if (process.env.NEWNEWS_WEB_DIR) {
  const webDirectory = path.resolve(process.env.NEWNEWS_WEB_DIR);
  const entry = path.join(webDirectory, "index.html");
  if (!existsSync(entry))
    throw new Error(
      "Build the newsroom frontend before starting NEWNEWS_WEB_DIR",
    );
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
  app.use(express.static(webDirectory));
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) {
      next();
      return;
    }
    res.set("Cache-Control", "no-store").sendFile(entry);
  });
}

export default app;
