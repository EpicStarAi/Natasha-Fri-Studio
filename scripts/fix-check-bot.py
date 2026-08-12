import json

P = 'n8n-workflows/EPICSTAR_TELEGRAM_AUTOPOST.json'
wf = json.load(open(P, encoding='utf-8'))

NEW_CODE = """// Проверка Telegram-бота перед отправкой (понятная ошибка вместо 401 Unauthorized)
const token = $env.TELEGRAM_BOT_TOKEN;
if (token && token.trim()) {
  let body;
  try {
    body = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.telegram.org/bot' + token.trim() + '/getMe',
    });
  } catch (e) {
    throw new Error(
      'Telegram-бот недоступен: ' + (e && e.message ? e.message : String(e)) +
      ' — проверьте токен у @BotFather и перезапустите задачу'
    );
  }
  if (!body.ok) {
    throw new Error(
      'Telegram-бот не отвечает (getMe ' + (body.error_code || 'unknown') + '): ' +
      (body.description || 'токен недействителен или отозван — перевыпустите у @BotFather')
    );
  }
}
// Если TELEGRAM_BOT_TOKEN не задан — авторизация идёт через n8n-credential, проверку пропускаем
return $input.all();"""

for n in wf['nodes']:
    if n.get('name') == 'Check Bot':
        n['parameters']['jsCode'] = NEW_CODE
        print('Check Bot jsCode rewritten with this.helpers.httpRequest.')
json.dump(wf, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
