import React, { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function CreateUser() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    userId: "",
    password: "",
    role: "customer",
    namePrimary: "",
    nameAlt1: "",
    nameAlt2: "",
    firmName: "",
    address: "",
    phone: "",
    email: "",
    description: ""
  });
  const [message, setMessage] = useState("");

  if (!user || user.role !== "admin") {
    return (
      <div className="card">
        <h2>Access restricted</h2>
        <p>Only administrators can create users.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.post("/users", form);
      setMessage("User created successfully.");
      setForm((prev) => ({
        ...prev,
        userId: "",
        password: "",
        namePrimary: "",
        phone: "",
        email: ""
      }));
    } catch (err) {
      setMessage(err?.response?.data?.message || "Could not create user");
    }
  };

  return (
    <div className="card">
      <h2>Create customer / staff</h2>
      <p className="card-text">
        Admin can create loan customers or other admins. All fields marked * are
        mandatory.
      </p>
      {message && <div className="alert-info">{message}</div>}
      <form className="form grid-2" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Primary name *</span>
          <input
            name="namePrimary"
            value={form.namePrimary}
            onChange={handleChange}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">User ID *</span>
          <input
            name="userId"
            value={form.userId}
            onChange={handleChange}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Phone *</span>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Email *</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Password *</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Role</span>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Alternate name 2</span>
          <input
            name="nameAlt1"
            value={form.nameAlt1}
            onChange={handleChange}
          />
        </label>
        <label className="field">
          <span className="field-label">Alternate name 3</span>
          <input
            name="nameAlt2"
            value={form.nameAlt2}
            onChange={handleChange}
          />
        </label>
        <label className="field">
          <span className="field-label">Firm name</span>
          <input
            name="firmName"
            value={form.firmName}
            onChange={handleChange}
          />
        </label>
        <label className="field">
          <span className="field-label">Address</span>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
          />
        </label>
        <label className="field full-width">
          <span className="field-label">Description</span>
          <textarea
            name="description"
            rows={2}
            value={form.description}
            onChange={handleChange}
          />
        </label>
        <div className="field full-width">
          <button className="btn-primary" type="submit">
            Create user
          </button>
        </div>
      </form>
    </div>
  );
}