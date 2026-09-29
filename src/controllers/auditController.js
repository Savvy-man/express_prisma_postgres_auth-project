import { prisma } from "../config/db.js";

// Manually adjust stock levels (e.g., Damaged, Loss, Audits, Returns)
export const adjustStockManually = async (req, res) => {
  const { productId, quantityChanged, reason } = req.body; // quantityChanged can be positive or negative
  
  try {
    if (!productId || quantityChanged === undefined || !reason) {
      return res.status(400).json({ message: "Product ID, quantity change, and a valid reason are required" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Prevent stock from dipping below zero during a manual reduction
    if (product.quantityInStock + parseInt(quantityChanged) < 0) {
      return res.status(400).json({ 
        message: `Adjustment rejected. Stock cannot be negative. Current stock: ${product.quantityInStock}` 
      });
    }

    // Execute adjustment and log tracking details simultaneously inside a transaction
    const adjustmentResult = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          quantityInStock: { increment: parseInt(quantityChanged) }
        }
      });

      const log = await tx.stockMovementLog.create({
        data: {
          productId,
          userId: req.user?.id || null, // Tied to the active session user
          quantityChanged: parseInt(quantityChanged),
          reason // e.g., "Damaged", "Return", "Adjustment"
        }
      });

      return { updatedProduct, log };
    });

    res.status(200).json({ message: "Manual stock adjustment successful", data: adjustmentResult });
  } catch (error) {
    res.status(500).json({ message: "Failed to log inventory adjustment", error: error.message });
  }
};

// Fetch full chronological audit trails
export const getMovementLogs = async (req, res) => {
  const { productId, reason } = req.query;
  try {
    const logs = await prisma.stockMovementLog.findMany({
      where: {
        AND: [
          productId ? { productId } : {},
          reason ? { reason } : {}
        ]
      },
      include: {
        product: { select: { name: true, sku: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { loggedAt: "desc" }
    });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to load audit logs", error: error.message });
  }
};

// Compile high-level dashboard business intelligence counters
export const getDashboardSummary = async (req, res) => {
  try {
    // 1. Run basic total inventory counts simultaneously
    const totalProducts = await prisma.product.count();
    const totalCategories = await prisma.category.count();
    const totalSuppliers = await prisma.supplier.count();

    // 2. Fetch specific items matching low-stock conditions
    const lowStockCount = await prisma.product.count({
      where: {
        quantityInStock: { lte: prisma.product.fields.reorderLevel }
      }
    });

    // 3. Aggregate net sales transactions
    const salesAggregation = await prisma.salesOrder.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: "Cancelled" } }
    });

    // 4. Aggregate procurement spending costs
    const purchaseAggregation = await prisma.purchaseOrder.aggregate({
      _sum: { totalAmount: true },
      where: { status: "Received" }
    });

    res.status(200).json({
      metrics: {
        totalProducts,
        totalCategories,
        totalSuppliers,
        lowStockAlerts: lowStockCount,
        totalRevenue: salesAggregation._sum.totalAmount || 0.00,
        totalProcurementCost: purchaseAggregation._sum.totalAmount || 0.00
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate dashboard indicators", error: error.message });
  }
};
