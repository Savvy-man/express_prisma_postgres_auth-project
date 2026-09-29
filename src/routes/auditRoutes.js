import { Router } from "express";
import { auth_middleware } from "../middlewares/authMiddleware.js";
import {
  adjustStockManually,
  getMovementLogs,
  getDashboardSummary
} from "../controllers/auditController.js";

export const auditRoutes = Router();

// Dashboard analytics overview
auditRoutes.get("/dashboard/summary", auth_middleware, getDashboardSummary);

// Audit trails and adjustments
auditRoutes.route("/logs")
  .get(auth_middleware, getMovementLogs);

auditRoutes.post("/adjust", auth_middleware, adjustStockManually);
