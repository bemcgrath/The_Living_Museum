/**
 * Artist Agent Implementation
 * 
 * Creates artwork and seeks recognition.
 * Decision: What style to create in? When to submit?
 */

import { BaseAgent, Agent, AgentAction } from '../../models/Agent';
import { ART_STYLES, createArtwork, ArtStyle, MemeVariant, styleLabel } from '../../models/Artwork';
import { WorldState } from '../../models/WorldState';
import { ArtGenerator } from '../../utils/ArtGenerator';
import { RandomGenerator } from '../../utils/RandomGenerator';

export class Artist extends BaseAgent {
  readonly signatureMotif: string;
  readonly compositionSignature: string;
  private preferredStyle: ArtStyle;
  readonly primaryStyle: ArtStyle;
  private readonly secondaryStyles: ArtStyle[];
  private readonly experimentationRate: number;
  private inspiration: string | undefined;
  readonly memeVariant?: MemeVariant;
  private submissionFrequency: number; // 0-1, likelihood to submit per turn
  private rng: RandomGenerator;
  private readonly seed: number;

  constructor(
    id: string,
    name: string,
    personality: string,
    seed: number,
    forcedPrimaryStyle?: ArtStyle
  ) {
    super(id, name, 'artist', personality);
    this.seed = seed;
    this.rng = new RandomGenerator(seed);
    this.signatureMotif = this.rng.choice(['orbit', 'star', 'wave', 'grid', 'constellation']);
    this.compositionSignature = this.rng.choice(['diagonal', 'vertical', 'asymmetric', 'clustered', 'balanced']);
    this.memeVariant = personality.toLowerCase().includes('meme')
      ? this.rng.choice(['slogan', 'poster', 'comic', 'glitch', 'diagram', 'absurd'] as MemeVariant[])
      : undefined;
    const personalityLower = personality.toLowerCase();
    if (forcedPrimaryStyle) {
      // A specific style was requested (e.g. the user picked a style when creating a new collection)
      // rather than derived from personality text — honor it directly and pick varied secondaries.
      this.primaryStyle = forcedPrimaryStyle;
      this.secondaryStyles = this.rng.shuffle(ART_STYLES.filter((style) => style !== forcedPrimaryStyle)).slice(0, 3);
      this.experimentationRate = 0.2;
    } else if (personalityLower.includes('minimal')) {
      this.primaryStyle = 'minimal';
      this.secondaryStyles = ['geometric', 'bauhaus'];
      this.experimentationRate = 0.2;
    } else if (personalityLower.includes('meme')) {
      this.primaryStyle = 'meme';
      this.secondaryStyles = ['collage', 'digital', 'chaotic'];
      this.experimentationRate = 0.55;
    } else if (personalityLower.includes('bold')) {
      this.primaryStyle = 'expressionist';
      this.secondaryStyles = ['chaotic', 'abstract', 'cubist'];
      this.experimentationRate = 0.45;
    } else if (personalityLower.includes('pastoral') || personalityLower.includes('wyeth') || personalityLower.includes('rural')) {
      this.primaryStyle = 'pastoral';
      this.secondaryStyles = ['post_impressionist', 'silver_gelatin', 'impressionist'];
      this.experimentationRate = 0.25;
    } else if (personalityLower.includes('painterly') || personalityLower.includes('post-impressionist') || personalityLower.includes('post impressionist')) {
      this.primaryStyle = 'post_impressionist';
      this.secondaryStyles = ['impressionist', 'pastoral', 'expressionist'];
      this.experimentationRate = 0.4;
    } else if (personalityLower.includes('monet') || personalityLower.includes('impressionist') || personalityLower.includes('water lily') || personalityLower.includes('water lilies')) {
      // Checked after the post-impressionist branch above, since "post-impressionist" also contains
      // the substring "impressionist" and should keep routing to Van Gogh, not here.
      this.primaryStyle = 'impressionist';
      this.secondaryStyles = ['post_impressionist', 'pastoral', 'organic'];
      this.experimentationRate = 0.3;
    } else if (personalityLower.includes('photograph') || personalityLower.includes('ansel') || personalityLower.includes('monochrome')) {
      this.primaryStyle = 'silver_gelatin';
      this.secondaryStyles = ['pastoral', 'minimal', 'geometric'];
      this.experimentationRate = 0.25;
    } else if (personalityLower.includes('experimental')) {
      this.primaryStyle = this.rng.choice(['surreal', 'abstract', 'collage', 'digital']);
      this.secondaryStyles = ['organic', 'expressionist', 'impressionist', 'cubist'];
      this.experimentationRate = 0.65;
    } else {
      this.primaryStyle = this.rng.choice(ART_STYLES);
      this.secondaryStyles = ART_STYLES.filter((style) => style !== this.primaryStyle).slice(0, 3);
      this.experimentationRate = 0.3;
    }
    this.preferredStyle = this.primaryStyle;
    this.submissionFrequency = this.rng.randomFloat(0.3, 0.7);
  }

  observe(worldState: WorldState): void {
    // Look at recent artworks and their reception
    const recentArtworks = worldState
      .getArtworks()
      .filter((a) => a.createdAtTurn > worldState.turn - 10)
      .slice(-5);
    const peerWork = recentArtworks.find((artwork) => artwork.artist !== this.id);
    this.inspiration = peerWork
      ? `${peerWork.artist}'s ${peerWork.style} work`
      : undefined;

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
    } else if (this.personality.toLowerCase().includes('experimental')) {
      this.currentGoal = 'Push a new style beyond the museum consensus';
    } else if (this.personality.toLowerCase().includes('minimal')) {
      this.currentGoal = 'Refine a restrained style until critics notice';
    } else {
      this.currentGoal = 'Create and submit new innovative work';
    }
  }

  act(worldState: WorldState): AgentAction | null {
    this.worldState = worldState;

    // Decide whether to submit this turn
    const turnRng = new RandomGenerator(this.seed + worldState.turn * 1009);
    if (turnRng.randomBool(this.experimentationRate)) {
      this.preferredStyle = turnRng.choice(this.secondaryStyles);
    } else {
      this.preferredStyle = this.primaryStyle;
    }
    if (!turnRng.randomBool(this.submissionFrequency)) {
      return null;
    }

    // Create new artwork
    const recentReception = worldState.getArtworks()
      .filter((artwork) => artwork.artist === this.id && artwork.criticScore !== null)
      .slice(-3);
    if (recentReception.length >= 2 && recentReception.every((artwork) => (artwork.criticScore ?? 0) < 45)) {
      this.preferredStyle = turnRng.choice(this.secondaryStyles);
      this.recordMemory(`Turn ${worldState.turn}: Changed direction after weak reception.`);
    }
    const artworkId = `${this.id}-turn${worldState.turn}`;
    const artGenerator = new ArtGenerator(worldState.seedValue + worldState.turn + this.id.charCodeAt(0));
    const memeCaptions = ['LOL', 'NO WAY', 'BIG MOOD', 'THIS IS FINE', 'WOW', 'BRUH'];
    const memeThemes = ['OPEN SOURCE', 'THE SYSTEM', 'TOUCH GRASS', 'TERMS APPLY', 'FREEDOM', 'NEW PARADIGM'];
    const caption = this.preferredStyle === 'meme'
      ? (this.memeVariant === 'slogan' ? memeThemes[turnRng.randomInt(0, memeThemes.length)] : memeCaptions[turnRng.randomInt(0, memeCaptions.length)])
      : undefined;

    const artwork = createArtwork(
      artworkId,
      `${this.name}'s Work #${worldState.turn}`,
      this.id,
      this.preferredStyle,
      `A ${styleLabel(this.preferredStyle)} piece created by ${this.name}, marked by a recurring ${this.signatureMotif} motif${this.inspiration ? ` and inspired by ${this.inspiration}` : ''}`,
      worldState.turn,
      worldState.seedValue + worldState.turn,
      artGenerator.generateArt(this.preferredStyle, this.signatureMotif, caption, this.inspiration, this.memeVariant, this.compositionSignature)
    );

    worldState.addArtwork(artwork);
    worldState.addEvent(
      this.id,
      'artwork_submitted',
      `${this.name} submitted "${artwork.title}" in ${styleLabel(this.preferredStyle)} style`,
      { artworkId, style: this.preferredStyle }
    );

    this.memory.pastActions.push(`Submitted artwork: ${artwork.title}`);
    this.reputation = Math.min(100, this.reputation + 5);

    return {
      type: 'submit_artwork',
      agentId: this.id,
      data: { artworkId },
      turn: worldState.turn,
    };
  }

  getState(): Agent {
    return {
      ...super.getState(),
      primaryStyle: this.primaryStyle,
    };
  }
}
