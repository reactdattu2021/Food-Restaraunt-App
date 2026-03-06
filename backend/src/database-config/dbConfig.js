import mongoose from "mongoose";

const sitename = process.env.SITE_NAME;

const dbConnnection = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL, {
            dbName: process.env.DB_NAME || sitename,
        });

        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

export { dbConnnection };