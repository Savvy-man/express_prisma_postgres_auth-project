import express from "express";
import cors from "cors"; // Run 'npm install cors' if you haven't yet

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";




import { userRoute } from "./routes/userRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { logger } from "./middlewares/logger.js";
import { auth_middleware } from "./middlewares/authMiddleware.js";

// Import your new inventory modules
import { productRoutes } from "./routes/productRoutes.js";
import { purchaseRoutes } from "./routes/purchaseRoutes.js";
import { salesRoutes } from "./routes/salesRoutes.js";
import { auditRoutes } from "./routes/auditRoutes.js";


export const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://daved-work.vercel.app",   // no trailing slash
];

// / 1. Grant global origin permissions to your React App port
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
// Load your YAML file
const swaggerDocument = YAML.load('./swagger.yaml'); 


// Temporary diagnostics route
// app.post("/test-debug", (req, res) => {
//   console.log("💥 Test debug route hit successfully! Body:", req.body);
//   return res.status(200).json({ status: "Express routing is completely functional!", bodyReceived: req.body });
// });


// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Base System Routes
app.use("/users", userRoute);
app.use("/auth", authRoutes);

// New Inventory System Routes
app.use("/products", productRoutes);
app.use("/procurement", purchaseRoutes);
app.use("/sales", salesRoutes);
app.use("/inventory", auditRoutes);


// Serve the interactive documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// Add this at the very bottom of src/app.js (After app.use("/inventory", auditRoutes);)
app.use((err, req, res, next) => {
  console.error("💥 GLOBAL ERROR CAUGHT:", err);
  res.status(500).send({
    message: "Global handler caught an error",
    errorDetail: err.message || String(err)
  });
});

