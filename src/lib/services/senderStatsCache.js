import Database from '@tauri-apps/plugin-sql';

/** @type {any | null} */
let db = null;

async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:aisle3.db');
  }
  return db;
}

const CACHE_TTL_HOURS = 24;

/**
 * Get cached sender stats if they exist and are fresh
 * @returns {Promise<any[]|null>} Cached stats or null if cache miss
 */
export async function getCachedSenderStats() {
  try {
    const database = await getDb();
    const now = Math.floor(Date.now() / 1000);
    const cacheCutoff = now - (CACHE_TTL_HOURS * 3600);

    const results = await database.select(
      'SELECT sender, count, unread_count, oldest_id, newest_id, sample_subject FROM sender_stats WHERE last_updated > $1 ORDER BY count DESC',
      [cacheCutoff]
    );

    if (results && results.length > 0) {
      console.log(`📦 Using cached sender stats (${results.length} senders)`);
      return results.map(/** @param {any} row */ row => ({
        sender: row.sender,
        count: row.count,
        unreadCount: row.unread_count,
        oldestId: row.oldest_id,
        newestId: row.newest_id,
        sampleSubject: row.sample_subject,
      }));
    }

    return null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Cache sender stats
 * @param {any[]} stats - Sender stats to cache
 */
export async function cacheSenderStats(stats) {
  try {
    const database = await getDb();
    const now = Math.floor(Date.now() / 1000);

    // Clear old cache
    await database.execute('DELETE FROM sender_stats');

    // Insert new stats
    for (const stat of stats) {
      await database.execute(
        'INSERT INTO sender_stats (sender, count, unread_count, oldest_id, newest_id, sample_subject, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          stat.sender,
          stat.count,
          stat.unreadCount,
          stat.oldestId,
          stat.newestId,
          stat.sampleSubject,
          now
        ]
      );
    }

    console.log(`💾 Cached ${stats.length} sender stats`);
  } catch (error) {
    console.error('Error caching stats:', error);
  }
}
