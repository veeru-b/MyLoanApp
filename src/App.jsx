// import { useState, useEffect, useCallback } from "react";

// // ─── CONFIG ────────────────────────────────────────────────────────────────
// // JSONBin.io free storage — create a free account at jsonbin.io
// // 1. Sign up at https://jsonbin.io
// // 2. Create a new BIN with initial data: {"loans":[],"payments":[]}
// // 3. Get your BIN ID and API key and paste below
// // All 3 admins share the same BIN ID + API key

// const JSONBIN_BIN_ID = "6a1baca421f9ee59d29fdd22"; // e.g. "6650abc123def456"
// const JSONBIN_API_KEY = "$2a$10$Z8Fo5H2LqszqZqv0e.g3Gu1gGlshI4g6aKfOk5Hp3VL/gVXpqqMwG"; // e.g. "$2a$10$..."
// const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";

// const TOTAL_INVESTED = 150000;
// const PARTNERS = ["Partner 1", "Partner 2", "Partner 3"];
// const PARTNER_SHARE = TOTAL_INVESTED / 3;

// // Loan rules
// const LOAN_RULES = {
//   5000:  { disburse: 4500,  daily: 100, days: 50,  penalty: 300 },
//   10000: { disburse: 9000,  daily: 100, days: 100, penalty: 300 },
//   20000: { disburse: 18000, daily: 200, days: 100, penalty: 300 },
//   30000: { disburse: 27000, daily: 300, days: 100, penalty: 300 },
// };

// function getLoanRule(amount) {
//   const keys = Object.keys(LOAN_RULES).map(Number).sort((a, b) => a - b);
//   for (const k of keys) if (amount <= k) return { loanAmount: k, ...LOAN_RULES[k] };
//   return { loanAmount: amount, disburse: Math.floor(amount * 0.9), daily: 150, days: 200, penalty: 300 };
// }

// function daysDiff(from, to) {
//   return Math.floor((new Date(to) - new Date(from)) / 86400000);
// }

// function fmt(n) {
//   return "₹" + Number(n).toLocaleString("en-IN");
// }

// function today() {
//   return new Date().toISOString().split("T")[0];
// }

// // ─── API LAYER ──────────────────────────────────────────────────────────────
// async function readData() {
//   if (JSONBIN_BIN_ID === "YOUR_BIN_ID_HERE") {
//     // Demo mode with localStorage fallback for testing
//     const d = localStorage.getItem("loanapp_demo");
//     return d ? JSON.parse(d) : { loans: [], payments: [] };
//   }
//   const r = await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}/latest`, {
//     headers: { "X-Master-Key": JSONBIN_API_KEY },
//   });
//   const j = await r.json();
//   return j.record || { loans: [], payments: [] };
// }

// async function writeData(data) {
//   if (JSONBIN_BIN_ID === "YOUR_BIN_ID_HERE") {
//     localStorage.setItem("loanapp_demo", JSON.stringify(data));
//     return;
//   }
//   await fetch(`${JSONBIN_BASE}/${JSONBIN_BIN_ID}`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json", "X-Master-Key": JSONBIN_API_KEY },
//     body: JSON.stringify(data),
//   });
// }

// // ─── LOAN CALCULATIONS ─────────────────────────────────────────────────────
// function calcLoanStatus(loan, payments) {
//   const rule = getLoanRule(loan.requestedAmount);
//   const loanPayments = payments.filter((p) => p.loanId === loan.id);
//   const totalPaid = loanPayments.reduce((s, p) => s + p.amount, 0);
//   const elapsed = daysDiff(loan.startDate, today());
//   const remaining = rule.loanAmount - totalPaid;
//   const overdue = elapsed > rule.days;
//   const daysOver = overdue ? elapsed - rule.days : 0;
//   const penaltyAccrued = daysOver * rule.penalty;
//   const totalDue = Math.max(0, remaining + penaltyAccrued);
//   const progress = Math.min(100, (totalPaid / rule.loanAmount) * 100);
//   const daysLeft = Math.max(0, rule.days - elapsed);
//   return {
//     rule, totalPaid, remaining, elapsed, overdue, daysOver,
//     penaltyAccrued, totalDue, progress, daysLeft, loanPayments,
//     closed: remaining <= 0,
//   };
// }

// // ─── COMPONENTS ────────────────────────────────────────────────────────────
// const colors = {
//   bg: "#0d0f14",
//   card: "#161b24",
//   card2: "#1e2535",
//   accent: "#f0c040",
//   green: "#34d399",
//   red: "#f87171",
//   blue: "#60a5fa",
//   text: "#e8eaf0",
//   muted: "#7a8299",
//   border: "#2a3347",
// };

// const css = `
//   @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
//   * { margin:0; padding:0; box-sizing:border-box; }
//   body { background:${colors.bg}; color:${colors.text}; font-family:'DM Sans',sans-serif; }
//   ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#111; }
//   ::-webkit-scrollbar-thumb { background:#333; border-radius:4px; }
//   .app { max-width:430px; margin:0 auto; min-height:100vh; position:relative; padding-bottom:80px; }
//   .nav { display:flex; background:${colors.card}; border-top:1px solid ${colors.border}; position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:430px; z-index:100; }
//   .nav-btn { flex:1; padding:14px 8px 10px; background:none; border:none; color:${colors.muted}; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:10px; font-family:'DM Sans',sans-serif; transition:.2s; }
//   .nav-btn.active { color:${colors.accent}; }
//   .nav-btn svg { width:22px; height:22px; }
//   .header { padding:20px 20px 10px; display:flex; align-items:center; justify-content:space-between; }
//   .header h1 { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:${colors.accent}; letter-spacing:-0.5px; }
//   .header .sync { background:none; border:1px solid ${colors.border}; color:${colors.muted}; padding:6px 12px; border-radius:20px; font-size:11px; cursor:pointer; transition:.2s; }
//   .header .sync:hover { border-color:${colors.accent}; color:${colors.accent}; }
//   .card { background:${colors.card}; border-radius:16px; margin:0 16px 12px; padding:16px; border:1px solid ${colors.border}; }
//   .card2 { background:${colors.card2}; }
//   .label { font-size:11px; color:${colors.muted}; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
//   .big-num { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; color:${colors.accent}; }
//   .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 16px 12px; }
//   .stat-card { background:${colors.card}; border:1px solid ${colors.border}; border-radius:14px; padding:14px; }
//   .stat-val { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; }
//   .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600; }
//   .badge-green { background:#0d2e22; color:${colors.green}; }
//   .badge-red { background:#2e1111; color:${colors.red}; }
//   .badge-yellow { background:#2e2600; color:${colors.accent}; }
//   .progress-bar { height:6px; background:#1e2535; border-radius:4px; overflow:hidden; margin-top:6px; }
//   .progress-fill { height:100%; border-radius:4px; transition:.5s; }
//   .input { width:100%; background:${colors.card2}; border:1px solid ${colors.border}; color:${colors.text}; padding:12px 14px; border-radius:12px; font-size:15px; font-family:'DM Sans',sans-serif; outline:none; transition:.2s; }
//   .input:focus { border-color:${colors.accent}; }
//   .btn { width:100%; padding:14px; border-radius:12px; border:none; font-size:15px; font-weight:600; font-family:'Syne',sans-serif; cursor:pointer; transition:.2s; }
//   .btn-primary { background:${colors.accent}; color:#0d0f14; }
//   .btn-primary:hover { background:#f5d060; }
//   .btn-secondary { background:${colors.card2}; color:${colors.text}; border:1px solid ${colors.border}; }
//   .loan-row { background:${colors.card}; border:1px solid ${colors.border}; border-radius:14px; margin:0 16px 10px; padding:14px; cursor:pointer; transition:.2s; }
//   .loan-row:hover { border-color:${colors.accent}44; }
//   .loan-row .name { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; }
//   .row { display:flex; justify-content:space-between; align-items:center; }
//   .toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:${colors.green}; color:#000; padding:10px 24px; border-radius:30px; font-weight:600; font-size:13px; z-index:999; animation: fadeInOut 2.5s forwards; }
//   @keyframes fadeInOut { 0%{opacity:0;transform:translateX(-50%) translateY(-10px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }
//   .modal-overlay { position:fixed; inset:0; background:#000a; z-index:200; display:flex; align-items:flex-end; }
//   .modal { background:${colors.card}; border-radius:24px 24px 0 0; width:100%; max-width:430px; margin:0 auto; padding:24px 20px; max-height:90vh; overflow-y:auto; border-top:1px solid ${colors.border}; }
//   .modal-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; margin-bottom:16px; }
//   .section-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:${colors.muted}; text-transform:uppercase; letter-spacing:1px; margin:16px 16px 10px; }
//   .pay-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid ${colors.border}22; }
//   .empty { text-align:center; padding:40px 20px; color:${colors.muted}; }
//   select.input { appearance:none; }
//   .chip { display:inline-flex; align-items:center; gap:4px; background:${colors.card2}; border:1px solid ${colors.border}; border-radius:20px; padding:4px 12px; font-size:12px; color:${colors.muted}; margin:2px; cursor:pointer; transition:.2s; }
//   .chip.active { border-color:${colors.accent}; color:${colors.accent}; background:#2e260033; }
// `;

// // ─── GRAPH ─────────────────────────────────────────────────────────────────
// function MiniGraph({ loans, payments }) {
//   const months = [];
//   for (let i = 5; i >= 0; i--) {
//     const d = new Date();
//     d.setMonth(d.getMonth() - i);
//     months.push({ label: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), month: d.getMonth() });
//   }
//   const data = months.map(({ month, year, label }) => {
//     const collected = payments.filter((p) => {
//       const d = new Date(p.date);
//       return d.getMonth() === month && d.getFullYear() === year;
//     }).reduce((s, p) => s + p.amount, 0);
//     return { label, collected };
//   });
//   const max = Math.max(...data.map((d) => d.collected), 1);
//   const W = 340, H = 100;
//   const pts = data.map((d, i) => ({
//     x: 20 + i * ((W - 40) / (data.length - 1)),
//     y: H - 10 - (d.collected / max) * (H - 20),
//     val: d.collected,
//     label: d.label,
//   }));
//   const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
//   const area = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

//   return (
//     <div style={{ padding: "0 0 8px" }}>
//       <svg viewBox={`0 0 ${W} ${H + 24}`} width="100%" style={{ overflow: "visible" }}>
//         <defs>
//           <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
//             <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
//           </linearGradient>
//         </defs>
//         <path d={area} fill="url(#g1)" />
//         <path d={path} fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//         {pts.map((p, i) => (
//           <g key={i}>
//             <circle cx={p.x} cy={p.y} r="4" fill={colors.accent} />
//             <text x={p.x} y={H + 18} textAnchor="middle" fill={colors.muted} fontSize="10" fontFamily="DM Sans">{p.label}</text>
//           </g>
//         ))}
//       </svg>
//     </div>
//   );
// }

// // ─── MAIN APP ──────────────────────────────────────────────────────────────
// export default function App() {
//   const [tab, setTab] = useState("dashboard");
//   const [data, setData] = useState({ loans: [], payments: [] });
//   const [loading, setLoading] = useState(true);
//   const [toast, setToast] = useState("");
//   const [selectedLoan, setSelectedLoan] = useState(null);
//   const [filter, setFilter] = useState("all");

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const d = await readData();
//       setData(d);
//     } catch (e) { showToast("Sync error!"); }
//     setLoading(false);
//   }, []);

//   useEffect(() => { load(); }, [load]);

//   function showToast(msg) {
//     setToast(msg);
//     setTimeout(() => setToast(""), 2600);
//   }

//   async function save(newData) {
//     setData(newData);
//     try { await writeData(newData); } catch (e) { showToast("Save error!"); }
//   }

//   // Stats
//   const activeLoans = data.loans.filter((l) => {
//     const s = calcLoanStatus(l, data.payments);
//     return !s.closed;
//   });
//   const closedLoans = data.loans.filter((l) => calcLoanStatus(l, data.payments).closed);
//   const totalDisbursed = data.loans.reduce((s, l) => s + getLoanRule(l.requestedAmount).disburse, 0);
//   const totalCollected = data.payments.reduce((s, p) => s + p.amount, 0);
//   const totalInterest = data.loans.reduce((s, l) => {
//     const rule = getLoanRule(l.requestedAmount);
//     return s + (rule.loanAmount - rule.disburse);
//   }, 0);
//   const overdueLoans = data.loans.filter((l) => {
//     const s = calcLoanStatus(l, data.payments);
//     return !s.closed && s.overdue;
//   });
//   const availableCapital = TOTAL_INVESTED - totalDisbursed + totalCollected;

//   return (
//     <>
//       <style>{css}</style>
//       <div className="app">
//         {toast && <div className="toast">{toast}</div>}

//         {tab === "dashboard" && (
//           <DashboardTab
//             data={data} totalDisbursed={totalDisbursed}
//             totalCollected={totalCollected} totalInterest={totalInterest}
//             activeLoans={activeLoans} closedLoans={closedLoans}
//             overdueLoans={overdueLoans} availableCapital={availableCapital}
//             onSync={load} loading={loading}
//             onSelectLoan={(l) => { setSelectedLoan(l); setTab("borrowers"); }}
//           />
//         )}
//         {tab === "new" && (
//           <NewLoanTab data={data} onSave={save} onDone={() => { load(); setTab("dashboard"); }} showToast={showToast} />
//         )}
//         {tab === "borrowers" && (
//           <BorrowersTab data={data} onSave={save} showToast={showToast}
//             selected={selectedLoan} onClearSelected={() => setSelectedLoan(null)}
//             filter={filter} setFilter={setFilter}
//           />
//         )}

//         <nav className="nav">
//           {[
//             { key: "dashboard", label: "Dashboard", icon: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
//             { key: "new", label: "New Loan", icon: <path d="M12 4v16m8-8H4" /> },
//             { key: "borrowers", label: "Borrowers", icon: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
//           ].map(({ key, label, icon }) => (
//             <button key={key} className={`nav-btn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
//               <svg fill="none" viewBox="0 0 24 24" strokeWidth={tab === key ? 2.2 : 1.8} stroke="currentColor">{icon}</svg>
//               {label}
//             </button>
//           ))}
//         </nav>
//       </div>
//     </>
//   );
// }

// // ─── DASHBOARD ──────────────────────────────────────────────────────────────
// function DashboardTab({ data, totalDisbursed, totalCollected, totalInterest, activeLoans, closedLoans, overdueLoans, availableCapital, onSync, loading }) {
//   const interestCollected = data.payments.reduce((s, p) => {
//     const loan = data.loans.find((l) => l.id === p.loanId);
//     if (!loan) return s;
//     const rule = getLoanRule(loan.requestedAmount);
//     const interest = rule.loanAmount - rule.disburse;
//     const principalPaid = rule.disburse;
//     // rough: interest portion of payments
//     return s;
//   }, 0);

//   // Better: total collected - total disbursed repaid
//   const totalLoanDue = data.loans.reduce((s, l) => s + getLoanRule(l.requestedAmount).loanAmount, 0);
//   const netInterestEarned = Math.max(0, totalCollected - (totalDisbursed * (totalCollected / Math.max(totalLoanDue, 1))));

//   return (
//     <>
//       <div className="header">
//         <div>
//           <div style={{ fontSize: 11, color: colors.muted, letterSpacing: 1, textTransform: "uppercase" }}>Loan Book</div>
//           <h1>💰 MoneyFlow</h1>
//         </div>
//         <button className="sync" onClick={onSync}>{loading ? "Syncing..." : "⟳ Sync"}</button>
//       </div>

//       <div className="card" style={{ background: "linear-gradient(135deg, #1a2035 0%, #0f1520 100%)", border: `1px solid ${colors.accent}33` }}>
//         <div className="label">Total Capital</div>
//         <div className="big-num">{fmt(TOTAL_INVESTED)}</div>
//         <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
//           <div>
//             <div className="label">Available</div>
//             <div style={{ color: colors.green, fontWeight: 700, fontFamily: "Syne" }}>{fmt(availableCapital)}</div>
//           </div>
//           <div>
//             <div className="label">Deployed</div>
//             <div style={{ color: colors.blue, fontWeight: 700, fontFamily: "Syne" }}>{fmt(totalDisbursed)}</div>
//           </div>
//           <div>
//             <div className="label">Collected</div>
//             <div style={{ color: colors.accent, fontWeight: 700, fontFamily: "Syne" }}>{fmt(totalCollected)}</div>
//           </div>
//         </div>
//       </div>

//       <div className="card">
//         <div className="label" style={{ marginBottom: 12 }}>Monthly Collections</div>
//         <MiniGraph loans={data.loans} payments={data.payments} />
//       </div>

//       <div className="grid2">
//         <div className="stat-card">
//           <div className="label">Active Loans</div>
//           <div className="stat-val" style={{ color: colors.blue }}>{activeLoans.length}</div>
//         </div>
//         <div className="stat-card">
//           <div className="label">Closed Loans</div>
//           <div className="stat-val" style={{ color: colors.green }}>{closedLoans.length}</div>
//         </div>
//         <div className="stat-card">
//           <div className="label">⚠️ Overdue</div>
//           <div className="stat-val" style={{ color: colors.red }}>{overdueLoans.length}</div>
//         </div>
//         <div className="stat-card">
//           <div className="label">Interest Book</div>
//           <div className="stat-val" style={{ color: colors.accent }}>{fmt(totalInterest)}</div>
//         </div>
//       </div>

//       <div className="section-title">Partner Shares</div>
//       {PARTNERS.map((p, i) => (
//         <div key={i} style={{ margin: "0 16px 8px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//           <div>
//             <div style={{ fontFamily: "Syne", fontWeight: 700 }}>{p}</div>
//             <div style={{ fontSize: 12, color: colors.muted }}>Invested: {fmt(PARTNER_SHARE)}</div>
//           </div>
//           <div style={{ textAlign: "right" }}>
//             <div style={{ color: colors.green, fontWeight: 700 }}>{fmt(PARTNER_SHARE + totalCollected / 3)}</div>
//             <div style={{ fontSize: 11, color: colors.muted }}>Current value</div>
//           </div>
//         </div>
//       ))}

//       {overdueLoans.length > 0 && (
//         <>
//           <div className="section-title" style={{ color: colors.red }}>⚠️ Overdue Accounts</div>
//           {overdueLoans.map((l) => {
//             const s = calcLoanStatus(l, data.payments);
//             return (
//               <div key={l.id} className="loan-row" style={{ borderColor: colors.red + "44" }}>
//                 <div className="row">
//                   <div className="name">{l.name}</div>
//                   <span className="badge badge-red">{s.daysOver}d overdue</span>
//                 </div>
//                 <div className="row" style={{ marginTop: 6 }}>
//                   <div style={{ fontSize: 12, color: colors.muted }}>Due: {fmt(s.totalDue)}</div>
//                   <div style={{ fontSize: 12, color: colors.red }}>Penalty: {fmt(s.penaltyAccrued)}</div>
//                 </div>
//               </div>
//             );
//           })}
//         </>
//       )}
//     </>
//   );
// }

// // ─── NEW LOAN ──────────────────────────────────────────────────────────────
// function NewLoanTab({ data, onSave, onDone, showToast }) {
//   const [name, setName] = useState("");
//   const [phone, setPhone] = useState("");
//   const [business, setBusiness] = useState("");
//   const [amount, setAmount] = useState("");
//   const [startDate, setStartDate] = useState(today());
//   const [saving, setSaving] = useState(false);

//   const rule = amount ? getLoanRule(parseInt(amount)) : null;

//   async function submit() {
//     if (!name.trim() || !amount) return showToast("Fill name & amount");
//     setSaving(true);
//     const newLoan = {
//       id: Date.now().toString(),
//       name: name.trim(),
//       phone: phone.trim(),
//       business: business.trim(),
//       requestedAmount: parseInt(amount),
//       startDate,
//       createdAt: new Date().toISOString(),
//     };
//     await onSave({ ...data, loans: [...data.loans, newLoan] });
//     showToast("✅ Loan added!");
//     setTimeout(onDone, 500);
//     setSaving(false);
//   }

//   return (
//     <>
//       <div className="header"><h1>New Loan</h1></div>

//       <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
//         <div>
//           <div className="label" style={{ marginBottom: 6 }}>Borrower Name *</div>
//           <input className="input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
//         </div>
//         <div>
//           <div className="label" style={{ marginBottom: 6 }}>Phone Number</div>
//           <input className="input" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
//         </div>
//         <div>
//           <div className="label" style={{ marginBottom: 6 }}>Business / Shop Name</div>
//           <input className="input" placeholder="e.g. Ramu Kirana Store" value={business} onChange={(e) => setBusiness(e.target.value)} />
//         </div>
//         <div>
//           <div className="label" style={{ marginBottom: 6 }}>Loan Amount Requested *</div>
//           <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
//             {[5000, 10000, 20000, 30000].map((v) => (
//               <button key={v} className={`chip ${parseInt(amount) === v ? "active" : ""}`} onClick={() => setAmount(String(v))}>{fmt(v)}</button>
//             ))}
//           </div>
//           <input className="input" placeholder="Or type custom amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" />
//         </div>
//         <div>
//           <div className="label" style={{ marginBottom: 6 }}>Start Date</div>
//           <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
//         </div>

//         {rule && (
//           <div style={{ background: colors.card2, border: `1px solid ${colors.accent}33`, borderRadius: 14, padding: 16, marginTop: 4 }}>
//             <div style={{ fontFamily: "Syne", fontWeight: 700, color: colors.accent, marginBottom: 10 }}>📋 Loan Summary</div>
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
//               {[
//                 ["Amount Requested", fmt(parseInt(amount) || 0)],
//                 ["Amount to Disburse", fmt(rule.disburse)],
//                 ["Total to Repay", fmt(rule.loanAmount)],
//                 ["Daily Payment", fmt(rule.daily)],
//                 ["Validity", `${rule.days} days`],
//                 ["End Date", new Date(new Date(startDate).getTime() + rule.days * 86400000).toLocaleDateString("en-IN")],
//                 ["Penalty/day (if late)", fmt(rule.penalty)],
//                 ["Interest Earned", fmt(rule.loanAmount - rule.disburse)],
//               ].map(([k, v]) => (
//                 <div key={k}>
//                   <div style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{k}</div>
//                   <div style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>{v}</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ marginTop: 8 }}>
//           {saving ? "Saving..." : "➕ Create Loan"}
//         </button>
//         <div style={{ height: 16 }} />
//       </div>
//     </>
//   );
// }

// // ─── BORROWERS ──────────────────────────────────────────────────────────────
// function BorrowersTab({ data, onSave, showToast, selected, onClearSelected, filter, setFilter }) {
//   const [search, setSearch] = useState("");
//   const [payModal, setPayModal] = useState(null); // loan object
//   const [payAmount, setPayAmount] = useState("");
//   const [payDate, setPayDate] = useState(today());
//   const [payNote, setPayNote] = useState("");
//   const [detailLoan, setDetailLoan] = useState(selected);

//   useEffect(() => { if (selected) { setDetailLoan(selected); onClearSelected(); } }, [selected]);

//   const filtered = data.loans.filter((l) => {
//     const s = calcLoanStatus(l, data.payments);
//     if (filter === "active" && s.closed) return false;
//     if (filter === "closed" && !s.closed) return false;
//     if (filter === "overdue" && (!s.overdue || s.closed)) return false;
//     if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.business?.toLowerCase().includes(search.toLowerCase())) return false;
//     return true;
//   });

//   async function addPayment() {
//     if (!payAmount || isNaN(parseInt(payAmount))) return showToast("Enter valid amount");
//     const payment = {
//       id: Date.now().toString(),
//       loanId: payModal.id,
//       amount: parseInt(payAmount),
//       date: payDate,
//       note: payNote.trim(),
//     };
//     await onSave({ ...data, payments: [...data.payments, payment] });
//     showToast("✅ Payment recorded!");
//     setPayModal(null);
//     setPayAmount("");
//     setPayNote("");
//   }

//   if (detailLoan) {
//     const loan = data.loans.find((l) => l.id === detailLoan.id) || detailLoan;
//     const s = calcLoanStatus(loan, data.payments);
//     return (
//       <>
//         <div className="header">
//           <button onClick={() => setDetailLoan(null)} style={{ background: "none", border: "none", color: colors.accent, cursor: "pointer", fontSize: 22, lineHeight: 1 }}>←</button>
//           <h1 style={{ fontSize: 18 }}>{loan.name}</h1>
//           <div />
//         </div>

//         <div className="card" style={{ borderColor: s.closed ? colors.green + "44" : s.overdue ? colors.red + "44" : colors.border }}>
//           <div className="row">
//             <div>
//               <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20 }}>{loan.name}</div>
//               {loan.business && <div style={{ color: colors.muted, fontSize: 13 }}>{loan.business}</div>}
//               {loan.phone && <div style={{ color: colors.muted, fontSize: 13 }}>📞 {loan.phone}</div>}
//             </div>
//             <span className={`badge ${s.closed ? "badge-green" : s.overdue ? "badge-red" : "badge-yellow"}`}>
//               {s.closed ? "✅ Closed" : s.overdue ? `⚠️ ${s.daysOver}d late` : `${s.daysLeft}d left`}
//             </span>
//           </div>
//         </div>

//         <div className="grid2">
//           {[
//             ["Borrowed", fmt(s.rule.loanAmount), colors.text],
//             ["Disbursed", fmt(s.rule.disburse), colors.blue],
//             ["Paid So Far", fmt(s.totalPaid), colors.green],
//             ["Remaining", fmt(Math.max(0, s.remaining)), s.remaining > 0 ? colors.accent : colors.green],
//             ["Penalty", fmt(s.penaltyAccrued), s.penaltyAccrued > 0 ? colors.red : colors.muted],
//             ["Total Due", fmt(s.totalDue), s.totalDue > 0 ? colors.red : colors.green],
//           ].map(([k, v, c]) => (
//             <div key={k} className="stat-card">
//               <div className="label">{k}</div>
//               <div className="stat-val" style={{ color: c, fontSize: 16 }}>{v}</div>
//             </div>
//           ))}
//         </div>

//         <div className="card">
//           <div className="row" style={{ marginBottom: 8 }}>
//             <div className="label">Repayment Progress</div>
//             <div style={{ fontSize: 12, color: colors.accent, fontWeight: 600 }}>{s.progress.toFixed(0)}%</div>
//           </div>
//           <div className="progress-bar">
//             <div className="progress-fill" style={{ width: `${s.progress}%`, background: s.closed ? colors.green : s.overdue ? colors.red : colors.accent }} />
//           </div>
//           <div className="row" style={{ marginTop: 8, fontSize: 12, color: colors.muted }}>
//             <span>Start: {new Date(loan.startDate).toLocaleDateString("en-IN")}</span>
//             <span>Daily: {fmt(s.rule.daily)}</span>
//             <span>Day {s.elapsed}/{s.rule.days}</span>
//           </div>
//         </div>

//         {!s.closed && (
//           <div style={{ margin: "0 16px 16px" }}>
//             <button className="btn btn-primary" onClick={() => setPayModal(loan)}>+ Record Payment</button>
//           </div>
//         )}

//         <div className="section-title">Payment History ({s.loanPayments.length})</div>
//         {s.loanPayments.length === 0 ? (
//           <div className="empty">No payments yet</div>
//         ) : (
//           [...s.loanPayments].reverse().map((p) => (
//             <div key={p.id} style={{ margin: "0 16px 8px", background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 14px" }}>
//               <div className="row">
//                 <div style={{ fontFamily: "Syne", fontWeight: 700, color: colors.green }}>{fmt(p.amount)}</div>
//                 <div style={{ fontSize: 12, color: colors.muted }}>{new Date(p.date).toLocaleDateString("en-IN")}</div>
//               </div>
//               {p.note && <div style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>{p.note}</div>}
//             </div>
//           ))
//         )}

//         {payModal && (
//           <div className="modal-overlay" onClick={() => setPayModal(null)}>
//             <div className="modal" onClick={(e) => e.stopPropagation()}>
//               <div className="modal-title">Record Payment — {payModal.name}</div>
//               <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//                 <div>
//                   <div className="label" style={{ marginBottom: 6 }}>Amount Paid</div>
//                   <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
//                     {[100, 200, 500, 1000].map((v) => (
//                       <button key={v} className={`chip ${parseInt(payAmount) === v ? "active" : ""}`} onClick={() => setPayAmount(String(v))}>{fmt(v)}</button>
//                     ))}
//                   </div>
//                   <input className="input" type="number" placeholder="Enter amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
//                 </div>
//                 <div>
//                   <div className="label" style={{ marginBottom: 6 }}>Date</div>
//                   <input className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
//                 </div>
//                 <div>
//                   <div className="label" style={{ marginBottom: 6 }}>Note (optional)</div>
//                   <input className="input" placeholder="e.g. Cash, UPI, partial" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
//                 </div>
//                 <button className="btn btn-primary" onClick={addPayment}>Save Payment</button>
//                 <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
//               </div>
//             </div>
//           </div>
//         )}
//       </>
//     );
//   }

//   return (
//     <>
//       <div className="header"><h1>Borrowers</h1></div>
//       <div style={{ padding: "0 16px 12px" }}>
//         <input className="input" placeholder="🔍 Search by name or business..." value={search} onChange={(e) => setSearch(e.target.value)} />
//       </div>
//       <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", overflowX: "auto" }}>
//         {[["all", "All"], ["active", "Active"], ["overdue", "⚠️ Overdue"], ["closed", "Closed"]].map(([k, l]) => (
//           <button key={k} className={`chip ${filter === k ? "active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
//         ))}
//       </div>

//       {filtered.length === 0 ? (
//         <div className="empty">No borrowers found</div>
//       ) : (
//         filtered.map((loan) => {
//           const s = calcLoanStatus(loan, data.payments);
//           return (
//             <div key={loan.id} className="loan-row" onClick={() => setDetailLoan(loan)}>
//               <div className="row">
//                 <div>
//                   <div className="name">{loan.name}</div>
//                   {loan.business && <div style={{ fontSize: 12, color: colors.muted }}>{loan.business}</div>}
//                 </div>
//                 <span className={`badge ${s.closed ? "badge-green" : s.overdue ? "badge-red" : "badge-yellow"}`}>
//                   {s.closed ? "✅ Done" : s.overdue ? `⚠️ Late` : `${s.daysLeft}d`}
//                 </span>
//               </div>
//               <div className="row" style={{ marginTop: 8, fontSize: 13 }}>
//                 <span style={{ color: colors.muted }}>Loan: {fmt(s.rule.loanAmount)}</span>
//                 <span style={{ color: colors.green }}>Paid: {fmt(s.totalPaid)}</span>
//                 <span style={{ color: s.totalDue > 0 ? colors.red : colors.muted }}>Due: {fmt(s.totalDue)}</span>
//               </div>
//               <div className="progress-bar" style={{ marginTop: 8 }}>
//                 <div className="progress-fill" style={{ width: `${s.progress}%`, background: s.closed ? colors.green : s.overdue ? colors.red : colors.accent }} />
//               </div>
//             </div>
//           );
//         })
//       )}
//       <div style={{ height: 16 }} />
//     </>
//   );
// }

// -----------------

import { useState, useEffect, useCallback } from "react";

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
  5000:  { disburse: 4500,  daily: 100, days: 50,  penalty: 300 },
  10000: { disburse: 9000,  daily: 100, days: 100, penalty: 300 },
  20000: { disburse: 18000, daily: 100, days: 200, penalty: 300 },
  30000: { disburse: 27000, daily: 150, days: 200, penalty: 300 },
};
const SAFETY_TARGET = 10000;

function getLoanRule(amount) {
  const keys = Object.keys(LOAN_RULES).map(Number).sort((a, b) => a - b);
  for (const k of keys) if (amount <= k) return { loanAmount: k, ...LOAN_RULES[k] };
  return { loanAmount: amount, disburse: Math.floor(amount * 0.9), daily: 150, days: 200, penalty: 300 };
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
  const overdue = elapsed > rule.days;
  const daysOver = overdue ? elapsed - rule.days : 0;
  const penaltyAccrued = daysOver * rule.penalty;
  const totalDue = Math.max(0, remaining + penaltyAccrued);
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
        {tab === "safety" && <SafetyTab data={data} onSave={save} showToast={showToast} />}

        <nav className="nav">
          {[
            { key: "dash", label: "Home", icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
            { key: "new", label: "New", icon: <><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></> },
            { key: "borrowers", label: "People", icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
            { key: "investors", label: "Investors", icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></> },
            { key: "safety", label: "Safety", icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></> },
          ].map(({ key, label, icon }) => (
            <button key={key} className={`nav-btn ${tab === key ? "active" : ""}`} onClick={() => { setTab(key); setDetailLoan(null); }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">{icon}</svg>
              {label}
            </button>
          ))}
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
        <div className="login-title">MoneyFlow</div>
        <div className="login-sub">Loan Management System</div>
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
        <div style={{ marginTop: 40, fontSize: 11, color: "#ccc" }}>Default: admin / 1234</div>
      </div>
    </>
  );
}

// ─── DASHBOARD ──────────────────────────────────────────────────────────────
function DashTab({ data, totalInvested, totalDisbursed, totalCollected, totalInterestBook, activeLoans, closedLoans, overdueLoans, availableCapital, investors, onSync, loading, onOverdueClick }) {
  const payments = data.payments || [];
  const capital = availableCapital;
  const rotation = Math.round((totalCollected / Math.max(totalDisbursed, 1)) * 100);

  return (
    <>
      <div className="header">
        <div>
          <div className="header-title">💰 MoneyFlow</div>
          <div className="header-sub">Loan Book Dashboard</div>
        </div>
        <button className="sync-btn" onClick={onSync}>{loading ? "..." : "⟳ Sync"}</button>
      </div>
      <div className="page-pad">
        <div className="card card-dark">
          <div className="card-title" style={{ color: "#666" }}>Total Capital Pool</div>
          <div className="big-amt">{fmt(totalInvested)}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 12 }}>
            {[["Available", fmt(capital), "#4caf50"], ["Deployed", fmt(totalDisbursed), "#90caf9"], ["Collected", fmt(totalCollected), "#ffd54f"]].map(([k, v, c]) => (
              <div key={k}><div style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>{k}</div><div style={{ fontWeight: 700, color: c, fontSize: 13 }}>{v}</div></div>
            ))}
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

      {investors.length > 0 && (
        <>
          <div className="sec-title">Partner Breakdown</div>
          {investors.map((inv, i) => (
            <div key={i} style={{ margin: "0 16px 8px", background: "#f9f9f9", border: "1px solid #ebebeb", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{inv.name}</div>
                <div style={{ fontSize: 11, color: "#999" }}>{inv.phone || "No phone"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(inv.amount)}</div>
                <div style={{ fontSize: 11, color: "#999" }}>Invested</div>
              </div>
            </div>
          ))}
        </>
      )}

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
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Penalty: {fmt(s.penaltyAccrued)} · Total Due: {fmt(s.totalDue)}</div>
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
          {[["Disbursed", fmt(s.rule.disburse), "#1565c0"], ["Must Repay", fmt(s.rule.loanAmount), "#111"], ["Paid So Far", fmt(s.totalPaid), "#1a7a3f"], ["Remaining", fmt(Math.max(0, s.remaining)), "#856700"], ["Penalty", fmt(s.penaltyAccrued), "#c0392b"], ["Total Due", fmt(s.totalDue), s.totalDue > 0 ? "#c0392b" : "#1a7a3f"]].map(([k, v, c]) => (
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
            <button className="btn btn-black" style={{ marginBottom: 8 }} onClick={addPayment}>Save Payment</button>
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

  return (
    <>
      <div className="header">
        <div><div className="header-title">Investors</div><div className="header-sub">Total: {fmt(total)}</div></div>
        <button className="sync-btn" onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "+ Add"}</button>
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
                  <button onClick={() => removeInvestor(inv.id)} style={{ background: "none", border: "none", color: "#c0392b", cursor: "pointer", fontSize: 12, fontFamily: "Inter" }}>Remove</button>
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

