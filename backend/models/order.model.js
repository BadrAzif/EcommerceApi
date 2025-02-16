import mongoose from "mongoose";

// Define the Order schema with user, products, totalAmount, and stripeSessionId fields
const orderSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    products:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            default:1,
            required:true
        },
        price:{
            type:Number,
            min:0,
            required:true
        }
    }],
    totalAmount:{
        type:Number,
        min:0,
        required:true
    },
    stripeSessionId:{
        type:String,
        unique:true
    }
},
{
    timestamps:true
}
);

// Create the Order model
const Order = mongoose.model("Order", orderSchema);


export default Order;
