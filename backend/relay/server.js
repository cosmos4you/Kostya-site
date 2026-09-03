// Обработчик заявок с gagrafly.ru.
//
// Сайт статический (GitHub Pages), поэтому токен бота нельзя держать в его коде —
// его прочитает любой посетитель. Сайт шлёт заявку сюда, а уже отсюда она уходит
// Косте в Telegram. Токен живёт в переменных окружения Railway.
//
// Переменные: BOT_TOKEN — токен @gagraflybot, CHAT_ID — чат Кости.

const http = require('http');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PORT = process.env.PORT || 3000;

// Текст заявки собираем здесь, а не принимаем готовым с сайта:
// иначе через этот адрес можно было бы слать Косте произвольные сообщения.
function buildText(p) {
  return '🪂 Заявка с сайта GagraFly'
    + '\nИмя: ' + clean(p.name)
    + '\nТелефон: ' + clean(p.phone)
    + '\nТариф: ' + clean(p.plan)
    + '\nДата: ' + (p.date ? clean(p.date) : 'не указана');
}

function clean(v) {
  if (!v) return '—';
  return String(v).replace(/[\r\n]+/g, ' ').trim().slice(0, 200) || '—';
}

// Простая защита от флуда: не больше 5 заявок с одного адреса за 10 минут.
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  cors(res);

  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST') return res.writeHead(200).end('ok');

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket.remoteAddress || 'unknown';
  if (tooMany(ip)) {
    console.warn('too many requests from', ip);
    return res.writeHead(429).end('too many requests');
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 4096) req.destroy();
  });

  req.on('end', async () => {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('BOT_TOKEN или CHAT_ID не заданы');
      return res.writeHead(500).end('not configured');
    }
    try {
      const p = Object.fromEntries(new URLSearchParams(body));
      const r = await fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: buildText(p) })
      });
      if (!r.ok) {
        console.error('telegram ответил', r.status, await r.text());
        return res.writeHead(502).end('telegram error');
      }
      console.log('заявка отправлена');
      res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
    } catch (e) {
      console.error('ошибка обработки заявки:', e.message);
      res.writeHead(500).end('error');
    }
  });
});

server.listen(PORT, () => console.log('relay слушает порт', PORT));
