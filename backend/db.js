const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log("Connected to Cosmos DB");
}

module.exports = connectDB;

