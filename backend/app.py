"""
MARL Traffic Signal Control — Flask Backend
Serves metrics, agent state, and plot images to the frontend dashboard.

Run:
    pip install flask flask-cors
    python backend/app.py
"""

import os
import sys
import base64
from flask import Flask, jsonify, send_from_directory, abort
from flask_cors import CORS

# Make sure we can import from backend/api/
sys.path.insert(0, os.path.dirname(__file__))

from api.metrics import (
    get_training_metrics,
    get_agent_status,
    get_comparison_data,
    HYPERPARAMS,
    ENV_CONFIG,
    SUMO_CONFIG,
)
from api.sumo_waiting import get_waiting_time

# -------------------------------------------------------
# Paths
# -------------------------------------------------------
ROOT         = os.path.join(os.path.dirname(__file__), "..")
PLOTS_DIR    = os.path.join(ROOT, "plots")

# Serve the built React bundle (frontend/dist) if it exists; fall back to the
# source index.html for the Vite dev workflow.
FRONTEND_DIST = os.path.join(ROOT, "frontend", "dist")
FRONTEND_SRC  = os.path.join(ROOT, "frontend")
FRONTEND_DIR  = FRONTEND_DIST if os.path.isdir(FRONTEND_DIST) else FRONTEND_SRC

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)  # allow the Vite dev server on :5173 to call /api


# -------------------------------------------------------
# Frontend – serve index.html at /
# -------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


# -------------------------------------------------------
# API – Training metrics
# -------------------------------------------------------
@app.route("/api/metrics")
def api_metrics():
    data = get_training_metrics()
    return jsonify(data)


# -------------------------------------------------------
# API – Per-agent status
# -------------------------------------------------------
@app.route("/api/agents")
def api_agents():
    data = get_agent_status()
    return jsonify(data)


# -------------------------------------------------------
# API – Policy comparison
# -------------------------------------------------------
@app.route("/api/comparison")
def api_comparison():
    data = get_comparison_data()
    return jsonify(data)


# -------------------------------------------------------
# API – Hyperparameters & config
# -------------------------------------------------------
@app.route("/api/config")
def api_config():
    return jsonify({
        "hyperparams": HYPERPARAMS,
        "env_config":  ENV_CONFIG,
        "sumo_config": SUMO_CONFIG,
    })


# -------------------------------------------------------
# API – SUMO per-vehicle waiting time (parsed from tripinfo.xml)
# -------------------------------------------------------
@app.route("/api/sumo/waiting-time")
def api_sumo_waiting():
    return jsonify(get_waiting_time())


# -------------------------------------------------------
# API – Plot images (base64)  GET /api/plots/<name>
# Allowed names: training_reward | eval_comparison | reward_raw | reward_moving_avg
# -------------------------------------------------------
PLOT_FILES = {
    "training_reward":  "marl_training_reward.png",
    "eval_comparison":  "eval_comparison.png",
    "reward_raw":       "reward_raw.png",
    "reward_moving_avg":"reward_moving_avg.png",
}

@app.route("/api/plots/<name>")
def api_plot(name):
    filename = PLOT_FILES.get(name)
    if not filename:
        abort(404, description=f"Unknown plot '{name}'. Available: {list(PLOT_FILES.keys())}")

    path = os.path.join(PLOTS_DIR, filename)
    if not os.path.exists(path):
        return jsonify({"available": False, "name": name}), 200

    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")

    return jsonify({
        "available": True,
        "name":      name,
        "filename":  filename,
        "data":      f"data:image/png;base64,{data}",
    })


# -------------------------------------------------------
# Entry point
# -------------------------------------------------------
if __name__ == "__main__":
    print("=" * 55)
    print("  MARL Traffic Dashboard — Backend Server")
    print("  Dashboard -> http://127.0.0.1:5000")
    print("=" * 55)
    app.run(debug=True, port=5000, host="0.0.0.0")
