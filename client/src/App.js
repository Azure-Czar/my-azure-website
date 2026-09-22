import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  console.log("API URL:", process.env.REACT_APP_API_URL);

  // AUTH STATES
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // LOADING + ERROR STATES
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // SIGNUP
  const signup = async (email, password) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/signup`, { email, password });
      alert("Account created! Please sign in.");
    } catch (err) {
      setError("Signup failed.");
    }
  };

  // LOGIN
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/login`, { email, password });
      setToken(res.data.token);
      setError(null);
    } catch {
      setError("Invalid email or password");
    }
  };

  // LOGOUT
  const logout = () => {
    setToken(null);
    setTodos([]);
  };

  // TODO STATES
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [theme, setTheme] = useState('light');

  // NEW FIELDS
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");

  // FILTER STATES
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");

  const API_BASE = `${process.env.REACT_APP_API_URL}/api/tasks`;

  // THEME SWITCHER
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // LOAD TASKS ONLY AFTER LOGIN
  useEffect(() => {
    if (!token) return;

    setLoading(true);

    axios.get(API_BASE, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setTodos(res.data))
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, [token]);

  // ADD TODO
  const addTodo = async () => {
    if (!text.trim()) return;

    try {
      const res = await axios.post(API_BASE, {
        text,
        category,
        priority,
        dueDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTodos(prev => [...prev, res.data]);
      setText('');
      setDueDate('');
      setCategory("General");
      setPriority("Low");

    } catch {
      setError("Could not add task.");
    }
  };

  // TOGGLE TODO
  const toggleTodo = async (id, completed) => {
    try {
      const res = await axios.put(`${API_BASE}/${id}`, { completed: !completed }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTodos(prev => prev.map(t => (t._id === id ? res.data : t)));
    } catch {
      setError("Could not update task.");
    }
  };

  // DELETE TODO
  const deleteTodo = async id => {
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTodos(prev => prev.filter(t => t._id !== id));
    } catch {
      setError("Could not delete task.");
    }
  };

  // FILTERING LOGIC
  const filteredTasks = todos.filter(t => {
    const categoryMatch = filterCategory === "All" || t.category === filterCategory;
    const priorityMatch = filterPriority === "All" || t.priority === filterPriority;
    return categoryMatch && priorityMatch;
  });

  return (
    <div className="container">

      {/* THEME BUTTON */}
      <button
        className="theme-toggle"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
      </button>

      <h1>Azure Todo App</h1>

      {token && <h2>Welcome, Chris</h2>}

      {/* AUTH BOX */}
      {!token && (
        <div className="auth-box">
          <h2>Sign In</h2>
          <input
            placeholder="Email"
            onChange={e => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            onChange={e => setPassword(e.target.value)}
          />
          <button onClick={() => login(email, password)}>Sign In</button>

          <h3>Create Account</h3>
          <button onClick={() => signup(email, password)}>Create Account</button>

          {error && <p className="error">{error}</p>}
        </div>
      )}

      {/* LOGOUT BUTTON */}
      {token && (
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      )}

      {/* LOADING MESSAGE */}
      {loading && <p className="loading">Loading your tasks...</p>}

      {/* ADD TODO */}
      {token && (
        <div className="input-row">

          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a task"
          />

          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="General">General</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Urgent">Urgent</option>
            <option value="Shopping">Shopping</option>
          </select>

          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />

          <button onClick={addTodo} disabled={loading}>Add</button>
        </div>
      )}

      {/* FILTERS */}
      {token && (
        <div className="filter-row">
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="General">General</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Urgent">Urgent</option>
            <option value="Shopping">Shopping</option>
          </select>

          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      )}

      {/* TODO LIST */}
      {token && (
        <ul>
          {filteredTasks.map(t => (
            <li key={t._id}>
              <span
                className={t.completed ? 'done' : ''}
                onClick={() => toggleTodo(t._id, t.completed)}
              >
                {t.text}
              </span>

              <small>Category: {t.category}</small>

              <small style={{
                color:
                  t.priority === "High" ? "#e74c3c" :
                  t.priority === "Medium" ? "#f1c40f" :
                  "#2ecc71"
              }}>
                Priority: {t.priority}
              </small>

              {t.dueDate && (
                <small>Due: {new Date(t.dueDate).toLocaleDateString()}</small>
              )}

              <button className="delete" onClick={() => deleteTodo(t._id)}>X</button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}

export default App;
