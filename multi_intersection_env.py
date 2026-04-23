from traffic_env import TrafficIntersectionEnv

class MultiIntersectionEnv:
    def __init__(self, n=4, global_reward_weight=0.25):
        self.n = n
        self.global_reward_weight = global_reward_weight
        self.envs = [TrafficIntersectionEnv() for _ in range(n)]


    def reset(self):
        states = {}
        for i, env in enumerate(self.envs):
            obs, _ = env.reset()
            states[i] = tuple(obs)
        return states

    def step(self, actions):
        next_states = {}
        rewards = {}
        dones = {}

        for i, env in enumerate(self.envs):
            obs, reward, terminated, truncated, _ = env.step(actions[i])
            next_states[i] = tuple(obs)
            rewards[i] = reward
            dones[i] = terminated or truncated

        done = all(dones.values())

        global_reward = sum(rewards.values())

        for i in rewards:
            rewards[i] += self.global_reward_weight * global_reward



        return next_states, rewards, done
