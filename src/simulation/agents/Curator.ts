import { Agent, AgentAction, BaseAgent } from '../../models/Agent';
import { WorldState } from '../../models/WorldState';

export class Curator extends BaseAgent {
  constructor(id: string, name: string, personality: string) {
    super(id, name, 'curator', personality);
  }

  observe(worldState: WorldState): void {
    this.worldState = worldState;
    this.recordMemory(`Turn ${worldState.turn}: ${worldState.getArtworks().length} works in the collection.`);
  }

  think(): void {
    this.currentGoal = 'Build a compelling and diverse collection';
  }

  act(worldState: WorldState): AgentAction | null {
    const artwork = worldState.getArtworks().find((item) => item.status === 'submitted');
    if (!artwork) return null;
    return {
      agentId: this.id,
      type: 'curate_artwork',
      targetId: artwork.id,
      data: {},
      turn: worldState.turn,
    };
  }

  getState(): Agent {
    return super.getState();
  }
}
