export default function Hero() {
  return (
    <section id="hero" aria-labelledby="heroTitle">
      <div className="hero-tag">🤖 Multi-Agent Reinforcement Learning</div>
      <h1 id="heroTitle">
        Adaptive Traffic Signal<br />
        <span className="grad">Control Dashboard</span>
      </h1>
      <p className="hero-sub">
        4 cooperative Q-Learning agents managing a SUMO intersection network in real time —
        minimizing queue lengths, waiting times, and teleportation events.
      </p>
    </section>
  );
}
