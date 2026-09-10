/**
 * WorldState Model
 * 
 * Central state container for the entire simulation.
 * Holds all artworks, agents, movements, and world metadata.
 */

import { Artwork, ArtStyle } from './Artwork';
import { Agent } from './Agent';
import { Movement } from './Movement';

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

  getEvents(): WorldEvent[] {
    return this.events;
  }

  getRecentEvents(limit: number = 10): WorldEvent[] {
    return this.events.slice(-limit);
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
    this.events.push({
      turn: this.turn,
      agent,
      eventType,
      description,
      data,
    });
  }

  // Analysis methods
  getDominantStyle(): ArtStyle | null {
    const displayedWorks = Array.from(this.artworks.values()).filter(
      (w) => w.status === 'displayed'
    );

    if (displayedWorks.length === 0) return null;

    const styleCounts: Record<ArtStyle, number> = {
      geometric: 0,
      surreal: 0,
      minimal: 0,
      organic: 0,
      chaotic: 0,
      digital: 0,
      expressionist: 0,
      abstract: 0,
    };

    let totalScore: Record<ArtStyle, number> = {
      geometric: 0,
      surreal: 0,
      minimal: 0,
      organic: 0,
      chaotic: 0,
      digital: 0,
      expressionist: 0,
      abstract: 0,
    };

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
      const value = w.collectorValue ?? 0;
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
    this.turn = 0;
  }
}
