import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import lemlistRouter from "./lemlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(lemlistRouter);

export default router;
