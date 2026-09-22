router.post("/tasks", authMiddleware, async (req, res) => {
  try {
    const { text, category, priority, dueDate } = req.body;

    const task = await Task.create({
      userId: req.user.id,
      text,
      category,
      priority,
      dueDate
    });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create task" });
  }
});
