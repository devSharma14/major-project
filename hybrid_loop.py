from marl_trainer import MARLTrainer
from sumo_eval import run_sumo_eval

GLOBAL_REWARD_WEIGHT = 0.25

for outer in range(3):   # 3 hybrid rounds is enough
    print(f"\n=== HYBRID ROUND {outer} ===")

    trainer = MARLTrainer(
        n_agents=4,
        episodes=300,
        max_steps=200
    )

    trainer.env.global_reward_weight = GLOBAL_REWARD_WEIGHT
    trainer.train()

    metrics = run_sumo_eval(
        agent=trainer.agents[3],   # one agent is enough
        sumo_cfg="intersection.sumocfg"
    )

    print("SUMO metrics:", metrics)

    # Simple heuristic adjustment
    if metrics["avg_queue"] > 10:
        GLOBAL_REWARD_WEIGHT += 0.05
    else:
        GLOBAL_REWARD_WEIGHT -= 0.02

    GLOBAL_REWARD_WEIGHT = max(0.1, min(GLOBAL_REWARD_WEIGHT, 0.5))
