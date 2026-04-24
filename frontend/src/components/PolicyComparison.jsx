import { useEffect, useRef } from "react";

const POLICIES = [
  { key: "random_policy",   label: "Random Policy",   cls: "bar-random", emoji: "🎲" },
  { key: "independent_iql", label: "Independent IQL", cls: "bar-iql",    emoji: "🤖" },
  { key: "cooperative_iql", label: "Cooperative IQL", cls: "bar-coop",   emoji: "🤝" },
];

export default function PolicyComparison({ comparison }) {
  const containerRef = useRef(null);

  // Animate bar widths once we have data.
  useEffect(() => {
    if (!comparison || !containerRef.current) return;
    const bars = containerRef.current.querySelectorAll(".policy-bar-fill");
    const id = setTimeout(() => {
      bars.forEach((b) => { b.style.width = b.dataset.target; });
    }, 200);
    return () => clearTimeout(id);
  }, [comparison]);

  if (!comparison) {
    return (
      <div className="card" role="region" aria-label="Policy performance comparison">
        <div className="card-header">
          <div className="card-title"><span className="icon">⚖️</span>Policy Evaluation Comparison</div>
          <span className="card-badge badge-cyan">5 Eval Runs</span>
        </div>
        <div className="policy-bars">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 70, borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      </div>
    );
  }

  const allValues = POLICIES.flatMap((p) => comparison[p.key].values);
  const worst = Math.min(...allValues);
  const best = Math.max(...allValues);
  const range = best - worst || 1;

  return (
    <div className="card" role="region" aria-label="Policy performance comparison">
      <div className="card-header">
        <div className="card-title"><span className="icon">⚖️</span>Policy Evaluation Comparison</div>
        <span className="card-badge badge-cyan">5 Eval Runs</span>
      </div>

      <div className="policy-bars" ref={containerRef}>
        {POLICIES.map((p) => {
          const d = comparison[p.key];
          const pct = (((d.mean - worst) / range) * 100).toFixed(1);
          return (
            <div className="policy-item" key={p.key}>
              <div className="policy-header">
                <span className="policy-name">{p.emoji} {p.label}</span>
                <span className="policy-score">{d.mean.toFixed(0)}</span>
              </div>
              <div className="policy-bar-track">
                <div className={`policy-bar-fill ${p.cls}`} style={{ width: "0%" }} data-target={`${pct}%`} />
              </div>
              <div className="policy-stats">
                <span>min: {d.min}</span>
                <span>max: {d.max}</span>
                <span>σ: {d.std}</span>
                <span>med: {d.median}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{
        marginTop: "1.2rem", fontSize: "0.75rem", color: "var(--text-muted)",
        borderTop: "1px solid var(--border)", paddingTop: "0.8rem", lineHeight: 1.6
      }}>
        <strong style={{ color: "var(--accent)" }}>Higher bar = better performance.</strong>
        &nbsp;Bars normalised to range [worst → best] across all policies. Reward values are
        negative (cumulative queue penalty) — closer to 0 is better.
      </p>
    </div>
  );
}
