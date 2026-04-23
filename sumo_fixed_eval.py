import traci

def run_fixed_gui(sumo_cfg, steps=2000, gui=False):
    cmd = ["sumo-gui" if gui else "sumo"]
    cmd.extend([
        "-c", sumo_cfg,
        "--start",
        "--delay", "20",
        "--time-to-teleport", "900"
    ])
    
    traci.start(cmd)

    total_wait = 0.0
    total_queue = 0
    prev_wait = {}
    teleport_count = 0

    for _ in range(steps):
        traci.simulationStep()
        
        # Track teleportations
        teleport_count += traci.simulation.getStartingTeleportNumber()

        # -------------------------------
        # VEHICLE-BASED WAITING TIME
        # -------------------------------
        for veh in traci.vehicle.getIDList():
            w = traci.vehicle.getAccumulatedWaitingTime(veh)
            total_wait += w - prev_wait.get(veh, 0)
            prev_wait[veh] = w

        # -------------------------------
        # QUEUE (ALL EDGES)
        # -------------------------------
        total_queue += sum(
            traci.edge.getLastStepHaltingNumber(e)
            for e in traci.edge.getIDList()
        )

    traci.close()

    return {
        "avg_wait": total_wait / steps,
        "avg_queue": total_queue / steps,
        "teleportations": teleport_count
    }


# -------------------------------
# ENTRY POINT
# -------------------------------
if __name__ == "__main__":
    print("Starting FIXED-TIME evaluation (GUI)...")

    results = run_fixed_gui(
        sumo_cfg="./sumo/intersection.sumocfg",
        steps=2000
    )

    print("Fixed-time results:", results)
