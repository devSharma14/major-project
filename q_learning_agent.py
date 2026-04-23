from collections import defaultdict
import numpy as np
import random

class QLearningAgent:
    def __init__(
        self,
        state_size,
        action_size,
        agent_id=None,
        alpha=0.1,
        gamma=0.99,
        epsilon=1.0,
        epsilon_min=0.05,
        epsilon_decay=0.995
    ):
        self.state_size = state_size
        self.action_size = action_size
        self.agent_id = agent_id

        self.alpha = alpha
        self.gamma = gamma

        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay

        self.q_table = {}


    def select_action(self, state):
        if state not in self.q_table:
            self.q_table[state] = np.zeros(self.action_size)

        if np.random.rand() < self.epsilon:
            action = np.random.randint(self.action_size)
        else:
            action = np.argmax(self.q_table[state])

        # ✅ epsilon decay (THIS WAS MISSING)
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)

        return action


    def update(self, state, action, reward, next_state):
        # Initialize state if unseen
        if state not in self.q_table:
            self.q_table[state] = np.zeros(self.action_size)

        # Initialize next_state if unseen  ✅ THIS FIXES THE ERROR
        if next_state not in self.q_table:
            self.q_table[next_state] = np.zeros(self.action_size)

        best_next = np.max(self.q_table[next_state])

        td_target = reward + self.gamma * best_next
        td_error = td_target - self.q_table[state][action]

        self.q_table[state][action] += self.alpha * td_error

    def decay_epsilon(self, min_eps=0.05, decay=0.999):
        self.epsilon = max(min_eps, self.epsilon * decay)
