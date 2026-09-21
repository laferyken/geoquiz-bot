// База данных географической номенклатуры с точными координатами [широта, долгота]
export const LOCATIONS = [
  // --- МОРЯ И ОКЕАНИЧЕСКИЕ ОБЪЕКТЫ ---
  { id: 1, name: 'Балтийское море', category: 'Море', coords: [58.0, 20.0] },
  { id: 2, name: 'Берингово море', category: 'Море', coords: [58.0, 178.0] },
  { id: 3, name: 'Баренцево море', category: 'Море', coords: [73.0, 40.0] },
  { id: 4, name: 'Карское море', category: 'Море', coords: [75.0, 75.0] },
  { id: 5, name: 'Море Лаптевых', category: 'Море', coords: [76.0, 125.0] },
  { id: 6, name: 'Чукотское море', category: 'Море', coords: [69.5, -171.5] },
  { id: 7, name: 'Восточно-Сибирское море', category: 'Море', coords: [73.0, 160.0] },
  { id: 8, name: 'Красное море', category: 'Море', coords: [22.0, 38.0] },
  { id: 9, name: 'Средиземное море', category: 'Море', coords: [35.0, 18.0] },
  { id: 10, name: 'Чёрное море', category: 'Море', coords: [43.4, 34.5] },
  { id: 11, name: 'Мраморное море', category: 'Море', coords: [40.7, 28.2] },
  { id: 12, name: 'Японское море', category: 'Море', coords: [40.0, 135.0] },
  { id: 13, name: 'Жёлтое море', category: 'Море', coords: [35.5, 123.5] },
  { id: 14, name: 'Восточно-Китайское море', category: 'Море', coords: [29.0, 125.0] },
  { id: 15, name: 'Южно-Китайское море', category: 'Море', coords: [12.0, 113.0] },
  { id: 16, name: 'Аравийское море', category: 'Море', coords: [16.0, 64.0] },
  { id: 17, name: 'Северное море', category: 'Море', coords: [56.0, 3.0] },
  { id: 18, name: 'Норвежское море', category: 'Море', coords: [67.0, 4.0] },
  { id: 19, name: 'Карибское море', category: 'Море', coords: [15.0, -75.0] },
  { id: 20, name: 'Белое море', category: 'Море', coords: [65.5, 37.5] },
  { id: 21, name: 'Охотское море', category: 'Море', coords: [53.0, 150.0] },
  { id: 22, name: 'Азовское море', category: 'Море', coords: [46.0, 36.5] },
  { id: 23, name: 'Марианский желоб', category: 'Желоб', coords: [11.35, 142.2] },
  { id: 24, name: 'Курило-Камчатский желоб', category: 'Желоб', coords: [44.0, 150.0] },

  // --- ПРОЛИВЫ И КАНАЛЫ ---
  { id: 25, name: 'Малаккский пролив', category: 'Пролив', coords: [2.5, 101.5] },
  { id: 26, name: 'Пролив Ла-Манш', category: 'Пролив', coords: [50.0, -1.0] },
  { id: 27, name: 'Пролив Па-де-Кале', category: 'Пролив', coords: [51.0, 1.5] },
  { id: 28, name: 'Босфор', category: 'Пролив', coords: [41.1, 29.0] },
  { id: 29, name: 'Дарданеллы', category: 'Пролив', coords: [40.2, 26.4] },
  { id: 30, name: 'Магелланов пролив', category: 'Пролив', coords: [-53.5, -70.5] },
  { id: 31, name: 'Пролив Дрейка', category: 'Пролив', coords: [-58.5, -65.0] },
  { id: 32, name: 'Гибралтарский пролив', category: 'Пролив', coords: [35.9, -5.6] },
  { id: 33, name: 'Мозамбикский пролив', category: 'Пролив', coords: [-17.0, 42.0] },
  { id: 34, name: 'Баб-эль-Мандебский пролив', category: 'Пролив', coords: [12.6, 43.3] },
  { id: 35, name: 'Берингов пролив', category: 'Пролив', coords: [65.9, -168.9] },
  { id: 36, name: 'Татарский пролив', category: 'Пролив', coords: [50.0, 141.5] },
  { id: 37, name: 'Пролив Лаперуза', category: 'Пролив', coords: [45.7, 142.0] },
  { id: 38, name: 'Керченский пролив', category: 'Пролив', coords: [45.3, 36.6] },
  { id: 39, name: 'Суэцкий канал', category: 'Канал', coords: [30.5, 32.3] },
  { id: 40, name: 'Панамский канал', category: 'Канал', coords: [9.1, -79.7] },

  // --- ЗАЛИВЫ ---
  { id: 41, name: 'Финский залив', category: 'Залив', coords: [60.0, 26.0] },
  { id: 42, name: 'Мексиканский залив', category: 'Залив', coords: [25.0, -90.0] },
  { id: 43, name: 'Персидский залив', category: 'Залив', coords: [26.5, 52.0] },
  { id: 44, name: 'Бенгальский залив', category: 'Залив', coords: [15.0, 88.0] },
  { id: 45, name: 'Бискайский залив', category: 'Залив', coords: [45.5, -4.0] },
  { id: 46, name: 'Гудзонов залив', category: 'Залив', coords: [60.0, -86.0] },
  { id: 47, name: 'Гвинейский залив', category: 'Залив', coords: [2.0, 2.0] },
  { id: 48, name: 'Большой Австралийский залив', category: 'Залив', coords: [-34.0, 130.0] },
  { id: 49, name: 'Залив Карпентария', category: 'Залив', coords: [-14.0, 139.0] },

  // --- ОСТРОВА И ПОЛУОСТРОВА ---
  { id: 50, name: 'Мадагаскар', category: 'Остров', coords: [-18.7, 46.8] },
  { id: 51, name: 'Гренландия', category: 'Остров', coords: [72.0, -40.0] },
  { id: 52, name: 'Остров Сахалин', category: 'Остров', coords: [51.0, 143.0] },
  { id: 53, name: 'Курильские острова', category: 'Архипелаг', coords: [47.0, 152.0] },
  { id: 54, name: 'Тасмания', category: 'Остров', coords: [-42.0, 146.5] },
  { id: 55, name: 'Камчатка', category: 'Полуостров', coords: [56.0, 160.0] },
  { id: 56, name: 'Кольский полуостров', category: 'Полуостров', coords: [67.5, 36.5] },
  { id: 57, name: 'Полуостров Таймыр', category: 'Полуостров', coords: [75.0, 100.0] },
  { id: 58, name: 'Полуостров Индостан', category: 'Полуостров', coords: [15.0, 77.0] },
  { id: 59, name: 'Аравийский полуостров', category: 'Полуостров', coords: [23.5, 45.5] },
  { id: 60, name: 'Скандинавский полуостров', category: 'Полуостров', coords: [63.0, 15.0] },
  { id: 61, name: 'Пиренейский полуостров', category: 'Полуостров', coords: [40.0, -4.0] },
  { id: 62, name: 'Апеннинский полуостров', category: 'Полуостров', coords: [42.5, 12.5] },
  { id: 63, name: 'Полуостров Флорида', category: 'Полуостров', coords: [28.0, -82.0] },

  // --- ОЗЁРА И ВОДОХРАНИЛИЩА ---
  { id: 64, name: 'Озеро Байкал', category: 'Озеро', coords: [53.5, 108.0] },
  { id: 65, name: 'Каспийское море-озеро', category: 'Озеро', coords: [42.0, 51.0] },
  { id: 66, name: 'Ладожское озеро', category: 'Озеро', coords: [61.0, 31.5] },
  { id: 67, name: 'Онежское озеро', category: 'Озеро', coords: [61.8, 35.5] },
  { id: 68, name: 'Озеро Балхаш', category: 'Озеро', coords: [46.5, 75.0] },
  { id: 69, name: 'Мёртвое море', category: 'Озеро', coords: [31.5, 35.5] },
  { id: 70, name: 'Женевское озеро', category: 'Озеро', coords: [46.4, 6.5] },
  { id: 71, name: 'Озеро Верхнее', category: 'Озеро', coords: [47.7, -87.5] },
  { id: 72, name: 'Озеро Мичиган', category: 'Озеро', coords: [44.0, -87.0] },
  { id: 73, name: 'Озеро Виктория', category: 'Озеро', coords: [-1.0, 33.0] },
  { id: 74, name: 'Озеро Танганьика', category: 'Озеро', coords: [-6.0, 29.5] },
  { id: 75, name: 'Озеро Титикака', category: 'Озеро', coords: [-15.8, -69.4] },
  { id: 76, name: 'Рыбинское водохранилище', category: 'Водохранилище', coords: [58.4, 38.4] },
  { id: 77, name: 'Братское водохранилище', category: 'Водохранилище', coords: [55.5, 102.5] },

  // --- ВОДОПАДЫ ---
  { id: 78, name: 'Водопад Анхель', category: 'Водопад', coords: [5.97, -62.53] },
  { id: 79, name: 'Водопад Виктория', category: 'Водопад', coords: [-17.92, 25.85] },
  { id: 80, name: 'Ниагарский водопад', category: 'Водопад', coords: [43.08, -79.07] },
  { id: 81, name: 'Водопады Игуасу', category: 'Водопад', coords: [-25.69, -54.43] },
  { id: 82, name: 'Водопад Кивач', category: 'Водопад', coords: [62.27, 33.98] },

  // --- ГОРНЫЕ ВЕРШИНЫ И ВУЛКАНЫ ---
  { id: 83, name: 'Гора Джомолунгма (Эверест)', category: 'Гора', coords: [27.98, 86.92] },
  { id: 84, name: 'Эльбрус', category: 'Гора', coords: [43.35, 42.43] },
  { id: 85, name: 'Гора Белуха', category: 'Гора', coords: [49.8, 86.58] },
  { id: 86, name: 'Гора Монблан', category: 'Гора', coords: [45.83, 6.86] },
  { id: 87, name: 'Гора Аконкагуа', category: 'Гора', coords: [-32.65, -70.01] },
  { id: 88, name: 'Килиманджаро', category: 'Вулкан', coords: [-3.06, 37.35] },
  { id: 89, name: 'Вулкан Ключевская Сопка', category: 'Вулкан', coords: [56.05, 160.64] },
  { id: 90, name: 'Вулкан Фудзияма', category: 'Вулкан', coords: [35.36, 138.72] },
  { id: 91, name: 'Вулкан Везувий', category: 'Вулкан', coords: [40.82, 14.42] },
  { id: 92, name: 'Вулкан Этна', category: 'Вулкан', coords: [37.75, 14.99] },
  { id: 93, name: 'Вулкан Кракатау', category: 'Вулкан', coords: [-6.1, 105.4] },

  // --- КРАЙНИЕ МЫСЫ ---
  { id: 94, name: 'Мыс Челюскин', category: 'Мыс', coords: [77.72, 104.28] },
  { id: 95, name: 'Мыс Дежнёва', category: 'Мыс', coords: [66.08, -169.65] },
  { id: 96, name: 'Мыс Рока', category: 'Мыс', coords: [38.78, -9.5] },
  { id: 97, name: 'Мыс Доброй Надежды', category: 'Мыс', coords: [-34.35, 18.47] },
  { id: 98, name: 'Мыс Горн', category: 'Мыс', coords: [-55.98, -67.27] },
  { id: 99, name: 'Мыс Игольный', category: 'Мыс', coords: [-34.83, 20.0] },
  { id: 100, name: 'Мыс Альмади', category: 'Мыс', coords: [14.74, -17.53] },
  { id: 101, name: 'Мыс Рас-Хафун', category: 'Мыс', coords: [10.43, 51.27] },
  { id: 102, name: 'Мыс Йорк', category: 'Мыс', coords: [-10.68, 142.53] },
  { id: 103, name: 'Мыс Пиай', category: 'Мыс', coords: [1.26, 103.51] },

  // --- ПУСТЫНИ ---
  { id: 104, name: 'Пустыня Сахара', category: 'Пустыня', coords: [23.0, 12.0] },
  { id: 105, name: 'Пустыня Атакама', category: 'Пустыня', coords: [-23.8, -69.2] },
  { id: 106, name: 'Пустыня Калахари', category: 'Пустыня', coords: [-23.0, 22.0] },
  { id: 107, name: 'Пустыня Гоби', category: 'Пустыня', coords: [42.5, 105.0] },
  { id: 108, name: 'Пустыня Каракумы', category: 'Пустыня', coords: [39.0, 60.0] },
  { id: 109, name: 'Пустыня Руб-эль-Хали', category: 'Пустыня', coords: [20.0, 50.0] }
];

// Математический расчет расстояния (формула гаверсинусов)
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Расчет очков (от 0 до 5000)
export function calculateScore(distanceKm) {
  if (distanceKm <= 50) return 5000;
  const score = Math.round(5000 * Math.exp(-distanceKm / 1200));
  return Math.max(0, score);
}

// Расчёт изменения MMR за раунд (-200 ... +200)
export function calculateMmrDelta(distanceKm) {
  if (distanceKm <= 900) {
    // Чем ближе к 0 км, тем ближе к +200 MMR
    // При 0 км -> +200, при 900 км -> 0
    return Math.round(200 * (1 - distanceKm / 900));
  } else {
    // При промахе > 900 км уходим в минус, максимум -200 (при 3000 км+)
    const penalty = ((distanceKm - 900) / (3000 - 900)) * 200;
    return -Math.min(200, Math.round(penalty));
  }
}

// Таблица рангов с порядковыми номерами (level)
export function getRankBadge(mmr) {
  if (mmr < 500) return { level: 1, title: 'Рекрут', icon: '🥉', color: '#9ca3af' };
  if (mmr < 1200) return { level: 2, title: 'Страж', icon: '🥈', color: '#60a5fa' };
  if (mmr < 2000) return { level: 3, title: 'Рыцарь', icon: '⚔️', color: '#38bdf8' };
  if (mmr < 3000) return { level: 4, title: 'Герой', icon: '🛡️', color: '#34d399' };
  if (mmr < 4200) return { level: 5, title: 'Легенда', icon: '💎', color: '#fbbf24' };
  if (mmr < 5500) return { level: 6, title: 'Властелин', icon: '👑', color: '#f472b6' };
  if (mmr < 7000) return { level: 7, title: 'Божество', icon: '🔮', color: '#c084fc' };
  return { level: 8, title: 'Титан', icon: '⚡', color: '#f87171' };
}

// Проверка и расчёт ежедневного стрика
export function checkAndUpdateStreak() {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const lastDate = localStorage.getItem('geo_last_played_date');
  let currentStreak = parseInt(localStorage.getItem('geo_streak') || '0', 10);
  let streakIncreased = false;

  if (!lastDate) {
    currentStreak = 1;
    streakIncreased = true;
  } else if (lastDate === today) {
    // Сегодня уже играл — стрик не меняется
    streakIncreased = false;
  } else {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastDate === yesterday) {
      currentStreak += 1;
      streakIncreased = true;
    } else {
      // Пропустил день — стрик сбрасывается до 1
      currentStreak = 1;
      streakIncreased = true;
    }
  }

  localStorage.setItem('geo_last_played_date', today);
  localStorage.setItem('geo_streak', currentStreak.toString());

  return { streak: currentStreak, isNewDay: streakIncreased };
}
