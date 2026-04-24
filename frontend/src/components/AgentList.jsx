export default function AgentList({ agentsPayload }) {
  const agents = agentsPayload?.agents;

  return (
    <div className="card" role="region" aria-label="Q-Learning agent status">
      <div className="card-header">
        <div className="card-title"><span className="icon">🤖</span>Agent Status</div>
        <span className="card-badge badge-blue">Q-Learning</span>
      </div>

      <div className="agent-list">
        {agents == null ? (
          <>
            <div className="skeleton" style={{ height: 64, borderRadius: "var(--radius-md)" }} />
            <div className="skeleton" style={{ height: 64, borderRadius: "var(--radius-md)" }} />
            <div className="skeleton" style={{ height: 64, borderRadius: "var(--radius-md)" }} />
            <div className="skeleton" style={{ height: 64, borderRadius: "var(--radius-md)" }} />
          </>
        ) : agents.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            No trained_agents.pkl found. Run <code>python train.py</code> first.
          </p>
        ) : (
          agents.map((a) => (
            <div className="agent-card" key={a.id}>
              <div className="agent-avatar">{a.name.slice(0, 2)}</div>
              <div className="agent-info">
                <div className="agent-name">{a.name}</div>
                <div className="agent-meta">
                  α={a.alpha} · γ={a.gamma} · Q-states: {a.q_table_size}
                </div>
              </div>
              <div className="agent-epsilon">
                <span className="epsilon-val">ε={a.epsilon}</span>
                <div className="epsilon-bar-wrap">
                  <div className="epsilon-bar" style={{ width: `${(a.epsilon * 100).toFixed(0)}%` }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
