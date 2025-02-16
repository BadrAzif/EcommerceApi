import Product from "../models/product.model.js";

export const getCartProducts = async (req, res) => {
	try {
		// find all products in the user's cartItems
		const products = await Product.find({ _id: { $in: req.user.cartItems } });
		// Map through the retrieved products to include the quantity for each product
		const cartItems = products.map((product) => {
			// Find the corresponding cart item from the user's cartItems using the product ID
			const item = req.user.cartItems.find((item) => item.id === product.id);
			// Return a new object containing the product details and the quantity from the cart item
			return {
				...product.toJSON(),
				quantity: item.quantity,
			};
		});
		// Send the cart items with quantities as a JSON response
		res.status(200).json(cartItems);
	} catch (error) {
		// Log the error message in case of an exception
		console.log("Error in getCartProducts controller", error.message);
		// Send a 500 status response with an error message indicating a server error
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToCart = async (req, res) => {
	try {
		// Get the product ID from the request body
		const { productId } = req.body;
		// Get the user from the request context
		const user = req.user;
		// Check if there is already an item with the same product ID in the user's cartItems
		const existItem = user.cartItems.find((item) => item.id === productId.id);
		if (existItem) {
			// If the item exists, increment its quantity by 1
			existItem.quantity += 1;
		} else {
			// If the item does not exist, add the product ID to the user's cartItems
			user.cartItems.push(productId);
		}
		// Save the updated user to the database
		await user.save();
		// Send the updated cart items as a JSON response
		res.status(200).json(user.cartItems);
	} catch (error) {
		// Log the error message in case of an exception
		console.log("Error in addToCart controller", error.message);
		// Send a 500 status response with an error message indicating a server error
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const removeAllFromCart = async (req, res) => {
	try {
		// Extract productId from the request body
		const { productId } = req.body;
		// Retrieve the user from the request object
		const user = req.user;
		// If no productId, remove all items from the user's cart
		if (!productId) {
			user.cartItem = [];
		} else {
			// If a productId is provided, filter the user's cart to remove only the specified item
			user.cartItems = user.cartItems.filter((item) => item.id !== productId);
		}
		// Save the updated user information to the database
		await user.save();
		// Respond with the updated cartItems in JSON format
		res.status(200).json(user.cartItems);
	} catch (error) {
		// In case of an error, send a 500 status response with an error message
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateQuantity = async (req, res) => {
	try {
		// Extract the product ID from the request parameters
		const { id: productId } = req.params;
		// Extract the new quantity from the request body
		const { quantity } = req.body;
		// Retrieve the user from the request context
		const user = req.user;
		// Find the existing item in the user's cartItems that matches the provided product ID
		const existItem = user.cartItems.find((item) => item.id === productId);
		// If the item exists in the user's cart
		if (existItem) {
			// If the new quantity is 0, remove the item from the user's cart
			if (quantity === 0) {
				// Filter out the item from the user's cartItems
				user.cartItems = user.cartItems.filter((item) => item.id !== productId);
				// Save the updated user information to the database
				await user.save();
				// Return the updated cartItems as a JSON response
				res.status(200).json(user.cartItems);
			} else {
				// If the new quantity is not 0, update the quantity of the existing item
				existItem.quantity = quantity;
				// Save the updated user information to the database
				await user.save();
				// Return the updated cartItems as a JSON response
				res.status(200).json(user.cartItems);
			}
		} else {
			// If the item does not exist, return a 404 status response with an error message
			res.status(404).json({ message: " Product not found" });
		}
	} catch (error) {
		// Log the error message in case of an exception
		console.log("Error in updateQuantity controller", error.message);
		// Send a 500 status response with an error message indicating a server error
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
