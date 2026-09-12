/**
 * Genre-themed artist rosters for starting a new collection with a specific style focus.
 *
 * Choosing a style (instead of "Surprise me") invites this style's 3 profiles as the collection's
 * artists, so a genre-locked run reads as a room full of kindred artists rather than the generic
 * default trio forced into an unrelated style. Real names are used purely as personality/flavor
 * inspiration for historically significant, long-deceased figures associated with that movement —
 * the simulation never reproduces any specific artwork, only generates its own procedural pieces
 * (see ArtGenerator). Styles with no clean real-world movement (chaotic, digital, meme) use invented
 * personas, consistent with the rest of the roster (Ada, Vex, Lumen, ...).
 *
 * Each artist is still created with this style as its forced primaryStyle (see App.tsx), so the
 * personality text here is flavor only — it does not drive style selection the way it does for the
 * default/invited roster in Artist.ts.
 */
import { ArtStyle } from '../models/Artwork';

export interface GenreProfile {
  name: string;
  personality: string;
}

export const GENRE_PROFILES: Record<ArtStyle, GenreProfile[]> = {
  impressionist: [
    { name: 'Oscar', personality: 'Luminous and impressionist, in the spirit of Monet' },
    { name: 'Pierre', personality: 'Warm and sociable impressionist, in the spirit of Renoir' },
    { name: 'Edgar', personality: 'Precise and observant impressionist, in the spirit of Degas' },
  ],
  post_impressionist: [
    { name: 'Vincent', personality: 'Painterly and post-impressionist, in the spirit of Van Gogh' },
    { name: 'Paul', personality: 'Structured and searching post-impressionist, in the spirit of Cézanne' },
    { name: 'Georges', personality: 'Meticulous pointillist post-impressionist, in the spirit of Seurat' },
  ],
  pastoral: [
    { name: 'Wren', personality: 'Wistful and pastoral, in the spirit of Andrew Wyeth' },
    { name: 'John', personality: 'Atmospheric and pastoral, in the spirit of Constable' },
    { name: 'Jean-François', personality: 'Rustic and pastoral, in the spirit of Millet' },
  ],
  silver_gelatin: [
    { name: 'Ansel', personality: 'Patient and monochrome, in the spirit of Ansel Adams photography' },
    { name: 'Edward', personality: 'Sharp-focus monochrome, in the spirit of Edward Weston' },
    { name: 'Dorothea', personality: 'Documentary monochrome, in the spirit of Dorothea Lange' },
  ],
  cubist: [
    { name: 'Pablo', personality: 'Fractured and bold cubist, in the spirit of Picasso' },
    { name: 'Georges', personality: 'Analytical and muted cubist, in the spirit of Braque' },
    { name: 'Juan', personality: 'Crystalline cubist, in the spirit of Juan Gris' },
  ],
  surreal: [
    { name: 'Salvador', personality: 'Dreamlike and surreal, in the spirit of Dalí' },
    { name: 'René', personality: 'Puzzling and surreal, in the spirit of Magritte' },
    { name: 'Max', personality: 'Uncanny and surreal, in the spirit of Max Ernst' },
  ],
  expressionist: [
    { name: 'Edvard', personality: 'Raw and expressionist, in the spirit of Munch' },
    { name: 'Ernst', personality: 'Angular and expressionist, in the spirit of Kirchner' },
    { name: 'Egon', personality: 'Intense and expressionist, in the spirit of Schiele' },
  ],
  abstract: [
    { name: 'Wassily', personality: 'Musical and abstract, in the spirit of Kandinsky' },
    { name: 'Mark', personality: 'Meditative color-field abstract, in the spirit of Rothko' },
    { name: 'Jackson', personality: 'Energetic abstract, in the spirit of Pollock' },
  ],
  bauhaus: [
    { name: 'Paul', personality: 'Whimsical bauhaus, in the spirit of Klee' },
    { name: 'László', personality: 'Experimental bauhaus, in the spirit of Moholy-Nagy' },
    { name: 'Josef', personality: 'Precise geometric bauhaus, in the spirit of Albers' },
  ],
  geometric: [
    { name: 'Piet', personality: 'Ordered and geometric, in the spirit of Mondrian' },
    { name: 'Kazimir', personality: 'Radical and geometric, in the spirit of Malevich' },
    { name: 'Victor', personality: 'Optical and geometric, in the spirit of Vasarely' },
  ],
  minimal: [
    { name: 'Agnes', personality: 'Disciplined and minimal, in the spirit of Agnes Martin' },
    { name: 'Donald', personality: 'Restrained and minimal, in the spirit of Donald Judd' },
    { name: 'Ellsworth', personality: 'Clean and minimal, in the spirit of Ellsworth Kelly' },
  ],
  organic: [
    { name: 'Georgia', personality: "Sensuous and organic, in the spirit of O'Keeffe" },
    { name: 'Henry', personality: 'Sculptural and organic, in the spirit of Henry Moore' },
    { name: 'Jean', personality: 'Biomorphic and organic, in the spirit of Jean Arp' },
  ],
  collage: [
    { name: 'Hannah', personality: 'Sharp political collage, in the spirit of Hannah Höch' },
    { name: 'Kurt', personality: 'Found-material collage, in the spirit of Kurt Schwitters' },
    { name: 'Romare', personality: 'Vibrant narrative collage, in the spirit of Romare Bearden' },
  ],
  chaotic: [
    { name: 'Riot', personality: 'Untamed and chaotic, chasing collision and noise' },
    { name: 'Static', personality: 'Restless and chaotic, drawn to friction and overload' },
    { name: 'Frenzy', personality: 'Volatile and chaotic, working fast and loud' },
  ],
  digital: [
    { name: 'Byte', personality: 'Precise and digital, fluent in circuitry and glow' },
    { name: 'Vector', personality: 'Futurist and digital, chasing signal and light' },
    { name: 'Cipher', personality: 'Systematic and digital, building from code and pattern' },
  ],
  meme: [
    { name: 'Blip', personality: 'Absurd and meme-driven, chasing whatever is viral right now' },
    { name: 'Echo', personality: 'Ironic and meme-driven, remixing what everyone already knows' },
    { name: 'Bit', personality: 'Deadpan and meme-driven, turning captions into punchlines' },
  ],
};
