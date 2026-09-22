import http from 'http';
import { Telegraf, Markup } from 'telegraf';
import cron from 'node-cron';
import fs from 'fs';

const BOT_TOKEN = '8677188607:AAHbjb_3eNYty1078oG5dYVH6HkbJEbTjCc';
const WEB_APP_URL = 'https://geo-quiz-three-zeta.vercel.app/';

const bot = new Telegraf(BOT_TOKEN);
const REMINDERS_FILE = './reminders.json';
const LEADERBOARD_FILE = './leaderboard.json';

const awaitingTimeInput = new Set();

// ==========================================
// ФУНКЦИИ ХРАНИЛИЩА (REMINDERS & LEADERBOARD)
// ==========================================
function loadReminders() {
  if (!fs.existsSync(REMINDERS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(REMINDERS_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveReminders(data) {
  try {
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Ошибка сохранения reminders:', e);
  }
}

function loadLeaderboard() {
  if (!fs.existsSync(LEADERBOARD_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(data) {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Ошибка сохранения leaderboard:', e);
  }
}

function getReminderKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🌅 09:00', 'time_09:00'),
      Markup.button.callback('☀️ 14:00', 'time_14:00'),
      Markup.button.callback('🌆 19:00', 'time_19:00'),
      Markup.button.callback('🌙 21:00', 'time_21:00'),
    ],
    [
      Markup.button.callback('✏️ Своё время', 'time_custom'),
      Markup.button.callback('🔕 Отключить', 'time_off'),
    ],
    [Markup.button.webApp('🎮 В главное меню', WEB_APP_URL)]
  ]);
}

// ==========================================
// ТЕЛЕГРАМ БОТ: ОБРАБОТЧИКИ
// ==========================================

// Единый обработчик команды /start
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const payload = ctx.payload; // Параметр из ссылки ?start=
  const data = loadReminders();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Novokuznetsk' });

  // Обновляем визит для напоминаний
  data[userId] = {
    ...data[userId],
    userName: ctx.from.first_name || 'Географ',
    lastPlayedDate: today
  };
  saveReminders(data);

  // Получаем аватарку пользователя
  let photoUrl = null;
  try {
    const photos = await ctx.telegram.getUserProfilePhotos(ctx.from.id, 0, 1);
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      photoUrl = fileLink.href;
    }
  } catch (e) {}

  const userData = {
    id: userId,
    first_name: ctx.from.first_name || 'Географ',
    username: ctx.from.username || '',
    photo_url: photoUrl
  };

  // Авторизация пользователя из обычного браузера
  if (payload && payload.startsWith('auth_')) {
    const authCode = payload.replace('auth_', '');

    try {
      await fetch('https://geo-quiz-three-zeta.vercel.app/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode, user: userData })
      });

      return ctx.reply(
        `✅ <b>Вы успешно авторизовались в GeoQuiz!</b>\n\n` +
        `Вернитесь во вкладку браузера — вход выполнится автоматически.`,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [Markup.button.webApp('🎮 Открыть GeoQuiz', WEB_APP_URL)]
          ])
        }
      );
    } catch (e) {
      console.error('Ошибка отправки авторизации:', e);
    }
  }

  // Обычное приветствие
  ctx.reply(
    `👋 Привет, <b>${ctx.from.first_name || 'Географ'}</b>!\n\n` +
    `Добро пожаловать в <b>GeoQuiz</b>!\n` +
    `Играй в одиночку или сразись в дуэли 1 на 1 в реальном времени.`,
    { parse_mode: 'HTML', ...getReminderKeyboard() }
  );
});

bot.command(['remind', 'time', 'settime'], (ctx) => {
  ctx.reply('⚙️ <b>Настройка ежедневных напоминаний:</b>', {
    parse_mode: 'HTML',
    ...getReminderKeyboard()
  });
});

bot.action(/^time_(\d{2}:\d{2})$/, async (ctx) => {
  const selectedTime = ctx.match[1];
  const userId = ctx.from.id.toString();
  const data = loadReminders();
  data[userId] = { ...data[userId], time: selectedTime, userName: ctx.from.first_name || 'Географ' };
  saveReminders(data);
  awaitingTimeInput.delete(userId);

  await ctx.answerCbQuery(`Время сохранено: ${selectedTime}`);
  await ctx.editMessageText(
    `✅ <b>Готово!</b> Напоминание установлено на <b>${selectedTime}</b>.`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🗺️ Открыть игру', WEB_APP_URL)],
        [Markup.button.callback('⚙️ Изменить время', 'menu_remind')]
      ])
    }
  );
});

bot.action('time_off', async (ctx) => {
  const userId = ctx.from.id.toString();
  const data = loadReminders();
  if (data[userId]) delete data[userId].time;
  saveReminders(data);
  awaitingTimeInput.delete(userId);
  await ctx.answerCbQuery('Напоминания выключены');
  await ctx.editMessageText('🔕 Ежедневные напоминания отключены.', {
    ...Markup.inlineKeyboard([[Markup.button.callback('⏰ Включить напоминание', 'menu_remind')]])
  });
});

bot.action('time_custom', async (ctx) => {
  const userId = ctx.from.id.toString();
  awaitingTimeInput.add(userId);
  await ctx.answerCbQuery();
  await ctx.reply('✍️ Напиши в ответ время в формате <b>ЧЧ:ММ</b> (например: <code>19:30</code>):', { parse_mode: 'HTML' });
});

bot.action('menu_remind', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('⚙️ <b>Выбери новое время напоминания:</b>', { parse_mode: 'HTML', ...getReminderKeyboard() });
});

bot.on('text', (ctx, next) => {
  const userId = ctx.from.id.toString();
  if (!awaitingTimeInput.has(userId)) return next();

  const text = ctx.message.text.trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(text)) {
    return ctx.reply('⚠️ Формат: <b>ЧЧ:ММ</b> (например <code>19:30</code>):', { parse_mode: 'HTML' });
  }

  const data = loadReminders();
  data[userId] = { ...data[userId], time: text, userName: ctx.from.first_name || 'Географ' };
  saveReminders(data);
  awaitingTimeInput.delete(userId);
  ctx.reply(`✅ Сохранено на <b>${text}</b> каждый день.`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.webApp('🗺️ Открыть меню игры', WEB_APP_URL)]])
  });
});

// Крон ежеминутной проверки напоминаний
cron.schedule('* * * * *', () => {
  const now = new Date();
  const timeString = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Novokuznetsk' });
  const data = loadReminders();
  for (const [userId, record] of Object.entries(data)) {
    if (record.time === timeString) {
      bot.telegram.sendMessage(userId, `🔔 <b>Время размять память!</b>\n\nЗайди в GeoQuiz и подтверди стрик!`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.webApp('Открыть GeoQuiz 🗺️', WEB_APP_URL)]])
      }).catch(() => {});
    }
  }
});

// Стрик-таймер (23:00)
cron.schedule('0 23 * * *', () => {
  const data = loadReminders();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Novokuznetsk' });
  for (const [userId, record] of Object.entries(data)) {
    if (record.lastPlayedDate !== today) {
      bot.telegram.sendMessage(userId, `⚠️ <b>Огонёк почти погас!</b>\n\nОстался 1 час до сброса стрика!`, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([[Markup.button.webApp('Спасти огонёк 🔥', WEB_APP_URL)]])
      }).catch(() => {});
    }
  }
}, { timezone: 'Asia/Novokuznetsk' });

// ==========================================
// HTTP-СЕРВЕР: ДЛЯ RENDER И ЛИДЕРБОРДА
// ==========================================
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // 1. Получение списка лидеров (GET /api/leaderboard)
  if (req.method === 'GET' && (req.url === '/api/leaderboard' || req.url === '/leaderboard')) {
    const users = loadLeaderboard();
    const sorted = users.sort((a, b) => (Number(b.mmr) || 0) - (Number(a.mmr) || 0));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, leaderboard: sorted }));
  }

  // 2. Сохранение реального игрока (POST /api/leaderboard)
  if (req.method === 'POST' && (req.url === '/api/leaderboard' || req.url === '/leaderboard')) {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing ID' }));
        }

        let users = loadLeaderboard();
        const existingIndex = users.findIndex((u) => String(u.id) === String(data.id));

        const userProfile = {
          id: String(data.id),
          name: data.first_name || data.name || 'Географ',
          username: data.username || '',
          photo: data.photo_url || data.photo || null,
          mmr: Number(data.mmr) || 1000,
          streak: Number(data.streak) || 0,
          updatedAt: Date.now()
        };

        if (existingIndex >= 0) {
          users[existingIndex] = { ...users[existingIndex], ...userProfile };
        } else {
          users.push(userProfile);
        }

        saveLeaderboard(users);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, user: userProfile }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Пинг активности для проверок Render
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot and Leaderboard API is running 24/7!');
});

server.listen(PORT, () => {
  console.log(`🌐 Сервер бота и лидерборда слушает порт: ${PORT}`);
});

// Запуск бота с автоматическим сбросом зависших обновлений
bot.launch({ dropPendingUpdates: true })
  .then(() => console.log('🤖 Бот успешно запущен и слушает Telegram!'))
  .catch((err) => console.error('❌ Ошибка запуска бота:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));