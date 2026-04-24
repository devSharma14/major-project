function ConfigList({ items }) {
  return (
    <div className="config-list">
      {items.map(([k, v]) => (
        <div className="config-item" key={k}>
          <span className="config-key">{k}</span>
          <span className="config-val">{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function ConfigPanels({ config }) {
  if (!config) {
    return (
      <div className="config-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: 260, borderRadius: "var(--radius-md)" }} />
        ))}
      </div>
    );
  }

  const ev = config.env_config;
  const su = config.sumo_config;

  return (
    <div className="config-row">
      <div className="card" role="region" aria-label="Traffic environment configuration">
        <div className="card-header">
          <div className="card-title"><span className="icon">🚗</span>Traffic Env</div>
          <span className="card-badge badge-cyan">Gymnasium</span>
        </div>
        <ConfigList items={[
          ["Arrival Rate (NS)", ev.arrival_rate_NS],
          ["Arrival Rate (EW)", ev.arrival_rate_EW],
          ["Pass Rate",         ev.pass_rate],
          ["Min Green (steps)", ev.min_green],
          ["Max Red (steps)",   ev.max_red],
          ["Yellow Time",       ev.yellow_time],
        ]} />
      </div>

      <div className="card" role="region" aria-label="SUMO simulation configuration">
        <div className="card-header">
          <div className="card-title"><span className="icon">🛣️</span>SUMO Eval</div>
          <span className="card-badge badge-blue">TraCI</span>
        </div>
        <ConfigList items={[
          ["Decision Interval", su.decision_interval],
          ["Min Green (SUMO)",  su.min_green],
          ["Yellow Time",       su.yellow_time],
          ["All-Red Time",      su.all_red_time],
          ["Max Red",           su.max_red],
          ["Eval Steps",        su.eval_steps],
        ]} />
      </div>

      <div className="card" role="region" aria-label="Intersection phase maps">
        <div className="card-header">
          <div className="card-title"><span className="icon">🗺️</span>Intersections</div>
          <span className="card-badge badge-purple">SUMO Phase Map</span>
        </div>
        <div className="config-list">
          {(su.intersections || []).map((x) => (
            <div className="config-item" key={x}>
              <span className="config-key">{x}</span>
              <span className="config-val" style={{ color: "var(--accent)" }}>Active</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
            <div>Action <strong>0</strong> → NS Green phase</div>
            <div>Action <strong>1</strong> → EW Green phase</div>
            <div>Yellow → transition buffer (3s)</div>
            <div>All-Red → safety gap (2s)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
