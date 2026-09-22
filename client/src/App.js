import React, { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [token, setToken] = useState(null);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [text, setText] = useState("");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");

  // SIGNUP
  const signup = async (email, password) => {
    try {
      await axios.post(
        "https://my-azure-website-hsaug2hxbpfkephs.centralus-01.azurewebsites.net/api/signup",
        { email, password }
      );
      alert("Account created! Please sign in.");
    } catch (err) {
      setError("Signup failed.");
    }
  };

  // LOGIN
  const login = async (email, password) => {
    try {
      const res = await axios.post(
        "https://my-azure-website-hsaug2hxbpfkephs.centralus-01.azurewebsites.net/api/login",
        { email, password }
      );
      setToken(res.data.token);
      setError(null);
    } catch {
      setError("Invalid email or password");
    }
  };

  // API BASE
  const API_BASE =
    "https://my-azure-website-hsaug2hxbpfkephs.centralus-01.azurewebsites.net/api/tasks";

  // LOAD TASKS
  useEffect(() => {
    if (!token) return;

    setLoading(true);

    axios
      .get(API_BASE, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => setTodos(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token]);

  // ADD TODO
  const addTodo = async () => {
    if (!text.trim()) return;

    try {
      const res = await axios.post(
        API_BASE,
        {
          text,
          category,
          priority,
          dueDate
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setTodos((prev) => [...prev, res.data]);
      setText("");
      setDueDate("");
      setCategory("General");
      setPriority("Low");
    } catch {
      setError("Could not add task.");
    }
  };

  // TOGGLE TODO
  const toggleTodo = async (id, completed) => {
    try {
      const res = await axios.put(
        `${API_BASE}/${id}`,
        { completed: !completed },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setTodos((prev) => prev.map((t) => (t._id === id ? res.data : t)));
    } catch {
      setError("Could not update task.");
    }
  };

  // DELETE TODO
  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${API_BASE}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTodos((prev) => prev.filter((t) => t._id !== id));
    } catch {
      setError("Could not delete task.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>My Azure Task App</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* AUTH SECTION */}
      {!token && (
        <div style={{ marginBottom: "20px" }}>
          <h2>Sign Up</h2>
          <input type="email" id="signupEmail" placeholder="Email" />
          <input type="password" id="signupPassword" placeholder="Password" />
          <button
            onClick={() =>
              signup(
                document.getElementById("signupEmail").value,
                document.getElementById("signupPassword").value
              )
            }
          >
            Create Account
          </button>

          <h2>Login</h2>
          <input type="email" id="loginEmail" placeholder="Email" />
          <input type="password" id="loginPassword" placeholder="Password" />
          <button
            onClick={() =>
              login(
                document.getElementById("loginEmail").value,
                document.getElementById("loginPassword").value
              )
            }
          >
            Login
          </button>
        </div>
      )}

      {/* ADD TASK */}
      {token && (
        <div style={{ marginBottom: "20px" }}>
          <h2>Add Task</h2>
          <input
            type="text"
            placeholder="Task text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>General</option>
            <option>Work</option>
            <option>Home</option>
            <option>Urgent</option>
          </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <button onClick={addTodo}>Add Task</button>
        </div>
      )}

      {/* TASK LIST */}
      {token && (
        <div>
          <h2>Your Tasks</h2>

          {loading && <p>Loading tasks...</p>}

          {todos.map((todo) => (
            <div key={todo._id} style={{ marginBottom: "10px" }}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo._id, todo.completed)}
              />

              <span
                style={{
                  textDecoration: todo.completed ? "line-through" : "none",
                  marginLeft: "10px"
                }}
              >
                {todo.text} — {todo.category} — {todo.priority}
              </span>

              <button
                style={{ marginLeft: "10px" }}
                onClick={() => deleteTodo(todo._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;