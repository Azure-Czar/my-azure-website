import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: "General"
  },
  priority: {
    type: String,
    default: "Low"
  },
  dueDate: {
    type: String,
    default: ""
  },
  completed: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    required: true
  }
});

const Task = mongoose.model("Task", TaskSchema);

export default Task;