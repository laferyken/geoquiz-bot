import React, { useState, useEffect, useRef } from 'react';
import { LOCATIONS, getDistanceKm, getRankBadge, checkAndUpdateStreak } from './data';
import { COUNTRIES } from './countries';
import MapComponent from './MapComponent';

const BOT_USERNAME = 'GeographySudokamo_bot';
const CLOUD_DB_TOPIC = 'https://ntfy.sh/geoquiz_global_cloud_v3';

const getSafeMmr = (val) => {
  const num = Number(val);
  return (!isNaN(num) && num > 0) ? Math.round(num) : 1000;
};

const getSafeStreak = (val) => {
  const num = Number(val);
  return (!isNaN(num) && num >= 0) ? Math.round(num) : 0;
};

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [gameMode, setGameMode] = useState('classic'); // 'classic' | 'countries'

  const [roundNumber, setRoundNumber] = useState(1);
  const [playerCoords, setPlayerCoords] = useState(null);
  const [opponentCoords, setOpponentCoords] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [duelRoundResults, setDuelRoundResults] = useState(null);

  // Стрик и MMR
  const [streak, setStreak] = useState(() => getSafeStreak(localStorage.getItem('geo_streak')));
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [newRankUnlocked, setNewRankUnlocked] = useState(null);
  const [mmr, setMmr] = useState(() => getSafeMmr(localStorage.getItem('geo_mmr')));

  // Профиль Telegram
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('geo_tg_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Локальный ID гостя
  const [guestId] = useState(() => {
    let gid = localStorage.getItem('geo_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('geo_guest_id', gid);
    }
    return gid;
  });

  const [authCode] = useState(() => Math.random().toString(36).substring(2, 10));
  const [isWaitingAuth, setIsWaitingAuth] = useState(false);

  // Лидерборд
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Дуэли
  const [duelRoomId, setDuelRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [duelQuestions, setDuelQuestions] = useState([]);
  const [opponentName, setOpponentName] = useState('Соперник');
  const [duelScores, setDuelScores] = useState({ me: 0, opp: 0 });
  const [previewTimer, setPreviewTimer] = useState(3);
  const [mapTimer, setMapTimer] = useState(20);
  const [copied, setCopied] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [myRole, setMyRole] = useState('host');

  const eventSourceRef = useRef(null);
  const myRoleRef = useRef('host');
  const isAnsweredRef = useRef(false);
  const duelResultsRef = useRef(null);
  const roundGuessesRef = useRef({});

  const [soloIndex, setSoloIndex] = useState(0);

  // Выбор колоды: страны или классика
  const activeDeck = gameMode === 'countries' ? COUNTRIES : LOCATIONS;
  const currentQuestion = screen.startsWith('duel') ? duelQuestions[roundNumber - 1] : activeDeck[soloIndex % activeDeck.length];
  const rank = getRankBadge(mmr);
  const displayName = user?.first_name || 'Географ';

  useEffect(() => { myRoleRef.current = myRole; }, [myRole]);
  useEffect(() => { isAnsweredRef.current = isAnswered; }, [isAnswered]);
  useEffect(() => { duelResultsRef.current = duelRoundResults; }, [duelRoundResults]);

  useEffect(() => {
    localStorage.setItem('geo_mmr', String(mmr));
  }, [mmr]);

  useEffect(() => {
    localStorage.setItem('geo_streak', String(streak));
  }, [streak]);

  // Чтение игроков из облака
  const fetchAllCloudUsers = async () => {
    try {
      const res = await fetch(`${CLOUD_DB_TOPIC}/json?poll=1`);
      if (!res.ok) return [];
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const playersMap = new Map();

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.message) {
            const data = JSON.parse(item.message);
            if (data && data.id) {
              playersMap.set(String(data.id), data);
            }
          }
        } catch (e) {}
      }

      return Array.from(playersMap.values());
    } catch {
      return [];
    }
  };

  // Сохранение в облако
  const saveUserToCloud = async (currentMmr, currentStreak, customUser = null) => {
    const activeUser = customUser || user;
    const activeId = activeUser?.id ? String(activeUser.id) : guestId;
    const activeName = activeUser?.first_name || displayName;

    const payload = {
      id: activeId,
      name: activeName,
      username: activeUser?.username || '',
      photo: activeUser?.photo_url || null,
      mmr: getSafeMmr(currentMmr),
      streak: getSafeStreak(currentStreak),
      updatedAt: Date.now()
    };

    try {
      await fetch(CLOUD_DB_TOPIC, {
        method: 'POST',
        headers: { 'Cache': 'yes', 'Title': 'player_sync' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('Ошибка облака:', e);
    }
  };

  // Восстановление аккаунта
  const syncAccountFromCloud = async (targetUser) => {
    if (!targetUser?.id) return;
    try {
      const allUsers = await fetchAllCloudUsers();
      const existing = allUsers.find((p) => String(p.id) === String(targetUser.id));

      if (existing && existing.mmr) {
        const cloudMmr = getSafeMmr(existing.mmr);
        const cloudStreak = getSafeStreak(existing.streak);

        setMmr(cloudMmr);
        setStreak(cloudStreak);
        localStorage.setItem('geo_mmr', String(cloudMmr));
        localStorage.setItem('geo_streak', String(cloudStreak));
      } else {
        saveUserToCloud(mmr, streak, targetUser);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.disableVerticalSwipes?.();
      tg.setHeaderColor?.('#09090b');
      tg.setBackgroundColor?.('#09090b');

      if (tg.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user;
        setUser(tgUser);
        localStorage.setItem('geo_tg_user', JSON.stringify(tgUser));
        syncAccountFromCloud(tgUser);
      }
    }

    window.onTelegramAuth = (authUser) => {
      setUser(authUser);
      localStorage.setItem('geo_tg_user', JSON.stringify(authUser));
      syncAccountFromCloud(authUser);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (!user && screen === 'menu') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/auth?code=${authCode}`);
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('geo_tg_user', JSON.stringify(data.user));
            setIsWaitingAuth(false);
            syncAccountFromCloud(data.user);
            clearInterval(interval);
          }
        } catch (e) {}
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [user, screen, authCode]);

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    setScreen('leaderboard');
    await saveUserToCloud(mmr, streak);

    try {
      const users = await fetchAllCloudUsers();
      const sorted = users
        .filter((u) => u && u.id)
        .sort((a, b) => (Number(b.mmr) || 0) - (Number(a.mmr) || 0));

      setLeaderboard(sorted);
    } catch (e) {
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Таймеры
  useEffect(() => {
    let timer;
    if (screen === 'duel_preview') {
      setPreviewTimer(3);
      timer = setInterval(() => {
        setPreviewTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setScreen('duel_map');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [screen, roundNumber]);

  useEffect(() => {
    let timer;
    if (screen === 'duel_map' && !duelRoundResults) {
      setMapTimer(20);
      timer = setInterval(() => {
        setMapTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (!isAnsweredRef.current) handleDuelTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [screen, duelRoundResults, roundNumber]);

  const sendDuelEvent = async (roomId, data) => {
    try {
      await fetch(`https://ntfy.sh/geoquiz_duel_${roomId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {}
  };

  const handleCopyCode = async () => {
    if (!duelRoomId) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(duelRoomId);
      } else {
        const ta = document.createElement('textarea');
        ta.value = duelRoomId;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const handleGoToMenu = () => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    setIsAnswered(false);
    setPlayerCoords(null);
    setOpponentCoords(null);
    setDuelRoundResults(null);
    setCopied(false);
    setIsConnecting(false);
    roundGuessesRef.current = {};
    setScreen('menu');
  };

  // ЗАПУСК ИГРЫ: КЛАССИКА ИЛИ СТРАНЫ
  const startSolo = (mode = 'classic') => {
    setGameMode(mode);
    setRoundNumber(1);
    const deck = mode === 'countries' ? COUNTRIES : LOCATIONS;
    setSoloIndex(Math.floor(Math.random() * deck.length));
    setPlayerCoords(null);
    setIsAnswered(false);
    setScreen('solo_question');
  };

  const handleConfirmSoloGuess = () => {
    if (!playerCoords) return;
    const { streak: updatedStreak, isNewDay } = checkAndUpdateStreak();
    setStreak(updatedStreak);
    if (isNewDay) setShowStreakModal(true);

    const distance = getDistanceKm(playerCoords[0], playerCoords[1], currentQuestion.coords[0], currentQuestion.coords[1]);

    let delta = 0;
    if (distance <= 1200) {
      delta = Math.round(50 * (1 - distance / 1200));
    } else {
      const penalty = Math.round(((distance - 1200) / 1800) * 40);
      delta = -Math.min(40, Math.max(1, penalty));
    }

    const oldRank = getRankBadge(mmr);
    const newMmr = Math.max(100, mmr + delta);
    const updatedRank = getRankBadge(newMmr);

    setResult({ distance, delta });
    setMmr(newMmr);
    setIsAnswered(true);

    saveUserToCloud(newMmr, updatedStreak);

    if (updatedRank.level > oldRank.level) {
      setTimeout(() => setNewRankUnlocked(updatedRank), 400);
    }
  };

  // Дуэли
  const connectDuelStream = (roomId, isHostRole) => {
    if (eventSourceRef.current) eventSourceRef.current.close();

    const es = new EventSource(`https://ntfy.sh/geoquiz_duel_${roomId}/sse`);
    eventSourceRef.current = es;

    es.onopen = () => {
      if (isHostRole) {
        setDuelRoomId(roomId);
        setMyRole('host');
        setScreen('duel_lobby');
      } else {
        setIsConnecting(false);
        setDuelRoomId(roomId);
        setMyRole('guest');
        sendDuelEvent(roomId, { type: 'join', name: displayName });
      }
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload.message) return;
        const msg = JSON.parse(payload.message);

        if (msg.type === 'join' && myRoleRef.current === 'host') {
          const selectedQuestions = [...LOCATIONS].sort(() => 0.5 - Math.random()).slice(0, 5);
          setDuelQuestions(selectedQuestions);
          setOpponentName(msg.name || 'Гость');
          setRoundNumber(1);
          setDuelScores({ me: 0, opp: 0 });

          sendDuelEvent(roomId, {
            type: 'start',
            hostName: displayName,
            questions: selectedQuestions
          });

          setScreen('duel_preview');
        }

        if (msg.type === 'start' && myRoleRef.current === 'guest') {
          setOpponentName(msg.hostName || 'Хост');
          setDuelQuestions(msg.questions);
          setRoundNumber(1);
          setDuelScores({ me: 0, opp: 0 });
          setScreen('duel_preview');
        }

        if (msg.type === 'guess' && msg.role !== myRoleRef.current) {
          roundGuessesRef.current.opp = { coords: msg.coords, distance: msg.distance };
          checkBothAnswered();
        }

        if (msg.type === 'next_round') {
          roundGuessesRef.current = {};
          setRoundNumber(msg.round);
          setPlayerCoords(null);
          setOpponentCoords(null);
          setIsAnswered(false);
          setDuelRoundResults(null);
          setScreen('duel_preview');
        }
      } catch (err) {}
    };

    es.onerror = () => setIsConnecting(false);
  };

  const checkBothAnswered = () => {
    const { me, opp } = roundGuessesRef.current;
    if (me && opp && !duelResultsRef.current) {
      setOpponentCoords(opp.coords);

      let winner = 'draw';
      if (me.distance < opp.distance) {
        winner = 'me';
        setDuelScores((prev) => ({ ...prev, me: prev.me + 1 }));
      } else if (opp.distance < me.distance) {
        winner = 'opp';
        setDuelScores((prev) => ({ ...prev, opp: prev.opp + 1 }));
      }

      setDuelRoundResults({
        myDistance: me.distance,
        oppDistance: opp.distance,
        winner
      });
    }
  };

  const createDuel = () => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    connectDuelStream(code, true);
  };

  const joinDuel = () => {
    const cleanCode = inputRoomId.trim().toUpperCase();
    if (!cleanCode) return;
    setIsConnecting(true);
    connectDuelStream(cleanCode, false);
  };

  const handleConfirmDuelGuess = () => {
    if (!playerCoords) return;
    const distance = getDistanceKm(playerCoords[0], playerCoords[1], currentQuestion.coords[0], currentQuestion.coords[1]);
    setIsAnswered(true);

    roundGuessesRef.current.me = { coords: playerCoords, distance };

    sendDuelEvent(duelRoomId, {
      type: 'guess',
      role: myRoleRef.current,
      coords: playerCoords,
      distance
    });

    checkBothAnswered();
  };

  const handleDuelTimeExpired = () => {
    setIsAnswered(true);
    const fallbackCoords = playerCoords || [0, 0];
    const distance = playerCoords
      ? getDistanceKm(playerCoords[0], playerCoords[1], currentQuestion.coords[0], currentQuestion.coords[1])
      : 20000;

    roundGuessesRef.current.me = { coords: fallbackCoords, distance };

    sendDuelEvent(duelRoomId, {
      type: 'guess',
      role: myRoleRef.current,
      coords: fallbackCoords,
      distance
    });

    checkBothAnswered();
  };

  const handleNextDuelRound = () => {
    if (roundNumber >= 5) {
      const delta = duelScores.me > duelScores.opp ? 50 : duelScores.me < duelScores.opp ? -40 : 0;
      const newMmr = Math.max(100, mmr + delta);
      setMmr(newMmr);
      saveUserToCloud(newMmr, streak);
      setScreen('duel_result');
    } else {
      const nextR = roundNumber + 1;
      sendDuelEvent(duelRoomId, { type: 'next_round', round: nextR });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#09090b', color: '#f4f4f5', position: 'relative', overflowX: 'hidden' }}>

      {/* Модальное окно стрика */}
      {showStreakModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(5, 5, 8, 0.94)',
          backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '24px', textAlign: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)',
            border: '2px solid #ea580c', boxShadow: '0 0 50px rgba(234, 88, 12, 0.35)',
            borderRadius: '28px', padding: '36px 24px', maxWidth: '320px', width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ fontSize: '72px', filter: 'drop-shadow(0 0 20px #f97316)', marginBottom: '8px' }}>🔥</div>
            <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#ffedd5', margin: '0 0 4px 0' }}>
              {streak} {streak === 1 ? 'ДЕНЬ' : 'ДНЯ'}
            </h2>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '16px' }}>
              Ударный режим активен!
            </span>
            <p style={{ fontSize: '14px', color: '#a8a29e', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Заходи каждый день, чтобы огонёк не угас и стрик продолжил расти!
            </p>
            <button
              onClick={() => setShowStreakModal(false)}
              style={{
                width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(90deg, #ea580c, #f97316)', color: '#ffffff',
                fontSize: '15px', fontWeight: '800', cursor: 'pointer'
              }}
            >
              ВПЕРЁД
            </button>
          </div>
        </div>
      )}

      {/* Верхняя шапка */}
      {screen !== 'menu' && (
        <header style={{
          padding: '10px 14px', background: '#121215', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272a', zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>{rank.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {screen.startsWith('duel')
                  ? `ДУЭЛЬ: РАУНД ${roundNumber}/5`
                  : screen === 'leaderboard'
                  ? 'ТАБЛИЦА ЛИДЕРОВ'
                  : `РАУНД ${roundNumber} • ${gameMode === 'countries' ? 'СТРАНЫ' : 'КЛАССИКА'}`}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: rank.color }}>
                {rank.title}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'rgba(234, 88, 12, 0.12)', border: '1px solid rgba(249, 115, 22, 0.35)',
              padding: '5px 10px', borderRadius: '12px'
            }}>
              <span style={{ fontSize: '13px' }}>🔥</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#fb923c' }}>{streak}</span>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: '#18181b', padding: '5px 10px', borderRadius: '12px', border: '1px solid #3f3f46'
            }}>
              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>MMR</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#f4f4f5' }}>{mmr}</span>
            </div>

            <button
              onClick={handleGoToMenu}
              style={{
                background: '#27272a', border: '1px solid #ef444450', color: '#ef4444',
                borderRadius: '50%', width: '30px', height: '30px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </div>
        </header>
      )}

      {/* 1. ГЛАВНОЕ МЕНЮ */}
      {screen === 'menu' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>

          {/* Плашка профиля */}
          {user ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', background: '#18181b',
              padding: '6px 14px 6px 8px', borderRadius: '24px', border: '1px solid #27272a', marginBottom: '16px'
            }}>
              {user.photo_url ? (
                <img src={user.photo_url} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                  {displayName[0]}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>
                  {displayName}
                </span>
                {user.username && (
                  <span style={{ fontSize: '10px', color: '#38bdf8' }}>
                    @{user.username}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '8px', fontWeight: '700', marginLeft: '4px' }}>
                ✓ TG
              </span>
            </div>
          ) : (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <a
                href={`https://t.me/${BOT_USERNAME}?start=auth_${authCode}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsWaitingAuth(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: isWaitingAuth ? '#0369a1' : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  color: '#ffffff', padding: '12px 20px', borderRadius: '16px', textDecoration: 'none',
                  fontSize: '13px', fontWeight: '800', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
                }}
              >
                <span>{isWaitingAuth ? '⏳' : '✈️'}</span>
                {isWaitingAuth ? 'Ожидание нажатия Start в боте...' : `Войти через @${BOT_USERNAME}`}
              </a>
              <span style={{ fontSize: '11px', color: '#71717a' }}>
                Нажмите для синхронизации вашего рейтинга
              </span>
            </div>
          )}

          <div style={{ fontSize: '84px', marginBottom: '4px', filter: 'drop-shadow(0 0 32px rgba(59, 130, 246, 0.45))' }}>
            🌍
          </div>

          <h1 style={{
            fontSize: '38px', fontWeight: '900', letterSpacing: '0.08em', margin: '0 0 6px 0',
            background: 'linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase'
          }}>
            GEOQUIZ
          </h1>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: '#18181b',
            padding: '6px 14px', borderRadius: '20px', border: `1px solid ${rank.color}40`, marginBottom: '24px'
          }}>
            <span>{rank.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: rank.color }}>{rank.title}</span>
            <span style={{ fontSize: '13px', color: '#71717a' }}>•</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff' }}>{mmr} MMR</span>
            <span style={{ fontSize: '13px', color: '#71717a' }}>•</span>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#f97316' }}>🔥 {streak}</span>
          </div>

          <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Кнопка 1: Классическая игра */}
            <button
              onClick={() => startSolo('classic')}
              style={{
                width: '100%', padding: '15px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(90deg, #2563eb, #3b82f6)', color: '#ffffff',
                fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)'
              }}
            >
              🧭 Одиночная игра (Классика)
            </button>

            {/* Кнопка 2: Новый режим - СТРАНЫ МИРА */}
            <button
              onClick={() => startSolo('countries')}
              style={{
                width: '100%', padding: '15px', borderRadius: '16px', border: 'none',
                background: 'linear-gradient(90deg, #059669, #10b981)', color: '#ffffff',
                fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
              }}
            >
              🌍 Режим «Страны мира»
            </button>

            {/* Кнопка 3: Дуэль */}
            <button
              onClick={createDuel}
              style={{
                width: '100%', padding: '15px', borderRadius: '16px', border: '1px solid #ea580c',
                background: 'linear-gradient(90deg, #c2410c, #ea580c)', color: '#ffffff',
                fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 6px 20px rgba(234, 88, 12, 0.35)'
              }}
            >
              ⚔️ Создать дуэль (1 vs 1)
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="КОД КОМНАТЫ"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                style={{
                  flex: 1, background: '#18181b', border: '1px solid #3f3f46', borderRadius: '14px',
                  padding: '12px 14px', color: '#fff', fontSize: '14px', fontWeight: '700', textAlign: 'center', outline: 'none'
                }}
              />
              <button
                onClick={joinDuel}
                disabled={isConnecting}
                style={{
                  background: isConnecting ? '#3f3f46' : '#27272a', border: '1px solid #3f3f46',
                  color: '#ffffff', padding: '12px 18px', borderRadius: '14px', fontWeight: '700',
                  fontSize: '14px', cursor: isConnecting ? 'not-allowed' : 'pointer'
                }}
              >
                {isConnecting ? '...' : 'Войти'}
              </button>
            </div>

            <button
              onClick={fetchLeaderboard}
              style={{
                marginTop: '4px', width: '100%', padding: '14px', borderRadius: '14px',
                border: '1px solid #fbbf2450', background: '#1c1917', color: '#fbbf24',
                fontSize: '15px', fontWeight: '800', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              🏆 Таблица лидеров
            </button>
          </div>
        </div>
      )}

      {/* 2. ТАБЛИЦА ЛИДЕРОВ */}
      {screen === 'leaderboard' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏆 Таблица лидеров
            </h2>
            <button
              onClick={() => setScreen('menu')}
              style={{
                background: '#27272a', border: 'none', color: '#fff', padding: '8px 14px',
                borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Назад
            </button>
          </div>

          {/* Плашка текущего игрока */}
          {(() => {
            const currentActiveId = user?.id ? String(user.id) : guestId;
            const myIndex = leaderboard.findIndex((p) => String(p.id) === currentActiveId);
            const myPlace = myIndex >= 0 ? myIndex + 1 : 1;

            return (
              <div style={{
                background: 'linear-gradient(90deg, #18181b, #27272a)',
                border: `2px solid ${rank.color}`,
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                boxShadow: `0 4px 20px ${rank.color}25`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: '#27272a',
                    border: '1px solid #3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '900', color: '#fbbf24'
                  }}>
                    #{myPlace}
                  </div>
                  <span>{rank.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>
                      {displayName} <span style={{ color: '#4ade80', fontSize: '11px' }}>(Вы)</span>
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: rank.color, textTransform: 'uppercase' }}>
                      {rank.title}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: '#f4f4f5' }}>{mmr} MMR</span>
                  <span style={{ fontSize: '11px', color: '#fb923c', fontWeight: '700' }}>🔥 {streak} дн.</span>
                </div>
              </div>
            );
          })()}

          {/* Список игроков */}
          {isLoadingLeaderboard ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#71717a', fontSize: '14px' }}>
              Загрузка топа игроков...
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#71717a', fontSize: '14px' }}>
              Пока нет сыгравших игроков. Сыграй раунд первым!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leaderboard.map((player, index) => {
                const playerRank = getRankBadge(player.mmr);
                const currentActiveId = user?.id ? String(user.id) : guestId;
                const isMe = String(player.id) === currentActiveId;
                const isTop3 = index < 3;
                const placeBadge = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

                return (
                  <div
                    key={player.id || index}
                    style={{
                      background: isMe ? 'rgba(59, 130, 246, 0.12)' : '#121215',
                      border: isMe ? '1.5px solid #3b82f6' : isTop3 ? '1px solid #3f3f46' : '1px solid #27272a',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isMe ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: isTop3 ? '18px' : '13px',
                        fontWeight: '800',
                        width: '28px',
                        color: index === 0 ? '#facc15' : index === 1 ? '#cbd5e1' : index === 2 ? '#fb923c' : '#a1a1aa',
                        textAlign: 'center'
                      }}>
                        {placeBadge}
                      </span>

                      {player.photo ? (
                        <img src={player.photo} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                      ) : (
                        <span style={{ fontSize: '18px' }}>{playerRank.icon}</span>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: isMe ? '#60a5fa' : '#ffffff' }}>
                          {player.name} {isMe && '• Вы'}
                        </span>
                        <span style={{ fontSize: '10px', color: playerRank.color, fontWeight: '700', textTransform: 'uppercase' }}>
                          {playerRank.title}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#f4f4f5' }}>
                        {player.mmr} MMR
                      </span>
                      {player.streak > 0 && (
                        <span style={{ fontSize: '10px', color: '#f97316', fontWeight: '700' }}>
                          🔥 {player.streak}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. ЛОББИ ОЖИДАНИЯ ДУЭЛИ */}
      {screen === 'duel_lobby' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>Ожидание друга...</h2>
          <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 20px 0' }}>
            Нажми на код, чтобы скопировать его и отправить другу:
          </p>

          <div
            onClick={handleCopyCode}
            style={{
              cursor: 'pointer', background: copied ? 'rgba(34, 197, 94, 0.15)' : '#18181b',
              border: `2px dashed ${copied ? '#22c55e' : '#f97316'}`, borderRadius: '20px',
              padding: '18px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '6px', transition: 'all 0.2s ease', transform: copied ? 'scale(1.03)' : 'scale(1)',
              boxShadow: copied ? '0 0 25px rgba(34, 197, 94, 0.3)' : '0 0 25px rgba(249, 115, 22, 0.15)',
              marginBottom: '32px'
            }}
          >
            <div style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '0.22em', color: copied ? '#22c55e' : '#f97316' }}>
              {duelRoomId || '...'}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: copied ? '#4ade80' : '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {copied ? '✓ Скопировано в буфер!' : '📋 Нажми, чтобы скопировать'}
            </span>
          </div>

          <button
            onClick={handleGoToMenu}
            style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: '#27272a', color: '#ef4444', fontWeight: '700', cursor: 'pointer' }}
          >
            Отменить дуэль
          </button>
        </div>
      )}

      {/* 4. ПРЕВЬЮ ДУЭЛИ (3 СЕКУНДЫ) */}
      {screen === 'duel_preview' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
            ПРИГОТОВЬТЕСЬ • {previewTimer} СЕК
          </span>
          <div style={{ padding: '6px 14px', borderRadius: '20px', background: '#1e1b4b', color: '#818cf8', fontSize: '13px', fontWeight: '700', marginBottom: '16px' }}>
            {currentQuestion?.category}
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: '900', color: '#ffffff' }}>
            {currentQuestion?.name}
          </h1>
        </div>
      )}

      {/* 5. КАРТА ДУЭЛИ (20 СЕКУНД) */}
      {screen === 'duel_map' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: mapTimer <= 5 ? '#ef4444' : '#18181b', border: '2px solid #27272a',
            padding: '6px 16px', borderRadius: '20px', fontWeight: '900', fontSize: '16px', color: '#ffffff'
          }}>
            ⏱️ {mapTimer} с
          </div>

          <main style={{ flex: 1 }}>
            <MapComponent
              playerCoords={playerCoords}
              opponentCoords={opponentCoords}
              targetCoords={currentQuestion?.coords}
              isAnswered={Boolean(duelRoundResults)}
              onSelectCoords={(coords) => {
                if (!isAnswered) setPlayerCoords(coords);
              }}
            />
          </main>

          <footer style={{ padding: '12px 16px', background: '#121215', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#a1a1aa' }}>
              Ищем: <b style={{ color: '#60a5fa' }}>{currentQuestion?.name}</b>
            </div>

            {!isAnswered ? (
              <button
                onClick={handleConfirmDuelGuess}
                disabled={!playerCoords}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                  backgroundColor: playerCoords ? '#f97316' : '#27272a', color: playerCoords ? '#ffffff' : '#71717a',
                  fontSize: '15px', fontWeight: '700', cursor: playerCoords ? 'pointer' : 'not-allowed',
                }}
              >
                {playerCoords ? 'Поставить метку!' : 'Укажите точку'}
              </button>
            ) : duelRoundResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#18181b', borderRadius: '10px', fontSize: '13px' }}>
                  <span>Ты (чёрный): <b>{duelRoundResults.myDistance} км</b></span>
                  <span style={{ color: '#3b82f6' }}>{opponentName} (синий): <b>{duelRoundResults.oppDistance} км</b></span>
                </div>
                <button
                  onClick={handleNextDuelRound}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                    backgroundColor: '#16a34a', color: '#ffffff', fontSize: '15px', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  {roundNumber >= 5 ? 'Завершить дуэль' : 'Следующий раунд →'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', fontSize: '14px', color: '#fbbf24', fontWeight: '700' }}>
                ⏳ Ожидаем выбор соперника...
              </div>
            )}
          </footer>
        </div>
      )}

      {/* 6. ИТОГ ДУЭЛИ */}
      {screen === 'duel_result' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '8px' }}>
            {duelScores.me > duelScores.opp ? '🏆' : duelScores.me < duelScores.opp ? '💀' : '🤝'}
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 8px 0' }}>
            {duelScores.me > duelScores.opp ? 'ПОБЕДА!' : duelScores.me < duelScores.opp ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ'}
          </h1>

          <div style={{ fontSize: '20px', fontWeight: '800', color: duelScores.me > duelScores.opp ? '#4ade80' : '#ef4444', marginBottom: '24px' }}>
            {duelScores.me > duelScores.opp ? '+50 MMR' : duelScores.me < duelScores.opp ? '-40 MMR' : '+0 MMR'}
          </div>

          <div style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '36px' }}>
            Счёт раундов: <b>{duelScores.me} : {duelScores.opp}</b>
          </div>

          <button
            onClick={handleGoToMenu}
            style={{
              padding: '16px 36px', borderRadius: '16px', border: 'none',
              background: '#3b82f6', color: '#ffffff', fontSize: '16px', fontWeight: '800', cursor: 'pointer'
            }}
          >
            В главное меню
          </button>
        </div>
      )}

      {/* 7. ЭКРАН ВОПРОСА (ОДИНОЧНЫЙ) */}
      {screen === 'solo_question' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{
            padding: '6px 14px', borderRadius: '20px',
            background: gameMode === 'countries' ? '#064e3b' : '#1e1b4b',
            color: gameMode === 'countries' ? '#6ee7b7' : '#818cf8',
            fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px'
          }}>
            {gameMode === 'countries' ? '🌍 Страна мира' : currentQuestion.category}
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: '900', marginBottom: '48px', color: '#ffffff' }}>
            {currentQuestion.name}
          </h1>
          <button
            onClick={() => setScreen('solo_map')}
            style={{
              width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '16px',
              border: 'none',
              background: gameMode === 'countries' ? 'linear-gradient(90deg, #059669, #10b981)' : '#3b82f6',
              color: '#ffffff', fontSize: '17px', fontWeight: '700', cursor: 'pointer',
              boxShadow: gameMode === 'countries' ? '0 8px 24px rgba(16, 185, 129, 0.35)' : '0 8px 24px rgba(59, 130, 246, 0.35)'
            }}
          >
            🗺️ Найти на карте
          </button>
        </div>
      )}

      {/* 8. КАРТА (ОДИНОЧНАЯ) */}
      {screen === 'solo_map' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <main style={{ flex: 1 }}>
            <MapComponent
              playerCoords={playerCoords}
              targetCoords={currentQuestion.coords}
              isAnswered={isAnswered}
              onSelectCoords={(coords) => setPlayerCoords(coords)}
            />
          </main>
          <footer style={{ padding: '14px 16px', background: '#121215', borderTop: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ textAlign: 'center', fontSize: '13px', color: '#a1a1aa' }}>
              Ищем: <span style={{ color: gameMode === 'countries' ? '#34d399' : '#60a5fa', fontWeight: '700' }}>{currentQuestion.name}</span>
            </div>

            {!isAnswered ? (
              <button
                onClick={handleConfirmSoloGuess}
                disabled={!playerCoords}
                style={{
                  width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                  backgroundColor: playerCoords ? (gameMode === 'countries' ? '#10b981' : '#3b82f6') : '#27272a',
                  color: playerCoords ? '#ffffff' : '#71717a',
                  fontSize: '15px', fontWeight: '600', cursor: playerCoords ? 'pointer' : 'not-allowed',
                }}
              >
                {playerCoords ? 'Подтвердить выбор' : 'Укажите точку на карте'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#18181b', borderRadius: '10px', fontSize: '14px' }}>
                  <span style={{ color: '#a1a1aa' }}>Промах: <b>{result.distance} км</b></span>
                  <span style={{ color: result.delta >= 0 ? '#4ade80' : '#ef4444', fontWeight: '800' }}>
                    {result.delta > 0 ? `+${result.delta}` : result.delta} MMR
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPlayerCoords(null);
                    setIsAnswered(false);
                    setResult(null);
                    setSoloIndex((prev) => (prev + 1) % activeDeck.length);
                    setRoundNumber((prev) => prev + 1);
                    setScreen('solo_question');
                  }}
                  style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Следующий раунд →
                </button>
              </div>
            )}
          </footer>
        </div>
      )}
    </div>
  );
}