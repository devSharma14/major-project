import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  Title,
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend, Title
);

function downsample(arr, cap = 500) {
  if (!arr || arr.length <= cap) return arr || [];
  const step = Math.ceil(arr.length / cap);
  return arr.filter((_, i) => i % step === 0);
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: "easeInOutQuart" },
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
        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`,
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
};

export default function RewardChart({ metrics }) {
  const ready = metrics?.available;
  const { labels, rawData, smoothed } = useMemo(() => {
    if (!ready) return { labels: [], rawData: [], smoothed: [] };
    const raw = metrics.raw;
    const rawDs = downsample(raw, 500);
    const lbls = rawDs.map((_, i) => Math.round(i * (raw.length / rawDs.length)));
    return { labels: lbls, rawData: rawDs, smoothed: metrics.smoothed };
  }, [metrics, ready]);

  return (
    <div className="card" role="region" aria-label="Training reward over episodes">
      <div className="card-header">
        <div className="card-title"><span className="icon">📉</span>MARL Training Reward Progress</div>
        <span className="card-badge badge-purple">
          {ready ? `${metrics.stats.total_episodes} Episodes` : "—"}
        </span>
      </div>

      <div className="chart-container">
        {ready ? (
          <Line
            data={{
              labels,
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
                },
              ],
            }}
            options={chartOptions}
          />
        ) : (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", color: "var(--text-muted)", fontSize: "0.85rem",
            flexDirection: "column", gap: 8
          }}>
            <span style={{ fontSize: "2rem" }}>📂</span>
            <span>Run <code>python train.py</code> to generate episode_rewards.csv</span>
          </div>
        )}
      </div>
    </div>
  );
}
