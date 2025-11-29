import React from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <header className="app-header">
          <div>
            <div className="app-header-title">Welcome to RBB</div>
            {user && (
              <div className="app-header-subtitle">
                Hello, {user.namePrimary || user.userId}
              </div>
            )}
          </div>
        </header>
        <section className="app-content">{children}</section>
      </main>
    </div>
  );
}