from marl_trainer import MARLTrainer
import pickle

if __name__ == "__main__":
    trainer = MARLTrainer(
        n_agents=4,
        episodes=3000,
        max_steps=500
    )

    trainer.train()
    trainer.evaluate(episodes=5)
    with open("trained_agents.pkl", "wb") as f:
        pickle.dump(trainer.agents, f)
