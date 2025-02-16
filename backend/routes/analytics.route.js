import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getAnalyticsData, getDailySalesData } from "../controllers/analytics.controller.js";

const router = express.Router();

// Route: GET /api/analytics/
// Access: Private (Admins only)
router.get("/", protectRoute, adminRoute, async (req, res) => {
	try {
		// Fetch general analytics data (e.g., total sales, users, revenue, etc.)
		const analyticsData = await getAnalyticsData();
		// Define the date range for daily sales data (last 7 days)
		const endDate = new Date()// Current date
		const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)// 7 days ago

		// Fetch sales data per day within the specified date range
		const dailySalesData = await getDailySalesData(startDate, endDate)

		// Send the response with both analytics and daily sales data
		res.status(200).json({ analyticsData, dailySalesData });
	} catch (error) {
		// Log and handle errors
		console.log("Error in analytics route", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
});


export default router;
