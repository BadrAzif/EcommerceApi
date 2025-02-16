import mongoose from "mongoose";

// Define the Coupon schema with code, discountPercentage, expirationDate, isActive, and userId fields
const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        discountPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        expirationDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
    },
    { timestamps: true }
);
// Create the Coupon model
const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
