import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

// Generate the access token and refresh token
const generateTokens = (userId) => {
	// Generate the access token
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "15m",
	});

	// Generate the refresh token
	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "7d",
	});
	// Return both the access token and refresh token
	return { accessToken, refreshToken };
};
// Store the refresh token in Redis
const storeRefreshToken = async (userId, refreshToken) => {
	// Set the refresh token in Redis with the key: refresh_token:userId
	await redis.set(
		`refresh_token:${userId}`,
		refreshToken,
		"EX",
		7 * 24 * 60 * 60 * 1000
	); // 7days
};

// Set the access and refresh tokens as cookies on the response
const setCookie = (res, accessToken, refreshToken) => {
	// Set the access token cookie
	res.cookie("accessToken", accessToken, {
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict", // prevents CSRF attack, cross-site request forgery attack
		maxAge: 15 * 60 * 1000, // 15 minutes
	});

	// Set the refresh token cookie

	res.cookie("refreshToken", refreshToken, {
		httpOnly: true, // prevent XSS attacks, cross site scripting attack
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict", // prevents CSRF attack, cross-site request forgery attack
		maxAge: 7 * 24 * 60 * 60 * 1000, //  7 days
	});
};

// Signup user
export const signup = async (req, res) => {
	// Extract the email, password, and name from the request body
	const { name, email, password } = req.body;
	try {
		// Check if a user with the same email already exists
		const existUser = await User.findOne({ email });

		if (existUser) {
			// Return an error if the user already exists
			return res.status(400).json({ message: "user already exist" });
		}
		// Create a new user
		const user = await User.create({
			name,
			email,
			password,
		});

		// Authenticate the user
		//generate access token and refresh token
		const { accessToken, refreshToken } = generateTokens(user._id);
		//store refresh token
		storeRefreshToken(user._id, refreshToken);
		// Set the access and refresh tokens as cookies
		setCookie(res, accessToken, refreshToken);
		// Return the user's details
		res.status(200).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
		});
	} catch (error) {
		console.log("Error in signup controller", error);
		res.status(500).json({ message: error.message });
	}
};

// Login user
export const login = async (req, res) => {
	try {
		// Extract the email and password from the request body
		const { email, password } = req.body;
		// Find the user by email
		const user = await User.findOne({ email });
		// check if user exists and password is correct
		if (user && (await user.passwordCompare(password))) {
			// Authenticate the user
			//generate access token and refresh token
			const { accessToken, refreshToken } = generateTokens(user._id);
			//store refresh token
			storeRefreshToken(user._id, refreshToken);
			// Set the access and refresh tokens as cookies
			setCookie(res, accessToken, refreshToken);
			// Return the user's details
			res
				.status(200)
				.json({
					_id: user._id,
					name: user.name,
					email: user.email,
					role: user.role,
				});
		} else {
			// Return an error if the email or password is invalid
			res.status(400).json({ message: "Invalid email or password" });
		}
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ message: error.message });
	}
};

// Logout user
export const logout = async (req, res) => {
	try {
		// Extract the refresh token from the request cookies
		const refreshToken = req.cookies.refreshToken;
		// Check if refresh token exists
		if (refreshToken) {
			// Verify the refresh token
			let decoded;
			try {
				decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
			} catch (error) {
				console.log("Error verifying refresh token:", error.message);
				return res.status(401).json({ message: "Invalid refresh token" });
			}

			// Check if the refresh token is valid
			if (!decoded || !decoded.userId) {
				return res.status(401).json({ message: "Invalid token payload" });
			}
			// Delete the refresh token from Redis
			await redis.del(`refresh_token:${decoded.userId}`);
		}
		// Clear the access and refresh tokens cookies
		res.clearCookie("accessToken");
		res.clearCookie("refreshToken");
		// Return a success message
		res.status(200).json({ message: "Logout successful" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Refresh the access token
export const refreshToken = async (req, res) => {
	try {
		// Extract the refresh token from the request cookies
		const refreshToken = req.cookies.refreshToken;
		// If no refresh token is provided, return an error
		if (!refreshToken) {
			return res.status(400).json({ message: "No refresh token provided" });
		}
		// Verify the refresh token
		let decoded;
		try {
			decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
			
		} catch (error) {
			console.log("Error in verify refresh token", error.message);
		}
		// Check if the refresh token exists in Redis
		const storedToken = await redis.get(`refresh_token:${decoded.userId}`);
		// If the stored token does not match the refresh token, return an error
		if (storedToken !== refreshToken) {
			return res.status(400).json({ message: "Invalid refresh token" });
		}
		// Generate a new access token
		const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET);

		// Set the new access token cookie
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 15 * 60 * 1000,
		});
		// Return a success message
		res.status(200).json({ message: "Refresh token successful" });
	} catch (error) {
		console.log("Error in refreshToken controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

// Get the user's profile
export const getProfile = async (req, res) => {
	try {
		// Return the user's details
		res.status(200).json(req.user);
	} catch (error) {
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
