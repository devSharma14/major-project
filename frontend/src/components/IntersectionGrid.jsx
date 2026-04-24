import { useEffect, useState } from "react";

const NODES = ["J1", "J2", "J3", "J4"];
const PHASE_CYCLE_MS = 4000;
const OFFSETS = [0, 1200, 2400, 3600];

function pickPhase() {
  const r = Math.random();
  if (r < 0.45) return 0;      // NS green
  if (r < 0.9) return 1;       // EW green
  return 2;                    // yellow transition
}

function phaseClasses(phase) {
  if (phase === 0) return { ns: "active-ns", ew: "inactive", pi: "phase-green" };
  if (phase === 1) return { ns: "inactive", ew: "active-ew", pi: "phase-red" };
  return { ns: "yellow-dot", ew: "yellow-dot", pi: "phase-yellow" };
}

function IntersectionNode({ name, agent, phase }) {
  const c = phaseClasses(phase);
  const eps = agent ? agent.epsilon.toFixed(4) : "0.0500";
  const qtbl = agent ? agent.q_table_size : "—";

  return (
    <div className="intersection-node">
      <div className="int-header">
        <span className="int-name">{name}</span>
        <span className={`phase-indicator ${c.pi}`}></span>
      </div>
      <div className="int-signals">
        <div className="signal-light">
          <div className={`signal-dot ${c.ns}`} title="NS direction"></div>
          <span className="signal-label">NS</span>
        </div>
        <div className="signal-light">
          <div className={`signal-dot ${c.ew}`} title="EW direction"></div>
          <span className="signal-label">EW</span>
        </div>
      </div>
      <div className="int-stats">
        <div className="int-stat-item">
          <span className="int-stat-label">ε (epsilon)</span>
          <span className="int-stat-value">{eps}</span>
        </div>
        <div className="int-stat-item">
          <span className="int-stat-label">Q-states</span>
          <span className="int-stat-value">{qtbl}</span>
        </div>
      </div>
    </div>
  );
}

export default function IntersectionGrid({ agentsPayload }) {
  const [phases, setPhases] = useState([0, 0, 0, 0]);

  // Stagger each node's phase ticker so the signals feel alive.
  useEffect(() => {
    const timers = NODES.map((_, i) => {
      const tick = () => setPhases((p) => {
        const next = [...p];
        next[i] = pickPhase();
        return next;
      });
      const startId = setTimeout(() => {
        tick();
        const intId = setInterval(tick, PHASE_CYCLE_MS + OFFSETS[i] * 0.2);
        timers[i].intId = intId;
      }, OFFSETS[i]);
      return { startId, intId: null };
    });
    return () => {
      timers.forEach((t) => {
        clearTimeout(t.startId);
        if (t.intId) clearInterval(t.intId);
      });
    };
  }, []);

  const agentMap = {};
  (agentsPayload?.agents || []).forEach((a) => { agentMap[a.name] = a; });

  return (
    <div className="card" role="region" aria-label="Intersection network map">
      <div className="card-header">
        <div className="card-title"><span className="icon">🗺️</span>Live Network Map</div>
        <span className="card-badge badge-cyan">4 Junctions</span>
      </div>
      <div className="intersection-grid">
        {NODES.map((n, i) => (
          <IntersectionNode key={n} name={n} agent={agentMap[n]} phase={phases[i]} />
        ))}
      </div>
    </div>
  );
}
