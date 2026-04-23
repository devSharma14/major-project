/* ─── app.js ──────────────────────────────────────────────────
   MARL Traffic Control Dashboard — Frontend Logic
   Handles: API calls, Chart.js charts, live metrics,
            intersection signal animations, count-up numbers
   ────────────────────────────────────────────────────────── */

const API = "http://127.0.0.1:5000";
const POLL_MS = 8000;          // refresh every 8 s

// Chart instances (kept for destroy-on-refresh)
let rewardChart = null;
let compChart   = null;

/* ══════════════════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════════════════ */

function $(id) { return document.getElementById(id); }

/** Animated number counter */
function animateCount(el, target, decimals = 0, suffix = "") {
  const start     = parseFloat(el.dataset.current || 0);
  const duration  = 700;
  const startTime = performance.now();

  el.dataset.current = target;

  function step(now) {
    const t  = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val  = start + (target - start) * ease;
    el.textContent = val.toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Fetch wrapper – returns null on error (never throws) */
async function apiFetch(path) {
  try {
    const res = await fetch(API + path);
    if (!res.ok) { console.warn(`API ${path} → ${res.status}`); return null; }
    return await res.json();
  } catch (e) {
    console.warn(`API ${path} failed:`, e.message);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   TRAINING REWARD CHART
══════════════════════════════════════════════════════════════ */

function buildRewardChart(raw, smoothed) {
  if (rewardChart) rewardChart.destroy();

  const ctx = $("rewardChart");
  if (!ctx) return;

  // Down-sample raw for performance if > 500 pts
  let rawData = raw;
  if (raw.length > 500) {
    const step = Math.ceil(raw.length / 500);
    rawData = raw.filter((_, i) => i % step === 0);
  }

  rewardChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: rawData.length }, (_, i) =>
        Math.round(i * (raw.length / rawData.length))),
      datasets: [
        {
          label: "Raw Reward",
          data: rawData,
          borderColor: "rgba(0, 245, 212, 0.25)",
          backgroundColor: "rgba(0, 245, 212, 0.03)",
          borderWidth: 1,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
          order: 2,
        },
        {
          label: "Smoothed (w=20)",
          data: smoothed,
          borderColor: "#00f5d4",
          backgroundColor: "transparent",
          borderWidth: 2.5,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          order: 1,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          shadowBlur: 10,
          shadowColor: "#00f5d4",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: "easeInOutQuart" },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: {
            color: "#7ea8be",
            font: { family: "Inter", size: 11 },
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: "rgba(13, 24, 48, 0.95)",
          borderColor: "rgba(0, 245, 212, 0.3)",
          borderWidth: 1,
          titleColor: "#e8f4f8",
          bodyColor: "#7ea8be",
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Episode", color: "#3d6070", font: { size: 11 } },
          grid: { color: "rgba(255,255,255,0.03)" },
          ticks: { color: "#3d6070", maxTicksLimit: 10, font: { size: 10 } },
        },
        y: {
          title: { display: true, text: "Total Reward", color: "#3d6070", font: { size: 11 } },
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#3d6070", font: { size: 10 } },
        },
      },
    },
  });
}

/* ══════════════════════════════════════════════════════════════
   POLICY COMPARISON — horizontal bar-style cards
══════════════════════════════════════════════════════════════ */

function renderComparison(data) {
  const container = $("policyBars");
  if (!container || !data) return;

  // Best possible value for normalising bars (all negative → 0 is best)
  const allValues = [...data.random_policy.values, ...data.independent_iql.values, ...data.cooperative_iql.values];
  const worst = Math.min(...allValues);
  const best  = Math.max(...allValues);
  const range = best - worst || 1;

  const policies = [
    { key: "random_policy",    label: "Random Policy",       cls: "bar-random", emoji: "🎲" },
    { key: "independent_iql",  label: "Independent IQL",     cls: "bar-iql",    emoji: "🤖" },
    { key: "cooperative_iql",  label: "Cooperative IQL",     cls: "bar-coop",   emoji: "🤝" },
  ];

  container.innerHTML = policies.map(p => {
    const d = data[p.key];
    const pct = ((d.mean - worst) / range * 100).toFixed(1);
    return `
      <div class="policy-item">
        <div class="policy-header">
          <span class="policy-name">${p.emoji} ${p.label}</span>
          <span class="policy-score">${d.mean.toFixed(0)}</span>
        </div>
        <div class="policy-bar-track">
          <div class="policy-bar-fill ${p.cls}" style="width:0%"
               data-target="${pct}%"></div>
        </div>
        <div class="policy-stats">
          <span>min: ${d.min}</span>
          <span>max: ${d.max}</span>
          <span>σ: ${d.std}</span>
          <span>med: ${d.median}</span>
        </div>
      </div>`;
  }).join("");

  // Animate bars after render
  setTimeout(() => {
    container.querySelectorAll(".policy-bar-fill").forEach(bar => {
      bar.style.width = bar.dataset.target;
    });
  }, 200);
}

/* ══════════════════════════════════════════════════════════════
   INTERSECTION SIGNAL NODES  (animated)
══════════════════════════════════════════════════════════════ */

const PHASES = ["NS Green 🟢", "EW Green 🟢", "Yellow 🟡"];
const PHASE_CYCLE_MS = 4000;

function createIntersectionNode(name, agentData) {
  const eps   = agentData ? agentData.epsilon : 0.05;
  const qtbl  = agentData ? agentData.q_table_size : "—";
  const nodeId = `int-node-${name}`;

  return `
    <div class="intersection-node" id="${nodeId}">
      <div class="int-header">
        <span class="int-name">${name}</span>
        <span class="phase-indicator phase-green" id="${nodeId}-phase"></span>
      </div>
      <div class="int-signals">
        <div class="signal-light">
          <div class="signal-dot active-ns" id="${nodeId}-ns" title="NS direction"></div>
          <span class="signal-label">NS</span>
        </div>
        <div class="signal-light">
          <div class="signal-dot inactive" id="${nodeId}-ew" title="EW direction"></div>
          <span class="signal-label">EW</span>
        </div>
      </div>
      <div class="int-stats">
        <div class="int-stat-item">
          <span class="int-stat-label">ε (epsilon)</span>
          <span class="int-stat-value">${eps.toFixed(4)}</span>
        </div>
        <div class="int-stat-item">
          <span class="int-stat-label">Q-states</span>
          <span class="int-stat-value">${qtbl}</span>
        </div>
      </div>
    </div>`;
}

/** Randomly cycle signals to simulate live traffic */
function startSignalAnimation() {
  const nodes = ["J1", "J2", "J3", "J4"];
  const offsets = [0, 1200, 2400, 3600]; // stagger them

  nodes.forEach((name, i) => {
    let phase = 0;
    const step = () => {
      const nodeId = `int-node-${name}`;
      const nsEl    = $(`${nodeId}-ns`);
      const ewEl    = $(`${nodeId}-ew`);
      const phEl    = $(`${nodeId}-phase`);
      if (!nsEl) return;

      // Pick next phase randomly (weighted towards green states)
      const rand = Math.random();
      if (rand < 0.45) phase = 0;      // NS green
      else if (rand < 0.90) phase = 1; // EW green
      else phase = 2;                  // yellow transition

      if (phase === 0) {
        nsEl.className = "signal-dot active-ns";
        ewEl.className = "signal-dot inactive";
        phEl.className = "phase-indicator phase-green";
      } else if (phase === 1) {
        nsEl.className = "signal-dot inactive";
        ewEl.className = "signal-dot active-ew";
        phEl.className = "phase-indicator phase-red";
      } else {
        nsEl.className = "signal-dot yellow-dot";
        ewEl.className = "signal-dot yellow-dot";
        phEl.className = "phase-indicator phase-yellow";
      }
    };

    setTimeout(() => {
      step();
      setInterval(step, PHASE_CYCLE_MS + offsets[i] * 0.2);
    }, offsets[i]);
  });
}

/* ══════════════════════════════════════════════════════════════
   AGENT STATUS LIST
══════════════════════════════════════════════════════════════ */

function renderAgents(agents) {
  const container = $("agentList");
  if (!container) return;

  if (!agents || !agents.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.82rem;">
      No trained_agents.pkl found. Run <code>python train.py</code> first.</p>`;
    return;
  }

  container.innerHTML = agents.map(a => `
    <div class="agent-card">
      <div class="agent-avatar">${a.name.slice(0,2)}</div>
      <div class="agent-info">
        <div class="agent-name">${a.name}</div>
        <div class="agent-meta">α=${a.alpha} · γ=${a.gamma} · Q-states: ${a.q_table_size}</div>
      </div>
      <div class="agent-epsilon">
        <span class="epsilon-val">ε=${a.epsilon}</span>
        <div class="epsilon-bar-wrap">
          <div class="epsilon-bar" style="width:${(a.epsilon * 100).toFixed(0)}%"></div>
        </div>
      </div>
    </div>`
  ).join("");
}

/* ══════════════════════════════════════════════════════════════
   HYPERPARAMETERS
══════════════════════════════════════════════════════════════ */

function renderHyperparams(cfg) {
  const grid = $("paramsGrid");
  if (!grid || !cfg) return;

  const params = [
    { k: "α (alpha)",     v: cfg.hyperparams.alpha },
    { k: "γ (gamma)",     v: cfg.hyperparams.gamma },
    { k: "ε start",      v: cfg.hyperparams.epsilon_start },
    { k: "ε min",        v: cfg.hyperparams.epsilon_min },
    { k: "ε decay",      v: cfg.hyperparams.epsilon_decay },
    { k: "Episodes",     v: cfg.hyperparams.episodes },
    { k: "Max steps",    v: cfg.hyperparams.max_steps },
    { k: "N agents",     v: cfg.hyperparams.n_agents },
    { k: "Global α",     v: cfg.hyperparams.global_reward_weight },
  ];

  grid.innerHTML = params.map(p =>
    `<div class="param-item" data-tip="${p.k}">
       <span class="param-key">${p.k}</span>
       <span class="param-val">${p.v}</span>
     </div>`
  ).join("");
}

/* ══════════════════════════════════════════════════════════════
   ENVIRONMENT CONFIG
══════════════════════════════════════════════════════════════ */

function renderConfigs(cfg) {
  if (!cfg) return;
  const ev = cfg.env_config;
  const su = cfg.sumo_config;

  const renderList = (id, items) => {
    const el = $(id);
    if (!el) return;
    el.innerHTML = items.map(([k, v]) =>
      `<div class="config-item">
         <span class="config-key">${k}</span>
         <span class="config-val">${v}</span>
       </div>`
    ).join("");
  };

  renderList("envConfig", [
    ["Arrival Rate (NS)", ev.arrival_rate_NS],
    ["Arrival Rate (EW)", ev.arrival_rate_EW],
    ["Pass Rate",         ev.pass_rate],
    ["Min Green (steps)", ev.min_green],
    ["Max Red (steps)",   ev.max_red],
    ["Yellow Time",       ev.yellow_time],
  ]);

  renderList("sumoConfig", [
    ["Decision Interval", su.decision_interval],
    ["Min Green (SUMO)",  su.min_green],
    ["Yellow Time",       su.yellow_time],
    ["All-Red Time",      su.all_red_time],
    ["Max Red",           su.max_red],
    ["Eval Steps",        su.eval_steps],
  ]);

  const intEl = $("sumoIntersections");
  if (intEl && su.intersections) {
    intEl.innerHTML = su.intersections.map(x =>
      `<div class="config-item">
         <span class="config-key">${x}</span>
         <span class="config-val" style="color:var(--accent)">Active</span>
       </div>`
    ).join("");
  }
}

/* ══════════════════════════════════════════════════════════════
   TRAINING STATS  (metric cards)
══════════════════════════════════════════════════════════════ */

function renderTrainingStats(metrics) {
  if (!metrics || !metrics.available) return;
  const s = metrics.stats;

  const setVal = (id, val, dec = 0, suffix = "") => {
    const el = $(id);
    if (el) animateCount(el, val, dec, suffix);
  };

  setVal("statEpisodes",  s.total_episodes);
  setVal("statBest",      s.best_reward,   0);
  setVal("statMean",      s.mean_reward,   1);
  setVal("statRecent",    s.recent_mean,   1);
  setVal("statFinal",     s.final_reward,  1);

  // convergence %: how much reward improved from mean to recent
  if (s.mean_reward !== 0) {
    const improvement = ((s.recent_mean - s.mean_reward) / Math.abs(s.mean_reward) * 100);
    const trendEl = $("statTrend");
    if (trendEl) {
      trendEl.textContent = (improvement >= 0 ? "+" : "") + improvement.toFixed(1) + "% recent";
      trendEl.className = "metric-trend " + (improvement >= 0 ? "trend-up" : "trend-down");
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   MAIN LOAD
══════════════════════════════════════════════════════════════ */

async function loadAll() {
  const [metrics, agents, comparison, config] = await Promise.all([
    apiFetch("/api/metrics"),
    apiFetch("/api/agents"),
    apiFetch("/api/comparison"),
    apiFetch("/api/config"),
  ]);

  // Training chart
  if (metrics && metrics.available) {
    buildRewardChart(metrics.raw, metrics.smoothed);
    renderTrainingStats(metrics);
  } else {
    const chartEl = $("rewardChart");
    if (chartEl) {
      chartEl.parentElement.innerHTML =
        `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.85rem;flex-direction:column;gap:8px">
           <span style="font-size:2rem">📂</span>
           <span>Run <code>python train.py</code> to generate episode_rewards.csv</span>
         </div>`;
    }
  }

  // Agents
  if (agents) {
    const intGrid = $("intersectionGrid");
    if (intGrid) {
      const agentMap = {};
      (agents.agents || []).forEach(a => { agentMap[a.name] = a; });
      intGrid.innerHTML = ["J1","J2","J3","J4"]
        .map(n => createIntersectionNode(n, agentMap[n] || null))
        .join("");
    }
    renderAgents(agents.agents);
  }

  renderComparison(comparison);
  renderHyperparams(config);
  renderConfigs(config);
}

/* ══════════════════════════════════════════════════════════════
   ENTRY POINT
══════════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  loadAll();
  startSignalAnimation();
  setInterval(loadAll, POLL_MS);

  // Last-updated display
  const stamp = $("lastUpdated");
  setInterval(() => {
    if (stamp) stamp.textContent = "Updated " + new Date().toLocaleTimeString();
  }, 1000);

  // Refresh button
  const btn = $("btnRefresh");
  if (btn) btn.addEventListener("click", () => { loadAll(); });
});
