import { Router } from "express";
import { trackingPixel } from "../controllers/tracking.controller.js";

const router = Router();

router.get("/:trackingId.gif", trackingPixel);

export default router;