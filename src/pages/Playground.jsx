import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Playground() {
  const { user } = useAuth();
  const { loanId } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [summary, setSummary] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const [loanRes, summaryRes] = await Promise.all([
          api.get(`/loans/${loanId}`),
          api.get(`/loans/${loanId}/ledger-summary`),
        ]);

        if (!cancelled) {
          setLoan(loanRes.data.loan);
          setSummary(summaryRes.data || { rows: [], totals: {} });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Unable to load playground");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [loanId, user]);

  const downloadCsv = () => {
    if (!summary.rows?.length) return;
    const header = [
      "Period",
      "Total Paid",
      "Total Received",
      "Interest Accrued",
      "Closing Balance",
    ];
    const lines = [header.join(",")];

    summary.rows.forEach((row) => {
      lines.push(
        [
          row.period,
          row.totalPaid || 0,
          row.totalReceived || 0,
          row.interestAccrued || 0,
          row.closingBalance || 0,
        ].join(",")
      );
    });

    const totals = summary.totals || {};
    lines.push(
      [
        "Totals",
        totals.totalPaid || 0,
        totals.totalReceived || 0,
        totals.interestAccrued || 0,
        totals.outstanding || 0,
      ].join(",")
    );

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan_${loanId}_playground.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) return null;

  return (
    <div className="loan-detail-grid">
      <div className="card">
        <h2>Ledger playground</h2>
        <p className="card-text">
          Aggregated view of the ledger to explain inflows, outflows, and interest
          over time. Granularity adapts automatically based on loan age.
        </p>
        <div className="ledger-toolbar">
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate(`/app/loans/${loanId}`)}
          >
            Back to ledger
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={downloadCsv}
            disabled={!summary.rows?.length}
          >
            Export CSV
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {loading && <div className="field-label">Loading...</div>}

        {!loading && loan && (
          <div className="loan-summary">
            <div className="loan-summary-row">
              <span className="field-label">Borrower</span>
              <span>
                {loan.borrower?.namePrimary}{" "}
                {loan.borrower?.userId && (
                  <span className="loans-list-sub">({loan.borrower.userId})</span>
                )}
              </span>
            </div>
            <div className="loan-summary-row">
              <span className="field-label">Granularity</span>
              <span>{summary.granularity || "-"}</span>
            </div>
            <div className="loan-summary-row">
              <span className="field-label">Interest accrued (total)</span>
              <span>
                ₹
                {(summary.totals?.interestAccrued || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="loan-summary-row">
              <span className="field-label">Outstanding principal</span>
              <span>
                ₹
                {(summary.totals?.outstanding || 0).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Aggregated ledger</h2>
        <p className="card-text">
          {summary.granularity === "daily" && "Daily buckets"}
          {summary.granularity === "monthly" && "Monthly buckets"}
          {summary.granularity === "quarterly" && "Quarterly buckets"}
          {" "}with totals for payments, receipts, interest, and closing balance.
        </p>

        {loading ? (
          <div className="field-label">Crunching numbers...</div>
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : !summary.rows?.length ? (
          <div className="field-label">No ledger entries yet.</div>
        ) : (
          <div className="table-scroll">
            <div className="ledger-table">
              <div className="ledger-header">
                <span>Period</span>
                <span className="ledger-amount">Total paid</span>
                <span className="ledger-amount">Total received</span>
                <span className="ledger-amount">Interest accrued</span>
                <span className="ledger-amount">Closing balance</span>
              </div>
              {summary.rows.map((row) => (
                <div key={row.period} className="ledger-row">
                  <span>{row.period}</span>
                  <span className="ledger-amount">
                    ₹
                    {(row.totalPaid || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="ledger-amount">
                    ₹
                    {(row.totalReceived || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="ledger-amount">
                    ₹
                    {(row.interestAccrued || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="ledger-amount">
                    ₹
                    {(row.closingBalance || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
              <div className="ledger-row ledger-row-totals">
                <span className="ledger-totals-label">Totals</span>
                <span className="ledger-amount">
                  ₹
                  {(summary.totals?.totalPaid || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="ledger-amount">
                  ₹
                  {(summary.totals?.totalReceived || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="ledger-amount">
                  ₹
                  {(summary.totals?.interestAccrued || 0).toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )}
                </span>
                <span className="ledger-amount">
                  ₹
                  {(summary.totals?.outstanding || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
