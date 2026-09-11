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
};

export class ArtGenerator {
  private readonly rng: RandomGenerator;

  constructor(seed: number) {
    this.rng = new RandomGenerator(seed);
  }

  generateArt(style: ArtStyle, motif?: string, caption?: string, inspiration?: string, memeVariant?: MemeVariant, composition?: string): string {
    const profile = STYLE_PROFILES[style];
    // Vary background + layout per artwork so pieces sharing a style aren't near-duplicates.
    const background = this.rng.choice(profile.backgrounds);
    const layout: Layout = this.rng.choice(['scatter', 'radial', 'grid', 'cluster']);
    const clusterCenter = { x: this.rng.randomInt(28, 72), y: this.rng.randomInt(28, 72) };
    const count = Math.max(1, profile.count + this.rng.randomInt(-1, 2));
    const shapes = Array.from({ length: count }, (_, index) => {
      const { x, y } = this.pickPosition(layout, index, count, clusterCenter);
      return this.generateElement(style, profile, index, x, y);
    }).join('');
    const signature = motif ? this.generateMotif(motif, profile.palette[0], style, composition) : '';
    const captionMarkup = style === 'meme' ? this.generateMemeCaption(caption ?? 'LOL', profile.palette[0], memeVariant ?? 'slogan') : '';
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${style} procedural artwork" data-motif="${motif ?? ''}" data-caption="${caption ?? ''}" data-inspiration="${inspiration ?? ''}" data-meme-variant="${memeVariant ?? ''}" data-composition="${composition ?? ''}" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="${background}"/>${shapes}${signature}${captionMarkup}</svg>`;
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
    }
  }
}
