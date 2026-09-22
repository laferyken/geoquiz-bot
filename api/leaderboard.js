// Используем постоянный защищенный топик для хранения таблицы лидеров
const NTFY_TOPIC = 'https://ntfy.sh/geoquiz_global_leaderboard_v1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Получить всех реальных игроков (GET)
  if (req.method === 'GET') {
    try {
      // Читаем сохраненные сообщения из кэша ntfy
      const response = await fetch(`${NTFY_TOPIC}/json?poll=1`);
      const text = await response.text();
      
      const lines = text.trim().split('\n').filter(Boolean);
      const playersMap = new Map();

      // Собираем актуальные данные по каждому уникальному id игрока
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.message) {
            const player = JSON.parse(item.message);
            if (player && player.id) {
              playersMap.set(String(player.id), player);
            }
          }
        } catch (e) {}
      }

      const leaderboard = Array.from(playersMap.values())
        .sort((a, b) => (Number(b.mmr) || 0) - (Number(a.mmr) || 0));

      return res.status(200).json({ success: true, leaderboard });
    } catch (err) {
      console.error('Ошибка чтения лидерборда:', err);
      return res.status(200).json({ success: true, leaderboard: [] });
    }
  }

  // 2. Сохранить / обновить игрока (POST)
  if (req.method === 'POST') {
    try {
      const { id, first_name, username, photo_url, mmr, streak } = req.body;
      if (!id) return res.status(400).json({ error: 'User ID is required' });

      const profile = {
        id: String(id),
        name: first_name || username || 'Географ',
        username: username || '',
        photo: photo_url || null,
        mmr: Number(mmr) || 1000,
        streak: Number(streak) || 0,
        updatedAt: Date.now()
      };

      // Публикуем с заголовком Cache: yes, чтобы данные сохранились в облаке
      await fetch(NTFY_TOPIC, {
        method: 'POST',
        headers: {
          'Cache': 'yes',
          'Title': 'user_update'
        },
        body: JSON.stringify(profile)
      });

      return res.status(200).json({ success: true, profile });
    } catch (err) {
      console.error('Ошибка записи:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).end();
}