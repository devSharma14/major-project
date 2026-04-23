import urllib.request, json

base = "http://127.0.0.1:5000"

# Metrics
with urllib.request.urlopen(base + "/api/metrics") as r:
    d = json.loads(r.read())
    print("=== METRICS ===")
    print("available    :", d["available"])
    s = d.get("stats", {})
    print("episodes     :", s.get("total_episodes"))
    print("best_reward  :", s.get("best_reward"))
    print("mean_reward  :", s.get("mean_reward"))
    print("recent_mean  :", s.get("recent_mean"))
    print("raw sample   :", d["raw"][:3])
    print()

# Agents
with urllib.request.urlopen(base + "/api/agents") as r:
    d = json.loads(r.read())
    print("=== AGENTS ===")
    print("available:", d["available"])
    for a in d.get("agents", []):
        print(f"  {a['name']}: eps={a['epsilon']}  Q-states={a['q_table_size']}")
    print()

# Comparison
with urllib.request.urlopen(base + "/api/comparison") as r:
    d = json.loads(r.read())
    print("=== COMPARISON ===")
    for k, v in d.items():
        print(f"  {k}: mean={v['mean']}  min={v['min']}  max={v['max']}")
    print()

print("All endpoints OK!")
