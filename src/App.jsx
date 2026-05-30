import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
// JSONBin.io free storage — create a free account at jsonbin.io
// 1. Sign up at https://jsonbin.io
// 2. Create a new BIN with initial data: {"loans":[],"payments":[]}
// 3. Get your BIN ID and API key and paste below
// All 3 admins share the same BIN ID + API key

const JSONBIN_BIN_ID = "6a1ae53dddf5aa59f7785b04"; // e.g. "6650abc123def456"
const JSONBIN_API_KEY = "$2a$10$Z8Fo5H2LqszqZqv0e.g3Gu1gGlshI4g6aKfOk5Hp3VL/gVXpqqMwG"; // e.g. "$2a$10$..."
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

const TOTAL_INVESTED = 150000;
const PARTNERS = ["Partner 1", "Partner 2", "Partner 3"];
const PARTNER_SHARE = TOTAL_INVESTED / 3;

// Loan rules
const LOAN_RULES = {
  5000:  { disburse: 4500,  daily: 100, days: 50,  penalty: 300 },
  10000: { disburse: 9000,  daily: 100, days: 100, penalty: 300 },
  20000: { disburse: 18000, daily: 200, days: 100, penalty: 300 },
  30000: { disburse: 27000, daily: 300, days: 100, penalty: 300 },
};

function getLoanRule(amount) {
  const keys = Object.keys(LOAN_RULES).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (amount <= k) return { loanAmount: k, ...LOAN_RULES[k] };
  return { loanAmount: amount, disburse: Math.floor(amount * 0.9), daily: 150, days: 200, penalty: 300 };
}

function daysDiff(from, to) {
  return Math.floor((new Date(to) - new Date(from)) / 86400000);
}

function fmt(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── API LAYER ──────────────────────────────────────────────────────────────
async function readData() {
  if (JSONBIN_BIN_ID === "YOUR_BIN_ID_HERE") {
    // Demo mode with localStorage fallback for testing
    const d = localStorage.getItem("loanapp_demo");
    return d ? JSON.parse(d) : { loans: [], payments: [] };
  }
  const r = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}/latest`, {
    headers: { "X-Master-Key": JSONBIN_API_KEY },
  });
  const j = await r.json();
  return j.record || { loans: [], payments: [] };
}

async function writeData(data) {
  if (JSONBIN_BIN_ID === "YOUR_BIN_ID_HERE") {
    localStorage.setItem("loanapp_demo", JSON.stringify(data));
    return;
  }
  await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_API_KEY },
    body: JSON.stringify(data),
  });
}

// ─── LOAN CALCULATIONS ─────────────────────────────────────────────────────
function calcLoanStatus(loan, payments) {
  const rule = getLoanRule(loan.requestedAmount);
  const loanPayments = payments.filter((p) => p.loanId === loan.id);
  const totalPaid = loanPayments.reduce((s, p) => s + p.amount, 0);
  const elapsed = daysDiff(loan.startDate, today());
  const remaining = rule.loanAmount - totalPaid;
  const overdue = elapsed > rule.days;
  const daysOver = overdue ? elapsed - rule.days : 0;
  const penaltyAccrued = daysOver * rule.penalty;
  const totalDue = Math.max(0, remaining + penaltyAccrued);
  const progress = Math.min(100, (totalPaid / rule.loanAmount) * 100);
  const daysLeft = Math.max(0, rule.days - elapsed);
  return {
    rule, totalPaid, remaining, elapsed, overdue, daysOver,
    penaltyAccrued, totalDue, progress, daysLeft, loanPayments,
    closed: remaining <= 0,
  };
}

// ─── COMPONENTS ────────────────────────────────────────────────────────────
const colors = {
  bg: "#0d0f14",
  card: "#161b24",
  card2: "#1e2535",
  accent: "#f0c040",
  green: "#34d399",
  red: "#f87171",
  blue: "#60a5fa",
  text: "#e8eaf0",
  muted: "#7a8299",
  border: "#2a3347",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:${colors.bg}; color:${colors.text}; font-family:'DM Sans',sans-serif; }
  ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#111; }
  ::-webkit-scrollbar-thumb { background:#333; border-radius:4px; }
  .app { max-width:430px; margin:0 auto; min-height:100vh; position:relative; padding-bottom:80px; }
  .nav { display:flex; background:${colors.card}; border-top:1px solid ${colors.border}; position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:430px; z-index:100; }
  .nav-btn { flex:1; padding:14px 8px 10px; background:none; border:none; color:${colors.muted}; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:10px; font-family:'DM Sans',sans-serif; transition:.2s; }
  .nav-btn.active { color:${colors.accent}; }
  .nav-btn svg { width:22px; height:22px; }
  .header { padding:20px 20px 10px; display:flex; align-items:center; justify-content:space-between; }
  .header h1 { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:${colors.accent}; letter-spacing:-0.5px; }
  .header .sync { background:none; border:1px solid ${colors.border}; color:${colors.muted}; padding:6px 12px; border-radius:20px; font-size:11px; cursor:pointer; transition:.2s; }
  .header .sync:hover { border-color:${colors.accent}; color:${colors.accent}; }
  .card { background:${colors.card}; border-radius:16px; margin:0 16px 12px; padding:16px; border:1px solid ${colors.border}; }
  .card2 { background:${colors.card2}; }
  .label { font-size:11px; color:${colors.muted}; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .big-num { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; color:${colors.accent}; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 16px 12px; }
  .stat-card { background:${colors.card}; border:1px solid ${colors.border}; border-radius:14px; padding:14px; }
  .stat-val { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; }
  .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600; }
  .badge-green { background:#0d2e22; color:${colors.green}; }
  .badge-red { background:#2e1111; color:${colors.red}; }
  .badge-yellow { background:#2e2600; color:${colors.accent}; }
  .progress-bar { height:6px; background:#1e2535; border-radius:4px; overflow:hidden; margin-top:6px; }
  .progress-fill { height:100%; border-radius:4px; transition:.5s; }
  .input { width:100%; background:${colors.card2}; border:1px solid ${colors.border}; color:${colors.text}; padding:12px 14px; border-radius:12px; font-size:15px; font-family:'DM Sans',sans-serif; outline:none; transition:.2s; }
  .input:focus { border-color:${colors.accent}; }
  .btn { width:100%; padding:14px; border-radius:12px; border:none; font-size:15px; font-weight:600; font-family:'Syne',sans-serif; cursor:pointer; transition:.2s; }
  .btn-primary { background:${colors.accent}; color:#0d0f14; }
  .btn-primary:hover { background:#f5d060; }
  .btn-secondary { background:${colors.card2}; color:${colors.text}; border:1px solid ${colors.border}; }
  .loan-row { background:${colors.card}; border:1px solid ${colors.border}; border-radius:14px; margin:0 16px 10px; padding:14px; cursor:pointer; transition:.2s; }
  .loan-row:hover { border-color:${colors.accent}44; }
  .loan-row .name { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; }
  .row { display:flex; justify-content:space-between; align-items:center; }
  .toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:${colors.green}; color:#000; padding:10px 24px; border-radius:30px; font-weight:600; font-size:13px; z-index:999; animation: fadeInOut 2.5s forwards; }
  @keyframes fadeInOut { 0%{opacity:0;transform:translateX(-50%) translateY(-10px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }
  .modal-overlay { position:fixed; inset:0; background:#000a; z-index:200; display:flex; align-items:flex-end; }
  .modal { background:${colors.card}; border-radius:24px 24px 0 0; width:100%; max-width:430px; margin:0 auto; padding:24px 20px; max-height:90vh; overflow-y:auto; border-top:1px solid ${colors.border}; }
  .modal-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; margin-bottom:16px; }
  .section-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:${colors.muted}; text-transform:uppercase; letter-spacing:1px; margin:16px 16px 10px; }
  .pay-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid ${colors.border}22; }
  .empty { text-align:center; padding:40px 20px; color:${colors.muted}; }
  select.input { appearance:none; }
  .chip { display:inline-flex; align-items:center; gap:4px; background:${colors.card2}; border:1px solid ${colors.border}; border-radius:20px; padding:4px 12px; font-size:12px; color:${colors.muted}; margin:2px; cursor:pointer; transition:.2s; }
  .chip.active { border-color:${colors.accent}; color:${colors.accent}; background:#2e260033; }
`;

// ─── GRAPH ─────────────────────────────────────────────────────────────────
function MiniGraph({ loans, payments }) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), month: d.getMonth() });
  }
  const data = months.map(({ month, year, label }) => {
    const collected = payments.filter((p) => {
      const d = new Date(p.date);
      return d.getMonth() === month && d.getFullYear() === year;
    }).reduce((s, p) => s + p.amount, 0);
    return { label, collected };
  });
  const max = Math.max(...data.map((d) => d.collected), 1);
  const W = 340, H = 100;
  const pts = data.map((d, i) => ({
    x: 20 + i * ((W - 40) / (data.length - 1)),
    y: H - 10 - (d.collected / max) * (H - 20),
    val: d.collected,
    label: d.label,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  return (
    <div style={{ padding: "0 0 8px" }}>
      <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g1)" />
        <path d={path} fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={colors.accent} />
            <text x={p.x} y={H + 18} textAnchor="middle" fill={colors.muted} fontSize="10" fontFamily="DM Sans">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState({ loans: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await readData();
      setData(d);
    } catch (e) { showToast("Sync error!"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function save(newData) {
    setData(newData);
    try { await writeData(newData); } catch (e) { showToast("Save error!"); }
  }

  // Stats
  const activeLoans = data.loans.filter((l) => {
    const s = calcLoanStatus(l, data.payments);
    return !s.closed;
  });
  const closedLoans = data.loans.filter((l) => calcLoanStatus(l, data.payments).closed);
  const totalDisbursed = data.loans.reduce((s, l) => s + getLoanRule(l.requestedAmount).disburse, 0);
  const totalCollected = data.payments.reduce((s, p) => s + p.amount, 0);
  const totalInterest = data.loans.reduce((s, l) => {
    const rule = getLoanRule(l.requestedAmount);
    return s + (rule.loanAmount - rule.disburse);
  }, 0);
  const overdueLoans = data.loans.filter((l) => {
    const s = calcLoanStatus(l, data.payments);
    return !s.closed && s.overdue;
  });
  const availableCapital = TOTAL_INVESTED - totalDisbursed + totalCollected;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {toast && <div className="toast">{toast}</div>}

        {tab === "dashboard" && (
          <DashboardTab
            data={data} totalDisbursed={totalDisbursed}
            totalCollected={totalCollected} totalInterest={totalInterest}
            activeLoans={activeLoans} closedLoans={closedLoans}
            overdueLoans={overdueLoans} availableCapital={availableCapital}
            onSync={load} loading={loading}
            onSelectLoan={(l) => { setSelectedLoan(l); setTab("borrowers"); }}
          />
        )}
        {tab === "new" && (
          <NewLoanTab data={data} onSave={save} onDone={() => { load(); setTab("dashboard"); }} showToast={showToast} />
        )}
        {tab === "borrowers" && (
          <BorrowersTab data={data} onSave={save} showToast={showToast}
            selected={selectedLoan} onClearSelected={() => setSelectedLoan(null)}
            filter={filter} setFilter={setFilter}
          />
        )}

        <nav className="nav">
          {[
            { key: "dashboard", label: "Dashboard", icon: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
            { key: "new", label: "New Loan", icon: <path d="M12 4v16m8-8H4" /> },
            { key: "borrowers", label: "Borrowers", icon: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
          ].map(({ key, label, icon }) => (
            <button key={key} className={`nav-btn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={tab === key ? 2.2 : 1.8} stroke="currentColor">{icon}</svg>
              {label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────
function DashboardTab({ data, totalDisbursed, totalCollected, totalInterest, activeLoans, closedLoans, overdueLoans, availableCapital, onSync, loading }) {
  const interestCollected = data.payments.reduce((s, p) => {
    const loan = data.loans.find((l) => l.id === p.loanId);
    if (!loan) return s;
    const rule = getLoanRule(loan.requestedAmount);
    const interest = rule.loanAmount - rule.disburse;
    const principalPaid = rule.disburse;
    // rough: interest portion of payments
    return s;
  }, 0);

  // Better: total collected - total disbursed repaid
  const totalLoanDue = data.loans.reduce((s, l) => s + getLoanRule(l.requestedAmount).loanAmount, 0);
  const netInterestEarned = Math.max(0, totalCollected - (totalDisbursed * (totalCollected / Math.max(totalLoanDue, 1))));

  return (
    <>
      <div className="header">
        <div>
          <div style={{ fontSize: 11, color: colors.muted, letterSpacing: 1, textTransform: "uppercase" }}>Loan Book</div>
          <h1>💰 MoneyFlow</h1>
        </div>
        <button className="sync" onClick={onSync}>{loading ? "Syncing..." : "⟳ Sync"}</button>
      </div>

      <div className="card" style={{ background: "linear-gradient(135deg, #1a2035 0%, #0f1520 100%)", border: `1px solid ${colors.accent}33` }}>
        <div className="label">Total Capital</div>
        <div className="big-num">{fmt(TOTAL_INVESTED)}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <div>
            <div className="label">Available</div>
            <div style={{ color: colors.green, fontWeight: 700, fontFamily: "Syne" }}>{fmt(availableCapital)}</div>
          </div>
          <div>
            <div className="label">Deployed</div>
            <div style={{ color: colors.blue, fontWeight: 700, fontFamily: "Syne" }}>{fmt(totalDisbursed)}</div>
          </div>
          <div>
            <div className="label">Collected</div>
            <div style={{ color: colors.accent, fontWeight: 700, fontFamily: "Syne" }}>{fmt(totalCollected)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="label" style={{ marginBottom: 12 }}>Monthly Collections</div>
        <MiniGraph loans={data.loans} payments={data.payments} />
      </div>

      <div className="grid2">
        <div className="stat-card">
          <div className="label">Active Loans</div>
          <div className="stat-val" style={{ color: colors.blue }}>{activeLoans.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Closed Loans</div>
          <div className="stat-val" style={{ color: colors.green }}>{closedLoans.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">⚠️ Overdue</div>
          <div className="stat-val" style={{ color: colors.red }}>{overdueLoans.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Interest Book</div>
          <div className="stat-val" style={{ color: colors.accent }}>{fmt(totalInterest)}</div>
        </div>
      </div>

      <div className="section-title">Partner Shares</div>
      {PARTNERS.map((p, i) => (
        <div key={i} style={{ margin: "0 16px 8px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "Syne", fontWeight: 700 }}>{p}</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Invested: {fmt(PARTNER_SHARE)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: colors.green, fontWeight: 700 }}>{fmt(PARTNER_SHARE + totalCollected / 3)}</div>
            <div style={{ fontSize: 11, color: colors.muted }}>Current value</div>
          </div>
        </div>
      ))}

      {overdueLoans.length > 0 && (
        <>
          <div className="section-title" style={{ color: colors.red }}>⚠️ Overdue Accounts</div>
          {overdueLoans.map((l) => {
            const s = calcLoanStatus(l, data.payments);
            return (
              <div key={l.id} className="loan-row" style={{ borderColor: colors.red + "44" }}>
                <div className="row">
                  <div className="name">{l.name}</div>
                  <span className="badge badge-red">{s.daysOver}d overdue</span>
                </div>
                <div className="row" style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: colors.muted }}>Due: {fmt(s.totalDue)}</div>
                  <div style={{ fontSize: 12, color: colors.red }}>Penalty: {fmt(s.penaltyAccrued)}</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

// ─── NEW LOAN ──────────────────────────────────────────────────────────────
function NewLoanTab({ data, onSave, onDone, showToast }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [business, setBusiness] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const rule = amount ? getLoanRule(parseInt(amount)) : null;

  async function submit() {
    if (!name.trim() || !amount) return showToast("Fill name & amount");
    setSaving(true);
    const newLoan = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      business: business.trim(),
      requestedAmount: parseInt(amount),
      startDate,
      createdAt: new Date().toISOString(),
    };
    await onSave({ ...data, loans: [...data.loans, newLoan] });
    showToast("✅ Loan added!");
    setTimeout(onDone, 500);
    setSaving(false);
  }

  return (
    <>
      <div className="header"><h1>New Loan</h1></div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Borrower Name *</div>
          <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Phone Number</div>
          <input className="input" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Business / Shop Name</div>
          <input className="input" placeholder="e.g. Ramu Kirana Store" value={business} onChange={(e) => setBusiness(e.target.value)} />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Loan Amount Requested *</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {[5000, 10000, 20000, 30000].map((v) => (
              <button key={v} className={`chip ${parseInt(amount) === v ? "active" : ""}`} onClick={() => setAmount(String(v))}>{fmt(v)}</button>
            ))}
          </div>
          <input className="input" placeholder="Or type custom amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Start Date</div>
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        {rule && (
          <div style={{ background: colors.card2, border: `1px solid ${colors.accent}33`, borderRadius: 14, padding: 16, marginTop: 4 }}>
            <div style={{ fontFamily: "Syne", fontWeight: 700, color: colors.accent, marginBottom: 10 }}>📋 Loan Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Amount Requested", fmt(parseInt(amount) || 0)],
                ["Amount to Disburse", fmt(rule.disburse)],
                ["Total to Repay", fmt(rule.loanAmount)],
                ["Daily Payment", fmt(rule.daily)],
                ["Validity", `${rule.days} days`],
                ["End Date", new Date(new Date(startDate).getTime() + rule.days * 86400000).toLocaleDateString("en-IN")],
                ["Penalty/day (if late)", fmt(rule.penalty)],
                ["Interest Earned", fmt(rule.loanAmount - rule.disburse)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
                  <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? "Saving..." : "➕ Create Loan"}
        </button>
        <div style={{ height: 16 }} />
      </div>
    </>
  );
}

// ─── BORROWERS ──────────────────────────────────────────────────────────────
function BorrowersTab({ data, onSave, showToast, selected, onClearSelected, filter, setFilter }) {
  const [search, setSearch] = useState("");
  const [payModal, setPayModal] = useState(null); // loan object
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(today());
  const [payNote, setPayNote] = useState("");
  const [detailLoan, setDetailLoan] = useState(selected);

  useEffect(() => { if (selected) { setDetailLoan(selected); onClearSelected(); } }, [selected]);

  const filtered = data.loans.filter((l) => {
    const s = calcLoanStatus(l, data.payments);
    if (filter === "active" && s.closed) return false;
    if (filter === "closed" && !s.closed) return false;
    if (filter === "overdue" && (!s.overdue || s.closed)) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.business?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function addPayment() {
    if (!payAmount || isNaN(parseInt(payAmount))) return showToast("Enter valid amount");
    const payment = {
      id: Date.now().toString(),
      loanId: payModal.id,
      amount: parseInt(payAmount),
      date: payDate,
      note: payNote.trim(),
    };
    await onSave({ ...data, payments: [...data.payments, payment] });
    showToast("✅ Payment recorded!");
    setPayModal(null);
    setPayAmount("");
    setPayNote("");
  }

  if (detailLoan) {
    const loan = data.loans.find((l) => l.id === detailLoan.id) || detailLoan;
    const s = calcLoanStatus(loan, data.payments);
    return (
      <>
        <div className="header">
          <button onClick={() => setDetailLoan(null)} style={{ background: "none", border: "none", color: colors.accent, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>←</button>
          <h1 style={{ fontSize: 18 }}>{loan.name}</h1>
          <div />
        </div>

        <div className="card" style={{ borderColor: s.closed ? colors.green + "44" : s.overdue ? colors.red + "44" : colors.border }}>
          <div className="row">
            <div>
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20 }}>{loan.name}</div>
              {loan.business && <div style={{ color: colors.muted, fontSize: 13 }}>{loan.business}</div>}
              {loan.phone && <div style={{ color: colors.muted, fontSize: 13 }}>📞 {loan.phone}</div>}
            </div>
            <span className={`badge ${s.closed ? "badge-green" : s.overdue ? "badge-red" : "badge-yellow"}`}>
              {s.closed ? "✅ Closed" : s.overdue ? `⚠️ ${s.daysOver}d late` : `${s.daysLeft}d left`}
            </span>
          </div>
        </div>

        <div className="grid2">
          {[
            ["Borrowed", fmt(s.rule.loanAmount), colors.text],
            ["Disbursed", fmt(s.rule.disburse), colors.blue],
            ["Paid So Far", fmt(s.totalPaid), colors.green],
            ["Remaining", fmt(Math.max(0, s.remaining)), s.remaining > 0 ? colors.accent : colors.green],
            ["Penalty", fmt(s.penaltyAccrued), s.penaltyAccrued > 0 ? colors.red : colors.muted],
            ["Total Due", fmt(s.totalDue), s.totalDue > 0 ? colors.red : colors.green],
          ].map(([k, v, c]) => (
            <div key={k} className="stat-card">
              <div className="label">{k}</div>
              <div className="stat-val" style={{ color: c, fontSize: 16 }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="label">Repayment Progress</div>
            <div style={{ fontSize: 12, color: colors.accent, fontWeight: 600 }}>{s.progress.toFixed(0)}%</div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${s.progress}%`, background: s.closed ? colors.green : s.overdue ? colors.red : colors.accent }} />
          </div>
          <div className="row" style={{ marginTop: 8, fontSize: 12, color: colors.muted }}>
            <span>Start: {new Date(loan.startDate).toLocaleDateString("en-IN")}</span>
            <span>Daily: {fmt(s.rule.daily)}</span>
            <span>Day {s.elapsed}/{s.rule.days}</span>
          </div>
        </div>

        {!s.closed && (
          <div style={{ margin: "0 16px 16px" }}>
            <button className="btn btn-primary" onClick={() => setPayModal(loan)}>+ Record Payment</button>
          </div>
        )}

        <div className="section-title">Payment History ({s.loanPayments.length})</div>
        {s.loanPayments.length === 0 ? (
          <div className="empty">No payments yet</div>
        ) : (
          [...s.loanPayments].reverse().map((p) => (
            <div key={p.id} style={{ margin: "0 16px 8px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div className="row">
                <div style={{ fontFamily: "Syne", fontWeight: 700, color: colors.green }}>{fmt(p.amount)}</div>
                <div style={{ fontSize: 12, color: colors.muted }}>{new Date(p.date).toLocaleDateString("en-IN")}</div>
              </div>
              {p.note && <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{p.note}</div>}
            </div>
          ))
        )}

        {payModal && (
          <div className="modal-overlay" onClick={() => setPayModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title">Record Payment — {payModal.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Amount Paid</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {[100, 200, 500, 1000].map((v) => (
                      <button key={v} className={`chip ${parseInt(payAmount) === v ? "active" : ""}`} onClick={() => setPayAmount(String(v))}>{fmt(v)}</button>
                    ))}
                  </div>
                  <input className="input" type="number" placeholder="Enter amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Date</div>
                  <input className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Note (optional)</div>
                  <input className="input" placeholder="e.g. Cash, UPI, partial" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={addPayment}>Save Payment</button>
                <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="header"><h1>Borrowers</h1></div>
      <div style={{ padding: "0 16px 12px" }}>
        <input className="input" placeholder="🔍 Search by name or business..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", overflowX: "auto" }}>
        {[["all", "All"], ["active", "Active"], ["overdue", "⚠️ Overdue"], ["closed", "Closed"]].map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">No borrowers found</div>
      ) : (
        filtered.map((loan) => {
          const s = calcLoanStatus(loan, data.payments);
          return (
            <div key={loan.id} className="loan-row" onClick={() => setDetailLoan(loan)}>
              <div className="row">
                <div>
                  <div className="name">{loan.name}</div>
                  {loan.business && <div style={{ fontSize: 12, color: colors.muted }}>{loan.business}</div>}
                </div>
                <span className={`badge ${s.closed ? "badge-green" : s.overdue ? "badge-red" : "badge-yellow"}`}>
                  {s.closed ? "✅ Done" : s.overdue ? `⚠️ Late` : `${s.daysLeft}d`}
                </span>
              </div>
              <div className="row" style={{ marginTop: 8, fontSize: 13 }}>
                <span style={{ color: colors.muted }}>Loan: {fmt(s.rule.loanAmount)}</span>
                <span style={{ color: colors.green }}>Paid: {fmt(s.totalPaid)}</span>
                <span style={{ color: s.totalDue > 0 ? colors.red : colors.muted }}>Due: {fmt(s.totalDue)}</span>
              </div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${s.progress}%`, background: s.closed ? colors.green : s.overdue ? colors.red : colors.accent }} />
              </div>
            </div>
          );
        })
      )}
      <div style={{ height: 16 }} />
    </>
  );
}
