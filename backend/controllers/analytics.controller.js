import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";


export const getAnalyticsData = async () => {
	// Count the total number of users.
	const totalUsers = await User.countDocuments()
	// Count the total number of products.
	const totalProducts = await Product.countDocuments()

	// Get the total sales and revenue.
	// salesData aggregates all orders to get the total sales and revenue.
	const salesData = await Order.aggregate([
		// Group all documents together.
		{
			$group: {
				// id: null means group all documents together.
				_id: null,
				// Sum up the total number of sales.
				totalSales: { $sum: 1 },
				// Sum up the total revenue of all sales.
				totalRevenue: { $sum: "$totalAmount" }
			}
		}
	])
	// Get the total sales and revenue from the result.
	// // If there are no sales, use default values.
	const { totalSales, totalRevenue } = salesData[0] || { totalSales: 0, totalRevenue: 0 }

	// Return the analytics data.
	return {
		// The total number of users.
		users: totalUsers,
		// The total number of products.
		products: totalProducts,
		// The total number of all sales.
		totalSales,
		// The total revenue of all sales.
		totalRevenue
	}
};


export const getDailySalesData = async (startDate, endDate) => {
	try {
		// Create an aggregate pipeline to group all orders within the given date range by date.
		// The pipeline consists of the following stages:
		// 1. $match: filter all orders to only include those within the date range.
		// 2. $group: group the orders by date, and calculate the total sales and revenue for each group.
		// 3. $sort: sort the groups by date in ascending order.

		const dailySalesData = await Order.aggregate([
			{
				$match: {
					createdAt: {
						$gte: startDate,
						$lte: endDate
					}

				}
			},
			{
				$group: {
					_id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
					sales: { $sum: 1 },
					revenue: { $sum: "$totalAmount" }
				}
			}, { $sort: { _id: 1 } }
		])
		// The result of the pipeline is an array of objects with the following shape:
		// [
		// 	{
		// 		_id: "2024-08-18",
		// 		sales: 12,
		// 		revenue: 1450.75
		// 	},
		// ]

		// Create an array of all dates within the given range.
		const dateArry = getDatesInRange(startDate, endDate)

		// Loop through the array of dates and for each date,
		return dateArry.map((date) => {
			// Find the object in the dailySalesData array that has the same date.
			const foundData = dailySalesData.find(item => item._id === date)

			return {
				date,
				// If the object was found, use its sales and revenue values.
				sales: foundData?.sales || 0,
				// If it wasn't found, use 0 for the sales and revenue values.
				revenue: foundData?.revenue || 0
			}

		})
	} catch (error) {
		throw error;
	}
};


function getDatesInRange(startDate, endDate) {
	// Create an array to store the dates.
	const dates = []
	// Set the current date to the start date.
	let currentDate = new Date(startDate)

	// Loop through the dates until the current date is greater than the end date.
	while (currentDate <= endDate) {
		// add the formatted date to the array
		dates.push(currentDate.toISOString().split("T")[0])
		// Increment the day by 1.
		currentDate.setDate(currentDate.getDate() + 1)
	}

	// Return the array of dates.
	return dates

}

