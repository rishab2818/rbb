import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoansList() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function fetchLoans() {
      try {
        const res = await api.get("/loans");
        if (!cancelled) setLoans(res.data.loans || []);
      } catch (err) {
        if (!cancelled)
          setError(err?.response?.data?.message || "Unable to load loans");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLoans();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;
  const isAdmin = user.role === "admin";

  return (
    <div className="card">
      <h2>{isAdmin ? "All loans" : "My loans"}</h2>
      <p className="card-text">
        {isAdmin
          ? "Overview of loans disbursed from this panel."
          : "Loans registered under your customer profile."}
      </p>
      {loading && <div className="field-label">Loading...</div>}
      {error && <div className="alert-error">{error}</div>}
      {!loading && loans.length === 0 && (
        <div className="field-label">No loans yet.</div>
      )}
      {!loading && loans.length > 0 && (
        <div className="table-scroll">
          <div className="loans-list">
            <div className="loans-list-header">
              <span>Borrower</span>
              <span>Amount</span>
              <span>Rate (p.a.)</span>
              <span>Mode</span>
              <span>Status</span>
            </div>
            {loans.map((loan) => (
              <button
                key={loan._id}
                type="button"
                className="loans-list-row"
                onClick={() => navigate(`/app/loans/${loan._id}`)}
              >
                <span>
                  {loan.borrower?.namePrimary}{" "}
                  <span className="loans-list-sub">
                    ({loan.borrower?.userId})
                  </span>
                </span>
                <span>₹{loan.amount?.toLocaleString?.() || loan.amount}</span>
                <span>{loan.interestRate}%</span>
                <span>{loan.mode === "emi" ? "EMI" : "Normal"}</span>
                <span
                  className={`loan-status-pill loan-status-pill-${loan.status}`}
                >
                  {loan.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}