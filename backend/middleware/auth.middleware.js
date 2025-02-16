import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware to protect routes and authenticate users
export const protectRoute = async (req, res, next) => {
  try {
    // Extract the access token from cookies
    const refreshToken = req.cookies.refreshToken;

    // If no token is provided, return unauthorized
    if (!refreshToken) {
      return res.status(401).json({ message: "Unauthorized - No access token" });
    }
    try {
      // Verify the token using the secret key
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      } catch (error) {
        console.log("Error in verify refresh token", error.message);
      }
      // Find the user by the decoded user ID and exclude the password
      const user = await User.findById(decoded.userId).select("-password");
      // If user does not exist, return unauthorized
      if (!user) {
        return res.status(401).json({ message: "Unauthorized - User not found" });
      }
      // Attach the user object to the request for later use
      req.user = user;

      // Continue to the next middleware or route handler
      next()
    } catch (error) {
      // Handle token expiration error separately
      if(error.name === "TokenExpiredError"){
        return res.status(401).json({ message: "Unauthorized - Access token expired" });
      }
      throw Error
    }
  } catch (error) {
    console.log("Error in protectRoute middleware:", error.message);
    return res.status(401).json({ message: "Unauthorized - Invalid access token" });
  }
};

// Middleware to restrict access to admin-only routes
export const adminRoute = (req, res, next) => {
  // Check if the authenticated user is an admin
  if (req.user.role === "admin")
    // Allow access
    next()
  else {
    return res.status(403).json({ message: "Access denied - Admin only" });
  }
};
