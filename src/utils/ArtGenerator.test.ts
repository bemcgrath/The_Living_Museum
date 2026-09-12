import { describe, expect, it } from 'vitest';
import { ArtStyle } from '../models/Artwork';
import { ArtGenerator } from './ArtGenerator';

describe('ArtGenerator', () => {
  it('generates a distinct SVG vocabulary for every art style', () => {
    // impressionist is exercised separately below — it's a scene-based style like pastoral/
    // post_impressionist/silver_gelatin, not part of the generic per-element loop these cover.
    const styles: ArtStyle[] = ['geometric', 'surreal', 'minimal', 'organic', 'chaotic', 'digital', 'expressionist', 'abstract', 'cubist', 'bauhaus', 'collage', 'meme'];
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
    expect(art[9]).toContain('<circle');
    expect(art[10]).toContain('<path');
    expect(art[11]).toContain('<text');
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

  it('renders distinct scene-based styles for pastoral, post-impressionist, silver gelatin, and impressionist', () => {
    const pastoral = new ArtGenerator(7).generateArt('pastoral');
    const postImpressionist = new ArtGenerator(7).generateArt('post_impressionist');
    const silverGelatin = new ArtGenerator(7).generateArt('silver_gelatin');
    const impressionist = new ArtGenerator(7).generateArt('impressionist');
    expect(new Set([pastoral, postImpressionist, silverGelatin, impressionist]).size).toBe(4);
    expect(pastoral).toContain('aria-label="pastoral procedural artwork"');
    expect(postImpressionist).toContain('aria-label="post_impressionist procedural artwork"');
    expect(silverGelatin).toContain('aria-label="silver_gelatin procedural artwork"');
    expect(impressionist).toContain('aria-label="impressionist procedural artwork"');
  });

  it('is deterministic per seed for each new scene style', () => {
    expect(new ArtGenerator(55).generateArt('pastoral')).toBe(new ArtGenerator(55).generateArt('pastoral'));
    expect(new ArtGenerator(55).generateArt('post_impressionist')).toBe(new ArtGenerator(55).generateArt('post_impressionist'));
    expect(new ArtGenerator(55).generateArt('silver_gelatin')).toBe(new ArtGenerator(55).generateArt('silver_gelatin'));
    expect(new ArtGenerator(55).generateArt('impressionist')).toBe(new ArtGenerator(55).generateArt('impressionist'));
  });

  it('produces varied scenes across seeds for the new painterly/photo styles', () => {
    expect(new ArtGenerator(1).generateArt('pastoral')).not.toBe(new ArtGenerator(2).generateArt('pastoral'));
    expect(new ArtGenerator(1).generateArt('post_impressionist')).not.toBe(new ArtGenerator(2).generateArt('post_impressionist'));
    expect(new ArtGenerator(1).generateArt('silver_gelatin')).not.toBe(new ArtGenerator(2).generateArt('silver_gelatin'));
    expect(new ArtGenerator(1).generateArt('impressionist')).not.toBe(new ArtGenerator(2).generateArt('impressionist'));
  });

  it('gives Monet-inspired impressionist scenes soft blurred brushwork rather than hard-edged shapes', () => {
    const svg = new ArtGenerator(3).generateArt('impressionist');
    expect(svg).toContain('feGaussianBlur');
    expect((svg.match(/<circle/g) ?? []).length).toBeGreaterThan(20);
  });

  it('keeps silver gelatin photography strictly grayscale', () => {
    const svg = new ArtGenerator(12).generateArt('silver_gelatin');
    const hexColors = svg.match(/#[0-9a-fA-F]{3,6}/g) ?? [];
    const grayHexes = new Set(['#050505', '#1a1a1a', '#3d3d3d', '#6b6b6b', '#9e9e9e', '#cfcfcf', '#f5f5f5']);
    expect(hexColors.length).toBeGreaterThan(0);
    hexColors.forEach((hex) => expect(grayHexes.has(hex.toLowerCase())).toBe(true));
  });
});
