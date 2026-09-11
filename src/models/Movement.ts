/**
 * Movement Model
 * 
 * Represents an artistic movement that emerges from agent interactions.
 * Tracks dominant styles, influence, and historical context.
 */

import { ArtStyle } from './Artwork';

export interface Movement {
  id: string;
  name: string;
  style: ArtStyle;
  description: string;
  createdAtTurn: number;
  prominence: number; // 0-100
  artworkCount: number;
  averageScore: number;
  influentialArtists: string[];
}

export function createMovement(
  id: string,
  name: string,
  style: ArtStyle,
  description: string,
  turn: number
): Movement {
  return {
    id,
    name,
    style,
    description,
    createdAtTurn: turn,
    prominence: 30,
    artworkCount: 0,
    averageScore: 0,
    influentialArtists: [],
  };
}

export function generateMovementName(style: ArtStyle, turn: number): string {
  const prefixes = ['Neo-', 'Post-', 'Ultra-', 'Meta-', 'Proto-', 'Trans-', 'Cyber-', 'Retro-'];
  const suffixes = ['ism', 'ity', 'ism', 'ism', 'ism', 'ism', 'ism', 'wave', 'era', 'era'];

  const styleBases: Record<ArtStyle, string> = {
    geometric: 'Geometr',
    surreal: 'Surreal',
    minimal: 'Minimal',
    organic: 'Organic',
    chaotic: 'Chaot',
    digital: 'Digital',
    expressionist: 'Expressi',
    abstract: 'Abstr',
    cubist: 'Cub',
    impressionist: 'Impress',
    bauhaus: 'Bau',
    collage: 'Collag',
    meme: 'Meme',
  };

  const base = styleBases[style];
  const prefix = prefixes[turn % prefixes.length];
  const suffix = suffixes[turn % suffixes.length];

  return `${prefix}${base}${suffix}`;
}
