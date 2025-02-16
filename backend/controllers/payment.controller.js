import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";
import mongoose from "mongoose";

export const createCheckoutSession = async (req, res) => {
	try {
		// Extract products and couponCode from the request body
		const { products, couponCode } = req.body;
		// Validate products array; if invalid or empty, return a 400 status with an error message
		if (!Array.isArray(products) || products.length == 0) {
			return res.status(400).json({ message: "Invalid products" });
		}
		// Initialize totalAmount to keep track of the total cost of all products
		let totalAmount = 0;

		// Map through the products to create line items for each product
		const lineItems = products.map((product) => {
			// Convert product price to cents and add to totalAmount
			const amount = product.price * 100;
			// Add product quantity to totalAmount
			totalAmount += product.quantity * amount;
			// Return a line item object formatted for Stripe API
			return {
				price_data: {
					currency: "usd",
					product_data: {
						name: product.name,
						images: [product.image],
					},
					unit_amount: amount,
				},
				quantity: product.quantity || 1,
			};
		});

		// set it to null coupon
		let coupon = null;
		// Check if a coupon code is provided, and if so, validate it
		if (couponCode) {
			// Find an active coupon for the user with the given code
			coupon = await Coupon.findOne({
				code: couponCode,
				userId: req.user._id,
				isActive: true,
			});
			// If a valid coupon is found
			if (coupon) {
				// Apply discount based on the coupon's discount percentage
				totalAmount -= Math.round(
					totalAmount * (coupon.discountPercentage / 100)
				);
			}
		}

		// Create a new checkout session with Stripe
		const session = await stripe.checkout.sessions.create({
			// Set payment_method_types to ["card", "paypal"] to allow customers to pay with credit cards or PayPal
			payment_method_types: ["card"],
			// Set line_items to the array of line items created above
			line_items: lineItems,
			// Set mode to "payment" to indicate that this is a payment checkout
			mode: "payment",
			// Set success_url to the URL that the customer will be redirected to after a successful payment
			success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			// Set cancel_url to the URL that the customer will be redirected to if they cancel the payment
			cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
			// discounts to an array containing the coupon if it exists
			discounts: coupon
				? [{ coupon: await createStripeCoupon(coupon.discountPercentage) }]
				: [],
			// Set metadata to an object containing the user ID, coupon code, and products
			// The products metadata should be a JSON string containing an array of objects
			// Each object should have the id, quantity, and price properties set to the corresponding values for each product
			metadata: {
				userId: req.user._id.toString(),
				coupon: couponCode || null,
				products: JSON.stringify(
					products.map((p) => ({
						id: p._id,
						quantity: p.quantity,
						price: p.price,
					}))
				),
			},
		});

		// If totalAmount is equal to or greater than $200, create a new coupon for the user
		if (totalAmount >= 20000) {
			// Check if a coupon already exists for the user
			const existCoupon = await Coupon.findOne({ userId: req.user._id });
			// If no coupon exists, create a new one
			if (!existCoupon) {
				await createNewCoupon(req.user._id);
			}
		}
		// Respond with the session ID and the total amount in dollars
		res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
	} catch (error) {
		// Log any errors that occur during the checkout process
		console.error("Error processing checkout:", error);
		// Return a 500 status with an error message
		res
			.status(500)
			.json({ message: "Error processing checkout", error: error.message });
	}
};

export const checkoutSuccess = async (req, res) => {
	try {
		// Get the session ID from the request body
		const { sessionId } = req.body;
		// Retrieve the Stripe checkout session using the session ID
		const session = await stripe.checkout.sessions.retrieve(sessionId);
		// Make sure the payment status is "paid"
		if (session.payment_status == "paid") {
			// If a coupon was used, deactivate it
			if (session.metadata.coupon) {
				// Find the coupon in the database
				const coupon = await Coupon.findOneAndUpdate(
					{
						code: session.metadata.couponCode,
						userId: session.metadata.userId,
					},
					{
						// Deactivate the coupon
						isActive: false,
					}
				);
			}
		}
		// First, parse the products from the session metadata
		const products = JSON.parse(session.metadata.products);
		// Check if an order already exists for this session
		const order = await Order.findOne({ stripeSessionId: sessionId });
		if (order) {
			// If an order already exists, return a 400 status with an error message
			console.log("Order already exists");
			return res.status(400).json({ message: "Order already exists" });
		}
		// Create a new order in the database using the Order model
		const newOrder = await Order.create({
			// Assign the userId from the session metadata to the order
			user: session.metadata.userId,
			// Map the product information from the session metadata to the format required by the Order schema
			products: products.map((product) => {
				// Get the product ID
				const productId = product.id || product._id;
				// Check if the product ID is valid
				if (!mongoose.Types.ObjectId.isValid(productId)) {
					// If not, return a 400 status with an error message
					throw new Error("Invalid product ID" + productId);
				}
				// Return an object with the product ID, quantity, and price
				return {
					// Include the product ID
					product: productId,
					// Include the quantity of the product being ordered
					quantity: product.quantity,
					// Include the price of the product
					price: product.price,
				};
			}),
			// Set the total amount for the order, converting from cents to dollars
			totalAmount: session.amount_total / 100,
			// Associate the Stripe session ID with the order for reference
			stripeSessionId: sessionId,
		});
		// Send a success response
		res.status(200).json({
			success: true,
			message:
				"Payment successful, order created, and coupon deactivated if used.",
			orderId: newOrder._id,
		});
	} catch (error) {
		console.error("Error processing successful checkout:", error);
		res.status(500).json({
			message: "Error processing successful checkout",
			error: error.message,
		});
	}
};

async function createStripeCoupon(discountPercentage) {
	// Create a new Stripe coupon with the specified discount percentage
	const coupon = await stripe.coupons.create({
		percent_off: discountPercentage,
		duration: "once", // The coupon will only be applied once
	});
	// Return the ID of the newly created coupon
	return coupon.id;
}

async function createNewCoupon(userId) {
	//
	const newCoupon = await Coupon.create({
		// Generate a random string for the coupon code
		code:
			"GIFT" + Math.random().toString(36).substring(2, 8).toLocaleLowerCase(),
		// Set the discount percentage for the coupon
		discountPercentage: 10,
		// Set the expiration date to 30 days from the current date
		expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		// Associate the coupon with the user
		userId: userId,
	});

	// Return the newly created coupon
	return newCoupon;
}
