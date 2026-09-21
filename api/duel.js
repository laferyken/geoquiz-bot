const rooms = global.__ROOMS || (global.__ROOMS = new Map());

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, roomId } = req.query;

  // 1. Создать комнату
  if (action === 'create' && req.method === 'POST') {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const { questions, hostName } = req.body;

    rooms.set(code, {
      code,
      hostName: hostName || 'Игрок 1',
      guestName: null,
      questions: questions || [],
      status: 'waiting',
      round: 1,
      roundStartTime: null,
      guesses: {}, // { host: { coords, distance }, guest: { coords, distance } }
      createdAt: Date.now()
    });

    return res.status(200).json({ success: true, roomId: code });
  }

  // 2. Войти в комнату
  if (action === 'join' && req.method === 'POST') {
    const cleanId = (roomId || '').trim().toUpperCase();
    const room = rooms.get(cleanId);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Комната не найдена' });
    }

    const { guestName } = req.body;
    room.guestName = guestName || 'Игрок 2';
    room.status = 'playing';
    room.roundStartTime = Date.now() + 3000; // Старт раунда после 3 сек превью

    return res.status(200).json({
      success: true,
      questions: room.questions,
      hostName: room.hostName
    });
  }

  // 3. Опрос состояния
  if (action === 'poll' && req.method === 'GET') {
    const cleanId = (roomId || '').trim().toUpperCase();
    const room = rooms.get(cleanId);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Комната не найдена' });
    }

    return res.status(200).json({
      success: true,
      status: room.status,
      hostName: room.hostName,
      guestName: room.guestName,
      round: room.round,
      guesses: room.guesses
    });
  }

  // 4. Запись ответа (строго по роли: host или guest)
  if (action === 'guess' && req.method === 'POST') {
    const cleanId = (roomId || '').trim().toUpperCase();
    const room = rooms.get(cleanId);

    if (!room) {
      return res.status(404).json({ success: false });
    }

    const { role, coords, distance } = req.body;
    if (role === 'host' || role === 'guest') {
      room.guesses[role] = { coords, distance };
    }

    return res.status(200).json({ success: true });
  }

  // 5. Переход к следующему раунду
  if (action === 'next_round' && req.method === 'POST') {
    const cleanId = (roomId || '').trim().toUpperCase();
    const room = rooms.get(cleanId);

    if (room) {
      room.round += 1;
      room.guesses = {};
    }

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Неизвестное действие' });
}