import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function Auth({ setToken }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const endpoint = isLogin ? '/api/login' : '/api/signup';

    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, {
        email,
        password
      });

      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
      } else {
        alert('Account created! You can now log in.');
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="container">
      <h1>{isLogin ? 'Login' : 'Sign Up'}</h1>

      <div className="input-row">
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div className="input-row">
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      <button onClick={submit}>
        {isLogin ? 'Login' : 'Create Account'}
      </button>

      <button
        className="theme-toggle"
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? 'Need an account?' : 'Already have an account?'}
      </button>
    </div>
  );
}

export default Auth;
