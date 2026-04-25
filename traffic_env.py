import numpy as np
import pickle
from gymnasium import Env
from gymnasium.spaces import Discrete, Box


#                TRAFFIC ENVIRONMENT

class TrafficIntersectionEnv(Env):
    metadata = {"render_modes": []}
    def _get_obs(self):
        # Discretize red_timer into 5-step buckets, capped at 40s (8 buckets)
        red_bin = min(self.red_timer // 5, 8)
        return np.array([self.queue_NS, self.queue_EW, self.phase, red_bin], dtype=np.int32)
    def __init__(self):
        super().__init__()

        # Action = “Should I switch?”
        # 0 → Keep current phase
        # 1 → Request switch

        self.action_space = Discrete(2)
        self.min_green = 8
        self.phase_timer = 0
        self.max_red = 25
        self.red_timer = 0

        self.observation_space = Box(
            low=np.array([0,0,0,0]),
            high=np.array([50,50,2,8]),
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

        # per-direction cumulative wait (for max-wait penalty)
        self.wait_NS = 0
        self.wait_EW = 0

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
        self.wait_NS = 0
        self.wait_EW = 0
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

        # ----------------------------
        # Dynamic Arrival Rates (Mimic peak shifts)
        # ----------------------------
        progress = self.timestep / 500  # max_steps is 500
        if progress < 0.3:
            # Phase 1: Balanced (Base)
            self.arrival_rate_NS = 0.3
            self.arrival_rate_EW = 0.3
        elif progress < 0.65:
            # Phase 2: NS Peak
            self.arrival_rate_NS = 0.9
            self.arrival_rate_EW = 0.2
        else:
            # Phase 3: EW Peak
            self.arrival_rate_NS = 0.2
            self.arrival_rate_EW = 0.9

        # spawn vehicles
        if np.random.rand() < self.arrival_rate_NS:
            self.queue_NS += 1
        if np.random.rand() < self.arrival_rate_EW:
            self.queue_EW += 1

        # vehicles pass ONLY during green
        if self.phase == 0:      # NS green
            self.queue_NS = max(0, self.queue_NS - self.pass_rate)
            self.wait_NS = 0     # reset wait counter on green
        elif self.phase == 1:    # EW green
            self.queue_EW = max(0, self.queue_EW - self.pass_rate)
            self.wait_EW = 0     # reset wait counter on green
        # phase == YELLOW → nobody moves

        # accumulate per-direction wait (vehicles waiting per tick)
        if self.phase != 0:
            self.wait_NS += self.queue_NS
        if self.phase != 1:
            self.wait_EW += self.queue_EW


        # ----------------------------
        # Reward
        # ----------------------------

        # 1. Squared queue penalty (heavily penalizes large backups)
        reward = -0.05 * (self.queue_NS**2 + self.queue_EW**2)

        # 2. Starvation penalty (flat -10 if red for > 30s)
        if self.red_timer > 30:
            reward -= 10.0

        # 3. Max-wait penalty — penalize the worst-off direction
        max_wait = max(self.wait_NS, self.wait_EW)
        if max_wait > 30:
            reward -= 0.1 * (max_wait - 30)
        
        # 4. Switching penalty (to prevent jittering)
        switch_penalty = -2.0 if self.phase == self.YELLOW and prev_phase != self.YELLOW else 0.0
        reward += switch_penalty

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
