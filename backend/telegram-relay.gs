/**
 * GagraFly — обработчик заявок с сайта.
 *
 * Принимает POST с формы на gagrafly.ru и пересылает заявку в Telegram.
 * Токен бота в коде НЕ хранится — он лежит в свойствах скрипта
 * (Настройки проекта → Свойства скрипта): BOT_TOKEN и CHAT_ID.
 *
 * Текст сообщения собирается здесь, на сервере, а не приходит с сайта —
 * чтобы через этот адрес нельзя было отправить Косте произвольный текст.
 */

function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('BOT_TOKEN');
  var chatId = props.getProperty('CHAT_ID');
  if (!token || !chatId) return ContentService.createTextOutput('not configured');

  var p = (e && e.parameter) || {};

  var text = '🪂 Заявка с сайта GagraFly'
    + '\nИмя: ' + clean(p.name)
    + '\nТелефон: ' + clean(p.phone)
    + '\nТариф: ' + clean(p.plan)
    + '\nДата: ' + (p.date ? clean(p.date) : 'не указана');

  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    payload: { chat_id: chatId, text: text },
    muteHttpExceptions: true
  });

  return ContentService.createTextOutput('ok');
}

function doGet() {
  return ContentService.createTextOutput('ok');
}

/** обрезаем и чистим — чтобы в чат не улетела простыня или разметка */
function clean(v) {
  if (!v) return '—';
  return String(v).replace(/[\r\n]+/g, ' ').trim().slice(0, 200) || '—';
}
