import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import CreateUser from "./pages/CreateUser";
import Settings from "./pages/Settings";
import CreateLoan from "./pages/CreateLoan";
import LoansList from "./pages/LoansList";
import LoanDetail from "./pages/LoanDetail";
import Playground from "./pages/Playground";
import Simulation from "./pages/Simulation";

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullpage-center">
        <div className="loader" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/app/loans" replace />} />
          <Route path="/app">
            <Route path="loans" element={<LoansList />} />
            <Route path="loans/:loanId" element={<LoanDetail />} />
            <Route path="loans/:loanId/playground" element={<Playground />} />
            <Route path="simulation" element={<Simulation />} />
            <Route path="create-user" element={<CreateUser />} />
            <Route path="create-loan" element={<CreateLoan />} />
            <Route path="settings" element={<Settings />} />
          </Route>
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<ProtectedApp />} />
    </Routes>
  );
}