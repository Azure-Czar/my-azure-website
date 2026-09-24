import React, { useState, useEffect } from "react";
import "./App.css";

const API = process.env.REACT_APP_API_URL;

function App() {
  const [view, setView] = useState("home");
  const [darkMode, setDarkMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState(localStorage.getItem("role") || "user");

  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  // ---------- Dark Mode ----------
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // ---------- Load Tasks ----------
  useEffect(() => {
    if (token) {
      fetch(`${API}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setTasks(data))
        .catch(err => console.error("Error fetching tasks:", err));
    }
  }, [token]);

  // ---------- Load Users (Admin Only) ----------
  const loadUsers = async () => {
    if (!token || role !== "admin") return;
    const res = await fetch(`${API}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setUsers(data);
  };

  // ---------- Load Logs (Admin Only) ----------
  const loadLogs = async () => {
    if (!token || role !== "admin") return;
    const res = await fetch(`${API}/api/logs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setLogs(data);
  };

  // ---------- Signup ----------
  const handleSignup = async () => {
    const res = await fetch(`${API}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    alert(data.message || "Account created!");
  };

  // ---------- Login ----------
  const handleLogin = async () => {
    const res = await fetch(`${API}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    });

    const data = await res.json();

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role || "user");
      setToken(data.token);
      setRole(data.role || "user");
      setView("tasks");
    } else {
      alert(data.message || "Login failed");
    }
  };

  // ---------- Logout ----------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken("");
    setRole("user");
    setView("home");
    setTasks([]);
  };

  // ---------- Add Task ----------
  const addTask = async () => {
    const res = await fetch(`${API}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text: newTask })
    });

    const data = await res.json();
    setTasks([...tasks, data]);
    setNewTask("");
  };

  // ---------- Delete Task ----------
  const deleteTask = async (id) => {
    await fetch(`${API}/api/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    setTasks(tasks.filter(t => t._id !== id));
  };

  // ---------- Update User Role (Admin) ----------
  const updateUserRole = async (id, newRole) => {
    await fetch(`${API}/api/users/${id}/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole })
    });
    loadUsers();
  };

  // ---------- Disable/Enable User (Admin) ----------
  const toggleUserDisabled = async (id, disabled) => {
    await fetch(`${API}/api/users/${id}/disable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ disabled })
    });
    loadUsers();
  };

  return (
    <>
      {/* ---------- Header ---------- */}
      <div className="header">
        <div>Azure IAM Console</div>
        <div className="right">
          <button className="primary" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          {token && (
            <button className="primary" onClick={handleLogout}>
              Logout ({role})
            </button>
          )}
        </div>
      </div>

      <div className="layout">
        {/* ---------- Sidebar ---------- */}
        <div className="sidebar">
          <h3>Navigation</h3>
          <button onClick={() => setView("home")}>Home</button>
          <button onClick={() => setView("tasks")}>Tasks</button>

          {role === "admin" && (
            <>
              <button onClick={() => { setView("users"); loadUsers(); }}>
                Users
              </button>
              <button onClick={() => { setView("logs"); loadLogs(); }}>
                Logs
              </button>
              <button onClick={() => setView("settings")}>Settings</button>
            </>
          )}
        </div>

        {/* ---------- Main Content ---------- */}
        <div className="main">

          {/* ---------- Home ---------- */}
          {view === "home" && (
            <div className="panel">
              <h2>Welcome</h2>
              <p>This is your Azure‑style IAM dashboard.</p>
              <p>Features: RBAC, Conditional Access, Audit Logs, Geo‑IP, Risk Engine.</p>
            </div>
          )}

          {/* ---------- Signup / Login ---------- */}
          {!token && (
            <>
              <div className="panel">
                <h2>Sign Up</h2>
                <input
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <input
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button className="primary" onClick={handleSignup}>
                  Create Account
                </button>
              </div>

              <div className="panel">
                <h2>Login</h2>
                <input
                  placeholder="Email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                />
                <input
                  placeholder="Password"
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
                <button className="primary" onClick={handleLogin}>
                  Login
                </button>
              </div>
            </>
          )}

          {/* ---------- Tasks ---------- */}
          {token && view === "tasks" && (
            <div className="panel">
              <h2>Your Tasks</h2>

              <input
                placeholder="New task"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
              />
              <button className="primary" onClick={addTask}>
                Add Task
              </button>

              {tasks.map(t => (
                <div key={t._id} className="task-item">
                  {t.text}
                  <button
                    className="primary"
                    style={{ background: "#d9534f" }}
                    onClick={() => deleteTask(t._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ---------- User Management (Admin) ---------- */}
          {token && view === "users" && role === "admin" && (
            <div className="panel">
              <h2>User Management</h2>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Disabled</th>
                    <th>Risk</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>{u.email}</td>
                      <td>{u.role || "user"}</td>
                      <td>{u.disabled ? "Yes" : "No"}</td>
                      <td>{u.riskScore ?? 0}</td>
                      <td>
                        <button
                          className="primary"
                          onClick={() =>
                            updateUserRole(
                              u._id,
                              u.role === "admin" ? "user" : "admin"
                            )
                          }
                        >
                          Set {u.role === "admin" ? "User" : "Admin"}
                        </button>

                        <button
                          className="primary"
                          style={{ background: "#d9534f", marginLeft: 8 }}
                          onClick={() =>
                            toggleUserDisabled(u._id, !u.disabled)
                          }
                        >
                          {u.disabled ? "Enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- Audit Logs (Admin) ---------- */}
          {token && view === "logs" && role === "admin" && (
            <div className="panel">
              <h2>Audit Logs</h2>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>IP</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.type}</td>
                      <td>{log.actor}</td>
                      <td>{log.target}</td>
                      <td>{log.details}</td>
                      <td>{log.ip}</td>
                      <td>{log.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------- Settings ---------- */}
          {token && view === "settings" && role === "admin" && (
            <div className="panel">
              <h2>Settings / Conditional Access</h2>
              <ul>
                <li>Login allowed only during business hours (8am–6pm).</li>
                <li>Weak passwords are rejected at signup.</li>
                <li>Disabled accounts cannot log in.</li>
                <li>Only US IP addresses allowed.</li>
                <li>High-risk users (risk ≥ 80) are blocked.</li>
              </ul>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default App;