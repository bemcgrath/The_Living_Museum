import { Agent, AgentAction, BaseAgent } from '../../models/Agent';
import { WorldState } from '../../models/WorldState';
import { RandomGenerator } from '../../utils/RandomGenerator';

export class Critic extends BaseAgent {
  private readonly seed: number;

  constructor(id: string, name: string, personality: string, seed: number) {
    super(id, name, 'critic', personality);
    this.seed = seed;
  }

  observe(worldState: WorldState): void {
    this.worldState = worldState;
    this.recordMemory(`Turn ${worldState.turn}: ${worldState.getArtworks().filter((artwork) => artwork.status === 'submitted').length} works awaiting review.`);
  }

  think(): void {
    this.currentGoal = 'Identify promising work and shape public taste';
  }

  act(worldState: WorldState): AgentAction | null {
    const artwork = worldState.getArtworks().find((item) => item.status === 'submitted');
    if (!artwork) return null;
    const scoreRng = new RandomGenerator(this.seed + worldState.turn * 1009);
    const personality = this.personality.toLowerCase();
    const personalityBias = personality.includes('demanding') ? -10 : personality.includes('generous') ? 10 : 0;
    const styleBias = this.getStyleBias(artwork.style, personality);
    const craftScore = artwork.svgData.includes('shape-rendering="crispEdges"') || artwork.svgData.includes('stroke-linecap') ? 6 : 0;
    const score = Math.max(0, Math.min(100, Math.round(50 + styleBias + craftScore + personalityBias + scoreRng.randomGaussian(0, 12))));
    return { agentId: this.id, type: 'review_artwork', targetId: artwork.id, data: { score }, turn: worldState.turn };
  }

  private getStyleBias(style: string, personality: string): number {
    const preferences: Record<string, string[]> = {
      minimal: ['minimal', 'restrained', 'formal'],
      geometric: ['formal', 'structured', 'geometric'],
      bauhaus: ['formal', 'structured', 'modern'],
      surreal: ['experimental', 'dream', 'imaginative'],
      impressionist: ['atmospheric', 'generous', 'color'],
      organic: ['organic', 'natural', 'empathetic'],
      expressionist: ['emotional', 'dramatic', 'bold'],
      chaotic: ['experimental', 'radical', 'bold'],
      digital: ['modern', 'technical', 'digital'],
      abstract: ['experimental', 'conceptual', 'modern'],
      cubist: ['formal', 'analytical', 'structured'],
      collage: ['experimental', 'material', 'radical'],
      meme: ['playful', 'popular', 'internet', 'generous'],
    };
    return (preferences[style] ?? []).some((keyword) => personality.includes(keyword)) ? 10 : 0;
  }

  getState(): Agent {
    return super.getState();
  }
}
