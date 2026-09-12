/**
 * Genre-themed artist rosters for starting a new collection with a specific style focus, and a
 * curated "search for your favorite artist" index built on top of the same data.
 *
 * Choosing a style (instead of "Surprise me") invites that style's first 3 profiles as the
 * collection's artists, so a genre-locked run reads as a room full of kindred artists rather than
 * the generic default trio forced into an unrelated style. Real names are used purely as
 * personality/flavor inspiration for historically significant, long-deceased figures associated
 * with that movement — the simulation never reproduces any specific artwork, only generates its own
 * procedural pieces (see ArtGenerator). Styles with no clean real-world movement (chaotic, digital,
 * meme) use invented personas, consistent with the rest of the roster (Ada, Vex, Lumen, ...).
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
  /** Flavor text shown as the agent's personality. */
  personality: string;
  /** Full name (or, for invented personas, the same as `name`) used for search matching. */
  realName: string;
}

export const GENRE_PROFILES: Record<ArtStyle, GenreProfile[]> = {
  impressionist: [
    { name: 'Oscar', personality: 'Luminous and impressionist, in the spirit of Monet', realName: 'Claude Monet' },
    { name: 'Pierre', personality: 'Warm and sociable impressionist, in the spirit of Renoir', realName: 'Pierre-Auguste Renoir' },
    { name: 'Edgar', personality: 'Precise and observant impressionist, in the spirit of Degas', realName: 'Edgar Degas' },
    { name: 'Berthe', personality: 'Intimate domestic impressionist, in the spirit of Morisot', realName: 'Berthe Morisot' },
    { name: 'Camille', personality: 'Rural light-filled impressionist, in the spirit of Pissarro', realName: 'Camille Pissarro' },
    { name: 'Mary', personality: 'Tender domestic impressionist, in the spirit of Cassatt', realName: 'Mary Cassatt' },
  ],
  post_impressionist: [
    { name: 'Vincent', personality: 'Painterly and post-impressionist, in the spirit of Van Gogh', realName: 'Vincent van Gogh' },
    { name: 'Paul', personality: 'Structured and searching post-impressionist, in the spirit of Cézanne', realName: 'Paul Cézanne' },
    { name: 'Georges', personality: 'Meticulous pointillist post-impressionist, in the spirit of Seurat', realName: 'Georges Seurat' },
    { name: 'Eugène', personality: 'Bold symbolist post-impressionist, in the spirit of Gauguin', realName: 'Paul Gauguin' },
    { name: 'Henri', personality: 'Theatrical post-impressionist, in the spirit of Toulouse-Lautrec', realName: 'Henri de Toulouse-Lautrec' },
  ],
  pastoral: [
    { name: 'Wren', personality: 'Wistful and pastoral, in the spirit of Andrew Wyeth', realName: 'Andrew Wyeth' },
    { name: 'John', personality: 'Atmospheric and pastoral, in the spirit of Constable', realName: 'John Constable' },
    { name: 'Jean-François', personality: 'Rustic and pastoral, in the spirit of Millet', realName: 'Jean-François Millet' },
    { name: 'Winslow', personality: 'Weathered maritime pastoral, in the spirit of Winslow Homer', realName: 'Winslow Homer' },
    { name: 'Camille', personality: 'Silvery atmospheric pastoral, in the spirit of Corot', realName: 'Jean-Baptiste-Camille Corot' },
  ],
  silver_gelatin: [
    { name: 'Ansel', personality: 'Patient and monochrome, in the spirit of Ansel Adams photography', realName: 'Ansel Adams' },
    { name: 'Edward', personality: 'Sharp-focus monochrome, in the spirit of Edward Weston', realName: 'Edward Weston' },
    { name: 'Dorothea', personality: 'Documentary monochrome, in the spirit of Dorothea Lange', realName: 'Dorothea Lange' },
    { name: 'Imogen', personality: 'Intimate botanical monochrome, in the spirit of Imogen Cunningham', realName: 'Imogen Cunningham' },
    { name: 'Minor', personality: 'Symbolic contemplative monochrome, in the spirit of Minor White', realName: 'Minor White' },
  ],
  cubist: [
    { name: 'Pablo', personality: 'Fractured and bold cubist, in the spirit of Picasso', realName: 'Pablo Picasso' },
    { name: 'Georges', personality: 'Analytical and muted cubist, in the spirit of Braque', realName: 'Georges Braque' },
    { name: 'Juan', personality: 'Crystalline cubist, in the spirit of Juan Gris', realName: 'Juan Gris' },
    { name: 'Fernand', personality: 'Mechanical bold cubist, in the spirit of Léger', realName: 'Fernand Léger' },
    { name: 'María', personality: 'Softened cubist, in the spirit of María Blanchard', realName: 'María Blanchard' },
  ],
  surreal: [
    { name: 'Salvador', personality: 'Dreamlike and surreal, in the spirit of Dalí', realName: 'Salvador Dalí' },
    { name: 'René', personality: 'Puzzling and surreal, in the spirit of Magritte', realName: 'René Magritte' },
    { name: 'Max', personality: 'Uncanny and surreal, in the spirit of Max Ernst', realName: 'Max Ernst' },
    { name: 'Frida', personality: 'Symbolic personal surrealist, in the spirit of Frida Kahlo', realName: 'Frida Kahlo' },
    { name: 'Joan', personality: 'Playful biomorphic surrealist, in the spirit of Miró', realName: 'Joan Miró' },
  ],
  expressionist: [
    { name: 'Edvard', personality: 'Raw and expressionist, in the spirit of Munch', realName: 'Edvard Munch' },
    { name: 'Ernst', personality: 'Angular and expressionist, in the spirit of Kirchner', realName: 'Ernst Ludwig Kirchner' },
    { name: 'Egon', personality: 'Intense and expressionist, in the spirit of Schiele', realName: 'Egon Schiele' },
    { name: 'Franz', personality: 'Symbolic animal expressionist, in the spirit of Franz Marc', realName: 'Franz Marc' },
    { name: 'Käthe', personality: 'Somber social expressionist, in the spirit of Kollwitz', realName: 'Käthe Kollwitz' },
  ],
  abstract: [
    { name: 'Wassily', personality: 'Musical and abstract, in the spirit of Kandinsky', realName: 'Wassily Kandinsky' },
    { name: 'Mark', personality: 'Meditative color-field abstract, in the spirit of Rothko', realName: 'Mark Rothko' },
    { name: 'Jackson', personality: 'Energetic abstract, in the spirit of Pollock', realName: 'Jackson Pollock' },
    { name: 'Joan', personality: 'Gestural color-field abstract, in the spirit of Joan Mitchell', realName: 'Joan Mitchell' },
    { name: 'Willem', personality: 'Forceful gestural abstract, in the spirit of de Kooning', realName: 'Willem de Kooning' },
  ],
  bauhaus: [
    { name: 'Paul', personality: 'Whimsical bauhaus, in the spirit of Klee', realName: 'Paul Klee' },
    { name: 'László', personality: 'Experimental bauhaus, in the spirit of Moholy-Nagy', realName: 'László Moholy-Nagy' },
    { name: 'Josef', personality: 'Precise geometric bauhaus, in the spirit of Albers', realName: 'Josef Albers' },
    { name: 'Anni', personality: 'Textile-minded bauhaus, in the spirit of Anni Albers', realName: 'Anni Albers' },
    { name: 'Marianne', personality: 'Industrial bauhaus, in the spirit of Marianne Brandt', realName: 'Marianne Brandt' },
  ],
  geometric: [
    { name: 'Piet', personality: 'Ordered and geometric, in the spirit of Mondrian', realName: 'Piet Mondrian' },
    { name: 'Kazimir', personality: 'Radical and geometric, in the spirit of Malevich', realName: 'Kazimir Malevich' },
    { name: 'Victor', personality: 'Optical and geometric, in the spirit of Vasarely', realName: 'Victor Vasarely' },
    { name: 'Theo', personality: 'Rigorous geometric, in the spirit of van Doesburg', realName: 'Theo van Doesburg' },
    { name: 'Bridget', personality: 'Optical geometric, in the spirit of Bridget Riley', realName: 'Bridget Riley' },
  ],
  minimal: [
    { name: 'Agnes', personality: 'Disciplined and minimal, in the spirit of Agnes Martin', realName: 'Agnes Martin' },
    { name: 'Donald', personality: 'Restrained and minimal, in the spirit of Donald Judd', realName: 'Donald Judd' },
    { name: 'Ellsworth', personality: 'Clean and minimal, in the spirit of Ellsworth Kelly', realName: 'Ellsworth Kelly' },
    { name: 'Frank', personality: 'Bold-edged minimal, in the spirit of Frank Stella', realName: 'Frank Stella' },
    { name: 'Dan', personality: 'Luminous minimal, in the spirit of Dan Flavin', realName: 'Dan Flavin' },
  ],
  organic: [
    { name: 'Georgia', personality: "Sensuous and organic, in the spirit of O'Keeffe", realName: "Georgia O'Keeffe" },
    { name: 'Henry', personality: 'Sculptural and organic, in the spirit of Henry Moore', realName: 'Henry Moore' },
    { name: 'Jean', personality: 'Biomorphic and organic, in the spirit of Jean Arp', realName: 'Jean Arp' },
    { name: 'Barbara', personality: 'Sculptural organic, in the spirit of Barbara Hepworth', realName: 'Barbara Hepworth' },
    { name: 'Constantin', personality: 'Reductive sculptural organic, in the spirit of Brâncuși', realName: 'Constantin Brâncuși' },
  ],
  collage: [
    { name: 'Hannah', personality: 'Sharp political collage, in the spirit of Hannah Höch', realName: 'Hannah Höch' },
    { name: 'Kurt', personality: 'Found-material collage, in the spirit of Kurt Schwitters', realName: 'Kurt Schwitters' },
    { name: 'Romare', personality: 'Vibrant narrative collage, in the spirit of Romare Bearden', realName: 'Romare Bearden' },
    { name: 'Robert', personality: 'Found-object collage, in the spirit of Rauschenberg', realName: 'Robert Rauschenberg' },
    { name: 'Eduardo', personality: 'Pop-inflected collage, in the spirit of Paolozzi', realName: 'Eduardo Paolozzi' },
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
