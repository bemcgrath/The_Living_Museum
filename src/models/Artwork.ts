/**
 * Artwork Model
 * 
 * Represents a piece of art in the museum.
 * Each artwork has metadata, visual representation, and lifecycle status.
 */

export type ArtworkStatus = 'submitted' | 'displayed' | 'rejected' | 'acquired';

export type ArtStyle = 
  | 'geometric' 
  | 'surreal' 
  | 'minimal' 
  | 'organic' 
  | 'chaotic' 
  | 'digital' 
  | 'expressionist'
  | 'abstract'
  | 'cubist'
  | 'impressionist'
  | 'bauhaus'
  | 'collage'
  | 'meme'
  | 'post_impressionist'
  | 'pastoral'
  | 'silver_gelatin';

export type MemeVariant = 'slogan' | 'poster' | 'comic' | 'glitch' | 'diagram' | 'absurd';

export const ART_STYLES: ArtStyle[] = [
  'geometric', 'surreal', 'minimal', 'organic', 'chaotic', 'digital',
  'expressionist', 'abstract', 'cubist', 'impressionist', 'bauhaus', 'collage', 'meme',
  'post_impressionist', 'pastoral', 'silver_gelatin',
];

const STYLE_LABEL_OVERRIDES: Partial<Record<ArtStyle, string>> = {
  impressionist: 'Impressionist (Monet-inspired)',
  post_impressionist: 'Post-Impressionist',
  pastoral: 'Pastoral (Wyeth-inspired)',
  silver_gelatin: 'Silver Gelatin (Ansel Adams-inspired)',
};

/** Friendly, title-cased display name for a style, used anywhere a raw style id would otherwise leak into the UI (e.g. "post_impressionist"). */
export function styleLabel(style: string): string {
  const override = STYLE_LABEL_OVERRIDES[style as ArtStyle];
  if (override) return override;
  return style.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export interface ArtworkHistoryEntry {
  turn: number;
  eventType: string;
  agent: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  style: ArtStyle;
  description: string;
  createdAtTurn: number;
  criticScore: number | null;
  status: ArtworkStatus;
  svgData: string; // SVG representation
  seed: number; // For reproducible generation
  marketValue: number;
  acquiredBy?: string;
  signatureMotif?: string;
  inspiration?: string;
  memeVariant?: MemeVariant;
  compositionSignature?: string;
  history: ArtworkHistoryEntry[];
}

export function createArtwork(
  id: string,
  title: string,
  artist: string,
  style: ArtStyle,
  description: string,
  turn: number,
  seed: number,
  svgData: string
): Artwork {
  const signatureMotif = svgData.match(/data-motif="([^"]*)"/)?.[1] || undefined;
  const inspiration = svgData.match(/data-inspiration="([^"]*)"/)?.[1] || undefined;
  const memeVariant = svgData.match(/data-meme-variant="([^"]*)"/)?.[1] as MemeVariant | undefined;
  const compositionSignature = svgData.match(/data-composition="([^"]*)"/)?.[1] || undefined;
  return {
    id,
    title,
    artist,
    style,
    description,
    createdAtTurn: turn,
    criticScore: null,
    status: 'submitted',
    svgData,
    seed,
    marketValue: 0,
    signatureMotif,
    inspiration,
    memeVariant,
    compositionSignature,
    history: [{
      turn,
      eventType: 'artwork_submitted',
      agent: artist,
      description: `${title} was submitted in the ${style} style.`,
      data: { style },
    }],
  };
}
