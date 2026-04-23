import numpy as np
from multi_intersection_env import MultiIntersectionEnv
from q_learning_agent import QLearningAgent

class MARLTrainer:
    def __init__(
        self,
        n_agents=4,
        episodes=1000,
        max_steps=200,
        epsilon_start=1.0,
        epsilon_min=0.05,
        epsilon_decay=0.995
    ):
        self.n_agents = n_agents
        self.episodes = episodes
        self.max_steps = max_steps

        # Environment
        self.env = MultiIntersectionEnv(n=n_agents)

        # Agents
        self.agents = {
            i: QLearningAgent(
                state_size=4,
                action_size=2,
                agent_id=i
            )
            for i in range(self.n_agents)
        }


        self.episode_rewards = []

    def train(self):
        print(f"Starting MARL training with {self.n_agents} agents")

        for ep in range(self.episodes):
            states = self.env.reset()
            done = False
            step = 0
            episode_reward = 0.0

            while not done and step < self.max_steps:
                # --- select actions ---
                actions = {
                    i: self.agents[i].select_action(states[i])
                    for i in self.agents
                }

                # --- environment step ---
                next_states, rewards, done = self.env.step(actions)

                # --- learning ---
                for i in self.agents:
                    self.agents[i].update(
                        states[i],
                        actions[i],
                        rewards[i],
                        next_states[i]
                    )
                    episode_reward += rewards[i]

                states = next_states
                step += 1

            self.episode_rewards.append(episode_reward)

            # --- logging ---
            if ep % 10 == 0:
                eps = {i: round(a.epsilon, 3) for i, a in self.agents.items()}
                print(
                    f"Episode {ep:4d} | "
                    f"Steps: {step:3d} | "
                    f"Total Reward: {episode_reward:.2f} | "
                    f"Epsilons: {eps}"
                )

        print("Training complete")

    def evaluate(self, episodes=5):
        print("Evaluating trained agents (epsilon = 0)")

        for agent in self.agents.values():
            agent.epsilon = 0.0

        for ep in range(episodes):
            states = self.env.reset()
            done = False
            step = 0
            total_reward = 0.0

            while not done and step < self.max_steps:
                actions = {
                    i: self.agents[i].select_action(states[i])
                    for i in self.agents
                }

                next_states, rewards, done = self.env.step(actions)

                total_reward += sum(rewards.values())
                states = next_states
                step += 1

            print(f"[EVAL] Episode {ep} | Reward: {total_reward:.2f}")
        np.savetxt("episode_rewards.csv", self.episode_rewards)
