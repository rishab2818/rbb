import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function CreateLoan() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loanForm, setLoanForm] = useState({
    amount: "",
    startDate: "",
    interestRate: "",
    mode: "emi",
    loanType: "principal_first",
    tenureMonths: "",
    note: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setSelectedUser(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get("/users/search", { params: { q: search.trim() } });
        if (!cancelled) {
          const users = res.data.users || [];
          setResults(users);
          if (users.length === 1) setSelectedUser(users[0]);
        }
      } catch (err) {
        if (!cancelled) setMessage(err?.response?.data?.message || "Search failed");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search]);

  if (!user || user.role !== "admin") {
    return (
      <div className="card">
        <h2>Access restricted</h2>
        <p>Only administrators can create loans.</p>
      </div>
    );
  }

  const handleLoanChange = (e) => {
    const { name, value } = e.target;
    setLoanForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitLoan = async (e) => {
    e.preventDefault();
    if (!selectedUser) {
      setMessage("Please select a borrower first.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const payload = {
        userId: selectedUser.userId,
        amount: Number(loanForm.amount),
        startDate: loanForm.startDate,
        interestRate: Number(loanForm.interestRate),
        mode: loanForm.mode,
        loanType: loanForm.loanType,
        tenureMonths: loanForm.tenureMonths
          ? Number(loanForm.tenureMonths)
          : undefined,
        note: loanForm.note || undefined
      };
      const res = await api.post("/loans", payload);
      setMessage(
        `Loan created for ${res.data.loan.borrower.namePrimary} (ID: ${res.data.loan.borrower.userId}).`
      );
      setLoanForm({
        amount: "",
        startDate: "",
        interestRate: "",
        mode: "emi",
        loanType: "principal_first",
        tenureMonths: "",
        note: ""
      });
    } catch (err) {
      setMessage(err?.response?.data?.message || "Could not create loan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Create loan</h2>
      <p className="card-text">
        Start typing a customer User ID or name, pick them, then set the loan terms.
      </p>
      {message && <div className="alert-info">{message}</div>}

      <div className="form">
        <div className="loan-search-row">
          <label className="field flex-1">
            <span className="field-label">Search customer</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="User ID or name"
            />
          </label>
          {searching && <div className="field-label">Searching...</div>}
        </div>
      </div>

      {results.length > 0 && (
        <div className="loan-search-results">
          <div className="loan-search-header">
            <span className="field-label">Matching customers</span>
          </div>
          <div className="loan-search-list">
            {results.map((u) => (
              <button
                key={u._id}
                type="button"
                className={
                  "loan-search-item" +
                  (selectedUser && selectedUser._id === u._id
                    ? " loan-search-item-selected"
                    : "")
                }
                onClick={() => setSelectedUser(u)}
              >
                <div className="loan-search-name">{u.namePrimary}</div>
                <div className="loan-search-sub">
                  <span>{u.userId}</span>
                  <span>{u.phone}</span>
                  <span>{u.email}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="loan-borrower-summary">
          <div className="field-label">Selected borrower</div>
          <div className="loan-borrower-card">
            <div className="loan-borrower-name">{selectedUser.namePrimary}</div>
            <div className="loan-borrower-meta">
              <span>ID: {selectedUser.userId}</span>
              {selectedUser.firmName && <span>Firm: {selectedUser.firmName}</span>}
              {selectedUser.address && <span>{selectedUser.address}</span>}
            </div>
          </div>
        </div>
      )}

      <form className="form grid-2" onSubmit={submitLoan}>
        <label className="field">
          <span className="field-label">Amount *</span>
          <input
            type="number"
            name="amount"
            value={loanForm.amount}
            onChange={handleLoanChange}
            min="0"
            step="0.01"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Start date *</span>
          <input
            type="date"
            name="startDate"
            value={loanForm.startDate}
            onChange={handleLoanChange}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Rate of interest (per annum, %)</span>
          <input
            type="number"
            name="interestRate"
            value={loanForm.interestRate}
            onChange={handleLoanChange}
            min="0"
            step="0.01"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Mode</span>
          <select
            name="mode"
            value={loanForm.mode}
            onChange={handleLoanChange}
          >
            <option value="emi">EMI</option>
            <option value="normal">Normal mode</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Loan type</span>
          <select
            name="loanType"
            value={loanForm.loanType}
            onChange={handleLoanChange}
          >
            <option value="principal_first">Principal first</option>
            <option value="interest_first">Interest first</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">
            Tenure (months) {loanForm.mode === "emi" ? "*" : "(optional)"}
          </span>
          <input
            type="number"
            name="tenureMonths"
            value={loanForm.tenureMonths}
            onChange={handleLoanChange}
            min="1"
          />
        </label>
        <label className="field full-width">
          <span className="field-label">Internal note (optional)</span>
          <textarea
            name="note"
            value={loanForm.note}
            onChange={handleLoanChange}
            rows={2}
          />
        </label>
        <div className="field full-width">
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Saving loan..." : "Create loan"}
          </button>
        </div>
      </form>
    </div>
  );
}