import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [theme, setTheme] = useState('light');

  const API_BASE = "https://azure-todo-backend-azfsdjgaa9buejhk.centralus-01.azurewebsites.net/api/tasks";

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    axios.get(API_BASE)
      .then(res => setTodos(res.data))
      .catch(err => console.error(err));
  }, []);

  const addTodo = async () => {
    if (!text.trim()) return;
    const res = await axios.post(API_BASE, { text });
    setTodos(prev => [...prev, res.data]);
    setText('');
  };

  const toggleTodo = async (id, done) => {
    const res = await axios.put(`${API_BASE}/${id}`, { done: !done });
    setTodos(prev => prev.map(t => (t._id === id ? res.data : t)));
  };

  const deleteTodo = async id => {
    await axios.delete(`${API_BASE}/${id}`);
    setTodos(prev => prev.filter(t => t._id !== id));
  };

  return (
    <div className="container">
      <button
        className="theme-toggle"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        Toggle {theme === 'light' ? 'Dark' : 'Light'} Mode
      </button>

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
          <li key={t._id}>
            <span
              className={t.done ? 'done' : ''}
              onClick={() => toggleTodo(t._id, t.done)}
            >
              {t.text}
            </span>
            <button className="delete" onClick={() => deleteTodo(t._id)}>X</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
