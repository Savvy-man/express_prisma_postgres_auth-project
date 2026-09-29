import { Router } from "express";
import { auth_middleware } from "../middlewares/authMiddleware.js";
import {
  createProduct,
  getAllProducts,
  getLowStockProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createCategory,
  getCategories,
} from "../controllers/productController.js";

export const productRoutes = Router();

// Low-stock lookup needs to sit *above* /:id route parameters to avoid resolution conflicts
productRoutes.get("/low-stock", auth_middleware, getLowStockProducts);

productRoutes.route("/")
  .get(auth_middleware, getAllProducts)
  .post( createProduct);

productRoutes.route("/:id")
  .get(auth_middleware, getProductById)
  .put(auth_middleware, updateProduct)
  .delete(auth_middleware, deleteProduct);

// Category grouping subroutes
productRoutes.get("/categories/all", auth_middleware, getCategories);
productRoutes.post("/categories/create", auth_middleware, createCategory);
