// Надежный серверный буфер для лидерборда
const STORAGE_ENDPOINT = 'https://api.jsonstorage.net/v1/json/00000000-0000-0000-0000-000000000000/leaderboard';

// В памяти Vercel для мгновенной отдачи + fallback
let memoryCache = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. ПОЛУЧЕНИЕ ЛИДЕРБОРДА (GET)
  if (req.method === 'GET') {
    try {
      const response = await fetch('https://ntfy.sh/geoquiz_leaderboard_data_v2/raw', {
        headers: { 'User-Agent': 'GeoQuiz' }
      });
      
      if (response.ok) {
        const text = await response.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache = parsed;
        }
      }
    } catch (e) {
      // используем кэш при ошибке сети
    }

    const sorted = [...memoryCache].sort((a, b) => (Number(b.mmr) || 0) - (Number(a.mmr) || 0));
    return res.status(200).json({ success: true, leaderboard: sorted });
  }

  // 2. СОХРАНЕНИЕ / ОБНОВЛЕНИЕ ИГРОКА (POST)
  if (req.method === 'POST') {
    try {
      const { id, first_name, username, photo_url, mmr, streak } = req.body;
      if (!id) return res.status(400).json({ error: 'No ID' });

      const safeProfile = {
        id: String(id),
        name: first_name || username || 'Игрок',
        username: username || '',
        photo: photo_url || null,
        mmr: Number(mmr) || 1000,
        streak: Number(streak) || 0,
        updatedAt: Date.now()
      };

      // Читаем текущий актуальный список
      let currentList = [];
      try {
        const resCurrent = await fetch('https://ntfy.sh/geoquiz_leaderboard_data_v2/raw');
        if (resCurrent.ok) {
          const txt = await resCurrent.text();
          currentList = JSON.parse(txt);
        }
      } catch (err) {
        currentList = memoryCache;
      }

      if (!Array.isArray(currentList)) currentList = [];

      // Обновляем или добавляем игрока
      const idx = currentList.findIndex((p) => String(p.id) === String(safeProfile.id));
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...safeProfile };
      } else {
        currentList.push(safeProfile);
      }

      memoryCache = currentList;

      // Сохраняем обратно в облако
      await fetch('https://ntfy.sh/geoquiz_leaderboard_data_v2', {
        method: 'POST',
        headers: { 'Cache': 'yes', 'Title': 'save' },
        body: JSON.stringify(currentList)
      });

      return res.status(200).json({ success: true, profile: safeProfile });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).end();
}