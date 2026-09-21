import { Redis } from '@upstash/redis';

// Вставь свои ключи из консоли Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'ВСТАВЬ_СВОЙ_UPSTASH_REDIS_REST_URL',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'ВСТАВЬ_СВОЙ_UPSTASH_REDIS_REST_TOKEN',
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Получение лидерборда настоящих игроков
  if (req.method === 'GET') {
    try {
      // Получаем ID игроков, отсортированных по MMR (по убыванию)
      const userIds = await redis.zrange('geo_leaderboard_mmr', 0, 99, { rev: true });
      if (!userIds || userIds.length === 0) {
        return res.status(200).json({ success: true, leaderboard: [] });
      }

      // Достаем профиль каждого реального игрока
      const pipeline = redis.pipeline();
      userIds.forEach((id) => pipeline.get(`user:${id}`));
      const usersData = await pipeline.exec();

      const leaderboard = usersData
        .filter(Boolean)
        .map((u) => (typeof u === 'string' ? JSON.parse(u) : u));

      return res.status(200).json({ success: true, leaderboard });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. Сохранение/обновление игрока
  if (req.method === 'POST') {
    const { id, first_name, username, photo_url, mmr, streak } = req.body;
    if (!id) return res.status(400).json({ error: 'User ID is required' });

    const safeMmr = Number(mmr) || 1000;
    const safeStreak = Number(streak) || 0;

    const profile = {
      id: String(id),
      name: first_name || 'Географ',
      username: username || '',
      photo: photo_url || null,
      mmr: safeMmr,
      streak: safeStreak,
      updatedAt: Date.now()
    };

    try {
      // Сохраняем профиль и заносим в сортированный список
      await redis.set(`user:${id}`, JSON.stringify(profile));
      await redis.zadd('geo_leaderboard_mmr', { score: safeMmr, member: String(id) });

      return res.status(200).json({ success: true, profile });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).end();
}