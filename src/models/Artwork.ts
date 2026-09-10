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
  | 'abstract';

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  style: ArtStyle;
  description: string;
  createdAtTurn: number;
  criticScore: number | null;
  collectorValue: number | null;
  status: ArtworkStatus;
  svgData: string; // SVG representation
  seed: number; // For reproducible generation
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
  return {
    id,
    title,
    artist,
    style,
    description,
    createdAtTurn: turn,
    criticScore: null,
    collectorValue: null,
    status: 'submitted',
    svgData,
    seed,
  };
}
