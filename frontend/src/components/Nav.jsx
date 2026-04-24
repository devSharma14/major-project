export default function Nav({ onRefresh, lastUpdatedLabel }) {
  return (
    <nav id="nav" role="navigation" aria-label="Main navigation">
      <div className="nav-logo">
        <div className="logo-icon" aria-hidden="true">🚦</div>
        <span>MARL Traffic&nbsp;Control</span>
      </div>

      <div className="nav-right">
        <span className="status-badge" id="statusBadge" aria-live="polite">
          <span className="dot"></span>
          System Active
        </span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {lastUpdatedLabel}
        </span>
        <button className="btn-ghost" onClick={onRefresh} aria-label="Refresh dashboard data">
          ⟳ Refresh
        </button>
      </div>
    </nav>
  );
}
