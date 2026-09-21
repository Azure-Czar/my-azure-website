const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============ DATABASE CONNECTION ============
// Put your MongoDB connection string in an Environment Variable called MONGODB_URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ============ MODELS ============
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// ============ AUTH MIDDLEWARE ============
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SECRET123');
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ ROUTES ============

// Signup
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});
// ================== IMPORTS ==================
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// ================== APP SETUP ==================
const app = express();
app.use(cors());
app.use(express.json());

// ================== DATABASE ==================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ================== MODELS ==================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// ================== AUTH MIDDLEWARE ==================
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ================== AUTH ROUTES ==================

// SIGNUP
app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed });
    await user.save();

    res.json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'defaultsecret',
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// ================== TASK ROUTES ==================

// GET TASKS
app.get('/api/tasks', authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId });
  res.json(tasks);
});

// ADD TASK
app.post('/api/tasks', authMiddleware, async (req, res) => {
  const { text } = req.body;
  const task = new Task({ text, userId: req.userId });
  await task.save();
  res.json(task);
});

// UPDATE TASK
app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  const { done } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { done },
    { new: true }
  );
  res.json(task);
});

// DELETE TASK
app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ message: 'Task deleted' });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

