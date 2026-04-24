import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function StatTile({ label, value, unit = "s", hint }) {
  return (
    <div className="metric-card" style={{ padding: "1rem 1.2rem" }} data-tip={hint}>
      <div className="metric-label" style={{ fontSize: "0.72rem" }}>{label}</div>
      <div className="metric-value" style={{ fontSize: "1.6rem" }}>
        {value}
        <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(13, 24, 48, 0.95)",
      borderColor: "rgba(0, 245, 212, 0.3)",
      borderWidth: 1,
      titleColor: "#e8f4f8",
      bodyColor: "#7ea8be",
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y} vehicles`,
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: "Waiting time bucket", color: "#3d6070", font: { size: 11 } },
      grid: { color: "rgba(255,255,255,0.03)" },
      ticks: { color: "#3d6070", font: { size: 10 } },
    },
    y: {
      title: { display: true, text: "Vehicles", color: "#3d6070", font: { size: 11 } },
      grid: { color: "rgba(255,255,255,0.04)" },
      ticks: { color: "#3d6070", font: { size: 10 }, precision: 0 },
      beginAtZero: true,
    },
  },
};

export default function WaitingTimePanel({ payload }) {
  const [showAll, setShowAll] = useState(false);

  const histogramData = useMemo(() => {
    if (!payload?.available) return null;
    const { labels, counts } = payload.histogram;
    return {
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: [
            "rgba(34, 197, 94, 0.85)",
            "rgba(0, 245, 212, 0.85)",
            "rgba(0, 180, 216, 0.85)",
            "rgba(245, 158, 11, 0.85)",
            "rgba(239, 68, 68, 0.75)",
            "rgba(123, 94, 167, 0.85)",
          ],
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    };
  }, [payload]);

  return (
    <div className="card" role="region" aria-label="SUMO per-vehicle waiting time">
      <div className="card-header">
        <div className="card-title">
          <span className="icon">⏱️</span>Per-Vehicle Waiting Time (SUMO)
        </div>
        <span className="card-badge badge-cyan">
          {payload?.available ? `${payload.count} vehicles` : "—"}
        </span>
      </div>

      {!payload ? (
        <div className="skeleton" style={{ height: 260, borderRadius: "var(--radius-md)" }} />
      ) : !payload.available ? (
        <div style={{
          padding: "2rem", textAlign: "center", color: "var(--text-muted)",
          fontSize: "0.85rem", lineHeight: 1.7
        }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>📂</div>
          <div>{payload.hint || payload.error || "No tripinfo.xml available."}</div>
        </div>
      ) : (
        <>
          <div className="metrics-row" style={{ marginBottom: "1.2rem" }}>
            <StatTile label="🧮 Mean Wait"   value={payload.stats.mean}   hint="Average waiting time per vehicle" />
            <StatTile label="📊 Median Wait" value={payload.stats.median} hint="50th percentile waiting time" />
            <StatTile label="🔺 Max Wait"    value={payload.stats.max}    hint="Longest wait observed" />
            <StatTile label="📏 Std Dev"     value={payload.stats.std}    hint="Spread of waiting times" />
            <StatTile label="⏳ Total Wait"  value={payload.stats.total}  hint="Summed across all vehicles" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "1.2rem" }}>
            <div>
              <div style={{
                fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8,
                textTransform: "uppercase", letterSpacing: "0.05em"
              }}>
                Distribution
              </div>
              <div style={{ height: 260 }}>
                {histogramData && <Bar data={histogramData} options={barOptions} />}
              </div>
            </div>

            <div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8,
                textTransform: "uppercase", letterSpacing: "0.05em"
              }}>
                <span>Top waiters</span>
                <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.7rem" }}
                  onClick={() => setShowAll(s => !s)}>
                  {showAll ? "Show top 10" : `Show all ${payload.count}`}
                </button>
              </div>

              <div style={{
                maxHeight: 260, overflowY: "auto", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", background: "rgba(13, 24, 48, 0.4)"
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead style={{
                    position: "sticky", top: 0, background: "rgba(13, 24, 48, 0.95)",
                    color: "var(--text-muted)", textAlign: "left"
                  }}>
                    <tr>
                      <th style={{ padding: "8px 12px" }}>Vehicle</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Wait (s)</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Stops</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAll ? payload.vehicles : payload.vehicles.slice(0, 10)).map((v) => (
                      <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 12px", color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {v.id}
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--accent)" }}>
                          {v.waiting.toFixed(1)}
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                          {v.stops}
                        </td>
                        <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-secondary)" }}>
                          {v.duration.toFixed(1)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p style={{
            marginTop: "1rem", fontSize: "0.72rem", color: "var(--text-muted)",
            borderTop: "1px solid var(--border)", paddingTop: "0.8rem", lineHeight: 1.6
          }}>
            Source: <code>{payload.source}</code> — regenerated each time you run
            <code style={{ margin: "0 4px" }}>python sumo_eval.py</code>.
          </p>
        </>
      )}
    </div>
  );
}
