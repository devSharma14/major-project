import os
import traci
import pickle

# ============================================================
# CONTROL PARAMETERS (OPTIMIZED TO REDUCE EXTREME WAIT TIMES)
# ============================================================
DECISION_INTERVAL = 3    # Faster response to queue changes
MIN_GREEN = 8            # Allow faster switching (still safe for clearance)
YELLOW_TIME = 3
ALL_RED_TIME = 1         # Reduce dead time
MAX_RED = 25             # Force switch earlier to prevent starvation
MAX_GREEN = 30           # Cap green time to prevent one-sided hogging
STARVATION_THRESHOLD = 15  # Override agent if red > this AND queue > 0

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
    tripinfo_path = os.path.join(os.path.dirname(sumo_cfg) or ".", "tripinfo.xml")
    cmd.extend([
        "-c", sumo_cfg,
        "--start",
        "--delay", "20",
        "--time-to-teleport", "900",
        "--tripinfo-output", tripinfo_path,
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

    # --- Pre-categorize lanes by direction ---
    ns_lanes = {}
    ew_lanes = {}
    for tls in tls_ids:
        logic = traci.trafficlight.getAllProgramLogics(tls)[0]
        ns_phase_idx = PHASE_MAP[tls][0]
        ew_phase_idx = PHASE_MAP[tls][1]
        ns_state = logic.phases[ns_phase_idx].state.lower()
        ew_state = logic.phases[ew_phase_idx].state.lower()
        
        all_lanes = traci.trafficlight.getControlledLanes(tls)
        ns_lanes[tls] = list(set(all_lanes[i] for i, c in enumerate(ns_state) if c == 'g'))
        ew_lanes[tls] = list(set(all_lanes[i] for i, c in enumerate(ew_state) if c == 'g'))

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

            # Get split queues
            q_ns = sum(traci.lane.getLastStepHaltingNumber(l) for l in ns_lanes[tls])
            q_ew = sum(traci.lane.getLastStepHaltingNumber(l) for l in ew_lanes[tls])

            # Discretize red timer (match traffic_env.py)
            current_red = red_timer[tls][current_action[tls]]
            red_bin = min(current_red // 5, 8)

            # Build state: (q_ns, q_ew, action, red_bin)
            state = (min(q_ns, 50), min(q_ew, 50), current_action[tls], red_bin)

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

            # --- ADAPTIVE OVERRIDE 1: Starvation safety net ---
            # If a direction has been red for > STARVATION_THRESHOLD and has
            # queued vehicles while the green direction is empty, force switch
            queue_by_action = {0: q_ns, 1: q_ew}
            for p in [0, 1]:
                if p != current_action[tls]:  # check the non-green direction
                    if (red_timer[tls][p] >= STARVATION_THRESHOLD
                            and queue_by_action[p] > 0
                            and queue_by_action[current_action[tls]] == 0
                            and green_timer[tls] >= MIN_GREEN):
                        action = p
                        target_phase = PHASE_MAP[tls][p]
                        red_timer[tls][p] = 0
                        break

            # --- ADAPTIVE OVERRIDE 2: Hard max-red cap ---
            for p in [0, 1]:
                if red_timer[tls][p] >= MAX_RED:
                    action = p
                    target_phase = PHASE_MAP[tls][p]
                    red_timer[tls][p] = 0
                    break

            # --- ADAPTIVE OVERRIDE 3: Max green cap ---
            # Prevent hogging: if green has run for MAX_GREEN, force switch
            if (green_timer[tls] >= MAX_GREEN
                    and queue_by_action[1 - current_action[tls]] > 0):
                other = 1 - current_action[tls]
                action = other
                target_phase = PHASE_MAP[tls][other]
                red_timer[tls][other] = 0

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
        steps=2000,
        gui=True
    )

    print("Evaluation results:", results)
