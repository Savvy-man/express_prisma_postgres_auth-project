import { prisma } from "../config/db.js";

// Create a new product catalog item
export const createProduct = async (req, res) => {
  const { sku, name, description, categoryId, price, costPrice, quantityInStock, reorderLevel } = req.body;
  try {
    // const skuExists = await prisma.product.findUnique({ where: { sku } });
    // if (skuExists) {
    //   return res.status(400).json({ message: "Product SKU must be unique" });
    // }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        categoryId: categoryId || null,
        price: parseFloat(price) || 0.00,
        costPrice: parseFloat(costPrice) || 0.00,
        quantityInStock: parseInt(quantityInStock) || 0,
        reorderLevel: parseInt(reorderLevel) || 10,
      },
    });

    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    res.status(500).json({ message: "Failed to create product", error: error.message });
  }
};

// Retrieve all products with optional filters
export const getAllProducts = async (req, res) => {
  const { categoryId, search } = req.query;
  try {
    const products = await prisma.product.findMany({
      where: {
        AND: [
          categoryId ? { categoryId } : {},
          search ? { name: { contains: search, mode: "insensitive" } } : {},
        ],
      },
      include: { category: { select: { name: true }  } },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve products", error: error.message });
  }
};

// Get low-stock items across the inventory system
export const getLowStockProducts = async (req, res) => {
  try {
    // Find products where quantityInStock is equal to or less than the alert reorderLevel
    const lowStockItems = await prisma.product.findMany({
      where: {
        quantityInStock: {
          lte: prisma.product.fields.reorderLevel, 
        },
      },
    });

    // Note: If your local Prisma version doesn't support field comparisons directly, fallback:
    // const all = await prisma.product.findMany();
    // const lowStockItems = all.filter(p => p.quantityInStock <= p.reorderLevel);

    res.status(200).json(lowStockItems);
  } catch (error) {
    res.status(500).json({ message: "Failed to load low-stock alerts", error: error.message });
  }
};

// Get a single product details
export const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product details", error: error.message });
  }
};

// Update an existing product
export const updateProduct = async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.status(200).json({ message: "Product updated smoothly", product });
  } catch (error) {
    res.status(500).json({ message: "Update transaction failed", error: error.message });
  }
};

// Delete a product (Note: category relation stays clean due to onDelete: SetNull)
export const deleteProduct = async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Product deleted successfully from system" });
  } catch (error) {
    res.status(500).json({ message: "Deletion transaction failed", error: error.message });
  }
};

// Category Controllers
export const createCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const category = await prisma.category.create({ data: { name, description } });
    res.status(201).json({ message: "Category registered", category });
  } catch (error) {
    res.status(500).json({ message: "Category creation failed", error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } } } });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error loading categories", error: error.message });
  }
};
