import e from "express";
import Coupon from "../models/coupon.model.js";

export const getCoupon = async (req, res) => {
	try {
		// Find the first coupon that matches the following conditions:
		// 1. The coupon belongs to the logged-in user
		// 2. The coupon is still active
		const coupon = await Coupon.findOne({
			userId: req.user.id,
			isActive: true,
		});
		// Return the coupon if it exists, otherwise return null
		res.status(200).json(coupon || null);
	} catch (error) {
		// Log the error message in case of an exception
		console.log("Error in getCoupon controller", error.message);

		// Send a 500 status response with an error message indicating a server error
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const validateCoupon = async (req, res) => {
	try {
		// Extract the coupon code from the request body
		const { code } = req.body;
		// Search for a coupon with the specified code, belonging to the logged-in user, and that is still active
		const coupon = await Coupon.findOne({
			code: code,
			userId: req.user.id,
			isActive: true,
		});
		// If no such coupon exists, return a 404 status with an error message
		if (!coupon) {
			return res.status(404).json({ message: "Coupon not found" });
		}
		// Check if the coupon is expired by comparing its expiration date with the current date
		if (coupon.expirationDate > new Date()) {
			// If expired, set the coupon as inactive and save the changes
			coupon.isActive = false;
			// Return a 404 status with an expiration error message
			res.status(404).json({ message: "Coupon expired" });
		} else {
			// If the coupon is valid and not expired, return its details in the response
			res
				.status(200)
				.json({
					status: "valid",
					message: "Coupon is valid",
					discount: coupon.discount,
				});
		}
	} catch (error) {
		// Log any errors that occur during the process
		console.log("Error in validateCoupon controller", error.message);

		// Return a 500 status with a server error message
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
