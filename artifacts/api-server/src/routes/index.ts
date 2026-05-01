import { Router, type IRouter } from "express";
import healthRouter from "./health";
import f1Router from "./f1";
import newsRouter from "./news";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/f1", f1Router);
router.use("/f1", newsRouter);

export default router;
