/**
 * Rebel Artist Agent Implementation
 *
 * Disruptor role from SYSTEM_DESIGN.md: challenges whatever style the museum has
 * settled on rather than chasing critical/curatorial approval. Unlike Artist,
 * a Rebel Artist actively steers toward underrepresented styles and draws
 * "underground support" (reputation) from rejection rather than being deterred by it.
 */
import { BaseAgent, Agent, AgentAction } from '../../models/Agent';
import { ART_STYLES, createArtwork, ArtStyle, styleLabel } from '../../models/Artwork';
import { WorldState } from '../../models/WorldState';
import { ArtGenerator } from '../../utils/ArtGenerator';
import { RandomGenerator } from '../../utils/RandomGenerator';

export class RebelArtist extends BaseAgent {
  readonly signatureMotif: string;
  readonly compositionSignature: string;
  private preferredStyle: ArtStyle;
  private readonly submissionFrequency: number; // 0-1, likelihood to submit per turn
  private readonly experimentationRate: number; // odds of chasing the single least-represented style vs. any non-dominant style
  private inspiration: string | undefined;
  private readonly rng: RandomGenerator;
  private readonly seed: number;

  constructor(id: string, name: string, personality: string, seed: number) {
    super(id, name, 'rebel_artist', personality);
    this.seed = seed;
    this.rng = new RandomGenerator(seed);
    this.signatureMotif = this.rng.choice(['fracture', 'graffiti', 'static', 'scrawl', 'rupture']);
    this.compositionSignature = this.rng.choice(['jagged', 'off-center', 'inverted', 'collided']);
    this.preferredStyle = this.rng.choice(ART_STYLES);
    this.submissionFrequency = this.rng.randomFloat(0.3, 0.6);
    this.experimentationRate = 0.7;
  }

  observe(worldState: WorldState): void {
    this.worldState = worldState;
    const dominant = worldState.getDominantStyle();
    this.inspiration = dominant ? `a reaction against the museum's ${dominant} consensus` : undefined;
    this.recordMemory(
      dominant
        ? `Turn ${worldState.turn}: The museum is leaning ${dominant} — time to push the other way.`
        : `Turn ${worldState.turn}: No consensus has formed yet to challenge.`,
    );
  }

  think(): void {
    const dominant = this.worldState?.getDominantStyle();
    this.currentGoal = dominant
      ? `Undermine the ${styleLabel(dominant)} consensus with a counter-movement piece`
      : 'Stake out an early countercultural position';
  }

  act(worldState: WorldState): AgentAction | null {
    this.worldState = worldState;
    const turnRng = new RandomGenerator(this.seed + worldState.turn * 1009);
    if (!turnRng.randomBool(this.submissionFrequency)) return null;

    const dominant = worldState.getDominantStyle();
    const displayedCounts = new Map<ArtStyle, number>();
    worldState.getArtworks().forEach((artwork) => {
      if (artwork.status === 'displayed') {
        displayedCounts.set(artwork.style, (displayedCounts.get(artwork.style) ?? 0) + 1);
      }
    });
    const candidates = ART_STYLES.filter((style) => style !== dominant);
    const leastRepresented = candidates.reduce(
      (min, style) => ((displayedCounts.get(style) ?? 0) < (displayedCounts.get(min) ?? 0) ? style : min),
      candidates[0],
    );
    this.preferredStyle = turnRng.randomBool(this.experimentationRate) ? leastRepresented : turnRng.choice(candidates);

    const artworkId = `${this.id}-turn${worldState.turn}`;
    const artGenerator = new ArtGenerator(worldState.seedValue + worldState.turn + this.id.charCodeAt(0));
    const artwork = createArtwork(
      artworkId,
      `${this.name}'s Counter-Work #${worldState.turn}`,
      this.id,
      this.preferredStyle,
      `A defiant ${styleLabel(this.preferredStyle)} piece by ${this.name}, marked by a ${this.signatureMotif} motif${this.inspiration ? ` and driven by ${this.inspiration}` : ''}`,
      worldState.turn,
      worldState.seedValue + worldState.turn,
      artGenerator.generateArt(this.preferredStyle, this.signatureMotif, undefined, this.inspiration, undefined, this.compositionSignature),
    );

    worldState.addArtwork(artwork);
    worldState.addEvent(
      this.id,
      'artwork_submitted',
      `${this.name} defiantly submitted "${artwork.title}" in ${styleLabel(this.preferredStyle)} style`,
      { artworkId, style: this.preferredStyle },
    );

    this.memory.pastActions.push(`Submitted counter-movement artwork: ${artwork.title}`);
    this.reputation = Math.min(100, this.reputation + 2);

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
      primaryStyle: this.preferredStyle,
    };
  }
}
