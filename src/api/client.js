import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "https://rbb-backend.onrender.com";

export const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rbb_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});