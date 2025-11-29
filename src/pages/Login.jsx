import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { userId, password });
      login(res.data.token, res.data.user);
      navigate("/app/loans");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo-lockup">
          <div className="logo-circle">R</div>
          <div className="logo-text">
            <span className="logo-title">RBB</span>
            <span className="logo-subtitle">Small Bank. Big Trust.</span>
          </div>
        </div>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">
          Log in with your RBB user ID and password.
        </p>
        {error && <div className="alert-error">{error}</div>}
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">User ID</span>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn-primary full-width" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}