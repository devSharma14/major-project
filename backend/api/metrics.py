import os
import pickle
import numpy as np

# -------------------------------------------------------
# Paths (relative to the repo root, one level above backend/)
# -------------------------------------------------------
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
REWARDS_CSV = os.path.join(ROOT, "episode_rewards.csv")
AGENTS_PKL  = os.path.join(ROOT, "trained_agents.pkl")

# Hard-coded eval data from plot_eval_comparison.py
EVAL_DATA = {
    "random_policy":    [-1600, -1500, -1700, -1550, -1650],
    "independent_iql":  [-1200, -1350, -1000, -1600, -1100],
    "cooperative_iql":  [ -597,  -627,  -718, -1446,  -652],
}

# Agent hyperparameters (from q_learning_agent.py / train.py)
HYPERPARAMS = {
    "alpha":          0.1,
    "gamma":          0.99,
    "epsilon_start":  1.0,
    "epsilon_min":    0.05,
    "epsilon_decay":  0.995,
    "episodes":       1000,
    "max_steps":      200,
    "n_agents":       4,
    "global_reward_weight": 0.25,
}

# Traffic-env config
ENV_CONFIG = {
    "arrival_rate_NS": 0.9,
    "arrival_rate_EW": 0.1,
    "pass_rate":       2,
    "min_green":       5,
    "max_red":         20,
    "yellow_time":     2,
}

# SUMO eval config
SUMO_CONFIG = {
    "decision_interval": 5,
    "min_green":         10,
    "yellow_time":       3,
    "all_red_time":      2,
    "max_red":           40,
    "eval_steps":        2000,
    "intersections":     ["J1", "J2", "J3", "J4"],
}


def _moving_average(values, window=20):
    if len(values) < window:
        return values
    return list(np.convolve(values, np.ones(window) / window, mode="valid"))


def get_training_metrics():
    """Load episode_rewards.csv and return raw + smoothed reward lists."""
    if not os.path.exists(REWARDS_CSV):
        return {"available": False, "raw": [], "smoothed": [], "stats": {}}

    rewards = np.loadtxt(REWARDS_CSV).tolist()
    smoothed = _moving_average(rewards, window=20)

    stats = {
        "total_episodes": len(rewards),
        "final_reward":   round(rewards[-1], 2) if rewards else 0,
        "best_reward":    round(max(rewards), 2) if rewards else 0,
        "mean_reward":    round(float(np.mean(rewards)), 2),
        "recent_mean":    round(float(np.mean(rewards[-50:])), 2) if len(rewards) >= 50 else round(float(np.mean(rewards)), 2),
    }
    return {
        "available": True,
        "raw":       [round(r, 3) for r in rewards],
        "smoothed":  [round(r, 3) for r in smoothed],
        "stats":     stats,
    }


def get_agent_status():
    """Load trained_agents.pkl and return per-agent state info."""
    if not os.path.exists(AGENTS_PKL):
        return {"available": False, "agents": []}

    with open(AGENTS_PKL, "rb") as f:
        agents = pickle.load(f)

    result = []
    tls_names = ["J1", "J2", "J3", "J4"]
    for idx, (agent_id, agent) in enumerate(agents.items()):
        result.append({
            "id":            agent_id,
            "name":          tls_names[idx] if idx < len(tls_names) else f"Agent {agent_id}",
            "epsilon":       round(float(agent.epsilon), 4),
            "q_table_size":  len(agent.q_table),
            "alpha":         agent.alpha,
            "gamma":         agent.gamma,
        })
    return {"available": True, "agents": result}


def get_comparison_data():
    """Return policy comparison data with summary statistics."""
    out = {}
    for policy, values in EVAL_DATA.items():
        arr = np.array(values, dtype=float)
        out[policy] = {
            "values": values,
            "mean":   round(float(arr.mean()), 2),
            "min":    round(float(arr.min()), 2),
            "max":    round(float(arr.max()), 2),
            "std":    round(float(arr.std()), 2),
            "q1":     round(float(np.percentile(arr, 25)), 2),
            "median": round(float(np.median(arr)), 2),
            "q3":     round(float(np.percentile(arr, 75)), 2),
        }
    return out
