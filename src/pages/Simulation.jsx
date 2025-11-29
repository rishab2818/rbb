import React, { useState, useMemo } from "react";

function parseDate(str) {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => Number(p));
  if (!y || !m || !d) return null;
  // Month is 0-based
  return new Date(y, m - 1, d);
}

function formatDate(d) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end - start) / msPerDay);
}

let nextId = 1;

export default function PlaygroundApp() {
  const [annualRate, setAnnualRate] = useState(12); // %
  const [mode, setMode] = useState("interest-first"); // or "principal-first"
  const [asOfDate, setAsOfDate] = useState(formatDate(new Date()));

  const [events, setEvents] = useState([
    // example starter
    // { id: 1, type: "disbursal", amount: 100000, date: "2020-01-01" },
  ]);

  const [disbAmount, setDisbAmount] = useState("");
  const [disbDate, setDisbDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  const [error, setError] = useState("");

  const addDisbursal = () => {
    const amt = Number(disbAmount);
    if (!amt || !disbDate) {
      setError("Enter disbursal amount and date.");
      return;
    }
    const d = parseDate(disbDate);
    if (!d) {
      setError("Invalid disbursal date.");
      return;
    }
    setEvents((prev) => [
      ...prev,
      { id: nextId++, type: "disbursal", amount: amt, date: disbDate },
    ]);
    setError("");
  };

  const addPayment = () => {
    const amt = Number(payAmount);
    if (!amt || !payDate) {
      setError("Enter payment amount and date.");
      return;
    }
    const payD = parseDate(payDate);
    if (!payD) {
      setError("Invalid payment date.");
      return;
    }

    // Must have at least one disbursal first
    const disbursals = events.filter((e) => e.type === "disbursal");
    if (!disbursals.length) {
      setError("Add at least one disbursal before adding payments.");
      return;
    }

    // Find earliest disbursal date
    let firstDisbDate = null;
    for (const e of disbursals) {
      const d = parseDate(e.date);
      if (!d) continue;
      if (!firstDisbDate || d < firstDisbDate) {
        firstDisbDate = d;
      }
    }

    if (!firstDisbDate) {
      setError("Disbursal date is invalid.");
      return;
    }

    // ❗ payment must be on or after first disbursal date
    if (payD < firstDisbDate) {
      setError("Payment date cannot be before loan disbursal date.");
      return;
    }

    setEvents((prev) => [
      ...prev,
      { id: nextId++, type: "payment", amount: amt, date: payDate },
    ]);
    setError("");
  };

  const { ledgerRows, summary } = useMemo(() => {
    if (!events.length) {
      return { ledgerRows: [], summary: null };
    }

    const rate = Number(annualRate) || 0;
    const r = rate / 100;
    const asOf = parseDate(asOfDate);
    if (!asOf) return { ledgerRows: [], summary: null };

    // sort base events by date, then id
    const sortedEvents = [...events].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (!da || !db) return 0;
      if (da.getTime() !== db.getTime()) return da - db;
      return a.id - b.id;
    });

    // find first disbursal date
    const firstDisb = sortedEvents.find((e) => e.type === "disbursal");
    if (!firstDisb) {
      // no principal ever, nothing to do
      return { ledgerRows: [], summary: null };
    }
    const firstDisbDate = parseDate(firstDisb.date);
    if (!firstDisbDate) return { ledgerRows: [], summary: null };

    // if asOf before first disb, nothing
    if (asOf < firstDisbDate) {
      return { ledgerRows: [], summary: null };
    }

    // build map date -> events
    const eventsByDate = new Map();
    for (const e of sortedEvents) {
      const d = parseDate(e.date);
      if (!d) continue;
      const key = formatDate(d);
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key).push(e);
    }

    // state
    let principal = 0;
    let interest = 0;
    let rows = [];

    // process events on first date up to firstDisbDate (usually same)
    const firstDateStr = formatDate(firstDisbDate);
    const firstDayEvents = eventsByDate.get(firstDateStr) || [];
    for (const e of firstDayEvents) {
      if (e.type === "disbursal") {
        principal += e.amount;
      } else if (e.type === "payment") {
        if (mode === "interest-first") {
          interest -= e.amount;
          if (interest < 0) {
            const extra = -interest;
            interest = 0;
            principal -= extra; // principal can go negative
          }
        } else {
          // principal-first
          principal -= e.amount;
          if (principal < 0) {
            const extra = -principal;
            principal = 0;
            interest -= extra; // interest can go negative here
          }
        }
      }
      rows.push({
        kind: e.type.toUpperCase(),
        date: e.date,
        change: e.amount * (e.type === "disbursal" ? 1 : -1),
        principal,
        interest,
        note: e.type === "disbursal" ? "Loan given" : "Payment from user",
      });
    }

    // interest starts from day after first disbursal
    let currentDate = new Date(
      firstDisbDate.getFullYear(),
      firstDisbDate.getMonth(),
      firstDisbDate.getDate() + 1
    );

    const msPerDay = 1000 * 60 * 60 * 24;

    while (currentDate <= asOf) {
      const dateStr = formatDate(currentDate);

      // 1) accrue interest for this day (simple interest, daily step)
      // only if we have some principal and positive rate
      if (principal !== 0 && r !== 0) {
        const dailyInterest = principal * r * (1 / 365);
        interest += dailyInterest;
        rows.push({
          kind: "INTEREST",
          date: dateStr,
          change: dailyInterest,
          principal,
          interest,
          note: "Interest for the day",
        });
      }

      // 2) apply any events on this date (after interest)
      const dayEvents = eventsByDate.get(dateStr) || [];
      for (const e of dayEvents) {
        if (e.type === "disbursal") {
          principal += e.amount;
        } else if (e.type === "payment") {
          if (mode === "interest-first") {
            interest -= e.amount;
            if (interest < 0) {
              const extra = -interest;
              interest = 0;
              principal -= extra; // principal can go negative
            }
          } else {
            // principal-first
            principal -= e.amount;
            if (principal < 0) {
              const extra = -principal;
              principal = 0;
              interest -= extra; // interest can go negative
            }
          }
        }
        rows.push({
          kind: e.type.toUpperCase(),
          date: e.date,
          change: e.amount * (e.type === "disbursal" ? 1 : -1),
          principal,
          interest,
          note:
            e.type === "disbursal"
              ? "Loan given"
              : "Payment from user",
        });
      }

      currentDate = new Date(currentDate.getTime() + msPerDay);
    }

    const summary = {
      principal,
      interest,
      totalLoaned: rows
        .filter((r) => r.kind === "DISBURSAL")
        .reduce((s, r) => s + r.change, 0),
      totalPaid: rows
        .filter((r) => r.kind === "PAYMENT")
        .reduce((s, r) => s - r.change, 0),
    };

    return { ledgerRows: rows, summary };
  }, [events, annualRate, mode, asOfDate]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h1>Loan Playground (Simple Interest)</h1>
      <p style={{ maxWidth: 600, fontSize: 14 }}>
        This is a sandbox. Add disbursals and payments with dates, choose{" "}
        <b>interest-first</b> or <b>principal-first</b>, and see how principal
        and interest move over time. Interest is simple (no compounding) and
        starts from the day after the first disbursal.
      </p>

      {/* Error message (small, inline) */}
      {error && (
        <div
          style={{
            color: "#b91c1c",
            fontSize: 13,
            marginBottom: 8,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
          alignItems: "flex-end",
        }}
      >
        <div>
          <label style={{ fontSize: 13 }}>
            Annual rate (%)
            <br />
            <input
              type="number"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              style={{ padding: 4, width: 100 }}
            />
          </label>
        </div>
        <div>
          <label style={{ fontSize: 13 }}>
            Mode
            <br />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ padding: 4 }}
            >
              <option value="interest-first">Interest first</option>
              <option value="principal-first">Principal first</option>
            </select>
          </label>
        </div>
        <div>
          <label style={{ fontSize: 13 }}>
            As-of date (till when to simulate)
            <br />
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              style={{ padding: 4 }}
            />
          </label>
        </div>
      </div>

      <hr style={{ margin: "12px 0" }} />

      <h2 style={{ fontSize: 18 }}>Add events</h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            border: "1px solid #ccc",
            padding: 8,
            borderRadius: 8,
            minWidth: 260,
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Give money (disbursal)</h3>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            Amount &amp; date when you gave money.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              placeholder="Amount"
              value={disbAmount}
              onChange={(e) => setDisbAmount(e.target.value)}
              style={{ flex: 1, padding: 4 }}
            />
            <input
              type="date"
              value={disbDate}
              onChange={(e) => setDisbDate(e.target.value)}
              style={{ flex: 1, padding: 4 }}
            />
          </div>
          <button onClick={addDisbursal} style={{ padding: "4px 10px" }}>
            Add disbursal
          </button>
        </div>

        <div
          style={{
            border: "1px solid #ccc",
            padding: 8,
            borderRadius: 8,
            minWidth: 260,
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: 15 }}>User pays (payment)</h3>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            Amount &amp; date when user pays you.
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="number"
              placeholder="Amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              style={{ flex: 1, padding: 4 }}
            />
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              style={{ flex: 1, padding: 4 }}
            />
          </div>
          <button onClick={addPayment} style={{ padding: "4px 10px" }}>
            Add payment
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: 18 }}>Base events</h2>
      {!events.length ? (
        <div style={{ fontSize: 13 }}>No events yet.</div>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                Date
              </th>
              <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                Type
              </th>
              <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {events
              .slice()
              .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
              .map((e) => (
                <tr key={e.id}>
                  <td style={{ padding: 4 }}>{e.date}</td>
                  <td style={{ padding: 4 }}>{e.type}</td>
                  <td style={{ padding: 4 }}>{e.amount}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: 18 }}>Ledger (simulated)</h2>
      {!ledgerRows.length ? (
        <div style={{ fontSize: 13 }}>
          Add at least one disbursal and pick a valid as-of date.
        </div>
      ) : (
        <>
          {summary && (
            <div
              style={{
                fontSize: 13,
                marginBottom: 8,
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 8,
                maxWidth: 480,
              }}
            >
              <div>
                <b>As of:</b> {asOfDate}
              </div>
              <div>
                <b>Total loaned:</b> {summary.totalLoaned.toFixed(2)}
              </div>
              <div>
                <b>Total paid by user:</b> {summary.totalPaid.toFixed(2)}
              </div>
              <div>
                <b>Principal (can be negative):</b>{" "}
                {summary.principal.toFixed(2)}
              </div>
              <div>
                <b>Interest (can be negative in principal-first mode):</b>{" "}
                {summary.interest.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                fontSize: 12,
                minWidth: 700,
              }}
            >
              <thead>
                <tr>
                  <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                    Date
                  </th>
                  <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                    Type
                  </th>
                  <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                    Change
                  </th>
                  <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                    Principal after
                  </th>
                  <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                    Interest after
                  </th>
                  <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 4 }}>{r.date}</td>
                    <td style={{ padding: 4 }}>{r.kind}</td>
                    <td style={{ padding: 4 }}>
                      {r.kind === "INTEREST" ? "+" : ""}
                      {r.change.toFixed(2)}
                    </td>
                    <td style={{ padding: 4 }}>{r.principal.toFixed(2)}</td>
                    <td style={{ padding: 4 }}>{r.interest.toFixed(2)}</td>
                    <td style={{ padding: 4 }}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
