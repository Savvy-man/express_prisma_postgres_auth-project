import { Router } from "express";
import { auth_middleware } from "../middlewares/authMiddleware.js";
import {
  createSupplier,
  getAllSuppliers,
  createPurchaseOrder,
  getAllPurchaseOrders,
  updatePurchaseOrderStatus
} from "../controllers/purchaseControllers.js";

export const purchaseRoutes = Router();

// Supplier endpoints
purchaseRoutes.route("/suppliers")
  .get(auth_middleware, getAllSuppliers)
  .post(auth_middleware, createSupplier);

// Purchase order endpoints
purchaseRoutes.route("/orders")
  .get(auth_middleware, getAllPurchaseOrders)
  .post(auth_middleware, createPurchaseOrder);

purchaseRoutes.patch("/orders/:id/status", auth_middleware, updatePurchaseOrderStatus);
