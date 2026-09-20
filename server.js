require("dotenv").config();
const express = require("express");
const connectDB = require("./db");
const Task = require("./models/Task");

const app = express();
app.use(express.json());

// Connect to Cosmos DB
connectDB();

// GET all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await Task.find({ userId: "default" });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new task
app.post("/api/tasks", async (req, res) => {
  try {
    const task = await Task.create({
      text: req.body.text,
      completed: false,
      userId: "default"
    });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
