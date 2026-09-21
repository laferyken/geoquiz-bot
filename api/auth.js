// Временное хранилище токенов авторизации
const authSessions = global.__AUTH_SESSIONS || (global.__AUTH_SESSIONS = new Map());

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. Бот подтверждает вход по коду (POST)
  if (req.method === 'POST') {
    const { code, user } = req.body;
    if (code && user) {
      authSessions.set(code, { user, timestamp: Date.now() });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Missing code or user' });
  }

  // 2. Браузер проверяет, подтвердил ли бот вход (GET ?code=XYZ)
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const session = authSessions.get(code);
    if (session) {
      authSessions.delete(code); // Одноразовый код
      return res.status(200).json({ success: true, user: session.user });
    }

    return res.status(200).json({ success: false, pending: true });
  }

  return res.status(405).end();
}