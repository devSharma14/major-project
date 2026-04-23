import matplotlib.pyplot as plt
import numpy as np
import os

os.makedirs("plots", exist_ok=True)

# Replace these with your actual numbers
random_policy = [-1600, -1500, -1700, -1550, -1650]
independent_iql = [-1200, -1350, -1000, -1600, -1100]
cooperative_iql = [-597, -627, -718, -1446, -652]

labels = ["Random", "Independent IQL", "Cooperative IQL"]
data = [
    random_policy,
    independent_iql,
    cooperative_iql
]

plt.figure()
plt.boxplot(data, labels=labels, showmeans=True)

plt.ylabel("Evaluation Reward (lower is worse)")
plt.title("Evaluation Performance Comparison")
plt.grid(True)

plt.savefig("plots/eval_comparison.png")
plt.close()

print("Saved plots/eval_comparison.png")
