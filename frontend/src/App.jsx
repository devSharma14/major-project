import { useEffect, useState } from "react";
import { usePolling } from "./lib/hooks.js";
import Nav from "./components/Nav.jsx";
import Hero from "./components/Hero.jsx";
import MetricsRow from "./components/MetricsRow.jsx";
import IntersectionGrid from "./components/IntersectionGrid.jsx";
import AgentList from "./components/AgentList.jsx";
import RewardChart from "./components/RewardChart.jsx";
import WaitingTimePanel from "./components/WaitingTimePanel.jsx";
import PolicyComparison from "./components/PolicyComparison.jsx";
import Hyperparams from "./components/Hyperparams.jsx";
import ConfigPanels from "./components/ConfigPanels.jsx";

const ENDPOINTS = {
  metrics:    "/api/metrics",
  agents:     "/api/agents",
  comparison: "/api/comparison",
  config:     "/api/config",
  waiting:    "/api/sumo/waiting-time",
};

export default function App() {
  const { data, lastUpdated, refresh } = usePolling(ENDPOINTS, 4000);
  const [clockTick, setClockTick] = useState(0);

  // Re-render "Updated X seconds ago" text every second.
  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedLabel = lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString()}`
    : "Loading…";

  return (
    <>
      <Nav onRefresh={refresh} lastUpdatedLabel={lastUpdatedLabel} />
      <Hero />

      <main id="main" aria-label="Dashboard panels">
        <div className="section-label">📊 Training Overview</div>
        <MetricsRow metrics={data.metrics} />

        <div className="section-label">🗺️ Intersection Network &amp; Agent Status</div>
        <div className="row-two">
          <IntersectionGrid agentsPayload={data.agents} />
          <AgentList agentsPayload={data.agents} />
        </div>

        <div className="section-label">⏱️ SUMO Per-Vehicle Waiting Time</div>
        <WaitingTimePanel payload={data.waiting} />

        <div className="section-label">📉 Training Reward Curve</div>
        <RewardChart metrics={data.metrics} />

        <div className="section-label">⚖️ Policy Evaluation &amp; Configuration</div>
        <div className="row-four">
          <PolicyComparison comparison={data.comparison} />
          <Hyperparams config={data.config} />
        </div>

        <div className="section-label">🛣️ Simulation Configuration</div>
        <ConfigPanels config={data.config} />
      </main>

      <footer id="footer">
        <strong>MARL Traffic Control</strong> &nbsp;·&nbsp; Multi-Agent Q-Learning · SUMO ·
        Gymnasium · Python &nbsp;·&nbsp; Dashboard auto-refreshes every 8 s
      </footer>
    </>
  );
}
