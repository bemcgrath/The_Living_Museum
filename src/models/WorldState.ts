/**
 * WorldState Model
 * 
 * Central state container for the entire simulation.
 * Holds all artworks, agents, movements, and world metadata.
 */

import { ART_STYLES, Artwork, ArtStyle } from './Artwork';
import { Agent } from './Agent';
import { Movement } from './Movement';
import { Exhibition } from './Exhibition';

export interface WorldSave {
  version: 1;
  turn: number;
  seedValue: number;
  artworks: Artwork[];
  agents: Array<Omit<Agent, 'relationships'> & { relationships: Array<[string, number]> }>;
  movements: Movement[];
  events: WorldEvent[];
  historicalEvents?: WorldEvent[];
  exhibitions: Exhibition[];
}

export interface WorldEvent {
  turn: number;
  agent: string;
  eventType: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface WorldStats {
  currentTurn: number;
  totalArtworks: number;
  dominantStyle: ArtStyle | null;
  dominantStyleProminence: number;
  mostInfluentialArtist: string | null;
  mostValuableArtwork: string | null;
  emergingMovement: Movement | null;
}

export class WorldState {
  private artworks: Map<string, Artwork> = new Map();
  private agents: Map<string, Agent> = new Map();
  private movements: Map<string, Movement> = new Map();
  private events: WorldEvent[] = [];
  // The full narrative (historian notes/milestones) is kept separately and never trimmed,
  // since it is sparse and drives the historian summary/export even on very long runs.
  private historicalEvents: WorldEvent[] = [];
  private exhibitions: Exhibition[] = [];
  private static readonly MAX_RECENT_EVENTS = 500;

  turn: number = 0;
  seedValue: number = 42;

  // Getters
  getArtworks(): Artwork[] {
    return Array.from(this.artworks.values());
  }

  getArtwork(id: string): Artwork | undefined {
    return this.artworks.get(id);
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getMovements(): Movement[] {
    return Array.from(this.movements.values());
  }

  getMovement(id: string): Movement | undefined {
    return this.movements.get(id);
  }

  /** Returns the recent event log (bounded to the last MAX_RECENT_EVENTS entries on very long runs). */
  getEvents(): WorldEvent[] {
    return [...this.events];
  }

  getExhibitions(): Exhibition[] {
    return [...this.exhibitions];
  }

  addExhibition(exhibition: Exhibition): void {
    this.exhibitions.push(exhibition);
  }

  getRecentEvents(limit: number = 10): WorldEvent[] {
    return this.events.slice(-limit);
  }

  getHistoricalEvents(): WorldEvent[] {
    return [...this.historicalEvents];
  }


  getNarrativeSummary(): string {
    const movement = this.getMovements().sort((left, right) => right.prominence - left.prominence)[0];
    const acquired = this.getArtworks().filter((artwork) => artwork.status === 'acquired').length;
    const displayed = this.getArtworks().filter((artwork) => artwork.status === 'displayed').length;
    const artist = this.getMostInfluentialArtist();
    const style = this.getDominantStyle();
    if (this.turn === 0) return 'The museum is waiting for its first artistic act.';
    return `By turn ${this.turn}, artists submitted ${this.getArtworks().length} works. ${displayed} reached the galleries and ${acquired} entered private collections. ${artist ? `${artist} is the most influential artist so far` : 'No artist has yet established a clear influence'}${style ? `, while ${style} is the dominant displayed style` : ''}. ${movement ? `${movement.name} currently leads the museum's cultural conversation.` : 'No movement has yet gathered enough momentum to define the era.'}`;
  }

  getNarrativeText(): string {
    const history = this.getHistoricalEvents();
    return [
      `The Living Museum — turn ${this.turn}`,
      this.getNarrativeSummary(),
      '',
      ...history.map((event) => `Turn ${event.turn}: ${event.description}`),
    ].join('\n');
  }

  // Setters
  addArtwork(artwork: Artwork): void {
    this.artworks.set(artwork.id, artwork);
  }

  updateArtwork(artwork: Artwork): void {
    this.artworks.set(artwork.id, artwork);
  }

  addAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  updateAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  addMovement(movement: Movement): void {
    this.movements.set(movement.id, movement);
  }

  updateMovement(movement: Movement): void {
    this.movements.set(movement.id, movement);
  }

  addEvent(agent: string, eventType: string, description: string, data?: Record<string, unknown>): void {
    const event: WorldEvent = {
      turn: this.turn,
      agent,
      eventType,
      description,
      data,
    };
    if (eventType === 'historian_note' || eventType === 'historian_milestone') {
      this.historicalEvents.push(event);
    }
    this.events.push(event);
    // Bound the recent event log so very long runs (hundreds of turns) don't grow memory,
    // export size, and save snapshots without limit. The narrative (historicalEvents) is unaffected.
    if (this.events.length > WorldState.MAX_RECENT_EVENTS) {
      this.events.splice(0, this.events.length - WorldState.MAX_RECENT_EVENTS);
    }
  }

  // Analysis methods
  getDominantStyle(): ArtStyle | null {
    const displayedWorks = Array.from(this.artworks.values()).filter(
      (w) => w.status === 'displayed'
    );

    if (displayedWorks.length === 0) return null;

    const styleCounts = Object.fromEntries(ART_STYLES.map((style) => [style, 0])) as Record<ArtStyle, number>;
    const totalScore = Object.fromEntries(ART_STYLES.map((style) => [style, 0])) as Record<ArtStyle, number>;

    displayedWorks.forEach((w) => {
      styleCounts[w.style]++;
      if (w.criticScore !== null) {
        totalScore[w.style] += w.criticScore;
      }
    });

    // Find dominant by weighted score
    let dominantStyle: ArtStyle | null = null;
    let maxScore = 0;

    (Object.keys(styleCounts) as ArtStyle[]).forEach((style) => {
      if (styleCounts[style] > 0) {
        const avg = totalScore[style] / styleCounts[style];
        const weighted = avg * styleCounts[style];
        if (weighted > maxScore) {
          maxScore = weighted;
          dominantStyle = style;
        }
      }
    });

    return dominantStyle;
  }

  getMostInfluentialArtist(): string | null {
    const displayedWorks = Array.from(this.artworks.values()).filter(
      (w) => w.status === 'displayed'
    );

    if (displayedWorks.length === 0) return null;

    const artistScores: Record<string, number> = {};

    displayedWorks.forEach((w) => {
      if (!artistScores[w.artist]) artistScores[w.artist] = 0;
      if (w.criticScore !== null) {
        artistScores[w.artist] += w.criticScore;
      }
    });

    let topArtist: string | null = null;
    let maxScore = 0;

    Object.entries(artistScores).forEach(([artist, score]) => {
      if (score > maxScore) {
        maxScore = score;
        topArtist = artist;
      }
    });

    return topArtist;
  }

  getMostValuableArtwork(): Artwork | null {
    let mostValuable: Artwork | null = null;
    let maxValue = 0;

    Array.from(this.artworks.values()).forEach((w) => {
      const value = w.marketValue ?? 0;
      if (value > maxValue) {
        maxValue = value;
        mostValuable = w;
      }
    });

    return mostValuable;
  }

  getStats(): WorldStats {
    return {
      currentTurn: this.turn,
      totalArtworks: this.artworks.size,
      dominantStyle: this.getDominantStyle(),
      dominantStyleProminence: 0, // Will be calculated by simulation
      mostInfluentialArtist: this.getMostInfluentialArtist(),
      mostValuableArtwork: this.getMostValuableArtwork()?.id ?? null,
      emergingMovement: null, // Will be set by simulation
    };
  }

  reset(): void {
    this.artworks.clear();
    this.agents.clear();
    this.movements.clear();
    this.events = [];
    this.historicalEvents = [];
    this.exhibitions = [];
    this.turn = 0;
  }

  snapshot(): string {
    const save: WorldSave = {
      version: 1,
      turn: this.turn,
      seedValue: this.seedValue,
      artworks: this.getArtworks(),
      agents: this.getAgents().map((agent) => ({
        ...agent,
        relationships: Array.from(agent.relationships.entries()),
      })),
      movements: this.getMovements(),
      events: this.events,
      historicalEvents: this.historicalEvents,
      exhibitions: this.exhibitions,
    };
    return JSON.stringify(save);
  }

  loadSnapshot(snapshot: string): void {
    const save: unknown = JSON.parse(snapshot);
    if (!save || typeof save !== 'object' || !('version' in save) || save.version !== 1) {
      throw new Error('Unsupported museum save format.');
    }
    const data = save as WorldSave;
    if (!Array.isArray(data.artworks) || !Array.isArray(data.agents) ||
        !Array.isArray(data.movements) || !Array.isArray(data.events) ||
        typeof data.turn !== 'number' || typeof data.seedValue !== 'number') {
      throw new Error('Invalid museum save data.');
    }
    this.artworks = new Map(data.artworks.map((artwork) => [artwork.id, {
      ...artwork,
      history: Array.isArray(artwork.history) ? artwork.history : [{
        turn: artwork.createdAtTurn,
        eventType: 'artwork_submitted',
        agent: artwork.artist,
        description: `${artwork.title} was submitted.`,
      }],
    }]));
    this.agents = new Map(data.agents.map((agent) => [
      agent.id,
      { ...agent, relationships: new Map(agent.relationships) },
    ]));
    this.movements = new Map(data.movements.map((movement) => [movement.id, movement]));
    this.events = [...data.events];
    this.historicalEvents = Array.isArray(data.historicalEvents)
      ? [...data.historicalEvents]
      : this.events.filter((event) => event.eventType === 'historian_note' || event.eventType === 'historian_milestone');
    this.exhibitions = Array.isArray(data.exhibitions) ? [...data.exhibitions] : [];
    this.turn = data.turn;
    this.seedValue = data.seedValue;
  }
}
