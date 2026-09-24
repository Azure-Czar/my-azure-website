require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
const geoip = require("geoip-lite");

const app = express();
app.use(express.json());
app.use(cors());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db, users, tasks, logs, alerts;

// ---------- DB Connection ----------
async function connectDB() {
  await client.connect();
  db = client.db("todoapp");
  users = db.collection("users");
  tasks = db.collection("tasks");
  logs = db.collection("logs");
  alerts = db.collection("alerts");
  console.log("Connected to Cosmos DB (Mongo API)");
}
connectDB();

// ---------- IP / Geo Helpers ----------
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "0.0.0.0"
  );
}

function getGeo(ip) {
  const geo = geoip.lookup(ip);
  return geo || { country: "Unknown", city: "Unknown", region: "Unknown", ll: null };
}

// Allow only US logins (example IP rule)
function isAllowedIP(ip) {
  const allowedCountries = ["US"];
  const geo = geoip.lookup(ip);
  if (!geo) return false;
  return allowedCountries.includes(geo.country);
}

// ---------- Distance / Impossible Travel Helpers ----------
function haversineDistanceKm(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lon - coord1.lon);

  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isImpossibleTravel(prev, current) {
  if (!prev || !current) return false;
  const distanceKm = haversineDistanceKm(
    { lat: prev.lat, lon: prev.lon },
    { lat: current.lat, lon: current.lon }
  );
  const timeDiffHours =
    (current.time.getTime() - prev.time.getTime()) / (1000 * 60 * 60);

  if (timeDiffHours <= 0) return false;

  const speedKmPerHour = distanceKm / timeDiffHours;

  // Simple threshold: > 1000 km/h treated as impossible for normal users
  return speedKmPerHour > 1000;
}

// ---------- Audit Logging ----------
function logEvent(type, actor, target, details = "", req = null) {
  let ip = "unknown";
  let geo = { city: "Unknown", country: "Unknown" };

  if (req) {
    ip = getClientIP(req);
    geo = getGeo(ip);
  }

  logs.insertOne({
    type,
    actor,
    target,
    details,
    ip,
    location: `${geo.city}, ${geo.country}`,
    timestamp: new Date()
  });
}

// ---------- Alerts ----------
async function createAlert(type, email, details, req = null) {
  let ip = "unknown";
  let geo = { city: "Unknown", country: "Unknown" };

  if (req) {
    ip = getClientIP(req);
    geo = getGeo(ip);
  }

  await alerts.insertOne({
    type,
    email,
    details,
    ip,
    location: `${geo.city}, ${geo.country}`,
    timestamp: new Date()
  });
}

// ---------- Conditional Access Helpers ----------
function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function isBusinessHours() {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 8 && hour <= 18; // 8am–6pm
}

// ---------- Risk Engine Helpers ----------
async function adjustRisk(email, delta) {
  await users.updateOne(
    { email },
    { $inc: { riskScore: delta } }
  );
}

async function setRisk(email, value) {
  const risk = Math.max(0, Math.min(100, value));
  await users.updateOne(
    { email },
    { $set: { riskScore: risk } }
  );
}

// ---------- Auth Middleware ----------
async function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await users.findOne({ _id: new ObjectId(decoded.id) });

    if (!user || user.disabled) {
      return res.status(403).json({ message: "Account disabled or missing" });
    }

    req.user = {
      id: decoded.id,
      role: user.role || "user",
      email: user.email,
      riskScore: user.riskScore ?? 0
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin role required" });
  }
  next();
}

// ---------- Health ----------
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running" });
});

// ---------- Signup ----------
app.post("/api/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!isStrongPassword(password)) {
    logEvent("signup_weak_password", email, email, "Weak password rejected", req);
    return res.json({
      message:
        "Password must be at least 8 characters with upper, lower, and number.",
    });
  }

  const existing = await users.findOne({ email });
  if (existing) {
    logEvent("signup_existing_email", email, email, "Email already exists", req);
    return res.json({ message: "Email already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  await users.insertOne({
    email,
    password: hashed,
    role: "user",
    disabled: false,
    riskScore: 0,
    lastLoginAt: null,
    lastLoginLocation: null,
    createdAt: new Date(),
  });

  logEvent("signup", email, email, "User created", req);
  res.json({ message: "Account created successfully" });
});

// ---------- Login (Business Hours + IP Rules + Geo + Risk + Alerts + Impossible Travel) ----------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const ip = getClientIP(req);
  const geo = getGeo(ip);
  const now = new Date();

  // Business hours policy
  if (!isBusinessHours()) {
    await adjustRisk(email, 20);
    logEvent(
      "login_blocked",
      email,
      email,
      `Blocked by business-hours policy | IP: ${ip} | ${geo.city}, ${geo.country}`,
      req
    );
    await createAlert(
      "business_hours_violation",
      email,
      "Login attempted outside allowed hours",
      req
    );
    return res.json({
      message: "Login only allowed during business hours (8am–6pm).",
    });
  }

  // IP-based Conditional Access
  if (!isAllowedIP(ip)) {
    await adjustRisk(email, 20);
    logEvent(
      "login_blocked",
      email,
      email,
      `Blocked by IP policy | IP: ${ip} | ${geo.city}, ${geo.country}`,
      req
    );
    await createAlert(
      "ip_policy_violation",
      email,
      "Login blocked due to IP restrictions",
      req
    );
    return res.json({
      message: "Login blocked due to IP restrictions.",
    });
  }

  const user = await users.findOne({ email });
  if (!user) {
    await adjustRisk(email, 10);
    logEvent(
      "login_failure",
      email,
      email,
      `Invalid email | IP: ${ip} | ${geo.city}, ${geo.country}`,
      req
    );
    await createAlert(
      "failed_login",
      email,
      "Failed login attempt (invalid email)",
      req
    );
    return res.json({ message: "Invalid email or password" });
  }

  // High-risk lockout
  if ((user.riskScore ?? 0) >= 80) {
    logEvent(
      "login_blocked",
      email,
      email,
      `Blocked due to high risk (${user.riskScore}) | IP: ${ip} | ${geo.city}, ${geo.country}`,
      req
    );
    await createAlert(
      "high_risk_lockout",
      email,
      `User blocked due to high risk (${user.riskScore})`,
      req
    );
    return res.json({
      message: "Login blocked due to high risk score. Contact an administrator.",
    });
  }

  if (user.disabled) {
    await adjustRisk(email, 15);
    logEvent(
      "login_blocked",
      email,
      email,
      `Account disabled | IP: ${ip} | ${geo.city}, ${geo.country}`,
      req
    );
    await createAlert(
      "disabled_account_login",
      email,
      "Login attempt on disabled account",
      req
    );
    return res.json({ message: "Account is disabled by admin." });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    await adjustRisk(email, 10);
    logEvent(
      "login_failure",
      email,
      email,
      `Invalid password | IP: ${ip} | ${geo.city}, ${geo.country}`,
      req
    );
    await createAlert(
      "failed_login",
      email,
      "Failed login attempt (invalid password)",
      req
    );
    return res.json({ message: "Invalid email or password" });
  }

  // ---------- Impossible Travel Check ----------
  if (user.lastLoginAt && user.lastLoginLocation && geo.ll) {
    const prev = {
      time: new Date(user.lastLoginAt),
      lat: user.lastLoginLocation.lat,
      lon: user.lastLoginLocation.lon
    };
    const current = {
      time: now,
      lat: geo.ll[0],
      lon: geo.ll[1]
    };

    if (isImpossibleTravel(prev, current)) {
      await adjustRisk(email, 30);
      const details = `Impossible travel detected: ${user.lastLoginLocation.city}, ${user.lastLoginLocation.country} → ${geo.city}, ${geo.country}`;
      logEvent("impossible_travel", email, email, details, req);
      await createAlert("impossible_travel", email, details, req);
    }
  }

  // Successful login lowers risk slightly
  await adjustRisk(email, -5);

  // Update last login info
  await users.updateOne(
    { email },
    {
      $set: {
        lastLoginAt: now,
        lastLoginLocation: {
          lat: geo.ll ? geo.ll[0] : null,
          lon: geo.ll ? geo.ll[1] : null,
          city: geo.city,
          country: geo.country
        }
      }
    }
  );

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  logEvent(
    "login_success",
    email,
    email,
    `Login success | IP: ${ip} | ${geo.city}, ${geo.country}`,
    req
  );
  res.json({ token, role: user.role || "user" });
});

// ---------- Tasks ----------
app.get("/api/tasks", auth, async (req, res) => {
  const userId = req.user.id;
  const userTasks = await tasks.find({ userId }).toArray();
  res.json(userTasks);
});

app.post("/api/tasks", auth, async (req, res) => {
  const userId = req.user.id;
  const { text } = req.body;

  const newTask = {
    text,
    userId,
    createdAt: new Date(),
  };

  const result = await tasks.insertOne(newTask);
  newTask._id = result.insertedId;

  logEvent(
    "task_created",
    req.user.email,
    newTask._id.toString(),
    text,
    req
  );
  res.json(newTask);
});

app.delete("/api/tasks/:id", auth, async (req, res) => {
  const userId = req.user.id;
  const id = req.params.id;

  await tasks.deleteOne({ _id: new ObjectId(id), userId });

  logEvent("task_deleted", req.user.email, id, "Task deleted", req);
  res.json({ message: "Task deleted" });
});

// ---------- User Management (Admin only) ----------
app.get("/api/users", auth, requireAdmin, async (req, res) => {
  const allUsers = await users
    .find({}, { projection: { password: 0 } })
    .toArray();
  res.json(allUsers);
});

app.post("/api/users/:id/role", auth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { role } = req.body;

  await users.updateOne(
    { _id: new ObjectId(id) },
    { $set: { role: role || "user" } }
  );

  logEvent(
    "role_change",
    req.user.email,
    id,
    `Role set to ${role || "user"}`,
    req
  );

  res.json({ message: "Role updated" });
});

app.post("/api/users/:id/disable", auth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  const { disabled } = req.body;

  await users.updateOne(
    { _id: new ObjectId(id) },
    { $set: { disabled: !!disabled } }
  );

  logEvent(
    "account_status_change",
    req.user.email,
    id,
    disabled ? "Disabled" : "Enabled",
    req
  );

  res.json({ message: "Account status updated" });
});

// ---------- Audit Logs (Admin only) ----------
app.get("/api/logs", auth, requireAdmin, async (req, res) => {
  const allLogs = await logs
    .find({})
    .sort({ timestamp: -1 })
    .toArray();
  res.json(allLogs);
});

// ---------- Security Alerts (Admin only) ----------
app.get("/api/alerts", auth, requireAdmin, async (req, res) => {
  const allAlerts = await alerts
    .find({})
    .sort({ timestamp: -1 })
    .toArray();
  res.json(allAlerts);
});

// ---------- Start Server ----------
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));