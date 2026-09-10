/**
 * Agent Model
 * 
 * Base interface for all agent types.
 * Defines the core structure of an agent and its decision-making loop.
 */

export type AgentRole = 
  | 'artist' 
  | 'curator' 
  | 'critic' 
  | 'collector' 
  | 'rebel_artist'
  | 'historian';

export interface AgentMemory {
  observations: string[];
  pastActions: string[];
  successfulPatterns: string[];
  failurePatterns: string[];
}

export interface AgentDecision {
  observation: string;
  goal: string;
  reasoning: string;
  action: string;
  result: string;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  personality: string;
  reputation: number;
  currentGoal: string;
  memory: AgentMemory;
  lastDecision: AgentDecision | null;
  relationships: Map<string, number>; // agentId -> relationship score
}

export interface AgentAction {
  agentId: string;
  type: string;
  targetId?: string;
  data: Record<string, unknown>;
  turn: number;
}

export abstract class BaseAgent {
  id: string;
  name: string;
  role: AgentRole;
  personality: string;
  reputation: number;
  currentGoal: string;
  memory: AgentMemory;
  lastDecision: AgentDecision | null;
  relationships: Map<string, number>;

  constructor(
    id: string,
    name: string,
    role: AgentRole,
    personality: string
  ) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.personality = personality;
    this.reputation = 50;
    this.currentGoal = '';
    this.memory = {
      observations: [],
      pastActions: [],
      successfulPatterns: [],
      failurePatterns: [],
    };
    this.lastDecision = null;
    this.relationships = new Map();
  }

  abstract observe(worldState: unknown): void;
  abstract think(): void;
  abstract act(worldState: unknown): AgentAction | null;

  protected recordMemory(observation: string): void {
    this.memory.observations.push(observation);
    if (this.memory.observations.length > 20) {
      this.memory.observations.shift();
    }
  }

  protected recordAction(action: string): void {
    this.memory.pastActions.push(action);
    if (this.memory.pastActions.length > 20) {
      this.memory.pastActions.shift();
    }
  }

  recordDecision(decision: AgentDecision): void {
    this.lastDecision = decision;
  }

  getState(): Agent {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      personality: this.personality,
      reputation: this.reputation,
      currentGoal: this.currentGoal,
      memory: this.memory,
      lastDecision: this.lastDecision,
      relationships: this.relationships,
    };
  }
}
