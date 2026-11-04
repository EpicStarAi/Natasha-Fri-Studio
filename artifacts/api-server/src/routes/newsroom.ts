import { Router, type IRouter } from "express";
import { timingSafeEqual, randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import rateLimit from "express-rate-limit";
import {
  NEWS_CHANNEL,
  NewsDraftSchema,
  createNewsPackage,
} from "@workspace/api-zod";

const router: IRouter = Router();
const tokenConfigured = () =>
  (process.env.NEWNEWS_STUDIO_TOKEN?.length ?? 0) >= 32;

router.get("/newsroom/status", (_req, res) => {
  res.set("Cache-Control", "no-store").json({
    channel: NEWS_CHANNEL,
    storageConfigured: tokenConfigured(),
    rendering: "manual-local",
    publishing: "not-connected",
  });
});

router.use(
  "/newsroom/packages",
  rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Слишком много запросов. Повторите через минуту." },
  }),
  (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!tokenConfigured()) {
      res
        .status(503)
        .json({
          error:
            "Серверное сохранение не настроено. Задайте NEWNEWS_STUDIO_TOKEN (не менее 32 символов).",
        });
      return;
    }
    const provided = req.get("authorization") ?? "";
    const expected = `Bearer ${process.env.NEWNEWS_STUDIO_TOKEN}`;
    const hash = (value: string) => createHash("sha256").update(value).digest();
    if (!timingSafeEqual(hash(provided), hash(expected))) {
      res.status(401).json({ error: "Неверный ключ студии." });
      return;
    }
    next();
  },
);

router.post("/newsroom/packages", async (req, res) => {
  const parsed = NewsDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Проверьте выпуск", issues: parsed.error.issues });
    return;
  }
  const pack = createNewsPackage(parsed.data, randomUUID());
  const directory = path.resolve(
    process.env.NEWNEWS_DATA_DIR ?? "./data/newnews",
  );
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      path.join(directory, `${pack.id}.json`),
      JSON.stringify(pack, null, 2),
      { flag: "wx", mode: 0o600 },
    );
    res.status(201).json(pack);
  } catch {
    res
      .status(500)
      .json({
        error:
          "Не удалось сохранить выпуск. Проверьте доступ сервера к каталогу данных.",
      });
  }
});

router.get("/newsroom/packages/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id)) {
    res.status(400).json({ error: "Некорректный ID выпуска" });
    return;
  }
  try {
    const directory = path.resolve(
      process.env.NEWNEWS_DATA_DIR ?? "./data/newnews",
    );
    const pack = await readFile(path.join(directory, `${id}.json`), "utf8");
    res.type("json").send(pack);
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    res
      .status(missing ? 404 : 500)
      .json({
        error: missing ? "Выпуск не найден" : "Не удалось прочитать выпуск",
      });
  }
});

export default router;
