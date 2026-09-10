/**
 * Artist Agent Implementation
 * 
 * Creates artwork and seeks recognition.
 * Decision: What style to create in? When to submit?
 */

import { BaseAgent, Agent, AgentAction } from './Agent';
import { WorldState } from '../models/WorldState';
import { Artwork, createArtwork, ArtStyle } from '../models/Artwork';
import { ArtGenerator } from '../utils/ArtGenerator';
import { RandomGenerator } from '../utils/RandomGenerator';

export class Artist extends BaseAgent {
  private preferredStyle: ArtStyle;
  private submissionFrequency: number; // 0-1, likelihood to submit per turn
  private rng: RandomGenerator;

  constructor(
    id: string,
    name: string,
    personality: string,
    seed: number
  ) {
    super(id, name, 'artist', personality);
    this.rng = new RandomGenerator(seed);
    
    const styles: ArtStyle[] = [
      'geometric',
      'surreal',
      'minimal',
      'organic',
      'chaotic',
      'digital',
      'expressionist',
      'abstract',
    ];
    this.preferredStyle = this.rng.choice(styles);
    this.submissionFrequency = this.rng.randomFloat(0.3, 0.7);
  }

  observe(worldState: WorldState): void {
    // Look at recent artworks and their reception
    const recentArtworks = worldState
      .getArtworks()
      .filter((a) => a.createdAtTurn > worldState.turn - 10)
      .slice(-5);

    // Track what styles are getting displayed
    const displayedByStyle: Record<string, number> = {};
    worldState.getArtworks().forEach((a) => {
      if (a.status === 'displayed') {
        displayedByStyle[a.style] = (displayedByStyle[a.style] || 0) + 1;
      }
    });

    // Store observation
    this.memory.observations.push(
      `Turn ${worldState.turn}: Saw ${recentArtworks.length} recent artworks. Style popularity: ${JSON.stringify(displayedByStyle)}`
    );

    // Update relationships based on critic scores
    recentArtworks.forEach((artwork) => {
      if (artwork.artist && artwork.criticScore !== null) {
        if (artwork.criticScore > 70) {
          this.updateRelationship(artwork.artist, 5);
        } else if (artwork.criticScore < 30) {
          this.updateRelationship(artwork.artist, -3);
        }
      }
    });
  }

  think(): void {
    // Determine what to create and whether to submit
    const displayedCount = this.worldState?.getArtworks().filter((a) => a.status === 'displayed').length || 0;

    if (displayedCount === 0) {
      // No displayed work yet, be optimistic
      this.currentGoal = 'Submit artwork to establish presence';
    } else if (this.reputation < 30) {
      this.currentGoal = 'Improve and resubmit work';
    } else {
      this.currentGoal = 'Create and submit new innovative work';
    }
  }

  act(worldState: WorldState): AgentAction | null {
    this.worldState = worldState;

    // Decide whether to submit this turn
    if (!this.rng.randomBool(this.submissionFrequency)) {
      return null;
    }

    // Create new artwork
    const artworkId = `${this.id}-turn${worldState.turn}`;
    const artGenerator = new ArtGenerator(worldState.seedValue + worldState.turn + this.id.charCodeAt(0));

    const artwork = createArtwork(
      artworkId,
      `${this.name}'s Work #${worldState.turn}`,
      this.id,
      this.preferredStyle,
      `A ${this.preferredStyle} piece created by ${this.name}`,
      worldState.turn,
      artGenerator.generateArt(this.preferredStyle),
      worldState.seedValue + worldState.turn
    );

    worldState.addArtwork(artwork);
    worldState.addEvent(
      this.id,
      'artwork_submitted',
      `${this.name} submitted "${artwork.title}" in ${this.preferredStyle} style`,
      { artworkId, style: this.preferredStyle }
    );

    this.memory.pastActions.push(`Submitted artwork: ${artwork.title}`);
    this.reputation = Math.min(100, this.reputation + 5);

    return {
      type: 'submit_artwork',
      agentId: this.id,
      data: { artworkId },
    };
  }

  getState(): Agent {
    return {
      id: this.id,
      name: this.name,
      role: 'artist',
      personality: this.personality,
      reputation: this.reputation,
      currentGoal: this.currentGoal,
      memory: this.memory,
      relationships: this.relationships,
    };
  }
}
