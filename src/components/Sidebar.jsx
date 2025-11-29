import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === "admin";

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-circle">R</div>
        <div className="logo-text">
          <span className="logo-title">RBB</span>
          <span className="logo-subtitle">Trust. Clarity. Care.</span>
        </div>
        <button
          className={"hamburger" + (menuOpen ? " is-open" : "")}
          type="button"
          onClick={toggleMenu}
          aria-label="Toggle navigation"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      <nav className={"sidebar-nav" + (menuOpen ? " open" : "")}>
        <NavLink
          to="/app/loans"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " sidebar-link-active" : "")
          }
          onClick={() => setMenuOpen(false)}
        >
          Loans
        </NavLink>
        <NavLink
          to="/app/simulation"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " sidebar-link-active" : "")
          }
          onClick={() => setMenuOpen(false)}
        >
          Simulation
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/app/create-loan"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " sidebar-link-active" : "")
            }
            onClick={() => setMenuOpen(false)}
          >
            Create Loan
          </NavLink>
        )}
        {isAdmin && (
          <NavLink
            to="/app/create-user"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " sidebar-link-active" : "")
            }
            onClick={() => setMenuOpen(false)}
          >
            Create User
          </NavLink>
        )}
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " sidebar-link-active" : "")
          }
          onClick={() => setMenuOpen(false)}
        >
          Settings
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar-circle">
            {(user.namePrimary || user.userId || "U").charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">
              {user.namePrimary || user.userId}
            </span>
            <span className="sidebar-user-id">{user.userId}</span>
          </div>
        </div>
        <button className="btn-outline" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}