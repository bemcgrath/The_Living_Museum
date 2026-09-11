import { Agent, AgentAction, BaseAgent } from '../../models/Agent';
import { WorldState } from '../../models/WorldState';

export class Historian extends BaseAgent {
  constructor(id: string, name: string, personality: string) {
    super(id, name, 'historian', personality);
  }

  observe(worldState: WorldState): void {
    this.worldState = worldState;
    const events = worldState.getEvents();
    this.recordMemory(`Turn ${worldState.turn}: documented ${events.length} events and ${worldState.getMovements().length} movements.`);
  }

  think(): void {
    this.currentGoal = 'Identify turning points in the museum narrative';
  }

  act(worldState: WorldState): AgentAction | null {
    const latest = worldState.getEvents().slice().reverse().find((event) => event.agent !== this.id && !event.eventType.startsWith('historian_'));
    if (!latest) return null;
    const noteworthy = ['artwork_acquired', 'artwork_rejected', 'movement_emerged'].includes(latest.eventType);
    const milestoneKey = `${latest.turn}:${latest.eventType}:${latest.data?.artworkId ?? latest.data?.movementId ?? latest.description}`;
    if ((!noteworthy && worldState.turn % 5 !== 0) || worldState.getHistoricalEvents().some((event) => event.data?.milestoneKey === milestoneKey)) return null;
    const prefix = latest.eventType === 'movement_emerged'
      ? 'A new artistic movement emerged'
      : latest.eventType === 'artwork_acquired'
        ? 'A collector signaled a breakthrough'
        : latest.eventType === 'artwork_rejected'
          ? 'A rejection marked a moment of friction'
          : 'The museum recorded a developing pattern';
    return {
      agentId: this.id,
      type: 'record_observation',
      data: {
        description: `${prefix}: ${latest.description}`,
        eventType: noteworthy ? 'historian_milestone' : 'historian_note',
        milestoneKey,
      },
      turn: worldState.turn,
    };
  }

  getState(): Agent {
    return super.getState();
  }
}
