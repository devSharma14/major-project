import traci
import pickle

# ============================================================
# CONTROL PARAMETERS (OPTIMIZED FOR REDUCED TELEPORTATIONS)
# ============================================================
DECISION_INTERVAL = 5    # Reduced from 10 for faster response
MIN_GREEN = 10           # Reduced from 15 for faster adaptation
YELLOW_TIME = 3
ALL_RED_TIME = 2
MAX_RED = 40             # Slightly reduced for better fairness

# ============================================================
# PHASE MAPS - CORRECTED TO MATCH ACTUAL net.net.xml
# ============================================================
# From net.net.xml analysis:
# J1: 6 phases - phase 0,1 = NS direction; phase 4,5 = EW direction
# J2: 6 phases - phase 0,1,2 = NS direction; phase 3,4,5 = turn phases
# J3: 6 phases - phase 0,1 = EW direction; phase 2,3 = NS direction  
# J4: 4 phases - phase 0,1 = through; phase 2,3 = turn

# Agent action 0 = NS green, action 1 = EW green
PHASE_MAP = {
    "J1": {0: 0, 1: 4},   # NS green = phase 0, EW green = phase 4
    "J2": {0: 0, 1: 3},   # NS green = phase 0, EW/turn = phase 3
    "J3": {0: 2, 1: 0},   # NS green = phase 2, EW green = phase 0
    "J4": {0: 0, 1: 2},   # through = phase 0, turn = phase 2
}

# Yellow phases (the phase index to use before switching)
YELLOW_MAP = {
    "J1": {0: 1, 1: 5},   # yellow after NS = 1, yellow after EW = 5
    "J2": {0: 1, 1: 4},   # yellow phases
    "J3": {0: 3, 1: 1},   # yellow phases
    "J4": {0: 1, 1: 3},   # yellow phases
}


# ============================================================
# MAIN EVAL LOOP
# ============================================================
def run_sumo_eval(agents, tls_to_agent, sumo_cfg, steps=2000, gui=True):

    cmd = ["sumo-gui" if gui else "sumo"]
    cmd.extend([
        "-c", sumo_cfg,
        "--start",
        "--delay", "20",
        "--time-to-teleport", "900"
    ])
    
    traci.start(cmd)

    tls_ids = traci.trafficlight.getIDList()

    # --------------------------------------------------------
    # Timers
    # --------------------------------------------------------
    green_timer = {tls: 0 for tls in tls_ids}
    red_timer = {tls: {0: 0, 1: 0} for tls in tls_ids}
    yellow_timer = {tls: 0 for tls in tls_ids}
    pending_phase = {tls: None for tls in tls_ids}
    current_action = {tls: 0 for tls in tls_ids}  # Track current action per TLS

    total_wait = 0
    total_queue = 0
    prev_wait = {}
    teleport_count = 0

    for step in range(steps):
        traci.simulationStep()
        
        # Track teleportations
        teleport_count += traci.simulation.getStartingTeleportNumber()

        # -------------------------------
        # METRICS
        # -------------------------------
        for veh in traci.vehicle.getIDList():
            w = traci.vehicle.getAccumulatedWaitingTime(veh)
            total_wait += w - prev_wait.get(veh, 0)
            prev_wait[veh] = w

        # Queue counting - use edges for consistency with fixed-time baseline
        total_queue += sum(
            traci.edge.getLastStepHaltingNumber(e)
            for e in traci.edge.getIDList()
        )

        # -------------------------------
        # CONTROL
        # -------------------------------
        for tls in tls_ids:

            # handle yellow / all-red countdown
            if yellow_timer[tls] > 0:
                yellow_timer[tls] -= 1
                if yellow_timer[tls] == 0 and pending_phase[tls] is not None:
                    traci.trafficlight.setPhase(tls, pending_phase[tls])
                    pending_phase[tls] = None
                    green_timer[tls] = 0
                continue

            green_timer[tls] += 1

            # Only make decisions at intervals
            if step % DECISION_INTERVAL != 0:
                continue

            agent = agents[tls_to_agent[tls]]

            # Get queue for controlled lanes
            lanes = traci.trafficlight.getControlledLanes(tls)
            queue = sum(traci.lane.getLastStepHaltingNumber(l) for l in lanes)

            # Build state: (queue_binned, current_action)
            state = (min(queue, 50), current_action[tls])

            # Get action from agent
            action = agent.select_action(state)
            target_phase = PHASE_MAP[tls][action]

            current_sumo_phase = traci.trafficlight.getPhase(tls)

            # Update red timers for starvation prevention
            for p in [0, 1]:
                if p == action:
                    red_timer[tls][p] = 0
                else:
                    red_timer[tls][p] += DECISION_INTERVAL

            # FORCE SWITCH IF ONE DIRECTION IS STARVING
            for p in [0, 1]:
                if red_timer[tls][p] >= MAX_RED:
                    action = p
                    target_phase = PHASE_MAP[tls][p]
                    red_timer[tls][p] = 0
                    break

            # Only switch if we've met minimum green and need different phase
            if green_timer[tls] >= MIN_GREEN and target_phase != current_sumo_phase:
                # Transition through yellow
                yellow_phase = YELLOW_MAP[tls][current_action[tls]]
                traci.trafficlight.setPhase(tls, yellow_phase)
                yellow_timer[tls] = YELLOW_TIME + ALL_RED_TIME
                pending_phase[tls] = target_phase
                current_action[tls] = action
                green_timer[tls] = 0

    traci.close()

    return {
        "avg_wait": total_wait / steps,
        "avg_queue": total_queue / steps,
        "teleportations": teleport_count
    }


# ============================================================
# ENTRY
# ============================================================
if __name__ == "__main__":

    print("Starting MARL SUMO evaluation (optimized)...")

    with open("trained_agents.pkl", "rb") as f:
        agents = pickle.load(f)

    for agent in agents.values():
        agent.epsilon = 0.0

    tls_to_agent = {
        "J1": 0,
        "J2": 1,
        "J3": 2,
        "J4": 3
    }

    results = run_sumo_eval(
        agents,
        tls_to_agent,
        "./sumo/intersection.sumocfg",
        steps=2000
    )

    print("Evaluation results:", results)
