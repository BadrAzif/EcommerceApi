import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Define the User schema name, email, password, cartItems, and role
const userSchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:[true, "Please provide a name"],
            min:[3, "Name must be at least 3 characters"],
        },
        email: {
            type: String,
            required: [true, "Please provide an email"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, "Please provide a password"],
            min: [8, "Password must be at least 8 characters"],
        },
        cartItems: [
            {
                products: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                },
                quantity: {
                    type: Number,
                    default: 1,
                },
            },
        ],
        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
        },
    },
    { timestamps: true }
);

// Pre-save hook: Hash the password before saving it to the database
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare a given password with the stored hashed password
userSchema.methods.passwordCompare = async function (password) {
    return bcrypt.compare(password, this.password);
};
// Create the User model
const User = mongoose.model("User", userSchema);

export default User;
