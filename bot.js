import http from 'http';
import { Telegraf, Markup } from 'telegraf';
import cron from 'node-cron';
import fs from 'fs';

const BOT_TOKEN = '8677188607:AAHbjb_3eNYty1078oG5dYVH6HkbJEbTjCc';
const WEB_APP_URL = 'https://geo-quiz-three-zeta.vercel.app/';

const bot = new Telegraf(BOT_TOKEN);
const DB_FILE = './reminders.json';

const awaitingTimeInput = new Set();

function loadData() {
  if (!fs.existsSync(DB_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); } catch { return {}; }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
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

// ЕДИНЫЙ ОБРАБОТЧИК СТАРТА: ОБЫЧНЫЙ ВХОД + WEB-АВТОРИЗАЦИЯ
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const payload = ctx.payload; // Параметр из ссылки ?start=
  const data = loadData();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Novokuznetsk' });

  // Обновляем дату визита
  data[userId] = {
    ...data[userId],
    userName: ctx.from.first_name || 'Географ',
    lastPlayedDate: today
  };
  saveData(data);

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

  // Авторизация из браузера
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
      console.error('Ошибка auth API:', e);
    }
  }

  // Стандартное приветствие
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
  const data = loadData();
  data[userId] = { ...data[userId], time: selectedTime, userName: ctx.from.first_name || 'Географ' };
  saveData(data);
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
  const data = loadData();
  if (data[userId]) delete data[userId].time;
  saveData(data);
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

  const data = loadData();
  data[userId] = { ...data[userId], time: text, userName: ctx.from.first_name || 'Географ' };
  saveData(data);
  awaitingTimeInput.delete(userId);
  ctx.reply(`✅ Сохранено на <b>${text}</b> каждый день.`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([[Markup.button.webApp('🗺️ Открыть меню игры', WEB_APP_URL)]])
  });
});

// Крон напоминания
cron.schedule('* * * * *', () => {
  const now = new Date();
  const timeString = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Novokuznetsk' });
  const data = loadData();
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
  const data = loadData();
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

bot.launch().then(() => console.log('🤖 Бот успешно запущен!'));
// Фиктивный веб-сервер для прохождения проверки портов Render
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running!');
}).listen(PORT, () => {
  console.log(`🌐 Сервер проверки активности слушает порт: ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));