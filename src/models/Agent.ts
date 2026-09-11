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
  primaryStyle?: string;
}

export interface AgentAction {
  agentId: string;
  type: AgentActionType;
  targetId?: string;
  data: Record<string, unknown>;
  turn: number;
}

export type AgentActionType =
  | 'submit_artwork'
  | 'review_artwork'
  | 'curate_artwork'
  | 'acquire_artwork'
  | 'record_observation';

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
  protected worldState: import('./WorldState').WorldState | null = null;

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

  abstract observe(worldState: import('./WorldState').WorldState): void;
  abstract think(): void;
  abstract act(worldState: import('./WorldState').WorldState): AgentAction | null;

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

  resetState(): void {
    this.reputation = 50;
    this.currentGoal = '';
    this.memory = { observations: [], pastActions: [], successfulPatterns: [], failurePatterns: [] };
    this.lastDecision = null;
    this.relationships = new Map();
    this.worldState = null;
  }

  restoreState(state: Agent): void {
    if (state.id !== this.id || state.role !== this.role) {
      throw new Error(`Cannot restore ${state.id} into ${this.id}.`);
    }
    this.reputation = state.reputation;
    this.currentGoal = state.currentGoal;
    this.memory = {
      observations: [...state.memory.observations],
      pastActions: [...state.memory.pastActions],
      successfulPatterns: [...state.memory.successfulPatterns],
      failurePatterns: [...state.memory.failurePatterns],
    };
    this.lastDecision = state.lastDecision;
    this.relationships = new Map(state.relationships);
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

  protected updateRelationship(agentId: string, amount: number): void {
    const current = this.relationships.get(agentId) ?? 0;
    this.relationships.set(agentId, Math.max(-100, Math.min(100, current + amount)));
  }
}
