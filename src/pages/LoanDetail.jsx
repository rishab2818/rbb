
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

export default function LoanDetail() {
  const { user } = useAuth();
  const { loanId } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [entries, setEntries] = useState([]);
  const [ledgerTotals, setLedgerTotals] = useState({
    totalPaid: 0,
    totalReceived: 0,
    outstanding: 0,
    interestAccrued: 0,
  });
  const [loadingLoan, setLoadingLoan] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [errorLoan, setErrorLoan] = useState("");
  const [errorLedger, setErrorLedger] = useState("");

  const [interestPreview, setInterestPreview] = useState(null);
  const [interestMsg, setInterestMsg] = useState("");
  const [interestLoading, setInterestLoading] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: "",
    amount: "",
    narration: "",
    kind: "emi",
  });
  const [paymentMsg, setPaymentMsg] = useState("");

  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState("");

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchLoan() {
      try {
        const res = await api.get(`/loans/${loanId}`);
        if (!cancelled) setLoan(res.data.loan);
      } catch (err) {
        if (!cancelled) {
          setErrorLoan(
            err?.response?.data?.message || "Unable to load loan details"
          );
        }
      } finally {
        if (!cancelled) setLoadingLoan(false);
      }
    }

    async function fetchLedger() {
      try {
        const res = await api.get(`/loans/${loanId}/ledger`);
        if (!cancelled) {
          setEntries(res.data.entries || []);
          setLedgerTotals(
            res.data.totals || {
              totalPaid: 0,
              totalReceived: 0,
              outstanding: 0,
              interestAccrued: 0,
            }
          );
        }
      } catch (err) {
        if (!cancelled) {
          setErrorLedger(
            err?.response?.data?.message || "Unable to load ledger"
          );
        }
      } finally {
        if (!cancelled) setLoadingLedger(false);
      }
    }

    fetchLoan();
    fetchLedger();

    return () => {
      cancelled = true;
    };
  }, [loanId, user]);

  const { rowsWithBalance, totals } = useMemo(() => {
    let fallbackBalance = 0;
    const rows = entries.map((e) => {
      if (typeof e.runningBalance === "number") {
        fallbackBalance = e.runningBalance;
        return { ...e, runningBalance: e.runningBalance };
      }

      const paid = e.amountPaid || 0;
      const received = e.amountReceived || 0;
      fallbackBalance = fallbackBalance + paid - received;
      return { ...e, runningBalance: fallbackBalance };
    });

    return {
      rowsWithBalance: rows,
      totals: ledgerTotals,
    };
  }, [entries, ledgerTotals]);

  const runInterestPreview = async () => {
    setInterestMsg("");
    setInterestLoading(true);
    try {
      const res = await api.post(`/loans/${loanId}/interest-preview`, {
        asOfDate: new Date().toISOString(),
      });
      setInterestPreview(res.data);
    } catch (err) {
      setInterestPreview(null);
      setInterestMsg(
        err?.response?.data?.message || "Unable to compute interest"
      );
    } finally {
      setInterestLoading(false);
    }
  };

  const openPaymentModal = () => {
    setPaymentMsg("");
    setPaymentForm({
      date: "",
      amount: "",
      narration: "",
      kind: "emi",
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setPaymentMsg("");
      // ❗ Block payments before loan disbursal date
  if (loan?.startDate) {
    const loanStart = new Date(loan.startDate);        // disbursal date
    const chosenDate = paymentForm.date
      ? new Date(paymentForm.date)                     // user-selected date
      : new Date();                                    // default = today

    if (chosenDate < loanStart) {
      setPaymentMsg("Payment date cannot be before loan disbursal date.");
      return; // stop here, do NOT call API
    }
  }
    try {
      const payload = {
        date: paymentForm.date || new Date().toISOString(),
        narration: paymentForm.narration || "Ledger entry",
        amountPaid:
          paymentForm.kind === "disbursal" ? Number(paymentForm.amount) : 0,
        amountReceived:
          paymentForm.kind === "disbursal" ? 0 : Number(paymentForm.amount),
        kind: paymentForm.kind,
      };
      await api.post(`/loans/${loanId}/ledger`, payload);
      const res = await api.get(`/loans/${loanId}/ledger`);
      setEntries(res.data.entries || []);
      setLedgerTotals(res.data.totals || ledgerTotals);
      setPaymentModalOpen(false);
      setPaymentMsg("Entry added.");
    } catch (err) {
      setPaymentMsg(err?.response?.data?.message || "Could not add entry");
    }
  };

  const markClosed = async () => {
    setCloseMsg("");
    setClosing(true);
    try {
      const res = await api.post(`/loans/${loanId}/close`);
      setLoan(res.data.loan);
      setCloseMsg("Loan marked as closed.");
    } catch (err) {
      setCloseMsg(
        err?.response?.data?.message || "Could not mark loan as closed"
      );
    } finally {
      setClosing(false);
    }
  };

  const downloadCsv = () => {
    if (!rowsWithBalance.length) return;
    const isAdminView = isAdmin;
    const headerAdmin = [
      "Date",
      "Narration",
      "Type",
      "Amount Paid",
      "Amount Received",
      "Balance",
    ];
    const headerCustomer = ["Date", "Description", "Your Payment", "Balance"];
    const lines = [];
    lines.push((isAdminView ? headerAdmin : headerCustomer).join(","));
    rowsWithBalance.forEach((e) => {
      const dateStr = e.date ? new Date(e.date).toLocaleDateString() : "";
      const safeNarration = (e.narration || "").replace(/"/g, '""');
      if (isAdminView) {
        const row = [
          dateStr,
          `"${safeNarration}"`,
          e.kind || "",
          e.amountPaid || 0,
          e.amountReceived || 0,
          e.runningBalance || 0,
        ];
        lines.push(row.join(","));
      } else {
        const row = [
          dateStr,
          `"${safeNarration}"`,
          e.amountReceived || 0,
          e.runningBalance || 0,
        ];
        lines.push(row.join(","));
      }
    });
    // totals row
    if (isAdminView) {
      lines.push(
        [
          "",
          '"Totals"',
          "",
          totals.totalPaid || 0,
          totals.totalReceived || 0,
          totals.outstanding || 0,
        ].join(",")
      );
    } else {
      lines.push(
        [
          "",
          '"Totals"',
          totals.totalReceived || 0,
          totals.outstanding || 0,
        ].join(",")
      );
    }

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loan_${loanId}_ledger.csv`;
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
        {loadingLoan ? (
          <div className="field-label">Loading loan...</div>
        ) : errorLoan ? (
          <div className="alert-error">{errorLoan}</div>
        ) : !loan ? (
          <div className="field-label">Loan not found.</div>
        ) : (
          <>
            <h2>Loan summary</h2>
            <p className="card-text">
              A compact view of this loan and its customer details.
            </p>
            <div className="loan-summary">
              <div className="loan-summary-row">
                <span className="field-label">Borrower</span>
                <span>
                  {loan.borrower?.namePrimary}{" "}
                  {loan.borrower?.userId && (
                    <span className="loans-list-sub">
                      ({loan.borrower.userId})
                    </span>
                  )}
                </span>
              </div>
              {loan.borrower?.firmName && (
                <div className="loan-summary-row">
                  <span className="field-label">Firm</span>
                  <span>{loan.borrower.firmName}</span>
                </div>
              )}
              {loan.borrower?.address && (
                <div className="loan-summary-row">
                  <span className="field-label">Address</span>
                  <span>{loan.borrower.address}</span>
                </div>
              )}
              <div className="loan-summary-row">
                <span className="field-label">Amount</span>
                <span>
                  ₹
                  {loan.amount?.toLocaleString?.() ||
                    Number(loan.amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="loan-summary-row">
                <span className="field-label">Rate (p.a.)</span>
                <span>{loan.interestRate}%</span>
              </div>
              <div className="loan-summary-row">
                <span className="field-label">Mode</span>
                <span>{loan.mode === "emi" ? "EMI" : "Normal"}</span>
              </div>
              <div className="loan-summary-row">
                <span className="field-label">Loan type</span>
                <span>
                  {loan.loanType === "principal_first"
                    ? "Principal first"
                    : "Interest first"}
                </span>
              </div>
              {loan.tenureMonths && (
                <div className="loan-summary-row">
                  <span className="field-label">Tenure</span>
                  <span>{loan.tenureMonths} months</span>
                </div>
              )}
              <div className="loan-summary-row">
                <span className="field-label">Start date</span>
                <span>
                  {loan.startDate
                    ? new Date(loan.startDate).toLocaleDateString()
                    : "-"}
                </span>
              </div>
              <div className="loan-summary-row">
                <span className="field-label">Status</span>
                <span
                  className={`loan-status-pill loan-status-pill-${loan.status}`}
                >
                  {loan.status}
                </span>
              </div>
              {isAdmin && (
                <div className="loan-summary-row">
                  <span className="field-label">Outstanding</span>
                  <span>
                    ₹
                    {totals.outstanding.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}
              {isAdmin &&
                loan.status !== "closed" &&
                !loadingLedger &&
                totals.outstanding <= 0 && (
                <div className="loan-summary-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={markClosed}
                    disabled={closing}
                  >
                    {closing ? "Checking..." : "Mark as closed"}
                  </button>
                  {closeMsg && (
                    <span className="loan-summary-note">{closeMsg}</span>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Ledger</h2>
        <p className="card-text">
          Left side shows{" "}
          <strong>
            {isAdmin ? "Amount Paid (bank to customer)" : "date & narration"}
          </strong>
          . Right side focuses on{" "}
          <strong>
            {isAdmin
              ? "Amount Received (EMIs / repayments)"
              : "your payments and remaining balance"}
          </strong>
          .
        </p>

        <div className="ledger-toolbar">
          <button
            type="button"
            className="btn-outline"
            onClick={runInterestPreview}
            disabled={interestLoading}
          >
            {interestLoading ? "Checking..." : "Check interest & balance"}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate(`/app/loans/${loanId}/playground`)}
          >
            Detailed view
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={downloadCsv}
            disabled={!rowsWithBalance.length}
          >
            Export CSV
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn-primary"
              onClick={openPaymentModal}
            >
              Add entry
            </button>
          )}
        </div>

        {interestMsg && (
          <div className="alert-info ledger-message">{interestMsg}</div>
        )}

        {interestPreview && (
          <div className="ledger-interest-summary">
            <div>
              <span className="field-label">As of</span>{" "}
              {new Date(
                interestPreview.asOfDate
              ).toLocaleDateString()}
            </div>
            <div>
              <span className="field-label">Outstanding principal:</span>{" "}
              ₹
              {interestPreview.outstandingPrincipal.toLocaleString(
                undefined,
                { maximumFractionDigits: 2 }
              )}
            </div>
            <div>
              <span className="field-label">Interest accrued:</span>{" "}
              ₹
              {interestPreview.interestAccrued.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
            {typeof interestPreview.checksRemaining === "number" && (
              <div className="ledger-interest-usage">
                Interest checks remaining this month:{" "}
                {interestPreview.checksRemaining}
              </div>
            )}
          </div>
        )}

        {loadingLedger ? (
          <div className="field-label">Loading ledger...</div>
        ) : errorLedger ? (
          <div className="alert-error">{errorLedger}</div>
        ) : !rowsWithBalance.length ? (
          <div className="field-label">No ledger entries yet.</div>
        ) : (
          <>
            {isAdmin ? (
              <div className="table-scroll">
                <div className="ledger-table">
                  <div className="ledger-header">
                    <span>Date</span>
                    <span>Narration</span>
                    <span>Type</span>
                    <span className="ledger-amount">Amount Paid</span>
                    <span className="ledger-amount">
                      Amount Received
                    </span>
                    <span className="ledger-amount">Balance</span>
                  </div>
                  {rowsWithBalance.map((e) => (
                    <div key={e._id} className="ledger-row">
                      <span>
                        {e.date
                          ? new Date(e.date).toLocaleDateString()
                          : "-"}
                      </span>
                      <span
                        className={
                          "ledger-narration ledger-narration-" +
                          (e.kind || "adjustment")
                        }
                      >
                        {e.narration || "-"}
                      </span>
                      <span className="ledger-kind">
                        {e.kind || "adjustment"}
                      </span>
                      <span className="ledger-amount">
                        {e.amountPaid
                          ? `₹${
                              e.amountPaid.toLocaleString?.(undefined, {
                                maximumFractionDigits: 2,
                              }) || e.amountPaid
                            }`
                          : ""}
                      </span>
                      <span className="ledger-amount">
                        {e.amountReceived
                          ? `₹${
                              e.amountReceived.toLocaleString?.(undefined, {
                                maximumFractionDigits: 2,
                              }) || e.amountReceived
                            }`
                          : ""}
                      </span>
                      <span className="ledger-amount">
                        ₹
                        {e.runningBalance.toLocaleString?.(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                  <div className="ledger-row ledger-row-totals">
                    <span />
                    <span className="ledger-totals-label">Totals</span>
                    <span />
                    <span className="ledger-amount">
                      ₹
                      {totals.totalPaid.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="ledger-amount">
                      ₹
                      {totals.totalReceived.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="ledger-amount">
                      ₹
                      {totals.outstanding.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-scroll">
                <div className="ledger-table ledger-table-customer">
                  <div className="ledger-header">
                    <span>Date</span>
                    <span>Description</span>
                    <span className="ledger-amount">Your payment</span>
                    <span className="ledger-amount">Balance</span>
                  </div>
                  {rowsWithBalance.map((e) => (
                    <div key={e._id} className="ledger-row">
                      <span>
                        {e.date
                          ? new Date(e.date).toLocaleDateString()
                          : "-"}
                      </span>
                      <span
                        className={
                          "ledger-narration ledger-narration-" +
                          (e.kind || "adjustment")
                        }
                      >
                        {e.narration || "-"}
                      </span>
                      <span className="ledger-amount">
                        {e.amountReceived
                          ? `₹${
                              e.amountReceived.toLocaleString?.() ||
                              e.amountReceived
                            }`
                          : ""}
                      </span>
                      <span className="ledger-amount">
                        ₹
                        {e.runningBalance.toLocaleString?.() ||
                          e.runningBalance}
                      </span>
                    </div>
                  ))}
                  <div className="ledger-row ledger-row-totals">
                    <span />
                    <span className="ledger-totals-label">Totals</span>
                    <span className="ledger-amount">
                      ₹
                      {totals.totalReceived.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="ledger-amount">
                      ₹
                      {totals.outstanding.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <Modal
          open={paymentModalOpen}
          title="Add ledger entry"
          onClose={() => setPaymentModalOpen(false)}
        >
          <form className="form" onSubmit={submitPayment}>
            {paymentMsg && (
              <div className="alert-info ledger-message">{paymentMsg}</div>
            )}
            <label className="field">
              <span className="field-label">Type</span>
              <select
                name="kind"
                value={paymentForm.kind}
                onChange={handlePaymentChange}
              >
                <option value="emi">EMI / repayment</option>
                <option value="disbursal">Extra disbursal</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Amount *</span>
              <input
                type="number"
                name="amount"
                min="0"
                step="0.01"
                required
                value={paymentForm.amount}
                onChange={handlePaymentChange}
              />
            </label>
            <label className="field">
              <span className="field-label">Date</span>
              <input
                type="date"
                name="date"
                value={paymentForm.date}
                onChange={handlePaymentChange}
              />
            </label>
            <label className="field">
              <span className="field-label">Narration</span>
              <input
                name="narration"
                value={paymentForm.narration}
                onChange={handlePaymentChange}
                placeholder="e.g. EMI for March"
              />
            </label>
            <button className="btn-primary full-width" type="submit">
              Save entry
            </button>
          </form>
        </Modal>
      </div>
    </div>
  );
}
