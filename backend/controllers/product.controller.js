// Import necessary libraries and models
import { redis } from "../lib/redis.js"; // Redis client for caching
import cloudinary from "../lib/cloudinary.js"; // Cloudinary for image uploads
import Product from "../models/product.model.js"; // Product model from Mongoose

// Controller to get all products
export const getAllProducts = async (req, res) => {
	try {
		// Fetch all products from the database
		const products = await Product.find({})
		// If no products exist, return a 404 response
		if (!products) {
			return res.status(404).json({ message: "No products found" });
		}
		// Return the products as a JSON response
		res.status(200).json({ products });
	} catch (error) {
		// Log and return an error response if any issues occur
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to get featured products
export const getFeaturedProducts = async (req, res) => {
	try {
		// Try to get featured products from Redis cache
		let featuredProducts = await redis.get("featured_products")
		// If found, parse and return the cached data
		if (featuredProducts) {
			return res.status(200).json(JSON.parse(featuredProducts))
		}
		// If not found in cache, fetch from the database
		featuredProducts = await Product.find({ isfeatured: true }).lean()
		// If no featured products exist, return a 404 response
		if (!featuredProducts) {
			return res.status(404).json({ message: "No featured products found" })
		}
		// Store the fetched data in Redis for future requests
		await redis.set("featured_products", JSON.stringify(featuredProducts))
		// Return the fetched data
		res.status(200).json(featuredProducts)
	} catch (error) {
		// Log and return an error response if any issues occur
		console.log("Error in getFeaturedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to create a new product
export const createProduct = async (req, res) => {
	try {
		// Destructure product details from the request body
		const { name, description, price, image, category } = req.body
		// Initialize a variable to store Cloudinary response
		let cloudinaryResponse = null
		// If an image is provided, upload it to Cloudinary
		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" })
		}

		// Create a new product in the database with the provided details
		const product = await Product.create({
			name,
			description,
			price,
			image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
			category
		})

		// Return the created product with a 201 status code
		res.status(201).json(product)
	} catch (error) {
		// Log and return an error response if any issues occur
		console.log("Error in createProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to delete a product
export const deleteProduct = async (req, res) => {
	try {
		// Find the product by ID
		const product = await Product.findById(req.params.id)
		// If product does not exist, return a 404 response
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}
		// If the product has an associated image, delete it from Cloudinary
		if (product.image) {
			const publicId = product.image.split("/").pop().split('.')[0]
			try {
				await cloudinary.uploader.destroy(`products/${publicId}`);
				console.log("deleted image from cloduinary");
			} catch (error) {
				console.log("error deleting image from cloduinary", error);
			}
		}
		// Delete the product from the database
		await Product.findByIdAndDelete(req.params.id)

		// Return a success response
		res.status(200).json({ message: "Product deleted successfully" });
	} catch (error) {
		// Log and return an error response if any issues occur
		console.log("Error in deleteProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to get recommended products
export const getRecommendedProducts = async (req, res) => {
	try {
		// Use MongoDB aggregation to randomly select 4 products
		const product = await Product.aggregate([
			{$sample: {
				size: 4
			}},
			{$project: {
				name: 1,
				description: 1,
				price: 1,
				image: 1,
				category: 1
			}}
		])
		// Return the sampled products
		res.status(200).json(product)
	} catch (error) {
		// Log and return an error response if any issues occur
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to get products by category
export const getProductsByCategory = async (req, res) => {
	// Extract category from request parameters
	const { category } = req.params
	try {
		// Find products that match the specified category
		const products = await Product.find({ category })
		// Return the found products
		res.status(200).json({ products })
	} catch (error) {
		// Log and return an error response if any issues occur
		console.log("Error in getProductsByCategory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Controller to toggle the featured status of a product
export const toggleFeaturedProduct = async (req, res) => {
	try {
		// Find the product by ID
		const product = await Product.findById(req.params.id)
		// if product exists, toggle the isFeatured property
		if (product) {
			// Toggle the isFeatured property
			product.isfeatured = !product.isfeatured
			// Save the updated product
			const updatedProduct = await product.save();
			// Update the cache for featured products
			await updateFeaturedProductsCache()
			// Return the updated product
			res.status(200).json(updatedProduct)
		}
		else {
			// If product does not exist, return a 404 response
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		// Log and return an error response if any issues occur
		console.log("Error in toggleFeaturedProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Function to update the cache for featured products
async function updateFeaturedProductsCache() {
	try {
		// Find all featured products
		const featuredProducts = await Product.find({isfeatured:true}).lean()
		// Store them in Redis cache
		await redis.set(`featured_products`,JSON.stringify(featuredProducts))
	} catch (error) {
		// Log an error if cache update fails
		console.log("error in update cache function", error.message);
		console.log("error in update cache function");
	}
}

