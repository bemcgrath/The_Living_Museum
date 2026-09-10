/**
 * SimulationEngine
 * 
 * Core orchestration for the museum simulation.
 * Executes the agent loop: OBSERVE -> THINK -> ACT -> MEMORY UPDATE
 * Then updates world state and generates events.
 */

import { WorldState } from '../models/WorldState';
import { Agent, AgentAction } from '../models/Agent';
import { BaseAgent } from '../models/Agent';

export class SimulationEngine {
  private worldState: WorldState;
  private agents: Map<string, BaseAgent> = new Map();
  private isRunning: boolean = false;
  private speed: number = 1; // turns per second

  constructor(worldState: WorldState) {
    this.worldState = worldState;
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
    this.worldState.addAgent(agent.getState());
  }

  setSimulationSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(speed, 5));
  }

  advanceTurn(): void {
    this.worldState.turn++;
    const actions: AgentAction[] = [];

    // Phase 1: OBSERVE - Each agent observes the world state
    for (const agent of this.agents.values()) {
      agent.observe(this.worldState);
    }

    // Phase 2: THINK - Each agent determines its goal and strategy
    for (const agent of this.agents.values()) {
      agent.think();
    }

    // Phase 3: ACT - Each agent performs an action
    for (const agent of this.agents.values()) {
      const action = agent.act(this.worldState);
      if (action) {
        actions.push(action);
      }
    }

    // Phase 4: Process all actions and update world state
    this.processActions(actions);

    // Phase 5: Update agent state in world
    for (const agent of this.agents.values()) {
      this.worldState.updateAgent(agent.getState());
    }

    // Phase 6: Update movement prominence
    this.updateMovements();
  }

  private processActions(actions: AgentAction[]): void {
    actions.forEach((action) => {
      // Actions will be handled by specific agent types
      // This is the extension point for simulation logic
    });
  }

  private updateMovements(): void {
    // Calculate movement prominence based on displayed artworks
    const movements = this.worldState.getMovements();
    movements.forEach((movement) => {
      const artworksInMovement = this.worldState
        .getArtworks()
        .filter((w) => w.style === movement.style && w.status === 'displayed');

      movement.artworkCount = artworksInMovement.length;

      if (artworksInMovement.length > 0) {
        const totalScore = artworksInMovement.reduce(
          (sum, w) => sum + (w.criticScore ?? 0),
          0
        );
        movement.averageScore = totalScore / artworksInMovement.length;
        movement.prominence = Math.min(
          100,
          20 + artworksInMovement.length * 5 + movement.averageScore * 2
        );
      } else {
        movement.prominence = Math.max(0, movement.prominence - 2);
      }

      this.worldState.updateMovement(movement);
    });
  }

  start(): void {
    this.isRunning = true;
  }

  pause(): void {
    this.isRunning = false;
  }

  reset(): void {
    this.worldState.reset();
    this.isRunning = false;
  }

  getWorldState(): WorldState {
    return this.worldState;
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  getSpeed(): number {
    return this.speed;
  }
}
