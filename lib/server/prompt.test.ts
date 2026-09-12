import { describe, expect, it } from 'vitest';
import { GENRE_PROFILES } from '../../src/data/genreProfiles';
import { buildImagePrompt, resolveWeeklyProfile, weeklyEmailSubject } from './prompt';
import type { Subscriber } from './supabase';

function makeSubscriber(overrides: Partial<Subscriber>): Subscriber {
  return {
    id: 'sub-1',
    email: 'test@example.com',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    status: 'active',
    preferred_style: null,
    favorite_artist_real_name: null,
    last_delivered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('resolveWeeklyProfile', () => {
  it('uses the subscriber\'s favorite artist when it matches their preferred style', () => {
    const subscriber = makeSubscriber({ preferred_style: 'impressionist', favorite_artist_real_name: 'Mary Cassatt' });
    const { style, profile } = resolveWeeklyProfile(subscriber);
    expect(style).toBe('impressionist');
    expect(profile.realName).toBe('Mary Cassatt');
  });

  it('falls back to a default artist for the style if no favorite is on file', () => {
    const subscriber = makeSubscriber({ preferred_style: 'cubist' });
    const { style, profile } = resolveWeeklyProfile(subscriber);
    expect(style).toBe('cubist');
    expect(GENRE_PROFILES.cubist.map((p) => p.realName)).toContain(profile.realName);
  });

  it('picks some style for a "surprise me" subscriber (no preferred_style)', () => {
    const subscriber = makeSubscriber({ preferred_style: null });
    const { style, profile } = resolveWeeklyProfile(subscriber);
    expect(GENRE_PROFILES[style].map((p) => p.realName)).toContain(profile.realName);
  });

  it('is stable for the same subscriber within the same week', () => {
    const subscriber = makeSubscriber({ preferred_style: null, id: 'stable-subscriber' });
    const first = resolveWeeklyProfile(subscriber);
    const second = resolveWeeklyProfile(subscriber);
    expect(first).toEqual(second);
  });
});

describe('buildImagePrompt / weeklyEmailSubject', () => {
  it('mentions the style and the real artist name, and guards against depicting a real person', () => {
    const profile = GENRE_PROFILES.impressionist[0];
    const prompt = buildImagePrompt('impressionist', profile);
    expect(prompt).toContain('Impressionist');
    expect(prompt).toContain(profile.realName);
    expect(prompt.toLowerCase()).toContain('not depict any real, identifiable person');

    const subject = weeklyEmailSubject('impressionist', profile);
    expect(subject).toContain('Impressionist');
    expect(subject).toContain(profile.realName);
  });
});
