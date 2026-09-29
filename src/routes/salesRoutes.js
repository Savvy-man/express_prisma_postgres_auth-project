import { Router } from "express";
import { auth_middleware } from "../middlewares/authMiddleware.js";
import {
  createSalesOrder,
  getAllSalesOrders,
  updateSalesOrderStatus
} from "../controllers/salesControllers.js";

export const salesRoutes = Router();

salesRoutes.route("/")
  .get(auth_middleware, getAllSalesOrders)
  .post(auth_middleware, createSalesOrder);

salesRoutes.patch("/:id/status", auth_middleware, updateSalesOrderStatus);
