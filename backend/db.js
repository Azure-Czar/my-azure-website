import mongoose from "mongoose";

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      console.error("MONGO_URI is missing in environment variables");
      process.exit(1);
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("Connected to Cosmos DB (MongoDB API)");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}

export default connectDB;
