import gymnasium as gym
import traffic_env_gym

env = gym.make("TrafficIntersection-v0")
env = gym.wrappers.TimeLimit(env, max_episode_steps=200)
env = gym.wrappers.RecordEpisodeStatistics(env)

obs, info = env.reset()
done = False

while not done:
    # random or fixed action
    action = env.action_space.sample()

    obs, reward, terminated, truncated, info = env.step(action)
    done = terminated or truncated

    print(
        f"t={env.unwrapped.timestep:3d} | "
        f"Phase={env.unwrapped.phase} | "
        f"NS={env.unwrapped.queue_NS:2d} "
        f"EW={env.unwrapped.queue_EW:2d}"
    )


env.close()
