// server.js

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db.js";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";

dotenv.config();

const app = express();

// CORS FIX — THIS IS WHAT ALLOWS YOUR FRONTEND TO TALK TO YOUR BACKEND
app.use(
  cors({
    origin: "https://victorious-pond-06dfbbf10.5.azurestaticapps.net",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  })
);

// Middleware
app.use(express.json());

// Routes
app.use("/api", authRoutes);
app.use("/api/tasks", taskRoutes);

// Connect to DB
connectDB();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`