/**
 * Genre-themed artist rosters for starting a new collection with a specific style focus, and a
 * curated "search for your favorite artist" index built on top of the same data.
 *
 * Choosing a style (instead of "Surprise me") invites that style's first 3 profiles as the
 * collection's artists, so a genre-locked run reads as a room full of kindred artists rather than
 * the generic default trio forced into an unrelated style. `realName` records which historically
 * significant, long-deceased figure inspired each profile, purely so the image generator can be
 * told "in the spirit of <realName>" (see lib/server/prompt.ts) and so a search for that name finds
 * the right profile (findArtistByName) — it is an internal reference only and is never rendered
 * anywhere a user would see it (no UI text, no email copy, no API response). `personality`, which IS
 * displayed, deliberately contains no names — just mood/technique descriptors. The simulation never
 * reproduces any specific artwork, only generates its own procedural or AI pieces (see ArtGenerator,
 * lib/server/imageProvider.ts). Styles with no clean real-world movement (chaotic, digital, meme)
 * use invented personas, consistent with the rest of the roster (Ada, Vex, Lumen, ...) — for those,
 * realName is just the persona's own name.
 *
 * Each style lists more than 3 profiles — the extras beyond the first 3 exist purely so
 * findArtistByName() can recognize more searched names than fit the default roster. Searching for
 * one of them (e.g. "Cassatt") swaps them into the roster in place of one of the front 3 via
 * rosterForStyle(), rather than silently ignoring the search. This is a curated, offline index, not
 * live research — an unrecognized name is reported as such rather than guessed at (see App.tsx).
 *
 * Each artist is still created with its style as its forced primaryStyle (see App.tsx), so the
 * personality text here is flavor only — it does not drive style selection the way it does for the
 * default/invited roster in Artist.ts.
 */
import { ArtStyle, ART_STYLES } from '../models/Artwork';

export interface GenreProfile {
  /** Short display name used as the agent's name in the simulation. */
  name: string;
  /** Flavor text shown as the agent's personality — deliberately names no real person. */
  personality: string;
  /** Internal only — the real historical figure (or, for invented personas, same as `name`) used to
   *  build image prompts and match searches. Never render this to a user. */
  realName: string;
}

export const GENRE_PROFILES: Record<ArtStyle, GenreProfile[]> = {
  impressionist: [
    { name: 'Oscar', personality: 'Luminous and impressionist', realName: 'Claude Monet' },
    { name: 'Pierre', personality: 'Warm and sociable impressionist', realName: 'Pierre-Auguste Renoir' },
    { name: 'Edgar', personality: 'Precise and observant impressionist', realName: 'Edgar Degas' },
    { name: 'Berthe', personality: 'Intimate domestic impressionist', realName: 'Berthe Morisot' },
    { name: 'Camille', personality: 'Rural light-filled impressionist', realName: 'Camille Pissarro' },
    { name: 'Mary', personality: 'Tender domestic impressionist', realName: 'Mary Cassatt' },
  ],
  post_impressionist: [
    { name: 'Vincent', personality: 'Painterly and post-impressionist', realName: 'Vincent van Gogh' },
    { name: 'Paul', personality: 'Structured and searching post-impressionist', realName: 'Paul Cézanne' },
    { name: 'Georges', personality: 'Meticulous pointillist post-impressionist', realName: 'Georges Seurat' },
    { name: 'Eugène', personality: 'Bold symbolist post-impressionist', realName: 'Paul Gauguin' },
    { name: 'Henri', personality: 'Theatrical post-impressionist', realName: 'Henri de Toulouse-Lautrec' },
  ],
  pastoral: [
    { name: 'Wren', personality: 'Wistful and pastoral', realName: 'Andrew Wyeth' },
    { name: 'John', personality: 'Atmospheric and pastoral', realName: 'John Constable' },
    { name: 'Jean-François', personality: 'Rustic and pastoral', realName: 'Jean-François Millet' },
    { name: 'Winslow', personality: 'Weathered maritime pastoral', realName: 'Winslow Homer' },
    { name: 'Camille', personality: 'Silvery atmospheric pastoral', realName: 'Jean-Baptiste-Camille Corot' },
  ],
  silver_gelatin: [
    { name: 'Ansel', personality: 'Patient and monochrome photography', realName: 'Ansel Adams' },
    { name: 'Edward', personality: 'Sharp-focus monochrome photography', realName: 'Edward Weston' },
    { name: 'Dorothea', personality: 'Documentary monochrome photography', realName: 'Dorothea Lange' },
    { name: 'Imogen', personality: 'Intimate botanical monochrome', realName: 'Imogen Cunningham' },
    { name: 'Minor', personality: 'Symbolic contemplative monochrome', realName: 'Minor White' },
  ],
  cubist: [
    { name: 'Pablo', personality: 'Fractured and bold cubist', realName: 'Pablo Picasso' },
    { name: 'Georges', personality: 'Analytical and muted cubist', realName: 'Georges Braque' },
    { name: 'Juan', personality: 'Crystalline cubist', realName: 'Juan Gris' },
    { name: 'Fernand', personality: 'Mechanical bold cubist', realName: 'Fernand Léger' },
    { name: 'María', personality: 'Softened cubist', realName: 'María Blanchard' },
  ],
  surreal: [
    { name: 'Salvador', personality: 'Dreamlike and surreal', realName: 'Salvador Dalí' },
    { name: 'René', personality: 'Puzzling and surreal', realName: 'René Magritte' },
    { name: 'Max', personality: 'Uncanny and surreal', realName: 'Max Ernst' },
    { name: 'Frida', personality: 'Symbolic personal surrealist', realName: 'Frida Kahlo' },
    { name: 'Joan', personality: 'Playful biomorphic surrealist', realName: 'Joan Miró' },
  ],
  expressionist: [
    { name: 'Edvard', personality: 'Raw and expressionist', realName: 'Edvard Munch' },
    { name: 'Ernst', personality: 'Angular and expressionist', realName: 'Ernst Ludwig Kirchner' },
    { name: 'Egon', personality: 'Intense and expressionist', realName: 'Egon Schiele' },
    { name: 'Franz', personality: 'Symbolic animal expressionist', realName: 'Franz Marc' },
    { name: 'Käthe', personality: 'Somber social expressionist', realName: 'Käthe Kollwitz' },
  ],
  abstract: [
    { name: 'Wassily', personality: 'Musical and abstract', realName: 'Wassily Kandinsky' },
    { name: 'Mark', personality: 'Meditative color-field abstract', realName: 'Mark Rothko' },
    { name: 'Jackson', personality: 'Energetic abstract', realName: 'Jackson Pollock' },
    { name: 'Joan', personality: 'Gestural color-field abstract', realName: 'Joan Mitchell' },
    { name: 'Willem', personality: 'Forceful gestural abstract', realName: 'Willem de Kooning' },
  ],
  bauhaus: [
    { name: 'Paul', personality: 'Whimsical bauhaus', realName: 'Paul Klee' },
    { name: 'László', personality: 'Experimental bauhaus', realName: 'László Moholy-Nagy' },
    { name: 'Josef', personality: 'Precise geometric bauhaus', realName: 'Josef Albers' },
    { name: 'Anni', personality: 'Textile-minded bauhaus', realName: 'Anni Albers' },
    { name: 'Marianne', personality: 'Industrial bauhaus', realName: 'Marianne Brandt' },
  ],
  geometric: [
    { name: 'Piet', personality: 'Ordered and geometric', realName: 'Piet Mondrian' },
    { name: 'Kazimir', personality: 'Radical and geometric', realName: 'Kazimir Malevich' },
    { name: 'Victor', personality: 'Optical and geometric', realName: 'Victor Vasarely' },
    { name: 'Theo', personality: 'Rigorous geometric', realName: 'Theo van Doesburg' },
    { name: 'Bridget', personality: 'Precise optical geometric', realName: 'Bridget Riley' },
  ],
  minimal: [
    { name: 'Agnes', personality: 'Disciplined and minimal', realName: 'Agnes Martin' },
    { name: 'Donald', personality: 'Restrained and minimal', realName: 'Donald Judd' },
    { name: 'Ellsworth', personality: 'Clean and minimal', realName: 'Ellsworth Kelly' },
    { name: 'Frank', personality: 'Bold-edged minimal', realName: 'Frank Stella' },
    { name: 'Dan', personality: 'Luminous minimal', realName: 'Dan Flavin' },
  ],
  organic: [
    { name: 'Georgia', personality: 'Sensuous and organic', realName: "Georgia O'Keeffe" },
    { name: 'Henry', personality: 'Sculptural and organic', realName: 'Henry Moore' },
    { name: 'Jean', personality: 'Biomorphic and organic', realName: 'Jean Arp' },
    { name: 'Barbara', personality: 'Sculptural organic, drawn to negative space', realName: 'Barbara Hepworth' },
    { name: 'Constantin', personality: 'Reductive and essential organic', realName: 'Constantin Brâncuși' },
  ],
  collage: [
    { name: 'Hannah', personality: 'Sharp political collage', realName: 'Hannah Höch' },
    { name: 'Kurt', personality: 'Found-material collage', realName: 'Kurt Schwitters' },
    { name: 'Romare', personality: 'Vibrant narrative collage', realName: 'Romare Bearden' },
    { name: 'Robert', personality: 'Found-object collage, mixed media', realName: 'Robert Rauschenberg' },
    { name: 'Eduardo', personality: 'Pop-inflected collage', realName: 'Eduardo Paolozzi' },
  ],
  chaotic: [
    { name: 'Riot', personality: 'Untamed and chaotic, chasing collision and noise', realName: 'Riot' },
    { name: 'Static', personality: 'Restless and chaotic, drawn to friction and overload', realName: 'Static' },
    { name: 'Frenzy', personality: 'Volatile and chaotic, working fast and loud', realName: 'Frenzy' },
  ],
  digital: [
    { name: 'Byte', personality: 'Precise and digital, fluent in circuitry and glow', realName: 'Byte' },
    { name: 'Vector', personality: 'Futurist and digital, chasing signal and light', realName: 'Vector' },
    { name: 'Cipher', personality: 'Systematic and digital, building from code and pattern', realName: 'Cipher' },
  ],
  meme: [
    { name: 'Blip', personality: 'Absurd and meme-driven, chasing whatever is viral right now', realName: 'Blip' },
    { name: 'Echo', personality: 'Ironic and meme-driven, remixing what everyone already knows', realName: 'Echo' },
    { name: 'Bit', personality: 'Deadpan and meme-driven, turning captions into punchlines', realName: 'Bit' },
  ],
};

/** The roster used when a style is chosen with no particular artist searched for. */
export function defaultRosterForStyle(style: ArtStyle): GenreProfile[] {
  return GENRE_PROFILES[style].slice(0, 3);
}

/**
 * The roster for a style, guaranteeing `prioritize` is included (used after an artist search) —
 * `prioritize` first, then the style's other default profiles filling the remaining slots. Falls
 * back to the plain default roster if `prioritize` doesn't actually belong to this style.
 */
export function rosterForStyle(style: ArtStyle, prioritize?: GenreProfile | null): GenreProfile[] {
  const all = GENRE_PROFILES[style];
  if (!prioritize || !all.includes(prioritize)) return all.slice(0, 3);
  return [prioritize, ...all.filter((profile) => profile !== prioritize)].slice(0, 3);
}

/**
 * Looks up a searched artist name against the curated roster above. Matches on a substring of the
 * real name (case-insensitive) or an exact display-name match. This is a curated, offline index —
 * not live research — so an unrecognized name simply returns null rather than guessing.
 */
export function findArtistByName(query: string): { style: ArtStyle; profile: GenreProfile } | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  for (const style of ART_STYLES) {
    const profile = GENRE_PROFILES[style].find(
      (candidate) => candidate.realName.toLowerCase().includes(normalized) || candidate.name.toLowerCase() === normalized,
    );
    if (profile) return { style, profile };
  }
  return null;
}
