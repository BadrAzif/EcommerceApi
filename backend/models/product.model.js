import mongoose from "mongoose";

// Define the Product schema name, description, price, image, category, and isFeatured
const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true," Please provide a name"],
        min:[3," Name must be at least 3 characters"]
    },
    description:{
        type:String,
        required:[true," Please provide a description"],
        min:[10," Description must be at least 10 characters"]
    },
    price:{
        type:Number,
        required:[true," Please provide a price"],
    },
    image:{
        type:String,
        required:[true," Please provide an image"],
    },category:{
        type:String,
        required:[true," Please provide a category"],
    },
    isfeatured:{
        type:Boolean,
        default:false
    }
})

// Create the Product model
const Product = mongoose.model("Product",productSchema)


export default Product;
