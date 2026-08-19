import { useState, useEffect, useRef } from "react";

const SUPABASE_URL      = "https://iljzwxwopxuzpgkjivmn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KEoCJtCLyGTJjqB1phGy2Q_v3PftUYH";
const S_SESSION = "shdm_medium_manual_session_id";
const FLOW      = "medium_manual";

const COLLECTION_CATS = [
  { id: "homeSensors",      icon: "🏠", label: "Home Sensors",      subs: ["Kitchen Sensors", "Climate Sensors"] },
  { id: "behaviorPatterns", icon: "📊", label: "Behavior Patterns", subs: ["Motion Tracking", "Presence Detection"] },
  { id: "purchaseHistory",  icon: "🛒", label: "Purchase History",  subs: [] },
];
const USAGE_CATS = [
  { id: "foodServices",     icon: "🍕", label: "Food Services",     desc: "Meal recommendations and delivery",  subs: ["Food Delivery", "Grocery Shopping"] },
  { id: "homeServices",     icon: "🏠", label: "Home Services",     desc: "Automation and maintenance",         subs: ["Home Automation", "Maintenance"] },
  { id: "wellnessServices", icon: "💪", label: "Wellness Services", desc: "Health and fitness support",         subs: [] },
];
const OFFERS = [
  { id: "1", emoji: "🍕", name: "Pizza Meal",     desc: "2 Large Pizzas, 2 Pops, Large Fries",    price: 24.99, original: 32.99, save: 8 },
  { id: "2", emoji: "🍔", name: "Burger Combo",   desc: "2 Burgers, 2 Fries, 2 Drinks",           price: 18.99, original: 24.99, save: 6 },
  { id: "3", emoji: "🥡", name: "Chinese Dinner", desc: "Fried Rice, Noodles, Spring Rolls",       price: 32.99, original: 38.99, save: 6 },
  { id: "4", emoji: "🍝", name: "Pasta Bowl",     desc: "Pasta, Garlic Bread, Salad",              price: 16.99, original: 21.99, save: 5 },
];

const TASKS = [
  { id: "task1", label: "Task 1", desc: "Review the suggested settings in the Data Collection and Data Usage tabs and adjust them according to your preferences." },
  { id: "task2", label: "Task 2", desc: "Configure the Data Collection tab by allowing or denying access to home sensors and purchase history." },
  { id: "task3", label: "Task 3", desc: "Configure the Data Usage tab by allowing or denying access to home services and wellness-related services." },
  { id: "task4", label: "Task 4", desc: "Review all three tabs: Food, Home, and Wellness. Explore and select one offer that best matches your preferences." },
  { id: "task5", label: "Task 5", desc: "Review the final order summary and confirm or place the order." },
];

function getOrCreateSessionId() {
  try {
    let id = localStorage.getItem(S_SESSION);
    if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(S_SESSION, id); }
    return id;
  } catch (_) { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

async function logEvent(row) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/interaction_logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Prefer": "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch (_) {}
}

async function logTaskSummary(row) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/task_summaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Prefer": "return=minimal" },
      body: JSON.stringify(row),
    });
  } catch (_) {}
}

function createTracker(sessionId) {
  const s = { task: null, start: null, clicks: 0, errors: 0, overrides: 0, depth: 0 };
  return {
    start(taskId) { s.task = taskId; s.start = Date.now(); s.clicks = 0; s.errors = 0; s.overrides = 0; s.depth = 0; },
    click()    { s.clicks++; },
    error()    { s.errors++; },
    override() { s.clicks++; s.overrides++; },
    expand(d)  { s.clicks++; if (d > s.depth) s.depth = d; },
    complete(offerName = null, orderPlaced = false) {
      if (!s.task) return null;
      const time_ms = Date.now() - s.start;
      const result = { task: s.task, time_ms, clicks: s.clicks, errors: s.errors, overrides: s.overrides, depth: s.depth };
      logTaskSummary({ session_id: sessionId, flow: FLOW, task: s.task, time_ms, clicks: s.clicks, errors: s.errors, overrides: s.overrides, depth: s.depth, offer_selected: offerName, order_placed: orderPlaced, client_timestamp: new Date().toISOString() });
      s.task = null;
      return result;
    },
  };
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #f5f6fa; color: #111827; min-height: 100vh; }
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 220px; flex-shrink: 0; background: #fff; border-right: 1px solid #e4e6ef; padding: 20px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .sidebar-title { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; padding: 0 16px 12px; }
  .task-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 16px; cursor: pointer; transition: background .12s; border-left: 3px solid transparent; }
  .task-item:hover:not(.done):not(.locked) { background: #f5f6fa; }
  .task-item.active { background: #eef1ff; border-left-color: #4263eb; }
  .task-item.done { opacity: 0.5; cursor: default; }
  .task-item.locked { opacity: 0.35; cursor: not-allowed; }
  .task-cb { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #d1d5db; flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; font-size: 10px; }
  .task-cb.done { background: #16a34a; border-color: #16a34a; color: #fff; }
  .task-cb.active { border-color: #4263eb; }
  .task-lbl { font-size: 12px; font-weight: 600; }
  .task-desc { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.4; }
  .content-area { flex: 1; display: flex; justify-content: center; background: #f5f6fa; }
  .main { width: 100%; max-width: 600px; padding: 24px; }
  .task-banner { background: #1e1b4b; color: #e0e7ff; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px; }
  .task-banner-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; opacity: .6; margin-bottom: 4px; }
  .task-banner-desc { font-size: 13px; line-height: 1.5; }
  .btn-task-done { display: block; width: 100%; margin-top: 10px; padding: 11px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn-task-done:hover { background: #4338ca; }
  .back { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; color: #6b7280; cursor: pointer; margin-bottom: 16px; }
  .back:hover { color: #4263eb; }
  .page-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .page-sub { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
  .info-banner { display: flex; gap: 10px; padding: 12px 14px; border-radius: 10px; background: #eef1ff; border: 1px solid #c7d2fe; margin-bottom: 16px; }
  .info-banner-icon { font-size: 14px; color: #4263eb; flex-shrink: 0; margin-top: 1px; }
  .info-banner-title { font-size: 13px; font-weight: 600; color: #3451c7; }
  .info-banner-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .tabs { display: flex; border-bottom: 2px solid #e4e6ef; margin-bottom: 16px; }
  .tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 11px 8px; font-size: 14px; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
  .tab.active { color: #4263eb; border-bottom-color: #4263eb; }
  .cat-block { background: #fff; border: 1px solid #e4e6ef; border-radius: 12px; margin-bottom: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
  .cat-header { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; cursor: pointer; transition: background .12s; }
  .cat-header:hover { background: #f5f6fa; }
  .cat-header-left { display: flex; align-items: center; gap: 8px; }
  .cat-icon { font-size: 16px; }
  .cat-label { font-size: 14px; font-weight: 600; }
  .cat-desc { font-size: 12px; color: #6b7280; margin-top: 1px; }
  .cat-chevron { color: #9ca3af; font-size: 12px; transition: transform .15s; }
  .cat-chevron.open { transform: rotate(180deg); }
  .da { display: flex; gap: 6px; flex-shrink: 0; }
  .da-btn { padding: 5px 12px; border-radius: 7px; border: 1.5px solid #e4e6ef; background: #fff; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; color: #6b7280; }
  .da-deny.on  { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
  .da-allow.on { background: #dcfce7; border-color: #86efac; color: #16a34a; }
  .da-deny:hover:not(.on)  { background: #fee2e2; border-color: #fca5a5; }
  .da-allow:hover:not(.on) { background: #dcfce7; border-color: #86efac; }
  .sub-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px 10px 24px; border-top: 1px solid #e4e6ef; }
  .sub-label { font-size: 13px; color: #6b7280; }
  .xcheck { display: flex; gap: 5px; }
  .btn-x  { width: 26px; height: 26px; border-radius: 6px; border: 1.5px solid #fca5a5; background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .btn-ck { width: 26px; height: 26px; border-radius: 6px; border: 1.5px solid #86efac; background: #dcfce7; color: #16a34a; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .btn-x.dim, .btn-ck.dim { opacity: 0.28; }
  .save-row { display: flex; justify-content: flex-end; margin: 8px 0; }
  .btn-save { padding: 9px 22px; background: #4263eb; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn-save.saved { background: #16a34a; }
  .btn-done { display: block; width: 100%; padding: 14px; background: #16a34a; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 8px; }
  .off-tabs { display: flex; border-bottom: 2px solid #e4e6ef; margin-bottom: 16px; }
  .off-tab { flex: 1; text-align: center; padding: 11px 8px; font-size: 14px; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
  .off-tab.active { color: #4263eb; border-bottom-color: #4263eb; }
  .off-head { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .off-count { font-size: 13px; color: #6b7280; margin-bottom: 14px; }
  .ctx-box { background: #eef1ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; }
  .ctx-title { font-size: 13px; font-weight: 600; color: #3451c7; margin-bottom: 4px; }
  .ctx-sub { font-size: 12px; color: #6b7280; }
  .off-card { background: #fff; border: 1px solid #e4e6ef; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; transition: border-color .12s; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
  .off-card:hover { border-color: #4263eb; }
  .off-card-row { display: flex; align-items: flex-start; gap: 12px; }
  .off-emoji { font-size: 28px; line-height: 1; }
  .off-body { flex: 1; }
  .off-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
  .off-desc { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
  .off-save-badge { font-size: 12px; color: #16a34a; font-weight: 600; background: #dcfce7; padding: 2px 8px; border-radius: 20px; display: inline-block; }
  .off-price-col { text-align: right; flex-shrink: 0; }
  .off-original { font-size: 12px; color: #9ca3af; text-decoration: line-through; }
  .off-price { font-size: 16px; font-weight: 700; color: #4263eb; }
  .no-off { font-size: 14px; color: #6b7280; padding: 20px 0; }
  .order-card { background: #fff; border: 1px solid #e4e6ef; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
  .order-title { font-size: 17px; font-weight: 700; padding: 16px 20px; border-bottom: 1px solid #e4e6ef; }
  .order-line { display: flex; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #e4e6ef; font-size: 14px; }
  .order-line:last-child { border-bottom: none; font-weight: 700; }
  .smart-tip { background: #eef1ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #3451c7; margin-top: 12px; }
  .btn-confirm { display: block; width: 100%; padding: 14px; background: #4263eb; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 12px; }
  .confirm-wrap { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
  .confirm-box { background: #fff; border: 1px solid #e4e6ef; border-radius: 12px; padding: 40px 32px; text-align: center; max-width: 360px; width: 100%; }
  .confirm-icon { width: 56px; height: 56px; border-radius: 50%; background: #dcfce7; border: 2px solid #86efac; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 26px; color: #16a34a; }
  .confirm-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
  .confirm-sub { font-size: 14px; color: #6b7280; }
  .home-card { background: #fff; border: 1px solid #e4e6ef; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
  .home-card-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; cursor: pointer; font-size: 14px; font-weight: 500; border-top: 1px solid #e4e6ef; }
  .home-card-row:hover { background: #f5f6fa; }
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  .stat { background: #fff; border: 1px solid #e4e6ef; border-radius: 10px; padding: 14px 16px; }
  .stat-lbl { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
  .stat-val { font-size: 20px; font-weight: 700; }
`;

function Wrap({ children }) {
  return <div className="content-area"><div className="main">{children}</div></div>;
}

function TaskSidebar({ completed, active, onSelect }) {
  return (
    <div className="sidebar">
      <div className="sidebar-title">Study Tasks</div>
      {TASKS.map((t, i) => {
        const isDone   = completed.includes(t.id);
        const isActive = active?.id === t.id;
        const isLocked = !isDone && !isActive && (i === 0 ? false : !completed.includes(TASKS[i-1].id));
        return (
          <div key={t.id} className={`task-item${isDone ? " done" : ""}${isActive ? " active" : ""}${isLocked ? " locked" : ""}`}
            onClick={() => { if (!isDone && !isLocked) onSelect(t); }}>
            <div className={`task-cb${isDone ? " done" : isActive ? " active" : ""}`}>{isDone ? "✓" : ""}</div>
            <div>
              <div className="task-lbl">{t.label}</div>
              <div className="task-desc">{t.desc.slice(0, 50)}…</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskBanner({ task, onComplete }) {
  if (!task) return null;
  return (
    <div className="task-banner">
      <div className="task-banner-lbl">{task.label}</div>
      <div className="task-banner-desc">{task.desc}</div>
      <button className="btn-task-done" onClick={onComplete}>✓ Task Completed</button>
    </div>
  );
}

function DA({ value, onDeny, onAllow }) {
  return (
    <div className="da">
      <button className={`da-btn da-deny${value === "deny" ? " on" : ""}`} onClick={onDeny}>Deny</button>
      <button className={`da-btn da-allow${value === "allow" ? " on" : ""}`} onClick={onAllow}>Allow</button>
    </div>
  );
}

function XCheck({ value, onDeny, onAllow }) {
  return (
    <div className="xcheck">
      <button className={`btn-x${value === "deny" ? "" : " dim"}`} onClick={onDeny}>✕</button>
      <button className={`btn-ck${value === "allow" ? "" : " dim"}`} onClick={onAllow}>✓</button>
    </div>
  );
}

function HomeScreen({ onPrivacy, activeTask, onTaskComplete, sessionId, tracker }) {
  useEffect(() => {
    const t0 = Date.now();
    logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_enter", page: "home", client_timestamp: new Date().toISOString() });
    return () => logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_exit", page: "home", time_on_page_ms: Date.now() - t0, client_timestamp: new Date().toISOString() });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const now = new Date();
  return (
    <Wrap>
      <TaskBanner task={activeTask} onComplete={onTaskComplete} />
      <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#eef1ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>🏠</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Welcome Home</div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>{now.toLocaleDateString("en-US", { weekday: "long" })}, {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
      </div>
      <div className="home-card">
        <div style={{ padding: "14px 20px 10px" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>Your Smart Home</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Manage your home automation and privacy settings</div>
        </div>
        <div className="home-card-row" onClick={() => { tracker.click(); logEvent({ session_id: sessionId, flow: FLOW, event_type: "click", element: "privacy_settings", page: "home", client_timestamp: new Date().toISOString() }); onPrivacy(); }}>
          <span>Privacy Settings</span><span style={{ color: "#9ca3af" }}>→</span>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-lbl">Temperature</div><div className="stat-val">22°C</div></div>
        <div className="stat"><div className="stat-lbl">People Home</div><div className="stat-val">2</div></div>
      </div>
    </Wrap>
  );
}

function PrivacyScreen({ catVal, setCatVal, subVal, setSubVal, usgVal, setUsgVal, usgSub, setUsgSub, onBack, onDone, activeTask, onTaskComplete, sessionId, tracker, saved, setSaved }) {
  useEffect(() => {
    const t0 = Date.now();
    logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_enter", page: "privacy_settings", task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
    return () => logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_exit", page: "privacy_settings", time_on_page_ms: Date.now() - t0, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [tab,      setTab]      = useState(activeTask?.id === "task3" ? "usage" : "collection");
  const [expanded, setExpanded] = useState({});

  function toggleCat(id, val, state, setState) {
    const prev = state[id]; const next = prev === val ? null : val;
    if (prev !== null && prev !== next && next !== null) tracker.override(); else tracker.click();
    setState(s => ({ ...s, [id]: next })); setSaved(false);
    logEvent({ session_id: sessionId, flow: FLOW, event_type: prev !== null && next !== null ? "override" : "toggle", item: id, value: next, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }
  function toggleSub(key, val, state, setState) {
    const prev = state[key]; const next = prev === val ? null : val;
    if (prev !== null && prev !== next && next !== null) tracker.override(); else tracker.click();
    setState(s => ({ ...s, [key]: next })); setSaved(false);
    logEvent({ session_id: sessionId, flow: FLOW, event_type: prev !== null && next !== null ? "override" : "toggle", item: key, value: next, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }
  function expand(key, depth) {
    tracker.expand(depth);
    setExpanded(e => ({ ...e, [key]: !e[key] }));
    logEvent({ session_id: sessionId, flow: FLOW, event_type: "expand", item: key, value: depth, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }
  function switchTab(t) {
    if (activeTask?.id === "task2" && t === "usage")      { tracker.error(); logEvent({ session_id: sessionId, flow: FLOW, event_type: "error", element: "tab_switch_wrong", value: t, task: activeTask?.id, client_timestamp: new Date().toISOString() }); }
    if (activeTask?.id === "task3" && t === "collection") { tracker.error(); logEvent({ session_id: sessionId, flow: FLOW, event_type: "error", element: "tab_switch_wrong", value: t, task: activeTask?.id, client_timestamp: new Date().toISOString() }); }
    tracker.click(); setTab(t);
    logEvent({ session_id: sessionId, flow: FLOW, event_type: "tab_switch", from: tab, to: t, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }
  function handleSave() { tracker.click(); setSaved(true); logEvent({ session_id: sessionId, flow: FLOW, event_type: "click", element: "save_my_choices", task: activeTask?.id || null, client_timestamp: new Date().toISOString() }); }
  function handleDone() {
    if (!saved && activeTask && ["task2","task3"].includes(activeTask.id)) { tracker.error(); logEvent({ session_id: sessionId, flow: FLOW, event_type: "error", element: "done_without_saving", task: activeTask.id, client_timestamp: new Date().toISOString() }); }
    tracker.click(); onDone();
  }

  return (
    <Wrap>
      <TaskBanner task={activeTask} onComplete={onTaskComplete} />
      <div className="back" onClick={() => { tracker.click(); onBack(); }}>← Back to Home</div>
      <div className="page-title">Privacy Settings</div>
      <div className="page-sub">Control what data is collected and how it's used</div>
      <div className="info-banner">
        <span className="info-banner-icon">ℹ️</span>
        <div>
          <div className="info-banner-title">Manage Your Privacy</div>
          <div className="info-banner-sub">Expand categories to control specific data types.</div>
        </div>
      </div>
      <div className="tabs">
        <div className={`tab${tab === "collection" ? " active" : ""}`} onClick={() => switchTab("collection")}>🗄️ Data Collection</div>
        <div className={`tab${tab === "usage" ? " active" : ""}`} onClick={() => switchTab("usage")}>⚙️ Data Usage</div>
      </div>

      {tab === "collection" && (
        <>
          {COLLECTION_CATS.map(cat => (
            <div className="cat-block" key={cat.id}>
              <div className="cat-header">
                <div className="cat-header-left" onClick={() => cat.subs.length > 0 && expand(cat.id, 1)}>
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-label">{cat.label}</span>
                  {cat.subs.length > 0 && <span className={`cat-chevron${expanded[cat.id] ? " open" : ""}`}>▾</span>}
                </div>
                <DA value={catVal[cat.id]}
                  onDeny={() => toggleCat(cat.id, "deny", catVal, setCatVal)}
                  onAllow={() => toggleCat(cat.id, "allow", catVal, setCatVal)} />
              </div>
              {expanded[cat.id] && cat.subs.map(sub => {
                const key = `${cat.id}_${sub}`;
                return (
                  <div className="sub-item" key={sub}>
                    <span className="sub-label">{sub}</span>
                    <XCheck value={subVal[key]}
                      onDeny={() => toggleSub(key, "deny", subVal, setSubVal)}
                      onAllow={() => toggleSub(key, "allow", subVal, setSubVal)} />
                  </div>
                );
              })}
            </div>
          ))}
          <div className="save-row"><button className={`btn-save${saved ? " saved" : ""}`} onClick={handleSave}>{saved ? "Saved!" : "Save My Choices"}</button></div>
        </>
      )}

      {tab === "usage" && (
        <>
          {USAGE_CATS.map(cat => (
            <div className="cat-block" key={cat.id}>
              <div className="cat-header">
                <div className="cat-header-left" onClick={() => cat.subs.length > 0 && expand("u_" + cat.id, 1)}>
                  <span className="cat-icon">{cat.icon}</span>
                  <div>
                    <div className="cat-label">{cat.label}</div>
                    <div className="cat-desc">{cat.desc}</div>
                  </div>
                  {cat.subs.length > 0 && <span className={`cat-chevron${expanded["u_" + cat.id] ? " open" : ""}`}>▾</span>}
                </div>
                <DA value={usgVal[cat.id]}
                  onDeny={() => toggleCat(cat.id, "deny", usgVal, setUsgVal)}
                  onAllow={() => toggleCat(cat.id, "allow", usgVal, setUsgVal)} />
              </div>
              {expanded["u_" + cat.id] && cat.subs.map(sub => {
                const key = `${cat.id}_${sub}`;
                return (
                  <div className="sub-item" key={sub}>
                    <span className="sub-label">{sub}</span>
                    <XCheck value={usgSub[key]}
                      onDeny={() => toggleSub(key, "deny", usgSub, setUsgSub)}
                      onAllow={() => toggleSub(key, "allow", usgSub, setUsgSub)} />
                  </div>
                );
              })}
            </div>
          ))}
          <div className="save-row"><button className={`btn-save${saved ? " saved" : ""}`} onClick={handleSave}>{saved ? "Saved!" : "Save My Choices"}</button></div>
        </>
      )}
      <button className="btn-done" onClick={handleDone}>Done – Return to Home</button>
    </Wrap>
  );
}

function OffersScreen({ onSelect, onBack, activeTask, onTaskComplete, sessionId, tracker }) {
  useEffect(() => {
    const t0 = Date.now();
    logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_enter", page: "offers", task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
    return () => logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_exit", page: "offers", time_on_page_ms: Date.now() - t0, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState("food");

  function handleBack() {
    if (activeTask?.id === "task4") { tracker.error(); logEvent({ session_id: sessionId, flow: FLOW, event_type: "error", element: "left_offers_without_selection", task: "task4", client_timestamp: new Date().toISOString() }); }
    tracker.click(); onBack();
  }
  function switchTab(t) {
    tracker.click(); setTab(t);
    logEvent({ session_id: sessionId, flow: FLOW, event_type: "tab_switch", from: tab, to: t, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }

  return (
    <Wrap>
      <TaskBanner task={activeTask} onComplete={onTaskComplete} />
      <div className="back" onClick={handleBack}>← Back to Home</div>
      <div className="off-tabs">
        {["food","home","wellness"].map(t => (
          <div key={t} className={`off-tab${tab === t ? " active" : ""}`} onClick={() => switchTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</div>
        ))}
      </div>
      {tab === "food" ? (
        <>
          <div className="off-head">Personalized Offers for You</div>
          <div className="off-count">{OFFERS.length} available</div>
          <div className="ctx-box">
            <div className="ctx-title">ℹ️ Based on Your Settings</div>
            <div className="ctx-sub">These offers match your preferences (2 people home, 7:15 PM, no cooking activity)</div>
          </div>
          {OFFERS.map(o => (
            <div key={o.id} className="off-card"
              onClick={() => { tracker.click(); logEvent({ session_id: sessionId, flow: FLOW, event_type: "click", element: "select_offer", offer: o.name, task: activeTask?.id || null, client_timestamp: new Date().toISOString() }); onSelect(o); }}>
              <div className="off-card-row">
                <span className="off-emoji">{o.emoji}</span>
                <div className="off-body">
                  <div className="off-name">{o.name}</div>
                  <div className="off-desc">{o.desc}</div>
                  <span className="off-save-badge">Save ${o.save}.00</span>
                </div>
                <div className="off-price-col">
                  <div className="off-original">${o.original.toFixed(2)}</div>
                  <div className="off-price">${o.price.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="no-off">No offers available for this category.</div>
      )}
    </Wrap>
  );
}

function OrderScreen({ offer, onPlace, onBack, activeTask, onTaskComplete, sessionId, tracker, setOrderConfirmed }) {
  useEffect(() => {
    const t0 = Date.now();
    logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_enter", page: "order_summary", task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
    return () => logEvent({ session_id: sessionId, flow: FLOW, event_type: "page_exit", page: "order_summary", time_on_page_ms: Date.now() - t0, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    if (activeTask?.id === "task5") { tracker.error(); logEvent({ session_id: sessionId, flow: FLOW, event_type: "error", element: "left_order_without_confirming", task: "task5", client_timestamp: new Date().toISOString() }); }
    tracker.click(); onBack();
  }

  return (
    <Wrap>
      <TaskBanner task={activeTask} onComplete={onTaskComplete} />
      <div className="back" onClick={handleBack}>← Back to Offers</div>
      <div className="order-card">
        <div className="order-title">{offer.emoji} Order Summary</div>
        <div className="order-line"><span>Selected Item</span><span style={{ fontWeight: 600 }}>{offer.name}</span></div>
        <div style={{ padding: "4px 20px 8px", fontSize: 12, color: "#6b7280" }}>{offer.desc}</div>
        <div className="order-line"><span>Delivery Type</span><span>Standard (30–45 min)</span></div>
        <div className="order-line"><span>Delivery Fee</span><span>Free</span></div>
        <div className="order-line"><span>Total</span><span style={{ color: "#4263eb" }}>${offer.price.toFixed(2)}</span></div>
      </div>
      <div className="smart-tip">💡 <strong>Smart Tip:</strong> This offer matches your preferences and saves you ${offer.save}.00!</div>
      <button className="btn-confirm" onClick={() => {
        tracker.click(); setOrderConfirmed(true);
        logEvent({ session_id: sessionId, flow: FLOW, event_type: "click", element: "confirm_place_order", offer: offer.name, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
        logEvent({ session_id: sessionId, flow: FLOW, event_type: "order_placed", offer: offer.name, task: activeTask?.id || null, client_timestamp: new Date().toISOString() });
        onPlace();
      }}>Confirm &amp; Place Order</button>
    </Wrap>
  );
}

function ConfirmScreen({ onHome, activeTask, onTaskComplete }) {
  return (
    <Wrap>
      <TaskBanner task={activeTask} onComplete={onTaskComplete} />
      <div className="confirm-wrap">
        <div className="confirm-box">
          <div className="confirm-icon">✓</div>
          <div className="confirm-title">Order Placed</div>
          <div className="confirm-sub">Your order has been confirmed</div>
          <button className="btn-confirm" style={{ marginTop: 24 }} onClick={onHome}>Back to Home</button>
        </div>
      </div>
    </Wrap>
  );
}

export default function App() {
  const sessionId = useRef(getOrCreateSessionId()).current;
  const tracker   = useRef(createTracker(sessionId)).current;

  const [screen,         setScreen]         = useState("privacy");
  const [offer,          setOffer]          = useState(null);
  const [activeTask,     setActiveTask]     = useState(null);
  const [completed,      setCompleted]      = useState([]);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [saved,          setSaved]          = useState(false);

  // Manual: all null
  const [catVal, setCatVal] = useState({ homeSensors: null, behaviorPatterns: null, purchaseHistory: null });
  const [subVal, setSubVal] = useState({});
  const [usgVal, setUsgVal] = useState({ foodServices: null, homeServices: null, wellnessServices: null });
  const [usgSub, setUsgSub] = useState({});

  function startTask(task) {
    if (completed.includes(task.id)) return;
    setSaved(false);
    if (task.id === "task2") {
      setCatVal({ homeSensors: "deny", behaviorPatterns: "deny", purchaseHistory: "deny" });
      setSubVal({});
    }
    if (task.id === "task3") {
      setUsgVal({ foodServices: "deny", homeServices: "deny", wellnessServices: "deny" });
      setUsgSub({});
    }
    tracker.start(task.id);
    setActiveTask(task);
    if (["task1","task2","task3"].includes(task.id)) setScreen("privacy");
    else if (task.id === "task4") setScreen("offers");
    else if (task.id === "task5") setScreen("order");
  }

  function handleTaskComplete() {
    const result = tracker.complete(offer?.name || null, orderConfirmed);
    if (result?.task) setCompleted(prev => [...prev, result.task]);
    setActiveTask(null);
    setOrderConfirmed(false);
    setScreen("privacy");
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <TaskSidebar completed={completed} active={activeTask} onSelect={startTask} />
        {screen === "home"    && <HomeScreen    onPrivacy={() => setScreen("privacy")} activeTask={activeTask} onTaskComplete={handleTaskComplete} sessionId={sessionId} tracker={tracker} />}
        {screen === "privacy" && <PrivacyScreen catVal={catVal} setCatVal={setCatVal} subVal={subVal} setSubVal={setSubVal} usgVal={usgVal} setUsgVal={setUsgVal} usgSub={usgSub} setUsgSub={setUsgSub} onBack={() => setScreen("home")} onDone={() => setScreen("offers")} activeTask={activeTask} onTaskComplete={handleTaskComplete} sessionId={sessionId} tracker={tracker} saved={saved} setSaved={setSaved} />}
        {screen === "offers"  && <OffersScreen  onSelect={o => { setOffer(o); setScreen("order"); }} onBack={() => setScreen("privacy")} activeTask={activeTask} onTaskComplete={handleTaskComplete} sessionId={sessionId} tracker={tracker} />}
        {screen === "order"   && <OrderScreen   offer={offer || OFFERS[0]} onPlace={() => setScreen("confirm")} onBack={() => setScreen("offers")} activeTask={activeTask} onTaskComplete={handleTaskComplete} sessionId={sessionId} tracker={tracker} setOrderConfirmed={setOrderConfirmed} />}
        {screen === "confirm" && <ConfirmScreen onHome={() => setScreen("privacy")} activeTask={activeTask} onTaskComplete={handleTaskComplete} />}
      </div>
    </>
  );
}
