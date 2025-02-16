import express from 'express'
import dotenv from 'dotenv'
import {connectToDb} from './lib/db.js'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.route.js'
import productRouter from './routes/product.route.js'
import cartRouter from './routes/cart.route.js'
import analyticsRouter from './routes/analytics.route.js'
import paymentRouter from './routes/payment.route.js'
import couponRouter from './routes/coupon.route.js'


const app = express()
dotenv.config()
app.use(express.json({limit:"10mb"}))
app.use(cookieParser())

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/coupons", couponRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/analytics", analyticsRouter);

const PORT = process.env.PORT || 5000

app.listen(PORT,()=>{
    try {
        console.log(`server is running now on port ${PORT}`)
        connectToDb()
    } catch (error) {
        console.log("failed to run server")
    }
})