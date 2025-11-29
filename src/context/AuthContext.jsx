import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("rbb_token");
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function loadMe() {
      try {
        const res = await api.get("/auth/me");
        if (!cancelled) setUser(res.data.user);
      } catch {
        localStorage.removeItem("rbb_token");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("rbb_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("rbb_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}