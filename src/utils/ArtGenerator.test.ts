import { describe, expect, it } from 'vitest';
import { ArtStyle } from '../models/Artwork';
import { ArtGenerator } from './ArtGenerator';

describe('ArtGenerator', () => {
  it('generates a distinct SVG vocabulary for every art style', () => {
    const styles: ArtStyle[] = ['geometric', 'surreal', 'minimal', 'organic', 'chaotic', 'digital', 'expressionist', 'abstract', 'cubist', 'impressionist', 'bauhaus', 'collage', 'meme'];
    const art = styles.map((style) => new ArtGenerator(42).generateArt(style));
    expect(new Set(art).size).toBe(styles.length);
    expect(art[0]).toContain('<rect');
    expect(art[1]).toContain('<ellipse');
    expect(art[2]).toContain('<line');
    expect(art[3]).toContain('Q');
    expect(art[4]).toContain('stroke');
    expect(art[5]).toContain('<rect');
    expect(art[6]).toContain('C');
    expect(art[7]).toContain('<polygon');
    expect(art[8]).toContain('<polygon');
    expect(art[9]).toContain('<g');
    expect(art[10]).toContain('<circle');
    expect(art[11]).toContain('<path');
    expect(art[12]).toContain('<text');
  });

  it('is deterministic for a style and seed', () => {
    expect(new ArtGenerator(99).generateArt('organic'))
      .toBe(new ArtGenerator(99).generateArt('organic'));
  });

  it('creates different compositions within the same style', () => {
    const first = new ArtGenerator(101).generateArt('surreal');
    const second = new ArtGenerator(202).generateArt('surreal');
    expect(first).not.toBe(second);
    expect(first).toContain('aria-label="surreal procedural artwork"');
    expect(second).toContain('aria-label="surreal procedural artwork"');
  });

  it('supports varied meme captions without changing the style vocabulary', () => {
    const first = new ArtGenerator(1).generateArt('meme', 'star', 'NO WAY');
    const second = new ArtGenerator(1).generateArt('meme', 'star', 'BIG MOOD');
    expect(first).not.toBe(second);
    expect(first).toContain('NO WAY');
    expect(second).toContain('BIG MOOD');
  });

  it('renders distinct meme archetypes', () => {
    const poster = new ArtGenerator(1).generateArt('meme', 'star', 'FREEDOM', undefined, 'poster');
    const comic = new ArtGenerator(1).generateArt('meme', 'star', 'WHY', undefined, 'comic');
    expect(poster).toContain('data-meme-variant="poster"');
    expect(poster).toContain('font-family="Impact');
    expect(comic).toContain('data-meme-variant="comic"');
    expect(comic).toContain('font-family="sans-serif"');
    expect(poster).not.toBe(comic);
  });

  it('uses distinct composition profiles for sparse, atmospheric, and surreal styles', () => {
    const minimal = new ArtGenerator(42).generateArt('minimal');
    const impressionist = new ArtGenerator(42).generateArt('impressionist');
    const surreal = new ArtGenerator(42).generateArt('surreal');
    expect(minimal).toContain('fill="#f4f0e8"');
    expect((impressionist.match(/<circle/g) ?? []).length).toBeGreaterThan(10);
    expect(surreal).toContain('transform="rotate');
    expect(minimal.length).toBeLessThan(impressionist.length);
  });

  it('gives minimal compositions different artist signatures', () => {
    const diagonal = new ArtGenerator(42).generateArt('minimal', 'orbit', undefined, undefined, undefined, 'diagonal');
    const vertical = new ArtGenerator(42).generateArt('minimal', 'orbit', undefined, undefined, undefined, 'vertical');
    expect(diagonal).not.toBe(vertical);
    expect(diagonal).toContain('M 18 78 L 82 22');
    expect(vertical).toContain('M 50 12 V 88');
  });
});
