import mongoose from "mongoose";


export const connectToDb = async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("Connected To DB!")
    } catch (error) {
        console.log("failed to connect into Db!")
    }
}