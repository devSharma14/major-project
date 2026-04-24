import { useAnimatedNumber } from "../lib/hooks.js";

function MetricCard({ tip, icon, label, sub, value, decimals = 0, trendEl = null }) {
  const display = useAnimatedNumber(value ?? 0, decimals);
  return (
    <div className="metric-card" data-tip={tip}>
      <div className="metric-label">{icon} {label}</div>
      <div className="metric-value">
        <span className="count-up">{value == null ? "—" : display}</span>
      </div>
      <div className="metric-sub">{sub}</div>
      {trendEl}
    </div>
  );
}

export default function MetricsRow({ metrics }) {
  const s = metrics?.available ? metrics.stats : null;

  let trend = null;
  if (s && s.mean_reward !== 0) {
    const improvement = ((s.recent_mean - s.mean_reward) / Math.abs(s.mean_reward)) * 100;
    trend = (
      <div className={`metric-trend ${improvement >= 0 ? "trend-up" : "trend-down"}`}>
        {improvement >= 0 ? "+" : ""}
        {improvement.toFixed(1)}% recent
      </div>
    );
  }

  return (
    <div className="metrics-row" role="region" aria-label="Training statistics">
      <MetricCard tip="Total training episodes completed"
        icon="🎬" label="Episodes" sub="Training iterations"
        value={s?.total_episodes} />
      <MetricCard tip="Best cumulative reward achieved"
        icon="🏆" label="Best Reward" sub="Highest episode score"
        value={s?.best_reward} />
      <MetricCard tip="Mean reward over all episodes"
        icon="📈" label="Mean Reward" sub="All-episode average"
        value={s?.mean_reward} decimals={1} trendEl={trend} />
      <MetricCard tip="Mean reward over last 50 episodes"
        icon="🔥" label="Recent Mean" sub="Last 50 episodes"
        value={s?.recent_mean} decimals={1} />
      <MetricCard tip="Reward at the final training episode"
        icon="🎯" label="Final Reward" sub="Episode 1000"
        value={s?.final_reward} decimals={1} />
    </div>
  );
}
