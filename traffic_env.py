import numpy as np
import pickle
from gymnasium import Env
from gymnasium.spaces import Discrete, Box


#                TRAFFIC ENVIRONMENT

class TrafficIntersectionEnv(Env):
    metadata = {"render_modes": []}
    def _get_obs(self):
        return np.array([self.queue_NS, self.queue_EW, self.phase], dtype=np.int32)
    def __init__(self):
        super().__init__()

        # Action = “Should I switch?”
        # 0 → Keep current phase
        # 1 → Request switch

        self.action_space = Discrete(2)
        self.min_green = 5
        self.phase_timer = 0
        self.max_red = 20
        self.red_timer = 0

        self.observation_space = Box(
            low=np.array([0,0,0]),
            high=np.array([50,50,3]),
            dtype=np.int32
        )

        # internal states
        self.queue_NS = 0
        self.queue_EW = 0
        self.phase = 0      
        self.timestep = 0
        self.YELLOW = 2
        self.yellow_time = 2
        self.yellow_timer = 0
        self.next_phase = None

        # stats
        self.total_waiting_time = 0

        # config
        self.arrival_rate_NS = 0.9
        self.arrival_rate_EW = 0.1
        self.pass_rate = 2



    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.queue_NS = 0
        self.queue_EW = 0
        self.phase = 0
        self.timestep = 0
        self.total_waiting_time = 0
        self.phase_timer = 0
        self.red_timer = 0
        return self._get_obs(), {}



    def step(self, action):
        self.timestep += 1

        # clip queues to observation bounds
        self.queue_NS = np.clip(self.queue_NS, 0, 50)
        self.queue_EW = np.clip(self.queue_EW, 0, 50)

        prev_phase = self.phase

        # ----------------------------
        # Phase control logic
        # ----------------------------

        # If currently in yellow, count it down
        if self.phase == self.YELLOW:
            self.yellow_timer += 1

            if self.yellow_timer >= self.yellow_time:
                # transition from yellow to target green
                self.phase = self.next_phase
                self.phase_timer = 0
                self.red_timer = 0
                self.yellow_timer = 0
                self.next_phase = None

        else:
            # not in yellow → normal control
            self.red_timer += 1

            if action != self.phase:
                if self.phase_timer >= self.min_green:
                    # initiate yellow phase
                    self.phase = self.YELLOW
                    self.next_phase = action
                    self.yellow_timer = 0
                else:
                    self.phase_timer += 1
            else:
                self.phase_timer += 1

            # force switch if max-red exceeded
            if self.red_timer >= self.max_red and self.phase_timer >= self.min_green:
                self.phase = self.YELLOW
                self.next_phase = 1 - prev_phase
                self.yellow_timer = 0

        # ----------------------------
        # Traffic dynamics
        # ----------------------------

        # spawn vehicles
        if np.random.rand() < self.arrival_rate_NS:
            self.queue_NS += 1
        if np.random.rand() < self.arrival_rate_EW:
            self.queue_EW += 1

        # vehicles pass ONLY during green
        if self.phase == 0:      # NS green
            self.queue_NS = max(0, self.queue_NS - self.pass_rate)
        elif self.phase == 1:    # EW green
            self.queue_EW = max(0, self.queue_EW - self.pass_rate)
        # phase == YELLOW → nobody moves


        # ----------------------------
        # Reward
        # ----------------------------

        switch_penalty = -0.2 if self.phase != prev_phase else 0.0
        reward = -0.1 * (self.queue_NS + self.queue_EW)

        # stats
        self.total_waiting_time += (self.queue_NS + self.queue_EW)

        terminated = False
        truncated = False

        return self._get_obs(), reward, terminated, truncated, {}

        # --------------------------------------------------------



    def render(self):
        print(
            f"t={self.timestep} | "
            f"Phase={self.phase} | "
            f"NS={self.queue_NS} EW={self.queue_EW}"
        )

    def close(self):
        pass
