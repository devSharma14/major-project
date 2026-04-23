import random

def run_random_policy(env, num_episodes=100):
    rewards = []

    for _ in range(num_episodes):
        states = env.reset()
        done = False
        total_reward = 0

        while not done:
            actions = {
                i: random.randint(0, env.action_size - 1)
                for i in env.intersection_ids
            }

            next_states, reward_dict, done, _ = env.step(actions)

            total_reward += sum(reward_dict.values())
            states = next_states

        avg_reward = total_reward / env.envs[0].timestep
        rewards.append(avg_reward)

    return sum(rewards) / len(rewards)

def run_fixed_time_policy(env, switch_interval=10, num_episodes=100):
    rewards = []

    for _ in range(num_episodes):
        states = env.reset()
        done = False
        total_reward = 0
        phase = 0

        while not done:
            if env.envs[0].timestep % switch_interval == 0:
                phase = 1 - phase  # toggle

            actions = {i: phase for i in env.intersection_ids}

            next_states, reward_dict, done, _ = env.step(actions)

            total_reward += sum(reward_dict.values())
            states = next_states

        avg_reward = total_reward / env.envs[0].timestep
        rewards.append(avg_reward)

    return sum(rewards) / len(rewards)
