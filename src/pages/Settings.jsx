import React, { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    nameAlt1: user?.nameAlt1 || "",
    nameAlt2: user?.nameAlt2 || "",
    firmName: user?.firmName || "",
    address: user?.address || "",
    phone: user?.phone || "",
    email: user?.email || "",
    description: user?.description || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: ""
  });
  const [msgProfile, setMsgProfile] = useState("");
  const [msgPassword, setMsgPassword] = useState("");

  if (!user) return null;

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setMsgProfile("");
    try {
      const res = await api.put("/users/me", profile);
      setMsgProfile("Profile updated.");
    } catch (err) {
      setMsgProfile(err?.response?.data?.message || "Could not update");
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    setMsgPassword("");
    try {
      await api.put("/users/me/password", passwordForm);
      setMsgPassword("Password changed. Please sign in again.");
      setPasswordForm({ currentPassword: "", newPassword: "" });
      logout();
    } catch (err) {
      setMsgPassword(err?.response?.data?.message || "Could not change password");
    }
  };

  return (
    <div className="settings-layout">
      <div className="card">
        <h2>Profile</h2>
        <p className="card-text">
          Update optional details to help RBB keep your records clear.
        </p>
        {msgProfile && <div className="alert-info">{msgProfile}</div>}
        <form className="form grid-2" onSubmit={updateProfile}>
          <label className="field">
            <span className="field-label">Alternate name 1</span>
            <input
              name="nameAlt1"
              value={profile.nameAlt1}
              onChange={handleProfileChange}
            />
          </label>
          <label className="field">
            <span className="field-label">Alternate name 2</span>
            <input
              name="nameAlt2"
              value={profile.nameAlt2}
              onChange={handleProfileChange}
            />
          </label>
          <label className="field">
            <span className="field-label">Firm</span>
            <input
              name="firmName"
              value={profile.firmName}
              onChange={handleProfileChange}
            />
          </label>
          <label className="field">
            <span className="field-label">Phone</span>
            <input
              name="phone"
              value={profile.phone}
              onChange={handleProfileChange}
            />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleProfileChange}
            />
          </label>
          <label className="field full-width">
            <span className="field-label">Address</span>
            <textarea
              name="address"
              rows={2}
              value={profile.address}
              onChange={handleProfileChange}
            />
          </label>
          <label className="field full-width">
            <span className="field-label">Description</span>
            <textarea
              name="description"
              rows={2}
              value={profile.description}
              onChange={handleProfileChange}
            />
          </label>
          <div className="field full-width">
            <button className="btn-primary" type="submit">
              Save profile
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Security</h2>
        <p className="card-text">
          Change your password to keep your account safe.
        </p>
        {msgPassword && <div className="alert-info">{msgPassword}</div>}
        <form className="form" onSubmit={updatePassword}>
          <label className="field">
            <span className="field-label">Current password</span>
            <input
              type="password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">New password</span>
            <input
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              required
            />
          </label>
          <button className="btn-outline" type="submit">
            Change password
          </button>
        </form>
      </div>
    </div>
  );
}