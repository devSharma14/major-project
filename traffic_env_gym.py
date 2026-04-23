from gymnasium.envs.registration import register

register(
    id="TrafficIntersection-v0",
    entry_point="traffic_env:TrafficIntersectionEnv",
)
