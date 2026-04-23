from q_learning_agent import QLearningAgent

def build_agents(env):
    agents = {}
    for i in env.intersection_ids:
        agents[i] = QLearningAgent(
            state_size=env.state_size,
            action_size=env.action_size,
            agent_id=i
        )
    return agents
