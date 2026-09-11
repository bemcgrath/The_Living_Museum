import { ArtStyle, MemeVariant } from '../models/Artwork';
import { RandomGenerator } from './RandomGenerator';

type Layout = 'scatter' | 'radial' | 'grid' | 'cluster';

interface StyleProfile {
  /** Multiple background variants — one is chosen per artwork so same-style pieces don't look identical. */
  backgrounds: string[];
  palette: string[];
  count: number;
}

// `minimal` keeps a single fixed background by design (its restrained aesthetic is the point,
// and `ArtGenerator.test.ts` asserts the exact hex) — every other style now offers several
// background variants plus a larger palette so pieces of the same style read as a family
// rather than as duplicates.
const STYLE_PROFILES: Record<ArtStyle, StyleProfile> = {
  geometric: { backgrounds: ['#101827', '#0b1b2e', '#181022', '#0e2130'], palette: ['#f4b942', '#3a86ff', '#f8f4ff', '#ff6b6b', '#5ee7c6', '#c77dff'], count: 5 },
  surreal: { backgrounds: ['#21142c', '#2b1338', '#160f26', '#1d1a33'], palette: ['#e85d75', '#8338ec', '#06d6a0', '#f4b942', '#ff9f6b', '#5c8dff'], count: 4 },
  minimal: { backgrounds: ['#f4f0e8'], palette: ['#17151d', '#7a6f66', '#a89f96'], count: 2 },
  organic: { backgrounds: ['#10231d', '#122c1d', '#0d1f26', '#182619'], palette: ['#74c69d', '#d8f3dc', '#f4b942', '#b5e2a6', '#4d908e', '#95d5b2'], count: 5 },
  chaotic: { backgrounds: ['#1b1118', '#22131a', '#150d1c', '#1a1522'], palette: ['#ff4d6d', '#f4b942', '#3a86ff', '#f8f4ff', '#9d4edd', '#ff8fa3'], count: 8 },
  digital: { backgrounds: ['#0b1220', '#081018', '#0d1526', '#0a1a1a'], palette: ['#00f5d4', '#00bbf9', '#fee440', '#ff6b9d', '#9b5de5', '#4cc9f0'], count: 7 },
  expressionist: { backgrounds: ['#241313', '#2b1710', '#1f1420', '#26160e'], palette: ['#ff7b00', '#e85d75', '#f4b942', '#8338ec', '#ff477e', '#ffb703'], count: 5 },
  abstract: { backgrounds: ['#141420', '#1a1526', '#101018', '#171a2b'], palette: ['#f4b942', '#e85d75', '#3a86ff', '#8338ec', '#2ec4b6', '#ff9770'], count: 6 },
  cubist: { backgrounds: ['#20201b', '#241f16', '#1c211b', '#231c1a'], palette: ['#bc6c25', '#dda15e', '#283618', '#fefae0', '#606c38', '#a68a64'], count: 6 },
  impressionist: { backgrounds: ['#20344a', '#26374d', '#1c2c40', '#2a3f4d'], palette: ['#90e0ef', '#caf0f8', '#ffd166', '#f28482', '#a8dadc', '#c9ada7'], count: 10 },
  bauhaus: { backgrounds: ['#f6efe2', '#f2e9d8', '#efe4cf', '#f5e6d3'], palette: ['#d62828', '#003049', '#fcbf49', '#111111', '#606c38'], count: 5 },
  collage: { backgrounds: ['#2a241d', '#241f2a', '#1f231d', '#2a1f28'], palette: ['#f4b942', '#e85d75', '#3a86ff', '#f8f4ff', '#8338ec', '#4ecdc4'], count: 6 },
  meme: { backgrounds: ['#fff6d6', '#ffe8d6', '#e6f2ff', '#f0e6ff'], palette: ['#111111', '#ff4d6d', '#3a86ff', '#f4b942', '#06d6a0'], count: 4 },
  // Representational, scene-based styles — rendered by dedicated scene generators below rather than
  // the generic per-element loop, since they compose a horizon/sky/figure rather than scattered shapes.
  pastoral: { backgrounds: ['#cbb994', '#a9b7bd', '#d9c9a3', '#8a94a0'], palette: ['#8b6f47', '#c9a86a', '#5c6b73', '#7c8a5c', '#e8ddc7', '#6b4a3a'], count: 0 },
  post_impressionist: { backgrounds: ['#1b2a4a', '#2a1f4d', '#c97b2e', '#16344a'], palette: ['#f4d35e', '#3a86ff', '#ff9f1c', '#2ec4b6', '#e63946', '#f1faee'], count: 0 },
  silver_gelatin: { backgrounds: ['#3d3d3d', '#6b6b6b', '#1a1a1a', '#9e9e9e'], palette: ['#050505', '#1a1a1a', '#3d3d3d', '#6b6b6b', '#9e9e9e', '#cfcfcf', '#f5f5f5'], count: 0 },
};

export class ArtGenerator {
  private readonly rng: RandomGenerator;

  constructor(seed: number) {
    this.rng = new RandomGenerator(seed);
  }

  generateArt(style: ArtStyle, motif?: string, caption?: string, inspiration?: string, memeVariant?: MemeVariant, composition?: string): string {
    const profile = STYLE_PROFILES[style];
    const signature = motif ? this.generateMotif(motif, profile.palette[0], style, composition) : '';
    if (style === 'pastoral' || style === 'post_impressionist' || style === 'silver_gelatin') {
      const scene = style === 'pastoral'
        ? this.generatePastoralScene(profile, composition)
        : style === 'post_impressionist'
          ? this.generatePostImpressionistScene(profile, composition)
          : this.generateSilverGelatinScene(profile, composition);
      return `<svg viewBox="0 0 100 100" role="img" aria-label="${style} procedural artwork" data-motif="${motif ?? ''}" data-caption="${caption ?? ''}" data-inspiration="${inspiration ?? ''}" data-meme-variant="${memeVariant ?? ''}" data-composition="${composition ?? ''}" xmlns="http://www.w3.org/2000/svg">${scene}${signature}</svg>`;
    }
    // Vary background + layout per artwork so pieces sharing a style aren't near-duplicates.
    const background = this.rng.choice(profile.backgrounds);
    const layout: Layout = this.rng.choice(['scatter', 'radial', 'grid', 'cluster']);
    const clusterCenter = { x: this.rng.randomInt(28, 72), y: this.rng.randomInt(28, 72) };
    const count = Math.max(1, profile.count + this.rng.randomInt(-1, 2));
    const shapes = Array.from({ length: count }, (_, index) => {
      const { x, y } = this.pickPosition(layout, index, count, clusterCenter);
      return this.generateElement(style, profile, index, x, y);
    }).join('');
    const captionMarkup = style === 'meme' ? this.generateMemeCaption(caption ?? 'LOL', profile.palette[0], memeVariant ?? 'slogan') : '';
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${style} procedural artwork" data-motif="${motif ?? ''}" data-caption="${caption ?? ''}" data-inspiration="${inspiration ?? ''}" data-meme-variant="${memeVariant ?? ''}" data-composition="${composition ?? ''}" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${background}"/>${shapes}${signature}${captionMarkup}</svg>`;
  }

  /**
   * Wyeth-inspired pastoral realism: a muted, tempera-like rural scene — rolling field, a distant
   * farmhouse, and often a lone figure resting in the grass (echoing works like "Christina's World").
   * Never reproduces a specific artwork; it composes its own scene from randomized muted elements.
   */
  private generatePastoralScene(profile: StyleProfile, composition?: string): string {
    const sky = this.rng.choice(profile.backgrounds);
    const horizonY = this.rng.randomInt(40, 58);
    const fieldColor = this.rng.choice(profile.palette);
    const grassAccent = this.rng.choice(profile.palette.filter((c) => c !== fieldColor));
    const dip = this.rng.randomInt(-6, 6);
    const layout = this.pastoralLayout(composition);

    const sunGlow = `<circle cx="${this.rng.randomInt(18, 82)}" cy="${this.rng.randomInt(8, Math.max(9, horizonY - 8))}" r="${this.rng.randomInt(6, 11)}" fill="#f6ead0" opacity=".35"/>`;
    const skyRect = `<rect x="0" y="0" width="100" height="${horizonY}" fill="${sky}"/>`;
    const field = `<path d="M 0 ${horizonY} Q 25 ${horizonY - dip} 50 ${horizonY} Q 75 ${horizonY + dip} 100 ${horizonY} L 100 100 L 0 100 Z" fill="${fieldColor}"/>`;
    const texture = Array.from({ length: this.rng.randomInt(6, 10) }, () => {
      const tx = this.rng.randomInt(5, 95);
      const ty = this.rng.randomInt(horizonY + 4, 94);
      const len = this.rng.randomInt(4, 10);
      return `<path d="M ${tx} ${ty} l ${len} ${-this.rng.randomInt(1, 4)}" stroke="${grassAccent}" stroke-width="1" opacity=".4"/>`;
    }).join('');

    const house = this.rng.randomBool(0.7) ? this.generatePastoralHouse(layout.houseX, horizonY, profile) : '';
    const figure = this.rng.randomBool(0.65) ? this.generatePastoralFigure(layout.figureX, horizonY, profile) : '';

    return `${skyRect}${sunGlow}${field}${texture}${house}${figure}`;
  }

  private pastoralLayout(composition?: string): { houseX: number; figureX: number } {
    if (composition === 'diagonal') return { houseX: this.rng.randomInt(65, 85), figureX: this.rng.randomInt(15, 30) };
    if (composition === 'vertical') return { houseX: this.rng.randomInt(45, 55), figureX: this.rng.randomInt(45, 55) };
    if (composition === 'clustered') {
      const center = this.rng.randomInt(35, 65);
      return { houseX: center + this.rng.randomInt(-8, 8), figureX: center + this.rng.randomInt(-8, 8) };
    }
    return { houseX: this.rng.randomInt(10, 90), figureX: this.rng.randomInt(10, 90) };
  }

  private generatePastoralHouse(x: number, horizonY: number, profile: StyleProfile): string {
    const wallColor = this.rng.choice(profile.palette);
    const roofColor = this.rng.choice(profile.palette.filter((c) => c !== wallColor));
    const w = this.rng.randomInt(8, 14);
    const h = this.rng.randomInt(6, 10);
    const y = horizonY - h;
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${wallColor}"/><polygon points="${x - 1},${y} ${x + w / 2},${y - h * 0.7} ${x + w + 1},${y}" fill="${roofColor}"/><rect x="${x + w * 0.3}" y="${y + h * 0.35}" width="${w * 0.2}" height="${h * 0.35}" fill="#e8ddc7"/></g>`;
  }

  private generatePastoralFigure(x: number, horizonY: number, profile: StyleProfile): string {
    const dressColor = this.rng.choice(profile.palette);
    const hairColor = this.rng.choice(['#4a3728', '#6b4a3a', '#8b6f47', '#2b2118']);
    const y = this.rng.randomInt(horizonY + 15, 88);
    return `<g><ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="${dressColor}" opacity=".9"/><circle cx="${x + 3}" cy="${y - 4}" r="2.2" fill="${hairColor}"/></g>`;
  }

  /**
   * Van Gogh-inspired post-impressionist scene: swirling impasto sky, a glowing sun or moon, and a
   * dark cypress-like silhouette rising from a textured field — sometimes with a lone figure below.
   */
  private generatePostImpressionistScene(profile: StyleProfile, composition?: string): string {
    const sky = this.rng.choice(profile.backgrounds);
    const horizonY = this.rng.randomInt(62, 74);
    const swirlCount = this.rng.randomInt(7, 11);
    const cypressX = composition === 'diagonal' ? this.rng.randomInt(70, 85) : composition === 'vertical' ? 50 : this.rng.randomInt(15, 85);

    const skyRect = `<rect x="0" y="0" width="100" height="100" fill="${sky}"/>`;
    const glowColor = this.rng.choice(profile.palette);
    const glowX = this.rng.randomInt(20, 80);
    const glowY = this.rng.randomInt(12, Math.max(13, horizonY - 20));
    const glow = `<circle cx="${glowX}" cy="${glowY}" r="${this.rng.randomInt(7, 11)}" fill="${glowColor}" opacity=".85"/>`;
    const swirls = Array.from({ length: swirlCount }, () => {
      const cx = this.rng.randomInt(5, 95);
      const cy = this.rng.randomInt(5, horizonY - 4);
      const color = this.rng.choice(profile.palette);
      const r = this.rng.randomInt(6, 14);
      return `<path d="M ${cx - r} ${cy} C ${cx - r} ${cy - r}, ${cx + r} ${cy - r}, ${cx + r} ${cy} C ${cx + r} ${cy + r * 0.6}, ${cx - r * 0.4} ${cy + r * 0.8}, ${cx - r} ${cy}" fill="none" stroke="${color}" stroke-width="${this.rng.randomInt(1, 3)}" opacity=".75"/>`;
    }).join('');

    const fieldColor = this.rng.choice(profile.palette);
    const field = `<rect x="0" y="${horizonY}" width="100" height="${100 - horizonY}" fill="${fieldColor}" opacity=".9"/>`;
    const fieldStrokes = Array.from({ length: this.rng.randomInt(8, 14) }, () => {
      const sx = this.rng.randomInt(2, 98);
      const sy = this.rng.randomInt(horizonY + 2, 96);
      const color = this.rng.choice(profile.palette);
      return `<path d="M ${sx} ${sy} q 2 -4 4 0" stroke="${color}" stroke-width="1.4" fill="none" opacity=".7"/>`;
    }).join('');

    const cypressColor = '#14261c';
    const cypress = `<path d="M ${cypressX} ${horizonY + 4} C ${cypressX - 5} ${horizonY - 20}, ${cypressX + 5} ${horizonY - 45}, ${cypressX} ${horizonY - 60} C ${cypressX - 5} ${horizonY - 45}, ${cypressX + 5} ${horizonY - 20}, ${cypressX} ${horizonY + 4} Z" fill="${cypressColor}" opacity=".92"/>`;

    const figure = this.rng.randomBool(0.5) ? this.generatePostImpressionistFigure(profile, horizonY) : '';

    return `${skyRect}${glow}${swirls}${field}${fieldStrokes}${cypress}${figure}`;
  }

  private generatePostImpressionistFigure(profile: StyleProfile, horizonY: number): string {
    const color = this.rng.choice(profile.palette);
    const x = this.rng.randomInt(15, 85);
    const y = this.rng.randomInt(horizonY + 8, 92);
    return `<g stroke="${color}" stroke-width="2" stroke-linecap="round" opacity=".85"><path d="M ${x} ${y} L ${x} ${y - 8}"/><path d="M ${x} ${y - 8} L ${x - 3} ${y - 2}"/><path d="M ${x} ${y - 8} L ${x + 3} ${y - 2}"/><circle cx="${x}" cy="${y - 10}" r="1.6" fill="${color}"/></g>`;
  }

  /**
   * Ansel Adams-inspired silver gelatin landscape: a dramatic black-and-white, high-contrast
   * mountain vista with a soft vignette — evokes large-format zone-system photography without
   * reproducing any specific photograph.
   */
  private generateSilverGelatinScene(profile: StyleProfile, composition?: string): string {
    const sky = this.rng.choice(profile.backgrounds);
    const horizonY = this.rng.randomInt(48, 62);
    const skyRect = `<rect x="0" y="0" width="100" height="100" fill="${sky}"/>`;

    const cloudBand = Array.from({ length: this.rng.randomInt(2, 4) }, () => {
      const cy = this.rng.randomInt(6, horizonY - 8);
      const cw = this.rng.randomInt(30, 60);
      const cx = this.rng.randomInt(0, 100 - cw);
      const shade = this.rng.choice(['#cfcfcf', '#9e9e9e', '#f5f5f5']);
      return `<ellipse cx="${cx + cw / 2}" cy="${cy}" rx="${cw / 2}" ry="${this.rng.randomInt(3, 6)}" fill="${shade}" opacity=".5"/>`;
    }).join('');

    const peakCount = composition === 'clustered' ? 4 : 3;
    const peaks = Array.from({ length: peakCount }, (_, index) => {
      const baseX = (index / peakCount) * 110 - 5 + this.rng.randomInt(-6, 6);
      const peakHeight = this.rng.randomInt(18, 34);
      const width = this.rng.randomInt(28, 42);
      const shade = index % 2 === 0 ? '#1a1a1a' : '#050505';
      return `<polygon points="${baseX - width / 2},${horizonY} ${baseX},${horizonY - peakHeight} ${baseX + width / 2},${horizonY}" fill="${shade}"/>`;
    }).join('');

    const snowCaps = Array.from({ length: peakCount }, (_, index) => {
      const baseX = (index / peakCount) * 110 - 5;
      const peakHeight = this.rng.randomInt(18, 34);
      return `<polygon points="${baseX - 4},${horizonY - peakHeight + 6} ${baseX},${horizonY - peakHeight} ${baseX + 4},${horizonY - peakHeight + 6}" fill="#f5f5f5" opacity=".8"/>`;
    }).join('');

    const foreground = `<rect x="0" y="${horizonY}" width="100" height="${100 - horizonY}" fill="#050505"/>`;
    const foregroundTexture = Array.from({ length: this.rng.randomInt(5, 9) }, () => {
      const tx = this.rng.randomInt(5, 95);
      const ty = this.rng.randomInt(horizonY + 4, 96);
      return `<path d="M ${tx} ${ty} l ${this.rng.randomInt(4, 10)} ${-this.rng.randomInt(1, 3)}" stroke="#3d3d3d" stroke-width="1" opacity=".6"/>`;
    }).join('');

    // Soft vignette to mimic darkroom dodge/burn framing.
    const vignette = `<rect x="0" y="0" width="100" height="100" fill="none" stroke="#050505" stroke-width="14" opacity=".18"/>`;

    return `${skyRect}${cloudBand}${peaks}${snowCaps}${foreground}${foregroundTexture}${vignette}`;
  }

  /** Positions elements according to one of a few composition strategies chosen per artwork. */
  private pickPosition(layout: Layout, index: number, count: number, clusterCenter: { x: number; y: number }): { x: number; y: number } {
    switch (layout) {
      case 'radial': {
        const angle = (index / Math.max(1, count)) * Math.PI * 2 + this.rng.randomFloat(-0.25, 0.25);
        const radius = this.rng.randomInt(20, 38);
        return {
          x: Math.round(50 + Math.cos(angle) * radius),
          y: Math.round(50 + Math.sin(angle) * radius),
        };
      }
      case 'grid': {
        const cols = Math.max(2, Math.ceil(Math.sqrt(count)));
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cellSize = 78 / cols;
        return {
          x: Math.min(92, Math.max(8, Math.round(11 + col * cellSize + this.rng.randomInt(-4, 5)))),
          y: Math.min(92, Math.max(8, Math.round(11 + row * cellSize + this.rng.randomInt(-4, 5)))),
        };
      }
      case 'cluster': {
        return {
          x: Math.min(92, Math.max(5, clusterCenter.x + this.rng.randomInt(-20, 21))),
          y: Math.min(92, Math.max(5, clusterCenter.y + this.rng.randomInt(-20, 21))),
        };
      }
      default:
        return { x: this.rng.randomInt(5, 90), y: this.rng.randomInt(5, 90) };
    }
  }

  private generateMemeCaption(caption: string, color: string, variant: MemeVariant): string {
    const safeCaption = caption.replace(/[<&"]/g, '');
    if (variant === 'poster') return `<rect x="8" y="68" width="84" height="22" fill="${color}" opacity=".9"/><text x="50" y="82" text-anchor="middle" font-family="Impact, sans-serif" font-size="8" fill="#fff6d6">${safeCaption}</text>`;
    if (variant === 'comic') return `<g><path d="M 12 16 Q 50 2 88 16 L 82 38 Q 50 48 18 38 Z" fill="#fff" stroke="${color}" stroke-width="2"/><text x="50" y="28" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#111">${safeCaption}</text></g>`;
    if (variant === 'glitch') return `<text x="50" y="92" text-anchor="middle" font-family="monospace" font-size="6" fill="${color}" opacity=".8">${safeCaption} // ERROR</text>`;
    if (variant === 'diagram') return `<g stroke="${color}" fill="none"><path d="M 15 75 H 85 M 50 62 V 88"/></g><text x="50" y="58" text-anchor="middle" font-family="monospace" font-size="6" fill="${color}">${safeCaption}</text>`;
    if (variant === 'absurd') return `<text x="50" y="94" text-anchor="middle" font-family="serif" font-size="7" font-style="italic" fill="${color}">${safeCaption}?</text>`;
    return `<text x="50" y="94" text-anchor="middle" font-family="Impact, sans-serif" font-size="6" fill="${color}">${safeCaption}</text>`;
  }

  private generateMotif(motif: string, color: string, style: ArtStyle, composition?: string): string {
    if (style === 'minimal') {
      const accent = composition === 'diagonal' ? 'M 18 78 L 82 22' : composition === 'vertical' ? 'M 50 12 V 88' : 'M 12 50 H 88';
      return `<path d="${accent}" fill="none" stroke="${color}" stroke-width="1" opacity=".45"/>`;
    }
    switch (motif) {
      case 'orbit':
        return `<g fill="none" stroke="${color}" opacity=".8"><circle cx="50" cy="50" r="38"/><ellipse cx="50" cy="50" rx="42" ry="14" transform="rotate(32 50 50)"/></g>`;
      case 'star':
        return `<polygon points="50,8 54,18 65,18 56,25 60,36 50,29 40,36 44,25 35,18 46,18" fill="${color}" opacity=".85"/>`;
      case 'wave':
        return `<path d="M 5 82 Q 25 62 45 82 T 85 82" fill="none" stroke="${color}" stroke-width="2" opacity=".8"/>`;
      case 'grid':
        return `<g stroke="${color}" opacity=".35"><path d="M 20 10 V 90 M 40 10 V 90 M 60 10 V 90 M 80 10 V 90"/><path d="M 10 20 H 90 M 10 40 H 90 M 10 60 H 90 M 10 80 H 90"/></g>`;
      default:
        return `<g fill="${color}" opacity=".75"><circle cx="12" cy="12" r="3"/><circle cx="88" cy="88" r="3"/><circle cx="88" cy="12" r="2"/><circle cx="12" cy="88" r="2"/></g>`;
    }
  }

  private generateElement(style: ArtStyle, profile: StyleProfile, index: number, x: number, y: number): string {
    const size = this.rng.randomInt(8, 30);
    const color = profile.palette[this.rng.randomInt(0, profile.palette.length - 1)];
    const radius = Math.ceil(size / 2);
    const rotation = this.rng.randomInt(0, 360);
    const opacity = this.rng.randomFloat(.55, .9).toFixed(2);

    switch (style) {
      case 'geometric':
        return `<g transform="rotate(${rotation} ${x} ${y})"><rect x="${x}" y="${y}" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${this.rng.randomInt(1, 4)}"/><line x1="${x}" y1="${y}" x2="${x + size}" y2="${y + size}" stroke="${color}" opacity="${opacity}"/></g>`;
      case 'surreal':
        return `<g transform="rotate(${rotation} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${radius + this.rng.randomInt(0, 12)}" ry="${Math.max(3, Math.ceil(size / 5))}" fill="${color}" opacity="${opacity}"/><circle cx="${x + radius}" cy="${y - radius}" r="${this.rng.randomInt(2, 7)}" fill="#f8f4ff"/></g>`;
      case 'minimal':
        return `<line x1="${this.rng.randomInt(12, 45)}" y1="${this.rng.randomInt(15, 85)}" x2="${this.rng.randomInt(55, 90)}" y2="${this.rng.randomInt(15, 85)}" stroke="${color}" stroke-width="${this.rng.randomInt(1, 4)}" opacity="${opacity}"/>`;
      case 'organic':
        return `<path d="M ${x - radius} ${y} Q ${x} ${y - size} ${x + radius} ${y} Q ${x} ${y + size} ${x - radius} ${y}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})"/>`;
      case 'chaotic':
        return `<path d="M ${x} ${y} l ${size} ${-radius} l ${-radius} ${size} l ${size} ${radius} z" fill="none" stroke="${color}" stroke-width="${this.rng.randomInt(1, 4)}" transform="rotate(${rotation} ${x} ${y})"/>`;
      case 'digital':
        return `<g shape-rendering="crispEdges" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})"><rect x="${x}" y="${y}" width="${size}" height="${Math.max(3, Math.ceil(size / 4))}" fill="${color}"/><rect x="${x + Math.ceil(size / 3)}" y="${y + Math.ceil(size / 3)}" width="${Math.max(3, Math.ceil(size / 5))}" height="${Math.max(3, Math.ceil(size / 4))}" fill="${color}"/></g>`;
      case 'expressionist':
        return `<path d="M ${x - radius} ${y + radius} C ${x} ${y - size}, ${x + size} ${y + size}, ${x + radius} ${y - radius}" fill="none" stroke="${color}" stroke-width="${this.rng.randomInt(2, 8)}" stroke-linecap="round" opacity="${opacity}" transform="rotate(${rotation} ${x} ${y})"/>`;
      case 'abstract':
        return `<g transform="rotate(${index * 31} ${x} ${y})"><polygon points="${x},${y - size} ${x + radius},${y} ${x},${y + radius} ${x - radius},${y}" fill="${color}" opacity=".75"/><circle cx="${x}" cy="${y}" r="${Math.max(2, Math.ceil(radius / 3))}" fill="#f8f4ff"/></g>`;
      case 'cubist':
        return `<polygon points="${x},${y} ${x + size},${y - radius} ${x + size - radius},${y + size} ${x - radius},${y + radius}" fill="${color}" opacity=".78"/><line x1="${x}" y1="${y}" x2="${x + size - radius}" y2="${y + size}" stroke="#fefae0"/>`;
      case 'impressionist':
        return `<g fill="${color}" opacity="${opacity}">${Array.from({ length: this.rng.randomInt(4, 10) }, () => `<circle cx="${x + this.rng.randomInt(-4, 12)}" cy="${y + this.rng.randomInt(-4, 12)}" r="${Math.max(1, this.rng.randomInt(1, 4))}"/>`).join('')}</g>`;
      case 'bauhaus':
        return index % 2 === 0
          ? `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/><rect x="${x - radius}" y="${y}" width="${size}" height="2" fill="#f6efe2"/>`
          : `<rect x="${x}" y="${y}" width="${size}" height="${radius}" fill="${color}"/>`;
      case 'collage':
        return `<g transform="rotate(${index * 17} ${x} ${y})"><rect x="${x}" y="${y}" width="${size}" height="${radius}" fill="${color}"/><path d="M ${x} ${y + radius} l ${size} ${-radius}" stroke="#f8f4ff" stroke-width="2"/></g>`;
      case 'meme':
        return `<g transform="rotate(${rotation} ${x} ${y})"><rect x="${x}" y="${y}" width="${size + 8}" height="${Math.max(8, Math.ceil(size / 2))}" rx="2" fill="${color}" opacity="${opacity}"/></g>`;
      // Scene-based styles are rendered by dedicated generators in `generateArt()` and never reach
      // this per-element loop, but the cases must exist so this exhaustive switch type-checks.
      case 'pastoral':
      case 'post_impressionist':
      case 'silver_gelatin':
        return '';
    }
  }
}
