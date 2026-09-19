import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    axios.get('/api/todos').then(res => setTodos(res.data));
  }, []);

  const addTodo = async () => {
    if (!text.trim()) return;
    const res = await axios.post('/api/todos', { text });
    setTodos(prev => [...prev, res.data]);
    setText('');
  };

  const toggleTodo = async (id, done) => {
    const res = await axios.put(`/api/todos/${id}`, { done: !done });
    setTodos(prev => prev.map(t => (t.id === id ? res.data : t)));
  };

  const deleteTodo = async id => {
    await axios.delete(`/api/todos/${id}`);
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="container">
      <h1>Azure Todo App</h1>

      <div className="input-row">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a task"
        />
        <button onClick={addTodo}>Add</button>
      </div>

      <ul>
        {todos.map(t => (
          <li key={t.id}>
            <span
              className={t.done ? 'done' : ''}
              onClick={() => toggleTodo(t.id, t.done)}
            >
              {t.text}
            </span>
            <button className="delete" onClick={() => deleteTodo(t.id)}>X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

