import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import newsroomRouter from "./newsroom";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(newsroomRouter);
// The newsroom works without a database. Load the legacy integration only
// when it is explicitly enabled; importing it eagerly requires DATABASE_URL.
if (process.env.ENABLE_LEMLIST === "true") {
  const { default: lemlistRouter } = await import("./lemlist");
  router.use(lemlistRouter);
}

export default router;
