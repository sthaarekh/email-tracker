import { Router } from "express";
import {
  getLiveHealth,
  getReadyHealth,
} from "../controllers/health.controller.js";

const router = Router();

router.get("/live", getLiveHealth);
router.get("/ready", getReadyHealth);

export default router;
