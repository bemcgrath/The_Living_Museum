import { AgentAction, BaseAgent } from '../models/Agent';
import { WorldState } from '../models/WorldState';
import { createMovement, generateMovementName } from '../models/Movement';
import { ART_STYLES, styleLabel } from '../models/Artwork';
import { Exhibition } from '../models/Exhibition';

export class SimulationEngine {
  private readonly worldState: WorldState;
  private readonly agents = new Map<string, BaseAgent>();
  private readonly agentFactories = new Map<string, () => BaseAgent>();
  private isRunning = false;
  private speed = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();

  constructor(worldState: WorldState) {
    this.worldState = worldState;
  }

  registerAgent(agent: BaseAgent, factory?: () => BaseAgent): void {
    this.agents.set(agent.id, agent);
    this.agentFactories.set(agent.id, factory ?? (() => {
      agent.resetState();
      return agent;
    }));
    this.worldState.addAgent(agent.getState());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setSimulationSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(speed, 5));
    if (this.isRunning) {
      this.startTimer();
    }
  }

  advanceTurn(): void {
    this.worldState.turn++;
    const actions: AgentAction[] = [];
    for (const agent of this.agents.values()) agent.observe(this.worldState);
    for (const agent of this.agents.values()) agent.think();
    for (const agent of this.agents.values()) {
      const action = agent.act(this.worldState);
      if (action) {
        agent.recordDecision({
          observation: `Turn ${this.worldState.turn} world state`,
          goal: agent.currentGoal,
          reasoning: `Selected ${action.type} based on current goals and available targets.`,
          action: action.type,
          result: 'Pending',
        });
        actions.push(action);
      }
    }
    this.processActions(actions);
    for (const agent of this.agents.values()) {
      this.worldState.updateAgent(agent.getState());
    }
    this.updateMovements();
    this.updateExhibitions();
    this.notify();
  }

  private processActions(actions: AgentAction[]): void {
    for (const action of actions) {
      if (action.type === 'submit_artwork') continue;
      if (action.type === 'record_observation') {
        const description = action.data.description;
        if (typeof description === 'string') {
          const eventType = typeof action.data.eventType === 'string' ? action.data.eventType : 'historian_note';
          this.worldState.addEvent(action.agentId, eventType, description, {
            source: 'historian',
            ...(typeof action.data.milestoneKey === 'string' ? { milestoneKey: action.data.milestoneKey } : {}),
          });
        }
        continue;
      }
      if (action.type === 'review_artwork') {
        const artwork = action.targetId ? this.worldState.getArtwork(action.targetId) : undefined;
        const score = action.data.score;
        if (artwork && typeof score === 'number') {
          this.worldState.updateArtwork({ ...artwork, criticScore: score });
          this.addArtworkHistory(artwork.id, action.turn, action.agentId, 'artwork_reviewed', `Critic scored the work ${score}/100.`, { score });
          const critic = this.agents.get(action.agentId);
          const artist = this.agents.get(artwork.artist);
          if (critic && artist) {
            critic.relationships.set(artist.id, Math.min(100, (critic.relationships.get(artist.id) ?? 0) + (score >= 70 ? 3 : -1)));
          }
          this.worldState.addEvent(action.agentId, 'artwork_reviewed', `Artwork received a score of ${score}`, { artworkId: artwork.id, score });
        }
      }
      if (action.type === 'curate_artwork') {
        const artwork = action.targetId ? this.worldState.getArtwork(action.targetId) : undefined;
        if (artwork && artwork.status === 'submitted') {
          const curator = this.agents.get(action.agentId);
          const personality = curator?.personality.toLowerCase() ?? '';
          const threshold = personality.includes('experimental') ? 35 : personality.includes('strict') ? 60 : 45;
          const accept = (artwork.criticScore ?? 0) >= threshold;
          this.worldState.updateArtwork({
            ...artwork,
            status: accept ? 'displayed' : 'rejected',
            marketValue: accept ? Math.max(10, (artwork.criticScore ?? 50) * 2) : 0,
          });
          this.addArtworkHistory(artwork.id, action.turn, action.agentId, accept ? 'artwork_displayed' : 'artwork_rejected',
            `${accept ? 'Curator displayed' : 'Curator rejected'} the work.`, { threshold });
          const artist = this.agents.get(artwork.artist);
          if (artist) {
            artist.reputation = Math.max(0, Math.min(100, artist.reputation + (accept ? 2 : -4)));
          }
          this.worldState.addEvent(action.agentId, accept ? 'artwork_displayed' : 'artwork_rejected',
            `${accept ? 'Displayed' : 'Rejected'} "${artwork.title}"`, { artworkId: artwork.id });
        }
      }
      if (action.type === 'acquire_artwork') {
        const artwork = action.targetId ? this.worldState.getArtwork(action.targetId) : undefined;
        if (artwork && artwork.status === 'displayed') {
          this.worldState.updateArtwork({ ...artwork, status: 'acquired', acquiredBy: action.agentId, marketValue: Math.round(artwork.marketValue * 1.2) });
          this.addArtworkHistory(artwork.id, action.turn, action.agentId, 'artwork_acquired',
            `Collector acquired the work; value rose to ${Math.round(artwork.marketValue * 1.2)}.`, { marketValue: Math.round(artwork.marketValue * 1.2) });
          const artist = this.agents.get(artwork.artist);
          const collector = this.agents.get(action.agentId);
          if (artist) artist.reputation = Math.min(100, artist.reputation + 3);
          if (collector) collector.relationships.set(artwork.artist, Math.min(100, (collector.relationships.get(artwork.artist) ?? 0) + 5));
          this.worldState.addEvent(action.agentId, 'artwork_acquired', `Acquired "${artwork.title}"`, { artworkId: artwork.id });
        }
      }
    }
  }

  private updateMovements(): void {
    for (const style of ART_STYLES) {
      const works = this.worldState.getArtworks().filter((work) => work.style === style && work.status !== 'rejected');
      if (works.length >= 3 && !this.worldState.getMovements().some((movement) => movement.style === style)) {
        const movement = createMovement(`movement-${style}`, generateMovementName(style, this.worldState.turn), style, `An emerging ${style} school shaped by the museum's artists.`, this.worldState.turn);
        this.worldState.addMovement(movement);
        this.worldState.addEvent('museum', 'movement_emerged', `${movement.name} emerged around ${style} works`, { movementId: movement.id });
      }

    }
    for (const movement of this.worldState.getMovements()) {
      const works = this.worldState.getArtworks().filter((work) => work.style === movement.style && work.status !== 'rejected');
      movement.artworkCount = works.length;
      movement.averageScore = works.length ? works.reduce((sum, work) => sum + (work.criticScore ?? 0), 0) / works.length : 0;
      movement.prominence = works.length ? Math.min(100, 10 + works.length * 5 + movement.averageScore) : Math.max(0, movement.prominence - 2);
      this.worldState.updateMovement(movement);
    }

  }

  private updateExhibitions(): void {
    const displayed = this.worldState.getArtworks().filter((artwork) => artwork.status === 'displayed');
    if (displayed.length < 3 || this.worldState.getExhibitions().some((exhibition) => exhibition.createdAtTurn === this.worldState.turn)) return;
    const style = displayed.reduce((counts, artwork) => {
      counts[artwork.style] = (counts[artwork.style] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    const dominantStyle = Object.entries(style).sort((left, right) => right[1] - left[1])[0][0] as Exhibition['style'];
    const works = displayed.filter((artwork) => artwork.style === dominantStyle).slice(-6);
    const exhibition: Exhibition = {
      id: `exhibition-${this.worldState.turn}`,
      title: `${styleLabel(dominantStyle)} in Motion`,
      theme: `A study of ${styleLabel(dominantStyle)} works and the artists shaping the museum's current taste.`,
      style: dominantStyle,
      artworkIds: works.map((work) => work.id),
      artistIds: [...new Set(works.map((work) => work.artist))],
      createdAtTurn: this.worldState.turn,
    };
    this.worldState.addExhibition(exhibition);
    this.worldState.addEvent('curator-1', 'exhibition_opened', `${exhibition.title} opened with ${works.length} works.`, { exhibitionId: exhibition.id, style: dominantStyle });
  }

  private addArtworkHistory(artworkId: string, turn: number, agent: string, eventType: string, description: string, data?: Record<string, unknown>): void {
    const artwork = this.worldState.getArtwork(artworkId);
    if (!artwork) return;
    this.worldState.updateArtwork({
      ...artwork,
      history: [...artwork.history, { turn, agent, eventType, description, data }],
    });
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTimer();
    this.notify();
  }

  private startTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.advanceTurn(), 1000 / this.speed);
  }

  pause(): void {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.notify();
  }

  reset(): void {
    this.pause();
    this.worldState.reset();
    for (const [id, factory] of this.agentFactories) {
      this.agents.set(id, factory());
    }
    for (const agent of this.agents.values()) {
      this.worldState.addAgent(agent.getState());
    }
    this.notify();
  }

  loadSnapshot(snapshot: string): void {
    const wasRunning = this.isRunning;
    this.pause();
    this.worldState.loadSnapshot(snapshot);
    for (const agent of this.agents.values()) {
      const state = this.worldState.getAgent(agent.id);
      if (!state) throw new Error(`Save is missing registered agent ${agent.id}.`);
      agent.restoreState(state);
    }
    if (wasRunning) this.start();
    else this.notify();
  }

  getWorldState(): WorldState { return this.worldState; }
  isSimulationRunning(): boolean { return this.isRunning; }
  getSpeed(): number { return this.speed; }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
