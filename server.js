const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve React build
app.use(express.static(path.join(__dirname, 'client', 'build')));

// In-memory todos
let todos = [];

app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const todo = { id: Date.now(), text: req.body.text, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  todos = todos.map(t =>
    t.id === id ? { ...t, done: req.body.done ?? t.done } : t
  );
  res.json(todos.find(t => t.id === id));
});

app.delete('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  todos = todos.filter(t => t.id !== id);
  res.status(204).end();
});

// Serve React index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

// REQUIRED for Azure
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API running on port ${port}`));
