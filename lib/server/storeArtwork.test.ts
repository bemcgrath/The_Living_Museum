import { describe, expect, it, vi } from 'vitest';
import { GENRE_PROFILES } from '../../src/data/genreProfiles';

const insertedRows: Record<string, unknown>[] = [];

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/artwork/impressionist/piece.png' } }),
      }),
    },
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertedRows.push(row);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'piece-1' }, error: null }),
          }),
        };
      },
    }),
  }),
}));

// Imported after the mock so storeArtwork picks up the mocked getSupabaseClient.
const { storeArtwork } = await import('./storeArtwork');

describe('storeArtwork', () => {
  it('records a collection_id and null subscriber_id for a showcase piece', async () => {
    insertedRows.length = 0;
    const profile = GENRE_PROFILES.impressionist[0];
    await storeArtwork({
      subscriberId: null,
      kind: 'showcase',
      collectionId: 'collection-1',
      style: 'impressionist',
      profile,
      subject: 'a sunlit landscape with rolling hills',
      prompt: 'an original impressionist scene...',
      imageBase64: 'ZmFrZQ==',
    });
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({ kind: 'showcase', subscriber_id: null, collection_id: 'collection-1' });
  });

  it('records a null collection_id for the existing subscriber-email path (no collectionId passed)', async () => {
    insertedRows.length = 0;
    const profile = GENRE_PROFILES.impressionist[0];
    await storeArtwork({
      subscriberId: 'subscriber-1',
      kind: 'weekly',
      style: 'impressionist',
      profile,
      subject: 'a sunlit landscape with rolling hills',
      prompt: 'an original impressionist scene...',
      imageBase64: 'ZmFrZQ==',
    });
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({ kind: 'weekly', subscriber_id: 'subscriber-1', collection_id: null });
  });
});
