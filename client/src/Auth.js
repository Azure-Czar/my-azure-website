const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports = function (usersCollection) {
  const router = express.Router();

  // -----------------------------
  // Signup
  // -----------------------------
  router.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    try {
      const existing = await usersCollection.findOne({ email });
      if (existing) {
        return res.json({ message: "Email already exists" });
      }

      const hashed = await bcrypt.hash(password, 10);

      await usersCollection.insertOne({
        email,
        password: hashed,
        createdAt: new Date(),
      });

      res.json({ message: "Account created successfully" });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ message: "Server error during signup" });
    }
  });

  // -----------------------------
  // Login
  // -----------------------------
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.json({ message: "Invalid email or password" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.json({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error during login" });
    }
  });

  return router;
};