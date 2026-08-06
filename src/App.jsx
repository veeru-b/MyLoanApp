import { useState, useEffect, useCallback } from "react";
import * as XLSX from 'xlsx';

// ─── CONFIG ────────────────────────────────────────────────────────────────
// Setup: go to jsonbin.io → sign up free → create bin with:
// {"loans":[],"payments":[],"investors":[],"safetyDeposit":{"target":10000,"balance":0,"transactions":[]}}
// Then paste your BIN ID and API KEY below. All 3 admins share same credentials.

const JSONBIN_BIN_ID = "6a1baca421f9ee59d29fdd22";
const JSONBIN_API_KEY = "$2a$10$Z8Fo5H2LqszqZqv0e.g3Gu1gGlshI4g6aKfOk5Hp3VL/gVXpqqMwG";
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

// Login credentials — change as needed
const ADMIN_USERS = [
  { username: "admin", password: "1234" },
  { username: "partner2", password: "1234" },
  { username: "partner3", password: "1234" },
];

const LOAN_RULES = {
  5000:  { disburse: 4500,  daily: 100, days: 50 },
  10000: { disburse: 9000,  daily: 100, days: 100 },
  20000: { disburse: 18000, daily: 200, days: 100 },
  30000: { disburse: 27000, daily: 300, days: 100 },
};
const SAFETY_TARGET = 10000;

function getLoanRule(amount) {
  const keys = Object.keys(LOAN_RULES).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (amount <= k) return { loanAmount: k, ...LOAN_RULES[k] };
  return { loanAmount: amount, disburse: Math.floor(amount * 0.9), daily: 150, days: 200 };
}
function daysDiff(from, to) { return Math.floor((new Date(to) - new Date(from)) / 86400000); }
function fmt(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
function today() { return new Date().toISOString().split("T")[0]; }

// ─── STORAGE ────────────────────────────────────────────────────────────────
const EMPTY_DATA = { loans: [], payments: [], investors: [], safetyDeposit: { target: SAFETY_TARGET, balance: 0, transactions: [] } };

async function readData() {
  if (JSONBIN_BIN_ID === "YOUR_BIN_ID_HERE") {
    const d = localStorage.getItem("loanapp_v2");
    return d ? JSON.parse(d) : EMPTY_DATA;
  }
  try {
    const r = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}/latest`, { headers: { "X-Master-Key": JSONBIN_API_KEY } });
    const j = await r.json();
    const rec = j.record || EMPTY_DATA;
    if (!rec.safetyDeposit) rec.safetyDeposit = { target: SAFETY_TARGET, balance: 0, transactions: [] };
    if (!rec.investors) rec.investors = [];
    return rec;
  } catch { return EMPTY_DATA; }
}

async function writeData(data) {
  if (JSONBIN_BIN_ID === "YOUR_BIN_ID_HERE") { localStorage.setItem("loanapp_v2", JSON.stringify(data)); return; }
  await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_API_KEY },
    body: JSON.stringify(data),
  });
}

// ─── LOAN CALC ──────────────────────────────────────────────────────────────
function calcLoanStatus(loan, payments) {
  const rule = getLoanRule(loan.requestedAmount);
  const loanPayments = payments.filter(p => p.loanId === loan.id);
  const totalPaid = loanPayments.reduce((s, p) => s + p.amount, 0);
  const elapsed = daysDiff(loan.startDate, today());
  const remaining = rule.loanAmount - totalPaid;
  const isPaidOff = remaining <= 0;
  const overdue = !isPaidOff && elapsed > rule.days;
  const daysOver = overdue ? elapsed - rule.days : 0;
  // Penalty amount removed: only indicate delayed days (no monetary penalty)
  const penaltyAccrued = 0;
  const totalDue = Math.max(0, remaining);
  const progress = Math.min(100, (totalPaid / rule.loanAmount) * 100);
  const daysLeft = Math.max(0, rule.days - elapsed);
  return { rule, totalPaid, remaining, elapsed, overdue, daysOver, penaltyAccrued, totalDue, progress, daysLeft, loanPayments, closed: remaining <= 0 };
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
body{background:#f5f5f5;color:#111;font-family:'Inter',sans-serif;font-size:14px;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px;}
.app{max-width:430px;margin:0 auto;min-height:100vh;background:#fff;position:relative;padding-bottom:70px;}

/* LOGIN */
.login-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;padding:32px 24px;}
.login-logo{font-size:40px;margin-bottom:8px;}
.login-title{font-size:22px;font-weight:700;letter-spacing:-0.5px;margin-bottom:4px;}
.login-sub{font-size:13px;color:#888;margin-bottom:36px;}
.login-box{width:100%;max-width:360px;}
.login-field{margin-bottom:14px;}
.login-label{font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:block;}
.login-input{width:100%;border:1.5px solid #e0e0e0;border-radius:10px;padding:12px 14px;font-size:15px;font-family:'Inter',sans-serif;outline:none;transition:.15s;}
.login-input:focus{border-color:#111;}
.login-btn{width:100%;background:#111;color:#fff;border:none;border-radius:10px;padding:14px;font-size:15px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;margin-top:8px;transition:.15s;}
.login-btn:active{background:#333;}
.login-err{color:#c00;font-size:13px;text-align:center;margin-top:10px;}

/* NAV */
.nav{display:flex;background:#fff;border-top:1px solid #e8e8e8;position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;z-index:100;}
.nav-btn{flex:1;padding:10px 4px 8px;background:none;border:none;color:#aaa;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;font-family:'Inter',sans-serif;font-weight:500;transition:.15s;text-transform:uppercase;letter-spacing:0.3px;}
.nav-btn.active{color:#111;}
.nav-btn svg{width:20px;height:20px;}

/* HEADER */
.header{padding:18px 18px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f0f0f0;}
.header-title{font-size:18px;font-weight:700;letter-spacing:-0.3px;}
.header-sub{font-size:11px;color:#999;margin-top:1px;}
.sync-btn{background:none;border:1px solid #e0e0e0;color:#666;padding:5px 12px;border-radius:20px;font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;transition:.15s;}
.sync-btn:hover{border-color:#111;color:#111;}

/* CARDS */
.page-pad{padding:14px 16px 0;}
.card{background:#fff;border:1px solid #ebebeb;border-radius:14px;padding:16px;margin-bottom:12px;}
.card-dark{background:#111;color:#fff;border:none;}
.card-title{font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;}
.big-amt{font-size:28px;font-weight:700;letter-spacing:-1px;}
.row{display:flex;justify-content:space-between;align-items:center;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
.stat-card{background:#f9f9f9;border:1px solid #ebebeb;border-radius:12px;padding:12px 14px;}
.stat-label{font-size:11px;color:#999;font-weight:500;margin-bottom:3px;}
.stat-val{font-size:16px;font-weight:700;}

/* BADGES */
.badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;}
.badge-green{background:#e6f4ec;color:#1a7a3f;}
.badge-red{background:#fdecea;color:#c0392b;}
.badge-yellow{background:#fffbea;color:#856700;}
.badge-gray{background:#f0f0f0;color:#666;}

/* INPUTS */
.inp{width:100%;background:#f9f9f9;border:1.5px solid #e8e8e8;color:#111;padding:11px 13px;border-radius:10px;font-size:14px;font-family:'Inter',sans-serif;outline:none;transition:.15s;margin-bottom:10px;}
.inp:focus{border-color:#111;background:#fff;}
.inp-label{font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:5px;display:block;}
.btn{width:100%;padding:13px;border-radius:10px;border:none;font-size:14px;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;transition:.15s;}
.btn-black{background:#111;color:#fff;}
.btn-black:active{background:#333;}
.btn-outline{background:#fff;color:#111;border:1.5px solid #111;}
.btn-red{background:#fff;color:#c0392b;border:1.5px solid #fcc;}

/* CHIPS */
.chip{display:inline-block;padding:5px 13px;border-radius:20px;font-size:12px;font-weight:500;border:1.5px solid #e0e0e0;cursor:pointer;margin:2px;transition:.15s;color:#666;}
.chip.active{border-color:#111;color:#111;background:#f5f5f5;}

/* LOAN ROWS */
.loan-row{background:#fff;border:1px solid #ebebeb;border-radius:13px;margin-bottom:8px;padding:14px;cursor:pointer;transition:.15s;}
.loan-row:active{background:#f9f9f9;}
.loan-row .lname{font-size:15px;font-weight:700;}
.loan-row .lbiz{font-size:12px;color:#999;margin-top:1px;}

/* PROGRESS */
.pbar{height:5px;background:#f0f0f0;border-radius:4px;overflow:hidden;margin-top:8px;}
.pfill{height:100%;border-radius:4px;transition:.4s;}

/* MODAL */
.modal-bg{position:fixed;inset:0;background:#00000066;z-index:200;display:flex;align-items:flex-end;}
.modal{background:#fff;border-radius:22px 22px 0 0;width:100%;max-width:430px;margin:0 auto;padding:22px 18px 28px;max-height:88vh;overflow-y:auto;}
.modal-title{font-size:18px;font-weight:700;margin-bottom:18px;letter-spacing:-0.3px;}

/* TOAST */
.toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:9px 22px;border-radius:30px;font-size:13px;font-weight:500;z-index:999;white-space:nowrap;animation:popfade 2.6s forwards;}
@keyframes popfade{0%{opacity:0;transform:translateX(-50%) translateY(-8px)}12%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}

/* GRAPH */
.graph-wrap{overflow:hidden;border-radius:10px;}

/* SAFETY */
.sd-bar-wrap{height:20px;background:#f0f0f0;border-radius:10px;overflow:hidden;margin:10px 0;}
.sd-bar-fill{height:100%;border-radius:10px;background:#111;transition:.5s;}

/* SECTION TITLE */
.sec-title{font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:0.8px;padding:14px 16px 8px;}

/* INVESTOR ROW */
.inv-row{background:#fff;border:1px solid #ebebeb;border-radius:13px;margin-bottom:8px;padding:14px;}
.inv-name{font-size:15px;font-weight:700;}

/* CONFIRM MODAL */
.confirm-modal{background:#fff;border-radius:16px;margin:20px;padding:22px;width:100%;max-width:380px;}
.confirm-title{font-size:17px;font-weight:700;margin-bottom:8px;}
.confirm-msg{font-size:14px;color:#666;margin-bottom:20px;line-height:1.5;}
.confirm-btns{display:flex;gap:10px;}
.confirm-btns .btn{flex:1;padding:12px;}

/* OVERDUE ALERT */
.alert-red{background:#fdecea;border:1px solid #fcc;border-radius:12px;padding:12px 14px;margin-bottom:8px;}
.alert-red .alert-title{font-size:13px;font-weight:700;color:#c0392b;}

/* EMPTY */
.empty{text-align:center;padding:48px 20px;color:#bbb;font-size:14px;}
`;

// ─── GRAPH COMPONENT ─────────────────────────────────────────────────────────
function MiniGraph({ payments }) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ label: d.toLocaleString("default", { month: "short" }), month: d.getMonth(), year: d.getFullYear() });
  }
  const vals = months.map(({ month, year, label }) => ({
    label,
    v: payments.filter(p => { const d = new Date(p.date); return d.getMonth() === month && d.getFullYear() === year; }).reduce((s, p) => s + p.amount, 0),
  }));
  const max = Math.max(...vals.map(d => d.v), 1);
  const W = 340, H = 90;
  const pts = vals.map((d, i) => ({ x: 20 + i * ((W - 40) / 5), y: H - 8 - (d.v / max) * (H - 20), ...d }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path}L${pts[4].x},${H}L${pts[0].x},${H}Z`;
  return (
    <div className="graph-wrap">
      <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%">
        <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111" stopOpacity=".12"/><stop offset="100%" stopColor="#111" stopOpacity="0"/></linearGradient></defs>
        <path d={area} fill="url(#gr)"/>
        <path d={path} fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#111" strokeWidth="1.5"/>
            <text x={p.x} y={H + 16} textAnchor="middle" fill="#aaa" fontSize="10" fontFamily="Inter">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!sessionStorage.getItem("loanapp_auth"));
  const [tab, setTab] = useState("dash");
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [detailLoan, setDetailLoan] = useState(null);
  const [loanFilter, setLoanFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await readData()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (loggedIn) load(); }, [loggedIn, load]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2700); }

  async function save(nd) {
    setData(nd);
    try { await writeData(nd); showToast("✓ Saved"); } catch { showToast("Save error"); }
  }

  if (!loggedIn) return <LoginPage onLogin={() => { sessionStorage.setItem("loanapp_auth", "1"); setLoggedIn(true); }} />;

  const loans = data.loans || [];
  const payments = data.payments || [];
  const investors = data.investors || [];
  const sd = data.safetyDeposit || { target: SAFETY_TARGET, balance: 0, transactions: [] };

  const totalInvested = investors.reduce((s, i) => s + i.amount, 0) || 150000;
  const totalDisbursed = loans.reduce((s, l) => s + getLoanRule(l.requestedAmount).disburse, 0);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalInterestBook = loans.reduce((s, l) => { const r = getLoanRule(l.requestedAmount); return s + (r.loanAmount - r.disburse); }, 0);
  const activeLoans = loans.filter(l => !calcLoanStatus(l, payments).closed);
  const closedLoans = loans.filter(l => calcLoanStatus(l, payments).closed);
  const overdueLoans = loans.filter(l => { const s = calcLoanStatus(l, payments); return !s.closed && s.overdue; });
  const availableCapital = totalInvested - totalDisbursed + totalCollected;

  function logout() { sessionStorage.removeItem("loanapp_auth"); setLoggedIn(false); }

  if (detailLoan && tab === "borrowers") {
    return (
      <>
        <style>{css}</style>
        <div className="app">
          {toast && <div className="toast">{toast}</div>}
          <BorrowerDetail
            loan={loans.find(l => l.id === detailLoan.id) || detailLoan}
            payments={payments}
            onBack={() => setDetailLoan(null)}
            onSave={save} data={data} showToast={showToast}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {toast && <div className="toast">{toast}</div>}

        {tab === "dash" && <DashTab data={data} totalInvested={totalInvested} totalDisbursed={totalDisbursed} totalCollected={totalCollected} totalInterestBook={totalInterestBook} activeLoans={activeLoans} closedLoans={closedLoans} overdueLoans={overdueLoans} availableCapital={availableCapital} investors={investors} onSync={load} loading={loading} onOverdueClick={(l) => { setDetailLoan(l); setTab("borrowers"); }} />}
        {tab === "new" && <NewLoanTab data={data} onSave={save} onDone={() => { load(); setTab("borrowers"); }} showToast={showToast} />}
        {tab === "borrowers" && <BorrowersTab data={data} onSave={save} showToast={showToast} onSelect={(l) => setDetailLoan(l)} filter={loanFilter} setFilter={setLoanFilter} />}
        {tab === "investors" && <InvestorsTab data={data} onSave={save} showToast={showToast} />}
        {tab === "audit" && <AuditTab data={data} onSave={save} showToast={showToast} />}
        {tab === "safety" && <SafetyTab data={data} onSave={save} showToast={showToast} />}

        <nav className="nav">
          {[
            { key: "dash", label: "Home", icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
            { key: "new", label: "New", icon: <><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></> },
            { key: "borrowers", label: "People", icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
            { key: "investors", label: "Invest", icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></> },
            { key: "audit", label: "Audit", icon: <><path d="M3 3h18v4H3z"/><path d="M3 11h18v10H3z"/></> },
            { key: "safety", label: "Safety", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></> },
          ].map(({ key, label, icon }) => (
            <button key={key} className={`nav-btn ${tab === key ? "active" : ""}`} onClick={() => { setTab(key); setDetailLoan(null); }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">{icon}</svg>
              {label}
            </button>
          ))}
          <button className="nav-btn" onClick={logout} style={{ color: "#c0392b" }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Logout
          </button>
        </nav>
      </div>
    </>
  );
}

// ─── LOGIN PAGE ────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  function submit() {
    const ok = ADMIN_USERS.find(u => u.username === user.trim() && u.password === pass);
    if (ok) { setErr(""); onLogin(); }
    else setErr("Wrong username or password");
  }
  return (
    <>
      <style>{css}</style>
      <div className="login-wrap">
        <div className="login-logo">💰</div>
        <div className="login-title">BhaarathaFinance</div>
        <div className="login-sub">Trusted Loan Management System</div>
        <div className="login-box">
          <div className="login-field">
            <label className="login-label">Username</label>
            <input className="login-input" placeholder="admin" value={user} onChange={e => setUser(e.target.value)} autoCapitalize="none" />
          </div>
          <div className="login-field">
            <label className="login-label">Password</label>
            <input className="login-input" type="password" placeholder="••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
          </div>
          <button className="login-btn" onClick={submit}>Sign In →</button>
          {err && <div className="login-err">{err}</div>}
        </div>
        {/* <div style={{ marginTop: 40, fontSize: 11, color: "#ccc" }}>Default: admin / 1234</div> */}
      </div>
    </>
  );
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────
function DashTab({ data, totalInvested, totalDisbursed, totalCollected, totalInterestBook, activeLoans, closedLoans, overdueLoans, availableCapital, investors, onSync, loading, onOverdueClick }) {
  const payments = data.payments || [];
  const loans = data.loans || [];
  const capital = availableCapital;
  const totalRemaining = loans.reduce((s, l) => s + Math.max(0, calcLoanStatus(l, payments).remaining), 0);
  const rotation = Math.round((totalCollected / Math.max(totalDisbursed, 1)) * 100);

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">💰 BhaarathaFinance</div>
          <div className="header-sub">Trusted Loan Management System</div>
        </div>
        <button className="sync-btn" onClick={onSync}>{loading ? "..." : "⟳ Sync"}</button>
      </div>
      <div className="page-pad">
        <div className="card card-dark">
          <div className="card-title" style={{ color: "#666" }}>Total Capital Pool</div>
          <div className="big-amt">{fmt(totalInvested)}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
            {[["Available", fmt(capital), "#4caf50"], ["Deployed", fmt(totalDisbursed), "#90caf9"], ["Collected", fmt(totalCollected), "#ffd54f"], ["Remaining", fmt(totalRemaining), "#f06292"]].map(([k, v, c]) => (
              <div key={k}><div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{k}</div><div style={{ fontWeight: 700, color: c, fontSize: 13 }}>{v}</div></div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#ddd", marginTop: 10 }}>
            Available = Total Invested − Deployed + Collected. Remaining = sum of unpaid principal across loans.
          </div>
        </div>

        <div className="card">
          <div className="card-title">Monthly Collections</div>
          <MiniGraph payments={payments} />
        </div>
      </div>

      <div className="grid2" style={{ padding: "0 16px", marginBottom: 12 }}>
        {[
          ["Active Loans", activeLoans.length, "#1565c0"],
          ["Closed Loans", closedLoans.length, "#1a7a3f"],
          ["Overdue ⚠️", overdueLoans.length, "#c0392b"],
          ["Interest Book", fmt(totalInterestBook), "#856700"],
        ].map(([k, v, c]) => (
          <div key={k} className="stat-card">
            <div className="stat-label">{k}</div>
            <div className="stat-val" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      <div className="page-pad">
        <div className="card">
          <div className="card-title">Capital Rotation</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{rotation}%</div>
            <div style={{ flex: 1, fontSize: 12, color: "#888", lineHeight: 1.5 }}>
              Money collected vs deployed. Higher = faster money rotating back to give new loans.
            </div>
          </div>
          <div className="pbar" style={{ height: 8, marginTop: 10 }}>
            <div className="pfill" style={{ width: `${Math.min(rotation, 100)}%`, background: "#111" }} />
          </div>
        </div>
      </div>

      {investors.length > 0 && (() => {
        const totalInv = investors.reduce((s, i) => s + i.amount, 0) || 1;
        const loans = data.loans || [];
        const paymentsArr = data.payments || [];
        // Total interest booked = sum of (repayable - disbursed) across all loans — exact, no rounding
        const interestBooked = loans.reduce((s, l) => {
          const r = getLoanRule(l.requestedAmount);
          return s + (r.loanAmount - r.disburse);
        }, 0);
        // Interest collected = prorated share of payments that represent interest, per loan — kept as exact float
        const interestCollectedExact = loans.reduce((s, l) => {
          const r = getLoanRule(l.requestedAmount);
          const interestRatio = (r.loanAmount - r.disburse) / r.loanAmount;
          const loanPaid = paymentsArr.filter(p => p.loanId === l.id).reduce((t, p) => t + p.amount, 0);
          return s + Math.min(loanPaid * interestRatio, r.loanAmount - r.disburse);
        }, 0);
        // Round only once at display level, keep exact value for distribution
        const interestCollectedSoFar = Math.round(interestCollectedExact);
        // Per-investor shares: use exact float math, assign remainder to last investor to avoid paisa diff
        // shareOf(amount, idx) gives exact paise-accurate share
        const getShares = (total) => {
          const shares = investors.map((inv, i) => {
            if (i === investors.length - 1) return null; // last gets remainder
            return Math.round((inv.amount / totalInv) * total * 100) / 100;
          });
          const sumOthers = shares.slice(0, -1).reduce((s, v) => s + v, 0);
          shares[investors.length - 1] = Math.round((total - sumOthers) * 100) / 100;
          return shares;
        };
        const collectedShares = getShares(interestCollectedExact);
        const bookedShares = getShares(interestBooked);
        return (
          <>
            <div className="sec-title">Partner Breakdown</div>
            <div style={{ margin: "0 16px 10px", background: "#f0faf4", border: "1px solid #b7e4c7", borderRadius: 12, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#1a7a3f", fontWeight: 700, marginBottom: 2 }}>Interest Collected (Distributable)</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1a7a3f" }}>{fmt(interestCollectedSoFar)}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>of {fmt(interestBooked)} total booked</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Booked (full)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#555" }}>{fmt(interestBooked)}</div>
                </div>
              </div>
            </div>
            {investors.map((inv, i) => {
              const shareRatio = inv.amount / totalInv;
              // Use pre-calculated remainder-adjusted shares — zero paisa difference guaranteed
              const myCollected = collectedShares[i];
              const myBooked = bookedShares[i];
              const sharePercent = (shareRatio * 100).toFixed(2);
              return (
                <div key={i} style={{ margin: "0 16px 8px", background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.name}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{inv.phone || "No phone"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(inv.amount)}</div>
                      <div style={{ fontSize: 11, color: "#999" }}>{sharePercent}% share</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, padding: "8px 10px", background: myCollected > 0 ? "#f0faf4" : "#f5f5f5", borderRadius: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: "#888" }}>🏆 Collected So Far</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: myCollected > 0 ? "#1a7a3f" : "#bbb" }}>₹{myCollected.toFixed(2)}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: "#888" }}>📋 Total Booked Share</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#555" }}>₹{myBooked.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        );
      })()}

      {overdueLoans.length > 0 && (
        <>
          <div className="sec-title" style={{ color: "#c0392b" }}>⚠️ Overdue Accounts</div>
          <div style={{ padding: "0 16px" }}>
            {overdueLoans.map(l => {
              const s = calcLoanStatus(l, data.payments);
              return (
                <div key={l.id} className="alert-red" onClick={() => onOverdueClick(l)} style={{ cursor: "pointer" }}>
                  <div className="row">
                    <div className="alert-title">{l.name} — {l.business || "—"}</div>
                    <span className="badge badge-red">{s.daysOver}d late</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Late by: {s.daysOver}d · Total Due: {fmt(s.totalDue)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <div style={{ height: 16 }} />
    </>
  );
}

// ─── NEW LOAN ──────────────────────────────────────────────────────────────
function NewLoanTab({ data, onSave, onDone, showToast }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [business, setBusiness] = useState("");
  const [amount, setAmount] = useState(""); const [startDate, setStartDate] = useState(today()); const [saving, setSaving] = useState(false);
  const rule = amount ? getLoanRule(parseInt(amount) || 0) : null;

  async function submit() {
    if (!name.trim() || !amount || isNaN(parseInt(amount))) return showToast("Enter name and amount");
    setSaving(true);
    const loan = { id: Date.now().toString(), name: name.trim(), phone: phone.trim(), business: business.trim(), requestedAmount: parseInt(amount), startDate, createdAt: new Date().toISOString() };
    await onSave({ ...data, loans: [...(data.loans || []), loan] });
    onDone();
    setSaving(false);
  }

  return (
    <>
      <div className="header"><div className="header-title">New Loan</div></div>
      <div className="page-pad" style={{ paddingBottom: 20 }}>
        {[["Borrower Name *", "Full name", name, setName, "text"], ["Phone Number", "9876543210", phone, setPhone, "tel"], ["Business / Shop", "e.g. Ramu Kirana", business, setBusiness, "text"]].map(([label, ph, val, set, type]) => (
          <div key={label}><label className="inp-label">{label}</label><input className="inp" placeholder={ph} value={val} onChange={e => set(e.target.value)} type={type} /></div>
        ))}
        <label className="inp-label">Loan Amount *</label>
        <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 8 }}>
          {[5000, 10000, 20000, 30000].map(v => <button key={v} className={`chip ${parseInt(amount) === v ? "active" : ""}`} onClick={() => setAmount(String(v))}>{fmt(v)}</button>)}
        </div>
        <input className="inp" type="number" placeholder="Or enter custom amount" value={amount} onChange={e => setAmount(e.target.value)} />
        <label className="inp-label">Start Date</label>
        <input className="inp" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />

        {rule && (
          <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5, color: "#555" }}>Loan Summary</div>
            <div className="grid2" style={{ gap: 8, marginBottom: 0 }}>
              {[["Disburse", fmt(rule.disburse)], ["Repay", fmt(rule.loanAmount)], ["Daily", fmt(rule.daily)], ["Validity", `${rule.days} days`], ["End Date", new Date(new Date(startDate).getTime() + rule.days * 86400000).toLocaleDateString("en-IN")], ["Interest", fmt(rule.loanAmount - rule.disburse)]].map(([k, v]) => (
                <div key={k} style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.4 }}>{k}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="btn btn-black" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Create Loan"}</button>
      </div>
    </>
  );
}

// ─── BORROWERS LIST ────────────────────────────────────────────────────────
function BorrowersTab({ data, onSave, showToast, onSelect, filter, setFilter }) {
  const [search, setSearch] = useState("");
  const loans = data.loans || [];
  const payments = data.payments || [];

  const filtered = loans.filter(l => {
    const s = calcLoanStatus(l, payments);
    if (filter === "active" && s.closed) return false;
    if (filter === "closed" && !s.closed) return false;
    if (filter === "overdue" && (!s.overdue || s.closed)) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !(l.business || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="header"><div className="header-title">Borrowers</div><div className="header-sub">{loans.length} total</div></div>
      <div style={{ padding: "12px 16px 8px" }}>
        <input className="inp" style={{ marginBottom: 8 }} placeholder="Search name or business..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["all", "All"], ["active", "Active"], ["overdue", "⚠️ Overdue"], ["closed", "Closed"]].map(([k, l]) => (
            <button key={k} className={`chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 16px" }}>
        {filtered.length === 0 ? <div className="empty">No borrowers found</div> : filtered.map(loan => {
          const s = calcLoanStatus(loan, payments);
          return (
            <div key={loan.id} className="loan-row" onClick={() => onSelect(loan)}>
              <div className="row">
                <div><div className="lname">{loan.name}</div>{loan.business && <div className="lbiz">{loan.business}</div>}</div>
                <span className={`badge ${s.closed ? "badge-green" : s.overdue ? "badge-red" : "badge-yellow"}`}>{s.closed ? "Done" : s.overdue ? `${s.daysOver}d late` : `${s.daysLeft}d left`}</span>
              </div>
              <div className="row" style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
                <span>Loan: {fmt(s.rule.loanAmount)}</span>
                <span style={{ color: "#1a7a3f" }}>Paid: {fmt(s.totalPaid)}</span>
                <span style={{ color: s.totalDue > 0 ? "#c0392b" : "#888" }}>Due: {fmt(s.totalDue)}</span>
              </div>
              <div className="pbar"><div className="pfill" style={{ width: `${s.progress}%`, background: s.closed ? "#1a7a3f" : s.overdue ? "#c0392b" : "#111" }} /></div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 16 }} />
    </>
  );
}

// ─── WHATSAPP HELPERS ─────────────────────────────────────────────────────
function openWhatsApp(phone, message) {
  const clean = (phone || "").replace(/\D/g, "");
  const num = clean.startsWith("91") ? clean : "91" + clean;
  const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function paymentReceiptMsg(loan, s, payAmt, payDate) {
  const dateStr = new Date(payDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `*BharathaFinance* 🏦
━━━━━━━━━━━━━━━━━━
*Payment Receipt*

Dear *${loan.name}*,

We have received your payment. Here are your updated loan details:

📋 *Loan Summary*
• Total Borrowed : ${fmt(s.rule.loanAmount)}
• Total Paid     : ${fmt(s.totalPaid + parseInt(payAmt))}
• Balance Due    : ${fmt(Math.max(0, s.rule.loanAmount - s.totalPaid - parseInt(payAmt)))}

💰 *Today's Payment*
• Date   : ${dateStr}
• Amount : ${fmt(parseInt(payAmt))}

${s.daysLeft > 0 ? `⏳ Days Remaining : ${s.daysLeft} days` : `⚠️ Loan is overdue by ${s.daysOver} days`}

Thank you for your timely payment! 🙏
Keep it up — you're doing great.

— BharathaFinance Team`;
}

function fullReportMsg(loan, s) {
  const endDate = new Date(new Date(loan.startDate).getTime() + s.rule.days * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const startStr = new Date(loan.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `*BharathaFinance* 🏦
━━━━━━━━━━━━━━━━━━
*Loan Statement — ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}*

Dear *${loan.name}*,
${loan.business ? `Shop/Business : ${loan.business}` : ""}

📋 *Loan Details*
• Total Borrowed  : ${fmt(s.rule.loanAmount)}
• Daily Payment   : ${fmt(s.rule.daily)}
• Loan Start Date : ${startStr}
• Last Due Date   : ${endDate}

💳 *Repayment Status*
• Total Paid      : ${fmt(s.totalPaid)}
• Balance Due     : ${fmt(Math.max(0, s.remaining))}
• Progress        : ${s.progress.toFixed(0)}%
${s.daysOver > 0 ? `• Overdue by : ${s.daysOver} days
• Total Due : ${fmt(s.totalDue)}` : "• No penalty — on track! ✅"}

${s.closed ? "✅ Loan is fully repaid. Thank you!" : s.overdue ? `⚠️ Loan overdue by ${s.daysOver} days. Please clear dues at earliest.` : `⏳ ${s.daysLeft} days remaining. Keep paying daily!`}

For any queries, please contact us.
— BharathaFinance Team`;
}

// ─── BORROWER DETAIL ───────────────────────────────────────────────────────
function BorrowerDetail({ loan, payments, onBack, onSave, data, showToast }) {
  const [payModal, setPayModal] = useState(false);
  const [payAmt, setPayAmt] = useState(""); const [payDate, setPayDate] = useState(today()); const [payNote, setPayNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const s = calcLoanStatus(loan, payments);

  async function addPayment() {
    if (!payAmt || isNaN(parseInt(payAmt))) return showToast("Enter valid amount");
    const p = { id: Date.now().toString(), loanId: loan.id, amount: parseInt(payAmt), date: payDate, note: payNote.trim() };
    await onSave({ ...data, payments: [...(data.payments || []), p] });
    setPayModal(false); setPayAmt(""); setPayNote("");
    // CR1: open WhatsApp with payment receipt after saving
    if (loan.phone) {
      const updatedPaid = s.totalPaid + parseInt(payAmt);
      const msgS = { ...s, totalPaid: updatedPaid };
      setTimeout(() => openWhatsApp(loan.phone, paymentReceiptMsg(loan, s, payAmt, payDate)), 400);
    }
  }

  async function deleteLoan() {
    const nd = {
      ...data,
      loans: (data.loans || []).filter(l => l.id !== loan.id),
      payments: (data.payments || []).filter(p => p.loanId !== loan.id),
    };
    await onSave(nd);
    showToast("Borrower deleted");
    onBack();
  }

  return (
    <>
      <div className="header">
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 8px 0 0", color: "#111" }}>←</button>
        <div style={{ flex: 1 }}><div className="header-title">{loan.name}</div>{loan.business && <div className="header-sub">{loan.business}</div>}</div>
        <span className={`badge ${s.closed ? "badge-green" : s.overdue ? "badge-red" : "badge-yellow"}`}>{s.closed ? "Closed" : s.overdue ? `${s.daysOver}d late` : `${s.daysLeft}d left`}</span>
      </div>

      <div className="page-pad">
        <div className="grid2" style={{ gap: 8, marginBottom: 12 }}>
          {[["Disbursed", fmt(s.rule.disburse), "#1565c0"], ["Must Repay", fmt(s.rule.loanAmount), "#111"], ["Paid So Far", fmt(s.totalPaid), "#1a7a3f"], ["Remaining", fmt(Math.max(0, s.remaining)), "#856700"], ["Delayed", `${s.daysOver}d`, "#c0392b"], ["Total Due", fmt(s.totalDue), s.totalDue > 0 ? "#c0392b" : "#1a7a3f"]].map(([k, v, c]) => (
            <div key={k} className="stat-card"><div className="stat-label">{k}</div><div className="stat-val" style={{ color: c, fontSize: 15 }}>{v}</div></div>
          ))}
        </div>

        <div className="card">
          <div className="row" style={{ marginBottom: 6 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Repayment Progress</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{s.progress.toFixed(0)}%</div>
          </div>
          <div className="pbar" style={{ height: 8 }}>
            <div className="pfill" style={{ width: `${s.progress}%`, background: s.closed ? "#1a7a3f" : s.overdue ? "#c0392b" : "#111" }} />
          </div>
          <div className="row" style={{ marginTop: 8, fontSize: 11, color: "#999" }}>
            <span>Start: {new Date(loan.startDate).toLocaleDateString("en-IN")}</span>
            <span>Daily: {fmt(s.rule.daily)}</span>
            <span>Day {s.elapsed}/{s.rule.days}</span>
          </div>
        </div>

        {loan.phone && <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>📞 {loan.phone}</div>}

        {!s.closed && <button className="btn btn-black" style={{ marginBottom: 10 }} onClick={() => setPayModal(true)}>+ Record Payment</button>}
        {loan.phone && (
          <button className="btn btn-outline" style={{ marginBottom: 10 }} onClick={() => openWhatsApp(loan.phone, fullReportMsg(loan, s))}>
            📤 Send Report on WhatsApp
          </button>
        )}
        {!loan.phone && <div style={{ fontSize: 12, color: "#bbb", marginBottom: 10, textAlign: "center" }}>Add phone number to enable WhatsApp messages</div>}
        <button className="btn btn-red" onClick={() => setConfirm(true)}>🗑 Delete Borrower</button>
      </div>

      <div className="sec-title">Payment History ({s.loanPayments.length})</div>
      <div style={{ padding: "0 16px" }}>
        {s.loanPayments.length === 0 ? <div className="empty">No payments yet</div> : [...s.loanPayments].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
          <div key={p.id} style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
            <div className="row">
              <div style={{ fontWeight: 700, color: "#1a7a3f", fontSize: 15 }}>{fmt(p.amount)}</div>
              <div style={{ fontSize: 12, color: "#999" }}>{new Date(p.date).toLocaleDateString("en-IN")}</div>
            </div>
            {p.note && <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{p.note}</div>}
          </div>
        ))}
      </div>
      <div style={{ height: 16 }} />

      {payModal && (
        <div className="modal-bg" onClick={() => setPayModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Record Payment</div>
            <label className="inp-label">Quick amounts</label>
            <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 10 }}>
              {[100, 200, 500, 1000, 2000].map(v => <button key={v} className={`chip ${parseInt(payAmt) === v ? "active" : ""}`} onClick={() => setPayAmt(String(v))}>{fmt(v)}</button>)}
            </div>
            <label className="inp-label">Amount *</label>
            <input className="inp" type="number" placeholder="Enter amount" value={payAmt} onChange={e => setPayAmt(e.target.value)} />
            <label className="inp-label">Date</label>
            <input className="inp" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            <label className="inp-label">Note (optional)</label>
            <input className="inp" placeholder="Cash / UPI / partial..." value={payNote} onChange={e => setPayNote(e.target.value)} />
            <button className="btn btn-black" style={{ marginBottom: 8 }} onClick={addPayment}>Save Payment{loan.phone ? " & Send WhatsApp" : ""}</button>
            {loan.phone && <div style={{ fontSize: 11, color: "#888", textAlign: "center", marginBottom: 8 }}>WhatsApp receipt will open after saving</div>}
            <button className="btn btn-outline" onClick={() => setPayModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-bg" onClick={() => setConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-modal" style={{ margin: 0, padding: 0 }}>
              <div className="modal-title">Delete Borrower?</div>
              <div style={{ fontSize: 14, color: "#666", marginBottom: 20, lineHeight: 1.6 }}>
                This will permanently delete <strong>{loan.name}</strong> and all {s.loanPayments.length} payment records. This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancel</button>
                <button className="btn btn-red" style={{ flex: 1 }} onClick={deleteLoan}>Yes, Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── INVESTORS TAB ─────────────────────────────────────────────────────────
function InvestorsTab({ data, onSave, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [amount, setAmount] = useState(""); const [joinDate, setJoinDate] = useState(today()); const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const investors = data.investors || [];
  const total = investors.reduce((s, i) => s + i.amount, 0);
  const paymentsArr = data.payments || [];
  const loans = data.loans || [];
  const totalCollectedLocal = paymentsArr.reduce((s, p) => s + p.amount, 0);
  const reinvestments = data.reinvestments || [];
  const totalReinvested = reinvestments.reduce((s, r) => s + r.amount, 0);
  // Use profit (interest collected) as investable amount rather than raw collections
  const interestCollectedExact = loans.reduce((s, l) => {
    const r = getLoanRule(l.requestedAmount);
    const interestRatio = (r.loanAmount - r.disburse) / r.loanAmount;
    const loanPaid = paymentsArr.filter(p => p.loanId === l.id).reduce((t, p) => t + p.amount, 0);
    return s + Math.min(loanPaid * interestRatio, r.loanAmount - r.disburse);
  }, 0);
  const availableForReinvest = Math.max(0, Math.round(interestCollectedExact) - totalReinvested);
  const principalTransfers = data.principalTransfers || [];
  const totalPrincipalUsed = principalTransfers.reduce((s, t) => s + t.amount, 0);
  // Approximate principal collected = totalCollectedLocal - interestCollectedExact
  const principalCollectedApprox = Math.max(0, totalCollectedLocal - Math.round(interestCollectedExact));
  const availableCollectedPrincipal = Math.max(0, principalCollectedApprox - totalPrincipalUsed);
  const [principalModal, setPrincipalModal] = useState(false);
  const [principalInvestorId, setPrincipalInvestorId] = useState(investors.length ? investors[0].id : null);
  const [principalAmt, setPrincipalAmt] = useState("");
  const [reinvestModal, setReinvestModal] = useState(false);
  const [reinvestFor, setReinvestFor] = useState(null);
  const [reinvestAmt, setReinvestAmt] = useState("");

  async function submit() {
    if (!name.trim() || !amount || isNaN(parseInt(amount))) return showToast("Enter name and amount");
    setSaving(true);
    const inv = { id: Date.now().toString(), name: name.trim(), phone: phone.trim(), amount: parseInt(amount), joinDate, note: note.trim(), addedAt: new Date().toISOString() };
    await onSave({ ...data, investors: [...investors, inv] });
    setName(""); setPhone(""); setAmount(""); setNote(""); setShowForm(false);
    setSaving(false);
  }

  async function removeInvestor(id) {
    await onSave({ ...data, investors: investors.filter(i => i.id !== id) });
    showToast("Investor removed");
  }

  function getShares(totalInterest) {
    const totalInv = investors.reduce((s, i) => s + i.amount, 0) || 1;
    const shares = investors.map((inv, i) => {
      if (i === investors.length - 1) return null;
      return Math.round((inv.amount / totalInv) * totalInterest * 100) / 100;
    });
    const sumOthers = shares.slice(0, -1).reduce((s, v) => s + v, 0);
    shares[investors.length - 1] = Math.round((totalInterest - sumOthers) * 100) / 100;
    return shares;
  }

  // compute distributable interest per investor (exact float) — used to suggest reinvest amount
  const collectedShares = getShares(interestCollectedExact);

  async function openReinvest(inv, suggested) {
    setReinvestFor(inv);
    setReinvestAmt(String(Math.min(Math.round(suggested || 0), availableForReinvest)));
    setReinvestModal(true);
  }

  async function doReinvest() {
    const amt = parseInt(reinvestAmt || 0);
    if (!reinvestFor || !amt || isNaN(amt) || amt <= 0) return showToast("Enter valid amount");
    if (amt > availableForReinvest) return showToast("Not enough collected funds to reinvest");
    const newInvs = investors.map(i => i.id === reinvestFor.id ? { ...i, amount: i.amount + amt } : i);
    const rec = { id: Date.now().toString(), investorId: reinvestFor.id, amount: amt, date: today() };
    await onSave({ ...data, investors: newInvs, reinvestments: [...reinvestments, rec] });
    setReinvestModal(false); setReinvestFor(null); setReinvestAmt("");
    showToast("Reinvested successfully");
  }

  async function openUseCollected() {
    setPrincipalInvestorId(investors.length ? investors[0].id : null);
    setPrincipalAmt("");
    setPrincipalModal(true);
  }

  async function doUseCollected() {
    const amt = parseInt(principalAmt || 0);
    if (!principalInvestorId || !amt || isNaN(amt) || amt <= 0) return showToast("Enter valid amount");
    if (amt > availableCollectedPrincipal) return showToast("Not enough collected principal to use");
    const newInvs = investors.map(i => i.id === principalInvestorId ? { ...i, amount: i.amount + amt } : i);
    const rec = { id: Date.now().toString(), investorId: principalInvestorId, amount: amt, date: today() };
    await onSave({ ...data, investors: newInvs, principalTransfers: [...principalTransfers, rec] });
    setPrincipalModal(false); setPrincipalInvestorId(null); setPrincipalAmt("");
    showToast("Principal used to increase investor capital");
  }

  return (
    <>
      <div className="header">
        <div><div className="header-title">Investors</div><div className="header-sub">Total: {fmt(total)}</div></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sync-btn" onClick={openUseCollected}>Use Collected</button>
          <button className="sync-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "+ Add"}</button>
        </div>
      </div>

      {showForm && (
        <div className="page-pad" style={{ paddingBottom: 12 }}>
          <div style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>New Investor / Partner</div>
            {[["Full Name *", "Partner name", name, setName, "text"], ["Phone Number", "9876543210", phone, setPhone, "tel"], ["Invested Amount *", "50000", amount, setAmount, "number"]].map(([l, ph, v, s, t]) => (
              <div key={l}><label className="inp-label">{l}</label><input className="inp" placeholder={ph} value={v} onChange={e => s(e.target.value)} type={t} /></div>
            ))}
            <label className="inp-label">Join Date</label>
            <input className="inp" type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} />
            <label className="inp-label">Note (optional)</label>
            <input className="inp" placeholder="Silent partner, active partner..." value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn btn-black" onClick={submit} disabled={saving}>{saving ? "Saving..." : "Add Investor"}</button>
          </div>
        </div>
      )}

      <div className="page-pad">
        <div style={{ background: "#111", borderRadius: 14, padding: 16, marginBottom: 12, color: "#fff" }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Total Invested Capital</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(total)}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>{investors.length} partner{investors.length !== 1 ? "s" : ""}</div>
          <div style={{ fontSize: 12, color: "#ffd54f", marginTop: 6 }}>Available to Reinvest (profit): {fmt(availableForReinvest)}</div>
        </div>
      </div>

      {investors.length === 0 ? (
        <div className="empty">No investors added yet.<br />Tap + Add to add partners.</div>
      ) : (
        <div style={{ padding: "0 16px" }}>
          {investors.map((inv, idx) => {
            const share = total > 0 ? ((inv.amount / total) * 100).toFixed(1) : 0;
            return (
              <div key={inv.id} className="inv-row">
                <div className="row">
                  <div>
                    <div className="inv-name">{inv.name}</div>
                    {inv.phone && <div style={{ fontSize: 12, color: "#999", marginTop: 1 }}>📞 {inv.phone}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(inv.amount)}</div>
                    <div style={{ fontSize: 11, color: "#999" }}>{share}% share</div>
                  </div>
                </div>
                {inv.note && <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{inv.note}</div>}
                <div className="row" style={{ marginTop: 8, fontSize: 11, color: "#bbb" }}>
                  <span>Joined: {new Date(inv.joinDate).toLocaleDateString("en-IN")}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openReinvest(inv, collectedShares[idx] || 0)} style={{ background: "none", border: "none", color: "#1a7a3f", cursor: "pointer", fontSize: 12, fontFamily: "Inter" }}>Reinvest</button>
                    <button onClick={() => removeInvestor(inv.id)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 12, fontFamily: "Inter" }}>Remove</button>
                  </div>
                </div>
                <div className="pbar" style={{ height: 4, marginTop: 8 }}>
                  <div className="pfill" style={{ width: `${share}%`, background: "#111" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ height: 16 }} />
      {reinvestModal && reinvestFor && (
        <div className="modal-bg" onClick={() => setReinvestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Reinvest to {reinvestFor.name}</div>
            <label className="inp-label">Available to reinvest</label>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>{fmt(availableForReinvest)}</div>
            <label className="inp-label">Amount</label>
            <input className="inp" type="number" placeholder="Enter amount" value={reinvestAmt} onChange={e => setReinvestAmt(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-black" style={{ flex: 1 }} onClick={doReinvest}>Reinvest</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setReinvestModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {principalModal && (
        <div className="modal-bg" onClick={() => setPrincipalModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Use Collected Principal</div>
            <label className="inp-label">Available collected principal</label>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>{fmt(availableCollectedPrincipal)}</div>
            <label className="inp-label">Select Investor</label>
            <select className="inp" value={principalInvestorId || ""} onChange={e => setPrincipalInvestorId(e.target.value)}>
              {investors.map(inv => <option key={inv.id} value={inv.id}>{inv.name} — {fmt(inv.amount)}</option>)}
            </select>
            <label className="inp-label">Amount</label>
            <input className="inp" type="number" placeholder="Enter amount" value={principalAmt} onChange={e => setPrincipalAmt(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-black" style={{ flex: 1 }} onClick={doUseCollected}>Use Collected</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setPrincipalModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SAFETY DEPOSIT TAB ────────────────────────────────────────────────────
function SafetyTab({ data, onSave, showToast }) {
  const [modal, setModal] = useState(null); // "add" | "use"
  const [amt, setAmt] = useState(""); const [note, setNote] = useState(""); const [txDate, setTxDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const sd = data.safetyDeposit || { target: SAFETY_TARGET, balance: 0, transactions: [] };
  const pct = Math.min(100, Math.round((sd.balance / sd.target) * 100));

  async function addTx(type) {
    if (!amt || isNaN(parseInt(amt)) || parseInt(amt) <= 0) return showToast("Enter valid amount");
    const amount = parseInt(amt);
    if (type === "use" && amount > sd.balance) return showToast("Not enough balance");
    setSaving(true);
    const tx = { id: Date.now().toString(), type, amount, date: txDate, note: note.trim() };
    const newBal = type === "add" ? sd.balance + amount : sd.balance - amount;
    const newSd = { ...sd, balance: newBal, transactions: [...(sd.transactions || []), tx] };
    await onSave({ ...data, safetyDeposit: newSd });
    setAmt(""); setNote(""); setModal(null);
    setSaving(false);
  }

  const txns = [...(sd.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="header"><div className="header-title">🛡 Safety Deposit</div><div className="header-sub">Emergency Fund</div></div>
      <div className="page-pad">
        <div className="card card-dark">
          <div className="card-title" style={{ color: "#666" }}>Current Balance</div>
          <div className="big-amt">{fmt(sd.balance)}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Target: {fmt(sd.target)}</div>
          <div className="sd-bar-wrap" style={{ background: "#333" }}>
            <div className="sd-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? "#4caf50" : "#fff" }} />
          </div>
          <div style={{ fontSize: 12, color: pct >= 100 ? "#4caf50" : "#888" }}>{pct}% of target {pct >= 100 ? "✓ Funded!" : `— need ${fmt(sd.target - sd.balance)} more`}</div>
        </div>

        <div style={{ background: "#f0faf4", border: "1px solid #b7e4c7", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1a7a3f", marginBottom: 4 }}>📌 How it works</div>
          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
            Collect ₹10,000 as a safety buffer. Money keeps rotating — when someone repays a loan, you give it to someone new. The safety fund is separate and only used for emergencies or unexpected gaps.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button className="btn btn-black" style={{ flex: 1 }} onClick={() => setModal("add")}>+ Add Money</button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal("use")} disabled={sd.balance === 0}>− Use Money</button>
        </div>
      </div>

      <div className="sec-title">Transactions ({txns.length})</div>
      <div style={{ padding: "0 16px" }}>
        {txns.length === 0 ? <div className="empty">No transactions yet</div> : txns.map(tx => (
          <div key={tx.id} style={{ background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}>
            <div className="row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{tx.type === "add" ? "⬆️" : "⬇️"}</span>
                <div>
                  <div style={{ fontWeight: 700, color: tx.type === "add" ? "#1a7a3f" : "#c0392b", fontSize: 15 }}>{tx.type === "add" ? "+" : "−"}{fmt(tx.amount)}</div>
                  {tx.note && <div style={{ fontSize: 12, color: "#888" }}>{tx.note}</div>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>{new Date(tx.date).toLocaleDateString("en-IN")}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 16 }} />

      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === "add" ? "Add to Safety Fund" : "Use from Safety Fund"}</div>
            <label className="inp-label">Amount</label>
            <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 8 }}>
              {[500, 1000, 2000, 5000].map(v => <button key={v} className={`chip ${parseInt(amt) === v ? "active" : ""}`} onClick={() => setAmt(String(v))}>{fmt(v)}</button>)}
            </div>
            <input className="inp" type="number" placeholder="Enter amount" value={amt} onChange={e => setAmt(e.target.value)} />
            <label className="inp-label">Date</label>
            <input className="inp" type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
            <label className="inp-label">Reason / Note</label>
            <input className="inp" placeholder={modal === "add" ? "From collections..." : "Emergency use..."} value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn btn-black" style={{ marginBottom: 8 }} onClick={() => addTx(modal)} disabled={saving}>{saving ? "Saving..." : modal === "add" ? "Add Money" : "Use Money"}</button>
            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── AUDIT TAB ────────────────────────────────────────────────────────────
function AuditTab({ data, onSave, showToast }) {
  const [importMode, setImportMode] = useState("replace"); // replace | merge
  const [fileErr, setFileErr] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(1);
  const [auditType, setAuditType] = useState('all');
  const [auditInvestor, setAuditInvestor] = useState('all');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');

  function download(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const filename = `loanapp_export_${new Date().toISOString().slice(0,10)}.json`;
    download(filename, JSON.stringify(data, null, 2));
    showToast("Exported JSON");
  }

  function exportCSV() {
    // create CSV for loans, payments, investors
    const toCSV = (arr, keys) => [keys.join(','), ...arr.map(r => keys.map(k => `"${(r[k]||"").toString().replace(/"/g,'""')}"`).join(',')).join('\n')].join('\n');
    const loans = data.loans || [];
    const payments = data.payments || [];
    const investors = data.investors || [];
    const zip = `----LOANS----\n${toCSV(loans, ['id','name','requestedAmount','startDate','business'])}\n\n----PAYMENTS----\n${toCSV(payments, ['id','loanId','amount','date','note'])}\n\n----INVESTORS----\n${toCSV(investors, ['id','name','amount','joinDate','phone'])}`;
    const filename = `loanapp_export_${new Date().toISOString().slice(0,10)}.csv`;
    const blob = new Blob([zip], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    showToast('Exported CSV');
  }

  function handleImportFile(e) {
    setFileErr("");
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const txt = ev.target.result;
        const j = JSON.parse(txt);
        if (importMode === 'replace') {
          await onSave(j);
          showToast('Data replaced from import');
        } else {
          // merge arrays with deduplication by id: loans, payments, investors, safetyDeposit
          const nd = { ...data };
          const dedupe = (existing = [], incoming = []) => {
            const map = new Map(existing.map(i => [i.id, i]));
            for (const it of incoming || []) if (it && it.id && !map.has(it.id)) map.set(it.id, it);
            return Array.from(map.values());
          };
          nd.loans = dedupe(data.loans, j.loans);
          nd.payments = dedupe(data.payments, j.payments);
          nd.investors = dedupe(data.investors, j.investors);
          nd.safetyDeposit = j.safetyDeposit || data.safetyDeposit;
          nd.reinvestments = dedupe(data.reinvestments, j.reinvestments);
          nd.principalTransfers = dedupe(data.principalTransfers, j.principalTransfers);
          await onSave(nd);
          showToast('Data merged from import (duplicates skipped)');
        }
      } catch (err) {
        setFileErr('Invalid JSON file');
      }
    };
    reader.readAsText(f);
  }

  async function exportXLSX() {
    try {
      const wb = XLSX.utils.book_new();
      const loans = (data.loans || []).map(l=>({id:l.id,name:l.name,requestedAmount:l.requestedAmount,startDate:l.startDate,business:l.business}));
      const payments = (data.payments || []).map(p=>({id:p.id,loanId:p.loanId,amount:p.amount,date:p.date,note:p.note}));
      const investors = (data.investors || []).map(i=>({id:i.id,name:i.name,amount:i.amount,joinDate:i.joinDate,phone:i.phone,note:i.note}));
      const reinvestments = (data.reinvestments || []).map(r=>({id:r.id,investorId:r.investorId,amount:r.amount,date:r.date}));
      const principalTransfers = (data.principalTransfers || []).map(r=>({id:r.id,investorId:r.investorId,amount:r.amount,date:r.date}));
      const opts = { header: ['id','name','requestedAmount','startDate','business'] };
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(loans, {header:['id','name','requestedAmount','startDate','business']}), 'Loans');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments, {header:['id','loanId','amount','date','note']}), 'Payments');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(investors, {header:['id','name','amount','joinDate','phone','note']}), 'Investors');
      if (reinvestments.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reinvestments, {header:['id','investorId','amount','date']}), 'Reinvestments');
      if (principalTransfers.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(principalTransfers, {header:['id','investorId','amount','date']}), 'PrincipalTransfers');
      if (data.safetyDeposit) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([data.safetyDeposit], {header:['target','balance']}), 'SafetyDeposit');
      const filename = `loanapp_export_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast('Exported Excel');
    } catch (err) { showToast('Excel export failed'); }
  }

  function handleImportXLSX(e) {
    setFileErr("");
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dataBuf = ev.target.result;
        const wb = XLSX.read(dataBuf, { type: 'array' });
        const j = {};
        if (wb.SheetNames.includes('Loans')) j.loans = XLSX.utils.sheet_to_json(wb.Sheets['Loans']);
        if (wb.SheetNames.includes('Payments')) j.payments = XLSX.utils.sheet_to_json(wb.Sheets['Payments']);
        if (wb.SheetNames.includes('Investors')) j.investors = XLSX.utils.sheet_to_json(wb.Sheets['Investors']);
        if (wb.SheetNames.includes('Reinvestments')) j.reinvestments = XLSX.utils.sheet_to_json(wb.Sheets['Reinvestments']);
        if (wb.SheetNames.includes('PrincipalTransfers')) j.principalTransfers = XLSX.utils.sheet_to_json(wb.Sheets['PrincipalTransfers']);
        if (wb.SheetNames.includes('SafetyDeposit')) j.safetyDeposit = XLSX.utils.sheet_to_json(wb.Sheets['SafetyDeposit'])[0];
        // reuse JSON import logic
        if (importMode === 'replace') {
          await onSave(j);
          showToast('Data replaced from Excel import');
        } else {
          // merge with dedupe
          const nd = { ...data };
          const dedupe = (existing = [], incoming = []) => {
            const map = new Map(existing.map(i => [i.id, i]));
            for (const it of incoming || []) if (it && it.id && !map.has(it.id)) map.set(it.id, it);
            return Array.from(map.values());
          };
          nd.loans = dedupe(data.loans, j.loans);
          nd.payments = dedupe(data.payments, j.payments);
          nd.investors = dedupe(data.investors, j.investors);
          nd.safetyDeposit = j.safetyDeposit || data.safetyDeposit;
          nd.reinvestments = dedupe(data.reinvestments, j.reinvestments);
          nd.principalTransfers = dedupe(data.principalTransfers, j.principalTransfers);
          await onSave(nd);
          showToast('Data merged from Excel import (duplicates skipped)');
        }
      } catch (err) {
        setFileErr('Invalid Excel file');
      }
    };
    reader.readAsArrayBuffer(f);
  }

  function quarterRange(y, q) {
    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1);
    const end = new Date(y, startMonth + 3, 0, 23, 59, 59);
    return [start, end];
  }

  function generateQuarterReport() {
    const [s, e] = quarterRange(parseInt(year), parseInt(quarter));
    const loans = data.loans || [];
    const payments = data.payments || [];
    const inRange = d => { const dt = new Date(d); return dt >= s && dt <= e; };
    const disbursed = loans.filter(l => inRange(l.startDate)).reduce((sum, l) => sum + (getLoanRule(l.requestedAmount).disburse||0), 0);
    const collected = payments.filter(p => inRange(p.date)).reduce((sum, p) => sum + p.amount, 0);
    // interest collected in quarter
    const interestCollected = loans.reduce((sum, l) => {
      const r = getLoanRule(l.requestedAmount);
      const loanPaidInRange = payments.filter(p => p.loanId === l.id && inRange(p.date)).reduce((t,p)=>t+p.amount,0);
      return sum + Math.min(loanPaidInRange * ((r.loanAmount - r.disburse)/r.loanAmount), r.loanAmount - r.disburse);
    }, 0);
    const activeCount = loans.filter(l => { const st = new Date(l.startDate); return st <= e && calcLoanStatus(l, payments).closed === false; }).length;
    const overdueCount = loans.filter(l => { const st = new Date(l.startDate); return st <= e && calcLoanStatus(l, payments).overdue; }).length;

    const title = `Quarterly Report Q${quarter} ${year}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial;padding:24px;color:#111}h1{margin-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:8px;border:1px solid #ddd;text-align:left}</style></head><body><h1>${title}</h1><div>Period: ${s.toLocaleDateString()} — ${e.toLocaleDateString()}</div><table><tr><th>Metric</th><th>Value</th></tr><tr><td>Total Disbursed</td><td>${fmt(disbursed)}</td></tr><tr><td>Total Collected</td><td>${fmt(collected)}</td></tr><tr><td>Interest Collected</td><td>${fmt(Math.round(interestCollected))}</td></tr><tr><td>Active Loans (end)</td><td>${activeCount}</td></tr><tr><td>Overdue Loans</td><td>${overdueCount}</td></tr></table><div style="margin-top:20px;font-size:12px;color:#666">Generated: ${new Date().toLocaleString()}</div><script>window.print()</script></body></html>`;
    const w = window.open('about:blank');
    if (w) { w.document.write(html); w.document.close(); }
    showToast('Quarterly report opened — use Print to save as PDF');
  }

  // Audit list: recent reinvestments and principal transfers
  const recentReinvest = (data.reinvestments || []).map(r => ({ ...r, type: 'reinvest' }));
  const recentPrincipal = (data.principalTransfers || []).map(r => ({ ...r, type: 'principal' }));
  const recentAll = [...recentReinvest, ...recentPrincipal].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12);
  // apply filters
  const filteredAll = recentAll.filter(r => {
    if (auditType !== 'all' && r.type !== auditType) return false;
    if (auditInvestor !== 'all' && r.investorId !== auditInvestor) return false;
    if (auditFrom) { if (new Date(r.date) < new Date(auditFrom)) return false; }
    if (auditTo) { if (new Date(r.date) > new Date(auditTo + 'T23:59:59')) return false; }
    return true;
  });

  function exportAuditCSV(rows) {
    const keys = ['id','type','investorId','amount','date'];
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${((r[k]||'')+'').toString().replace(/"/g,'""')}"`).join(',')).join('\n')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `audit_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    showToast('Audit exported (CSV)');
  }

  function exportAuditXLSX(rows) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Audit');
    XLSX.writeFile(wb, `audit_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('Audit exported (Excel)');
  }

  return (
    <>
      <div className="header"><div className="header-title">Audit</div><div className="header-sub">Export / Import / Reports</div></div>
      <div className="page-pad">
        <div className="card">
          <div className="card-title">Export Data</div>
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="btn btn-black" onClick={exportJSON}>Export JSON</button>
            <button className="btn btn-outline" onClick={exportCSV}>Export CSV</button>
            <button className="btn btn-outline" onClick={exportXLSX}>Export Excel (.xlsx)</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Import Data</div>
          <div style={{ marginTop:8 }}>
            <label style={{ fontSize:12, color:'#666' }}>Mode:</label>
            <div style={{ display:'flex', gap:8, marginTop:6 }}>
              <label><input type="radio" checked={importMode==='replace'} onChange={()=>setImportMode('replace')} /> Replace</label>
              <label><input type="radio" checked={importMode==='merge'} onChange={()=>setImportMode('merge')} /> Merge</label>
            </div>
            <input style={{ marginTop:10 }} type="file" accept="application/json" onChange={handleImportFile} />
            <div style={{ marginTop:8 }}>
              <label style={{ fontSize:12, color:'#666' }}>Or import Excel (.xlsx):</label>
              <input style={{ marginTop:6 }} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleImportXLSX} />
            </div>
            {fileErr && <div style={{ color:'#c0392b', marginTop:6 }}>{fileErr}</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Quarterly Report (PDF)</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8, alignItems:'center' }}>
            <select className="inp" value={quarter} onChange={e=>setQuarter(Number(e.target.value))} style={{ width:120, minWidth:120 }}>
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
            <input className="inp" type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={{ width:120, minWidth:120 }} />
            <button className="btn btn-black" onClick={generateQuarterReport}>Generate PDF</button>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Audit Log</div>
          <div style={{ marginTop:8 }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8, alignItems:'center' }}>
              <select className="inp" value={auditType} onChange={e=>setAuditType(e.target.value)} style={{ width:140, minWidth:140 }}>
                <option value="all">All</option>
                <option value="reinvest">Reinvest</option>
                <option value="principal">Principal Transfer</option>
              </select>
              <select className="inp" value={auditInvestor} onChange={e=>setAuditInvestor(e.target.value)} style={{ width:180, minWidth:180 }}>
                <option value="all">All Investors</option>
                {(data.investors||[]).map(i=> <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8, alignItems:'center' }}>
              <input className="inp" type="date" value={auditFrom} onChange={e=>setAuditFrom(e.target.value)} style={{ width:140, minWidth:140 }} />
              <input className="inp" type="date" value={auditTo} onChange={e=>setAuditTo(e.target.value)} style={{ width:140, minWidth:140 }} />
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <button className="btn btn-outline" onClick={()=>exportAuditCSV(filteredAll)}>Export CSV</button>
              <button className="btn btn-outline" onClick={()=>exportAuditXLSX(filteredAll)}>Export XLSX</button>
            </div>
            {filteredAll.length === 0 ? <div className="empty">No audit records</div> : filteredAll.map(r => {
              const investor = (data.investors||[]).find(i => i.id === r.investorId) || {};
              return (
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', gap:16, padding:'8px 0', borderBottom:'1px solid #f0f0f0', flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{ minWidth:0, flex:'1 1 240px' }}>
                    <div style={{ fontWeight:700, wordBreak:'break-word' }}>{r.type === 'reinvest' ? 'Reinvest' : 'Principal Transfer'}</div>
                    <div style={{ fontSize:12, color:'#666', wordBreak:'break-word' }}>{investor.name || r.investorId} · {new Date(r.date).toLocaleString()}</div>
                  </div>
                  <div style={{ fontWeight:700, whiteSpace:'nowrap' }}>{fmt(r.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
