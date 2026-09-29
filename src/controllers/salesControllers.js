import { prisma } from "../config/db.js";

// Process a new custom outbound Sales Order (Decrements Stock & Logs Actions)
export const createSalesOrder = async (req, res) => {
  const { customerName, items } = req.body; // items: [{ productId, quantitySold, unitPrice }]
  
  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Sales order must contain at least one item" });
    }

    // Wrap the entire sales process inside a transaction to prevent race conditions or partial updates
    const order = await prisma.$transaction(async (tx) => {
      let cumulativeTotal = 0;

      // 1. Verify availability for all line items first
      for (const item of items) {
        const targetProduct = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!targetProduct) {
          throw new Error(`Product ID ${item.productId} not found in database`);
        }

        if (targetProduct.quantityInStock < item.quantitySold) {
          throw new Error(`Insufficient stock for product "${targetProduct.name}". Available: ${targetProduct.quantityInStock}, Requested: ${item.quantitySold}`);
        }

        cumulativeTotal += parseInt(item.quantitySold) * parseFloat(item.unitPrice);
      }

      // 2. Create the Sales Order structure
      const salesOrder = await tx.salesOrder.create({
        data: {
          customerName,
          status: "Processing",
          totalAmount: cumulativeTotal,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantitySold: parseInt(item.quantitySold),
              unitPrice: parseFloat(item.unitPrice)
            }))
          }
        },
        include: { items: true }
      });

      // 3. Deduct stock numbers and append logs to the historical log tracker
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantityInStock: { decrement: parseInt(item.quantitySold) }
          }
        });

        await tx.stockMovementLog.create({
          data: {
            productId: item.productId,
            userId: req.user?.id || null, // Linked to active authenticated user session
            quantityChanged: -parseInt(item.quantitySold), // Negative signifies depletion
            reason: "Sale"
          }
        });
      }

      return salesOrder;
    });

    res.status(201).json({ message: "Sales order logged successfully. Stock decremented.", order });
  } catch (error) {
    res.status(400).json({ message: "Transaction aborted", error: error.message });
  }
};

// Fetch list of complete sales histories
export const getAllSalesOrders = async (req, res) => {
  try {
    const history = await prisma.salesOrder.findMany({
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } }
      },
      orderBy: { orderDate: "desc" }
    });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sales history", error: error.message });
  }
};

// Update status flags (e.g. Shipped, Delivered, Cancelled)
export const updateSalesOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await prisma.salesOrder.update({
      where: { id },
      data: { status }
    });
    res.status(200).json({ message: `Sales order state updated to ${status}`, updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to modify order status", error: error.message });
  }
};
