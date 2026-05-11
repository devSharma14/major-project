# MARL Traffic Signal Control

Multi-agent Q-learning for adaptive traffic signal control with a Flask + React dashboard and SUMO evaluation.

## Overview
This project simulates and evaluates a multi-intersection traffic control system using independent Q-learning agents. The system has three primary layers:

1. **Learning environment (Gymnasium)**: A synthetic traffic intersection environment for fast training.
2. **Evaluation (SUMO/TraCI)**: Realistic simulation via SUMO with agent-based control.
3. **Dashboard (Flask + React)**: A live UI for metrics, agent status, and SUMO waiting-time analytics.

## Repository structure
- Python core (training/evaluation)
  - [traffic_env.py](traffic_env.py) – single-intersection gym environment.
  - [multi_intersection_env.py](multi_intersection_env.py) – multi-agent wrapper.
  - [q_learning_agent.py](q_learning_agent.py) – Q-learning agent.
  - [marl_trainer.py](marl_trainer.py) – training loop and evaluation.
  - [train.py](train.py) – training entry point.
  - [sumo_eval.py](sumo_eval.py) – SUMO evaluation control loop.
  - [sumo_fixed_eval.py](sumo_fixed_eval.py) – fixed-time baseline in SUMO.
  - [plot_training.py](plot_training.py) / [plot_eval_comparison.py](plot_eval_comparison.py) – plotting helpers.
- Backend (Flask API)
  - [backend/app.py](backend/app.py)
  - [backend/api/metrics.py](backend/api/metrics.py)
  - [backend/api/sumo_waiting.py](backend/api/sumo_waiting.py)
- Frontend (React + Vite)
  - [frontend/src/App.jsx](frontend/src/App.jsx)
  - [frontend/src/components](frontend/src/components)
- SUMO network
  - [sumo/intersection.sumocfg](sumo/intersection.sumocfg)
  - [sumo/net.net.xml](sumo/net.net.xml), [sumo/routes.rou.xml](sumo/routes.rou.xml)

## Core logic (high level)
### 1) Traffic environment
The synthetic environment in [traffic_env.py](traffic_env.py) models one intersection with two directions: NS and EW.

- **State**: $s_t = (q_{NS}, q_{EW}, p, r_{bin})$
  - $q_{NS}, q_{EW}$: queue lengths (clipped to 50)
  - $p$: current phase (0=NS green, 1=EW green, 2=yellow)
  - $r_{bin}$: discretized red timer bucket ($\lfloor r / 5 \rfloor$, capped at 8)
- **Action**: $a_t \in \{0,1\}$
  - 0 = keep/choose NS green, 1 = keep/choose EW green
- **Dynamics**:
  - Stochastic arrivals with time-varying rates.
  - Vehicles discharge at `pass_rate` when the corresponding direction is green.
  - Yellow phase enforced on phase switches.
- **Reward**: implemented in [traffic_env.py](traffic_env.py)
  $$
  r_t = -0.05(q_{NS}^2 + q_{EW}^2) - \mathbb{1}[r>30]\cdot 10 - 0.1\,\max(0,\max(w_{NS},w_{EW})-30) + r_{switch}
  $$
  where $r_{switch}=-2$ when entering a yellow phase (discourages jitter).

### 2) Multi-agent wrapper
[multi_intersection_env.py](multi_intersection_env.py) runs $N$ independent intersections in parallel and mixes local and global reward.

- Global reward: $R_g = \sum_{i=1}^{N} r_i$
- Per-agent reward shaping:
  $$
  r_i' = r_i + \lambda R_g
  $$
  where $\lambda = \texttt{global\_reward\_weight}$

### 3) Q-learning agent
[q_learning_agent.py](q_learning_agent.py) implements tabular Q-learning:

- TD target:
  $$
  y_t = r_t + \gamma \max_{a'} Q(s_{t+1}, a')
  $$
- TD update:
  $$
  Q(s_t,a_t) \leftarrow Q(s_t,a_t) + \alpha\,(y_t - Q(s_t,a_t))
  $$
- $\epsilon$-greedy policy with decay:
  $$
  \epsilon \leftarrow \max(\epsilon_{min}, \epsilon \cdot \epsilon_{decay})
  $$

### 4) Training loop
[marl_trainer.py](marl_trainer.py) runs episodic training:

1. Reset environment to get per-agent states.
2. Each agent selects $a_t$ via $\epsilon$-greedy policy.
3. Environment returns next states and rewards.
4. Each agent updates $Q$ and repeats until episode ends.
5. Episode rewards are written to `episode_rewards.csv` after evaluation.

Entry point: [train.py](train.py)

### 5) SUMO evaluation
[sumo_eval.py](sumo_eval.py) controls real traffic lights with TraCI and uses trained agents to pick actions.

Key logic:
- Intersection-specific **phase maps** for NS/EW mapping.
- Decision interval for reduced control frequency.
- Safety constraints: min-green, yellow, all-red, max-red, and max-green caps.
- Metrics: average waiting time, average queue length, teleportations.

### 6) Dashboard (Flask + React)
- Flask backend in [backend/app.py](backend/app.py) exposes:
  - `/api/metrics`: training rewards + summary statistics
  - `/api/agents`: agent epsilon + Q-table size
  - `/api/comparison`: static evaluation comparison
  - `/api/config`: environment + SUMO config
  - `/api/sumo/waiting-time`: parses `tripinfo.xml` with per-vehicle waiting time
- React frontend in [frontend/src/App.jsx](frontend/src/App.jsx) polls endpoints and renders charts and status cards.

## How things work together
1. **Train**: Run [train.py](train.py) to produce `trained_agents.pkl` and `episode_rewards.csv`.
2. **Evaluate (SUMO)**: Run [sumo_eval.py](sumo_eval.py) to generate `sumo/tripinfo.xml` for dashboard panels.
3. **Dashboard**:
   - Start Flask backend to serve the API and the React bundle.
   - Start Vite dev server for UI development (optional).

## Running the project
### 1) Python dependencies
Create a Python environment and install:
- `gymnasium`, `numpy`, `matplotlib`, `flask`, `flask-cors`, `traci`
- SUMO must be installed and available on PATH for `sumo` / `sumo-gui`.

### 2) Train agents
Run from the repo root:
- `python train.py`

### 3) SUMO evaluation
- `python sumo_eval.py` (GUI) or set `gui=False` inside the script.
- The script writes `sumo/tripinfo.xml` which powers waiting-time analytics.

### 4) Start backend
- `python backend/app.py`
- API available at `http://127.0.0.1:5000/api/*`

### 5) Start frontend (dev)
From [frontend](frontend) directory:
- `npm install`
- `npm run dev`

## Key outputs
- `trained_agents.pkl` — serialized agents.
- `episode_rewards.csv` — training reward curve.
- `plots/marl_training_reward.png` — training plot.
- `sumo/tripinfo.xml` — SUMO per-vehicle trip/wait data.

## Notes
- The SUMO phase mappings are intersection-specific. If the SUMO net changes, update `PHASE_MAP` and `YELLOW_MAP` in [sumo_eval.py](sumo_eval.py).
- The dashboard gracefully handles missing artifacts (e.g., no trained agents or no tripinfo file).
