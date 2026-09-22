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
    .then(res => setTodos(res.data))
    .catch(err => console.error(err))
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

    setTodos(prev => [...prev, res.data]);
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
      `https://my-azure-website-hsaug2hxbpfkephs.centralus-01.azurewebsites.net/api/tasks/${id}`,
      { completed: !completed },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    setTodos(prev => prev.map(t => (t._id === id ? res.data : t)));
  } catch {
    setError("Could not update task.");
  }
};

// DELETE TODO
const deleteTodo = async id => {
  try {
    await axios.delete(
      `https://my-azure-website-hsaug2hxbpfkephs.centralus-01.azurewebsites.net/api/tasks/${id}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    setTodos(prev => prev.filter(t => t._id !== id));
  } catch {
    setError("Could not delete task.");
  }
};

