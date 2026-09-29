import { prisma } from "../config/db.js";

// Create a supplier profile
export const createSupplier = async (req, res) => {
  const { companyName, contactName, email, phone, address } = req.body;
  try {
    const existing = await prisma.supplier.findUnique({ where: { companyName } });
    if (existing) return res.status(400).json({ message: "Supplier company name must be unique" });

    const supplier = await prisma.supplier.create({
      data: { companyName, contactName, email, phone, address }
    });
    res.status(201).json({ message: "Supplier created successfully", supplier });
  } catch (error) {
    res.status(500).json({ message: "Failed to create supplier", error: error.message });
  }
};

// Retrieve all suppliers
export const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json(suppliers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch suppliers", error: error.message });
  }
};

// Log a new Purchase Order (Default: Pending)
export const createPurchaseOrder = async (req, res) => {
  const { supplierId, items } = req.body; // items array: [{ productId, quantityOrdered, unitCost }]
  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Purchase order must contain at least one item" });
    }

    // Calculate total amount based on nested array values
    const totalAmount = items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        totalAmount,
        status: "Pending",
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityOrdered: parseInt(item.quantityOrdered),
            unitCost: parseFloat(item.unitCost)
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json({ message: "Purchase order created in Pending state", order });
  } catch (error) {
    res.status(500).json({ message: "Failed to create purchase order", error: error.message });
  }
};

// Get all purchase orders
export const getAllPurchaseOrders = async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { companyName: true } },
        items: { include: { product: { select: { name: true, sku: true } } } }
      },
      orderBy: { orderDate: "desc" }
    });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch purchase orders", error: error.message });
  }
};

// Update Purchase Order Status (Includes Inventory Hooks!)
export const updatePurchaseOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Ordered, Received, Cancelled
  
  try {
    const currentOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!currentOrder) return res.status(404).json({ message: "Purchase order not found" });
    if (currentOrder.status === "Received") {
      return res.status(400).json({ message: "Cannot alter status of an order already marked Received" });
    }

    // CRITICAL HOOK: Transaction executes only if incoming stock status transitions to "Received"
    if (status === "Received") {
      await prisma.$transaction(async (tx) => {
        // 1. Mark order state as Received
        await tx.purchaseOrder.update({
          where: { id },
          data: { status: "Received" }
        });

        // 2. Loop through individual row items to increment product values
        for (const item of currentOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantityInStock: { increment: item.quantityOrdered },
              costPrice: item.unitCost // Update stock buying cost metrics
            }
          });

          // 3. Create a descriptive logging snapshot for auditing
          await tx.stockMovementLog.create({
            data: {
              productId: item.productId,
              userId: req.user?.id || null, // Tied to active session from auth_middleware
              quantityChanged: item.quantityOrdered,
              reason: "Restock"
            }
          });
        }
      });

      return res.status(200).json({ message: "Order processed successfully. Stock levels incremented." });
    }

    // Basic status update fallback if status is just moving to "Ordered" or "Cancelled"
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ message: `Order status updated to ${status}`, updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Failed to update order status", error: error.message });
  }
};
