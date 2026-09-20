function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, 'SECRET123');
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({ email, password: hashed });
    res.json({ message: 'User created' });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, 'SECRET123', { expiresIn: '7d' });

  res.json({ token });
});

app.get('/api/tasks', auth, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId });
  res.json(tasks);
});

app.post('/api/tasks', auth, async (req, res) => {
  const task = await Task.create({
    text: req.body.text,
    done: false,
    userId: req.userId
  });
  res.json(task);
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { done: req.body.done },
    { new: true }
  );
  res.json(task);
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  await Task.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ message: 'Deleted' });
});
