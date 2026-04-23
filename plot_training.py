import numpy as np
import matplotlib.pyplot as plt
import os

os.makedirs("plots", exist_ok=True)

# load rewards (or import trainer and access directly)
episode_rewards = np.loadtxt("episode_rewards.csv")

# moving average smoothing
def moving_average(x, window=20):
    return np.convolve(x, np.ones(window)/window, mode="valid")

smoothed = moving_average(episode_rewards, window=20)

plt.figure()
plt.plot(episode_rewards, alpha=0.3, label="Raw Reward")
plt.plot(
    range(len(smoothed)),
    smoothed,
    linewidth=2,
    label="Smoothed (window=20)"
)

plt.xlabel("Episode")
plt.ylabel("Total Reward (sum over agents)")
plt.title("MARL Training Reward Progress")
plt.legend()
plt.grid(True)

plt.savefig("plots/marl_training_reward.png")
plt.close()

print("Saved plots/marl_training_reward.png")
