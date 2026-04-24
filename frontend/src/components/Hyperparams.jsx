export default function Hyperparams({ config }) {
  const h = config?.hyperparams;

  const params = h
    ? [
        { k: "α (alpha)", v: h.alpha },
        { k: "γ (gamma)", v: h.gamma },
        { k: "ε start",  v: h.epsilon_start },
        { k: "ε min",    v: h.epsilon_min },
        { k: "ε decay",  v: h.epsilon_decay },
        { k: "Episodes", v: h.episodes },
        { k: "Max steps", v: h.max_steps },
        { k: "N agents", v: h.n_agents },
        { k: "Global α", v: h.global_reward_weight },
      ]
    : null;

  return (
    <div className="card" role="region" aria-label="Agent hyperparameters">
      <div className="card-header">
        <div className="card-title"><span className="icon">⚙️</span>Hyperparameters</div>
        <span className="card-badge badge-purple">Q-Learning</span>
      </div>
      <div className="params-grid">
        {params
          ? params.map((p) => (
              <div className="param-item" key={p.k} data-tip={p.k}>
                <span className="param-key">{p.k}</span>
                <span className="param-val">{p.v}</span>
              </div>
            ))
          : [0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 54, borderRadius: "var(--radius-sm)" }} />
            ))}
      </div>
    </div>
  );
}
