import { describe, expect, it } from 'vitest';
import { GENRE_PROFILES } from '../../src/data/genreProfiles';
import { weeklyEmailHtml } from './emailTemplate';

describe('weeklyEmailHtml', () => {
  it('declares a UTF-8 charset so non-ASCII characters (em dashes, accented names) render correctly', () => {
    const html = weeklyEmailHtml({
      style: 'impressionist',
      profile: GENRE_PROFILES.impressionist[0],
      imageUrl: 'data:image/png;base64,',
      siteUrl: 'http://localhost:5173',
      kind: 'welcome',
    });
    expect(html).toContain('<meta charset="utf-8"');
    expect(html).toContain('—'); // the welcome heading's em dash
  });

  it('uses different headings for welcome vs weekly emails', () => {
    const params = { style: 'impressionist' as const, profile: GENRE_PROFILES.impressionist[0], imageUrl: '', siteUrl: '' };
    const welcome = weeklyEmailHtml({ ...params, kind: 'welcome' });
    const weekly = weeklyEmailHtml({ ...params, kind: 'weekly' });
    expect(welcome).toContain('Welcome');
    expect(weekly).not.toContain('Welcome');
    expect(weekly).toContain('Your weekly');
  });
});
