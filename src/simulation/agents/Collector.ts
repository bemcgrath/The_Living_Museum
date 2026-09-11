import { Agent, AgentAction, BaseAgent } from '../../models/Agent';
import { WorldState } from '../../models/WorldState';
import { RandomGenerator } from '../../utils/RandomGenerator';

export class Collector extends BaseAgent {
  private readonly seed: number;

  constructor(id: string, name: string, personality: string, seed: number) {
    super(id, name, 'collector', personality);
    this.seed = seed;
  }

  observe(worldState: WorldState): void {
    this.worldState = worldState;
    this.recordMemory(`Turn ${worldState.turn}: ${worldState.getArtworks().filter((artwork) => artwork.status === 'displayed').length} displayed works available.`);
  }

  think(): void {
    this.currentGoal = 'Acquire promising work before its value rises';
  }

  act(worldState: WorldState): AgentAction | null {
    const minimumScore = this.personality.toLowerCase().includes('speculative') ? 45 : 65;
    const artwork = worldState.getArtworks()
      .filter((item) => item.status === 'displayed')
      .filter((item) => (item.criticScore ?? 0) >= minimumScore)
      .sort((left, right) => (right.criticScore ?? 0) - (left.criticScore ?? 0))[0];
    const turnRng = new RandomGenerator(this.seed + worldState.turn * 1009);
    if (!artwork || !turnRng.randomBool(0.45)) return null;
    return {
      agentId: this.id,
      type: 'acquire_artwork',
      targetId: artwork.id,
      data: {},
      turn: worldState.turn,
    };
  }

  getState(): Agent {
    return super.getState();
  }
}
