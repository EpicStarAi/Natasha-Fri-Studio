# AVATAR FACTORY V1 — рабочий шаблон аватаров

Зафиксировано 4 ноября 2026, Europe/Kyiv. Проект: NEW🌏NEWS🇷🇺RUS / AI_FACTORY.
Этот документ сохраняет **одобренный пользователем ролик с движением ведущей** и превращает его способ производства в повторяемый шаблон. Это рабочая база для новых персонажей и тематик; каждый новый образ проходит свой короткий тест.

## 1. Что именно сохраняем

| Параметр | Эталон V1 |
|---|---|
| Видео | `NEW_NEWS_RUS_MOTION_V2_1080x1920.mp4` |
| Образ | Утверждённая брюнетка, чёрное худи, микрофон, прежняя студия |
| Голос | Supertonic 3, F1, русский; готовый пресет, не клон голоса |
| Исходная анимация | Wan 2.1 I2V + InfiniteTalk, 384×672, 25 fps |
| Выдача | MP4, 1080×1920, 30 fps, H.264/AAC, без субтитров |
| Монтаж | Заставка 1 секунда + 13.8 секунды ведущей; файл около 14.83 секунды |
| Движение | Голова, плечи и руки в одном генерируемом кадре |
| Железо теста | RTX 5060 8 GB; Ryzen 9 9950X; около 64 GB RAM |
| Время GPU | 1322 секунды, около 22 минут, для этого конкретного дубля |
| Git-контрольная точка | `checkpoint/avatar-motion-v1-approved-2026-11-04` |
| Код до добавления шаблонов | `c4965b9c729c2df66c3ad634fedcac1446dce249` |

SHA-256 утверждённого файла из чата:
`e2173b9d1a6d706bb898440bc1c287e1a61b30d97d243463a54cb99d365bd978`.

SHA-256 мастер-кадра:
`c42b5458e4a10e2a5365e157d2b52cfd68068b3de127d72d3f216eb9acfa8601`.

SHA-256 исходного `voice.wav`:
`3cf6c73f3a18159efcf05b24d6f553fac675a94a7493676575a5f50379db5a4f`.

Windows-копия экспортированного MP4 имеет другой контейнерный хеш. В комплект включён именно одобренный файл из чата. Новый рендер даже с тем же seed не обязан побайтно совпадать: влияют версии, GPU, окружение и недетерминированные операции.

**1080×1920 — размер итогового файла.** Детализация источника 384×672; масштабирование и перевод 25→30 fps не создают нативную Full HD детализацию и не являются нейросетевой интерполяцией.

## 2. Полный набор инструментов и их роли

| Инструмент | Роль | Статус для V1 |
|---|---|---|
| Windows + WSL Ubuntu 24.04 | Windows запускает GPU ComfyUI; WSL — голос, сборку, веб-студию | Проверено на текущем ПК |
| Python 3.12 | Скрипты, ComfyUI, локальные окружения | Windows 3.12.10; WSL 3.12.3 |
| NVIDIA / CUDA PyTorch | Вычисления на RTX 5060 | Драйвер 610.88; Torch 2.11.0+cu128 |
| ComfyUI | Выполнение графа генерации | Обязателен |
| ComfyUI-WanVideoWrapper | Узлы Wan, InfiniteTalk, аудиоэмбеддинги | Обязателен |
| ComfyUI-GGUF | Работа установленного стека с GGUF | Сохранён в рабочей сборке |
| ComfyUI-VideoHelperSuite | Кодирование промежуточных видео | Обязателен |
| Wan 2.1 I2V 14B Q4_K_M | Генерация движения из мастер-кадра | Обязательная базовая модель |
| InfiniteTalk Single Q8 | Управление говорящим персонажем по звуку | Обязательный адаптер |
| Lightx2v I2V 14B 480p rank64 | Ускорение выбранного режима Wan | Использован с 6 шагами |
| UMT5 scaled FP8 + Wan VAE | Текстовое условие и кодирование изображения | Обязательны |
| TencentGameMate/chinese-wav2vec2-base | Преобразование WAV в условие движения | Использован и с русской речью; название не означает язык ведущей |
| Supertonic 3 / SDK 1.3.1 | Локальная озвучка на CPU, F1–F5 и M1–M5 | В эталоне F1/ru, 8 шагов, speed 1.0 |
| FFmpeg / FFprobe | Монтаж, звук, масштабирование, проверка MP4 | В WSL FFmpeg 6.1.1 |
| Git / GitHub | Код, профили, графы, контрольные точки | Репозиторий Natasha-Fri-Studio, PR #3 |
| Node / pnpm | Веб-студия и редактор | Node 24.15.0, pnpm 12.15.0; для самого видеорендера не нужны |
| DEEP INSIDE | Существующая эстетика и дизайн интерфейса | Источник: `EpicStarAi/deepinside-life` |
| OpenSpline / LivePortrait | Отдельные эксперименты и быстрые портретные задачи | Не генератор тела в утверждённом V1 |
| DeepFace / ReActor / HyperSwap | Возможные дополнительные операции с лицами | Не входят в доказанный путь V1; не обязательная установка |
| Huggsfree / Freefield и другие интерфейсы | Возможная оболочка над имеющимися инструментами | Не обязательная зависимость этого сохранённого графа |
| n8n, публикация, радиосервер | Планирование и распространение контента | Отдельные этапы; готовый MP4 не означает настроенный автопостинг или радиопоток |

Для нового образа нужен утверждённый мастер-кадр: можно подготовить его существующим генератором изображений, фотографией или художником. Конкретный генератор изображения не является зависимостью InfiniteTalk. Замена лица поверх неподвижного тела не заменяет генерацию движения всего персонажа.

## 3. Что лежит в комплекте

- `docs/AVATAR_FACTORY_V1_RU.md` — эта инструкция.
- `config/avatar-v1/runtime.lock.json` — точные коммиты ComfyUI/расширений, версии основных библиотек, хеши пяти крупных моделей.
- `config/avatar-v1/comfy-packages.snapshot.json` — установленный список Python-пакетов Windows. Это инвентаризация, не универсальный lock-файл установщика.
- `config/avatar-v1/audio-runtime.lock.json` — Supertonic, его зависимости, голосовые пресеты, ONNX-модели и Wav2Vec с SHA-256.
- `workflows/newnews/infinite-talk-api.json` — проверенный исходный граф.
- `templates/avatar-v1/newnews-approved.profile.json` — профиль эталона.
- `templates/avatar-v1/avatar.profile.example.json` — пример другого персонажа; ещё не отрендеренный результат.
- `templates/avatar-v1/script-approved-ru.txt` — речь утверждённого теста.
- `templates/avatar-v1/QA_CHECKLIST.md` — проверка перед выпуском.
- `scripts/synthesize_avatar_voice.py` — локальная озвучка.
- `scripts/prepare_avatar_project.py` — новый проект, свой prompt, seed и хеши исходников.
- `scripts/capture_infinitetalk.py` — отправка в локальный ComfyUI и получение MP4.
- `scripts/render_avatar_clip.py` + `scripts/render_newnews.py` — универсальная сборка одного клипа и редакционная сборка новостей.
- В ZIP дополнительно `reference/`: мастер-кадр, заставка, оригинальная озвучка, утверждённый MP4, подготовленный клип движения.

В ZIP нет весов на десятки гигабайт, CUDA, окружений Python и паролей. Для восстановления нужны модели на ПК или их загрузка по ссылкам ниже. Это исходный комплект и эталон, не автономный установочный образ компьютера.

## 4. Папки и адреса на текущем ПК

| Назначение | Путь / адрес |
|---|---|
| AI_FACTORY | `C:\AI_FACTORY` |
| ComfyUI | `C:\AI_FACTORY\ComfyUI` |
| Python ComfyUI | `C:\AI_FACTORY\ComfyUI\venv\Scripts\python.exe` |
| ComfyUI API | `http://127.0.0.1:8188` |
| Выходы графа | `C:\AI_FACTORY\Outputs\images` |
| Проекты аватаров | `C:\AI_FACTORY\AVATAR_FACTORY\projects` |
| Сохранённая база | `C:\AI_FACTORY\AVATAR_FACTORY\checkpoints\avatar-v1-20261104` |
| Код WSL | `/home/buch/projects/newnews-rus-studio` |
| Голос WSL | `/home/buch/newnews-tools/tts-supertonic` |
| Python голоса | `/home/buch/newnews-tools/tts-supertonic/.venv/bin/python` |
| Модели голоса | `/home/buch/newnews-tools/tts-supertonic/models` |
| Веб-студия | `http://127.0.0.1:17888/` |
| OpenSpline, отдельный GPU-сервис | `http://127.0.0.1:7860` |

Windows-путь `C:\AI_FACTORY\...` в WSL соответствует `/mnt/c/AI_FACTORY/...`.
ComfyUI запускаем в Windows. Команды голоса, подготовки проекта и сборки ниже выполняем в терминале WSL. В браузере со стороны Windows адреса используют localhost.

## 5. Первый запуск на уже настроенном ПК

1. Прочитать `docs/PRODUCTION_STATE.md`; убедиться, что выбрана ветка `codex/newnews-rus-studio` и нет несохранённых изменений. Не обновлять все модели и расширения перед рабочим рендером.
2. Проверить свободную память GPU через `nvidia-smi`. Одновременно запускать только одну тяжёлую модельную задачу. CPU-озвучку и веб-студию можно оставить.
3. Если OpenSpline держит GPU, сначала проверить `http://127.0.0.1:7860/readyz`: он должен быть свободен (`occupied=false`). Остановить только установленный свободный worker, установленным для него способом. Не завершать процессы по старым PID из переписки. Если есть активная сессия — дождаться её окончания.
4. Запустить ComfyUI командой ниже, если его ещё нет на 8188. При существующем процессе второй не запускать.
5. Проверить `/queue` и `/object_info`. Очередь должна быть свободна, требуемые классы — доступны. Скрипт capture тоже проверяет это до отправки.
6. Создать голос, профиль и короткую пробу; просмотреть результат; только потом расширять сценарий.
7. После своих заданий проверить пустую очередь, освободить модели и корректно остановить свой ComfyUI-процесс, если нужен OpenSpline. Восстановить OpenSpline через `/home/buch/os_start_low.sh`, проверить `/readyz`. Не выключать чужую работу и остальные сервисы.

PowerShell, отдельное окно для ComfyUI:

```powershell
Set-Location C:\AI_FACTORY\ComfyUI
& .\venv\Scripts\python.exe -u main.py --listen 127.0.0.1 --port 8188 --output-directory C:\AI_FACTORY\Outputs\images --lowvram --reserve-vram 2.0 --disable-auto-launch
```

Второе окно PowerShell для проверки:

```powershell
Invoke-RestMethod http://127.0.0.1:8188/queue
Invoke-RestMethod http://127.0.0.1:8188/system_stats
```

Сам видеограф не подключён к кнопке редактора: сейчас его запускает CLI. Сервисы студии и ночное расписание не надо перенастраивать ради нового аватара.

## 6. Установка на чистой машине: порядок

Этот раздел описывает перенос. Полная установка на втором чистом ПК отдельно не проверялась. На действующем ПК повторная установка не нужна.

1. Установить Windows, совместимый драйвер NVIDIA, Git, Python 3.12 x64 и WSL Ubuntu 24.04. Сохранённые версии — ориентир совместимости проверенной машины, а не требование к любой будущей видеокарте. Учесть место: только пять главных видеовесов занимают около 21.7 GB, плюс окружения, аудиомодели, кэш и видео; практический запас свободного места — от 50 GB, лучше 80–100 GB.
2. Склонировать `https://github.com/EpicStarAi/Natasha-Fri-Studio` и рабочую ветку. Для первоначального рабочего состояния есть отдельная checkpoint-ветка; новые инструменты находятся в рабочей ветке.
3. В отдельной новой папке установить ComfyUI. Зафиксировать commit из `runtime.lock.json`; аналогично расширения. Не выполнять `git reset --hard` поверх единственной рабочей установки.
4. Создать Windows venv; установить CUDA-сборку PyTorch; затем requirements ComfyUI и используемых расширений. Проверить, что последующие установки не заменили Torch и NumPy. Использовать сохранённую инвентаризацию для сравнения.
5. Для сохранённого графа требуется совместимый SageAttention. Проверенная версия: `2.2.0+cu128torch2.10.0andhigher.post6`. Её бинарная сборка должна подходить Windows, Python 3.12, Torch и CUDA. В ZIP нет wheel-файла; не подменять его случайным пакетом. Если такую сборку восстановить нельзя, альтернативный attention проверять как отдельную новую конфигурацию, не объявлять побайтно восстановленным V1.
6. Разместить модели точно по таблице следующего раздела, сверить SHA-256. Скачать Wav2Vec заранее либо разрешить его штатную загрузку первым запуском. После загрузки проверить путь и хеши.
7. В WSL установить Python venv и FFmpeg, затем отдельный Supertonic venv с SDK `1.3.1`, модели Supertonic 3 и пресеты. Не смешивать это окружение с Windows ComfyUI.
8. Запустить локальный ComfyUI; проверить nodes; прогнать короткую пробу с сохранёнными мастер-кадром и WAV; сравнить результат с эталоном по чек-листу.
9. Веб-студию, n8n, радиопоток и публикацию подключать отдельно после успешного медиатеста. Они не нужны, чтобы проверить сам аватар.

Пример подготовки **нового**, изолированного Windows окружения после clone:

```powershell
py -3.12 -m venv venv
& .\venv\Scripts\python.exe -m pip install --upgrade pip
& .\venv\Scripts\python.exe -m pip install torch==2.11.0 torchvision==0.26.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu128
& .\venv\Scripts\python.exe -m pip install -r requirements.txt
# Затем requirements каждого расширения, совместимый SageAttention и проверка версий.
& .\venv\Scripts\python.exe -m pip check
& .\venv\Scripts\python.exe -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

Коммиты и зависимости расширений брать из сохранённого manifest, не из произвольного свежего tutorial. `pip check` проверяет зависимости пакетов, но не доказывает работоспособность CUDA-операций — для этого нужен короткий рендер.

WSL, новый TTS-каталог:

```bash
sudo apt-get install python3-venv ffmpeg
mkdir -p ~/newnews-tools/tts-supertonic
python3 -m venv ~/newnews-tools/tts-supertonic/.venv
~/newnews-tools/tts-supertonic/.venv/bin/python -m pip install supertonic==1.3.1
```

Один раз загрузить модель средствами SDK, в выбранную папку:

```bash
~/newnews-tools/tts-supertonic/.venv/bin/python - <<'PY'
from pathlib import Path
from supertonic import TTS
model_dir = str(Path.home() / 'newnews-tools/tts-supertonic/models')
tts = TTS(model='supertonic-3', model_dir=model_dir, auto_download=True)
print(tts.voice_style_names)
PY
```

В производственном скрипте `auto_download=False`: отсутствие модели должно быть явной ошибкой. Сверить скачанные файлы с `audio-runtime.lock.json`; upstream может измениться. Для точного восстановления нужны сохранённые веса с совпадающими хешами, а не только совпадающее имя модели.

## 7. Модели и расположение

Пути относительно `C:\AI_FACTORY\ComfyUI`:

| Путь | Размер примерно | Первичный источник |
|---|---:|---|
| `models/diffusion_models/wan2.1-i2v-14b-480p-Q4_K_M.gguf` | 11.34 GB | [city96/Wan2.1-I2V-14B-480P-gguf](https://huggingface.co/city96/Wan2.1-I2V-14B-480P-gguf/tree/main) |
| `models/diffusion_models/InfiniteTalk/Wan2_1-InfiniteTalk_Single_Q8.gguf` | 2.65 GB | [Kijai/WanVideo_comfy_GGUF/InfiniteTalk](https://huggingface.co/Kijai/WanVideo_comfy_GGUF/tree/main/InfiniteTalk) |
| `models/loras/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors` | 0.74 GB | [Kijai/WanVideo_comfy](https://huggingface.co/Kijai/WanVideo_comfy/tree/main), искать точное имя |
| `models/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors` | 6.74 GB | [Comfy-Org/Wan-2.1](https://huggingface.co/Comfy-Org/Wan-2.1/tree/main/split_files/text_encoders) |
| `models/vae/wan_2.1_vae.safetensors` | 0.25 GB | [Kijai/WanVideo_comfy](https://huggingface.co/Kijai/WanVideo_comfy/tree/main) |
| `models/transformers/TencentGameMate/chinese-wav2vec2-base/` | 0.38 GB | [TencentGameMate/chinese-wav2vec2-base](https://huggingface.co/TencentGameMate/chinese-wav2vec2-base) |

Каталог Supertonic содержит `onnx/` с четырьмя ONNX-моделями, конфигурациями и `voice_styles/F1.json`…`M5.json`. Точные имена, размеры и хеши находятся в аудиоманифесте.

Важная совместимость: GGUF InfiniteTalk используем с GGUF базовой моделью. Не смешивать этот адаптер с произвольным non-GGUF Wan. Не путать Wan 2.1 I2V, Wan Animate и другие эксперименты, даже если все называются «Wan 2».

Проверка файла в PowerShell:

```powershell
Get-FileHash C:\AI_FACTORY\ComfyUI\models\vae\wan_2.1_vae.safetensors -Algorithm SHA256
```

## 8. Профиль нового персонажа

Копировать `templates/avatar-v1/avatar.profile.example.json` и редактировать:

| Поле / материал | Что задаём |
|---|---|
| `name`, `topic` | Имя проекта и тематика |
| `positivePrompt` | Полное описание именно этого персонажа, одежды, студии и допустимых движений |
| `negativePrompt` | Ошибки анатомии, дрожание, смена лица/одежды/фона, нежелательный текст |
| `voice` и `language` | Выбранный движок, пресет, язык, скорость; фиксировать после прослушивания |
| `brand` | Палитра, типографика, стиль; это паспорт дизайна, а не автоматическая перекраска кадра |
| `seed` | Фиксированное число для сравнимых экспериментов |
| `master.png` | Утверждённое лицо, поза, одежда, студия |
| `intro.png` | Готовая заставка нового канала |
| `script.txt` / `voice.wav` | Сценарий и его полная утверждённая озвучка |

`prepare_avatar_project.py` применяет `positivePrompt`, `negativePrompt` и `seed` к графу. Остальные поля — паспорт проекта; TTS-параметры пока передаются отдельной командой. Изменение `brand` не меняет пиксели мастер-кадра. Размеры выдачи в V1 фиксированы кодом: для 16:9 нужен отдельный проверенный вариант, простого изменения JSON недостаточно.

Для мастер-кадра: одна хорошо видимая взрослая ведущая или ведущий, спокойная поза, руки без перекрытий и лишних пальцев, предплечья опираются на стол, умеренная перспектива. Лучше не начинать с сложного жеста двумя поднятыми руками. Оставить место под жесты; микрофон не должен закрывать рот. Сохранить лицо, одежду и свет между дублями.

При замене персонажа обязательно заменить прежнее описание «брюнетка в чёрном худи» в prompt. Именно это делает профиль: новый кадр и старый текстовый prompt не должны противоречить друг другу.

## 9. Полный цикл одного ролика — команды

Ниже рабочие пути текущего ПК. Для новой темы создать собственную папку `input`, положить в неё `master.png`, `intro.png`, `script.txt`, `avatar.profile.json`. Не использовать имя уже существующего проекта для нового запуска.

### 9.1. Текст и голос — WSL

```bash
cd /home/buch/projects/newnews-rus-studio
mkdir -p /mnt/c/AI_FACTORY/AVATAR_FACTORY/input
/home/buch/newnews-tools/tts-supertonic/.venv/bin/python scripts/synthesize_avatar_voice.py \
  --model-dir /home/buch/newnews-tools/tts-supertonic/models \
  --text-file /mnt/c/AI_FACTORY/AVATAR_FACTORY/input/script.txt \
  --output /mnt/c/AI_FACTORY/AVATAR_FACTORY/input/voice.wav \
  --voice F1 --language ru --speed 1.0
```

Сначала прослушать весь WAV: произношение, числа, имена, начало, конец, естественные паузы. В новостях сначала проверяем факты и ссылки, затем озвучиваем. Ударения исправляем текстом и повторным прослушиванием. Не маскируем неудачную дикцию ускорением всего ролика.

Для нового мужского голоса можно попробовать M1; для другого женского — F2…F5. Это доступные пресеты, не обещание одинакового качества на любом языке. Первый тест — 8–20 секунд. Скрипты допускают до 60 секунд исходного WAV, но это технический предел, не рекомендация начинать с минуты.

Если WAV другого движка не читается Python `wave`, конвертировать в новый PCM-файл:

```bash
ffmpeg -n -i input-audio.wav -ac 1 -ar 44100 -c:a pcm_s16le voice-pcm.wav
```

### 9.2. Собрать проект — WSL

```bash
python3 scripts/prepare_avatar_project.py \
  --profile /mnt/c/AI_FACTORY/AVATAR_FACTORY/input/avatar.profile.json \
  --image /mnt/c/AI_FACTORY/AVATAR_FACTORY/input/master.png \
  --voice /mnt/c/AI_FACTORY/AVATAR_FACTORY/input/voice.wav \
  --intro /mnt/c/AI_FACTORY/AVATAR_FACTORY/input/intro.png \
  --output /mnt/c/AI_FACTORY/AVATAR_FACTORY/projects/technology-001
```

Получаем собственные исходники, `workflow.api.json`, профиль и `manifest.json` с хешами. Скрипт ничего не отправляет на GPU и отказывается перезаписывать существующую папку. JPG/WebP сохранят своё расширение; в следующей команде нужно указать фактическое имя.

### 9.3. Запустить движение — Windows PowerShell

ComfyUI должен быть запущен на 8188 и свободен. Указать seed из своего профиля: аргумент capture имеет приоритет над seed в графе.

```powershell
& C:\AI_FACTORY\ComfyUI\venv\Scripts\python.exe `
  \\wsl.localhost\Ubuntu-24.04\home\buch\projects\newnews-rus-studio\scripts\capture_infinitetalk.py `
  --comfy-root C:\AI_FACTORY\ComfyUI `
  --workflow C:\AI_FACTORY\AVATAR_FACTORY\projects\technology-001\workflow.api.json `
  --image C:\AI_FACTORY\AVATAR_FACTORY\projects\technology-001\master.png `
  --audio C:\AI_FACTORY\AVATAR_FACTORY\projects\technology-001\voice.wav `
  --seed 20261104 `
  --output C:\AI_FACTORY\AVATAR_FACTORY\projects\technology-001\motion.mp4
```

Граф — **ComfyUI API JSON**, для runner, не JSON холста редактора. Его не следует обещать открывать обычным drag-and-drop как готовую UI-схему. Визуальные примеры доступны в WanVideoWrapper; для точного V1 используется наш runner.

Скрипт создаёт уникальные имена входов, проверяет очередь и классы узлов, записывает `motion.job.json` с `promptId` и фактически отправленным графом. Число кадров аудио вычисляется из длины WAV. Таймаут ожидания по умолчанию 90 минут; при таймауте задача может продолжать работать. Проверить `/history/<promptId>` и `/queue`, прежде чем отправлять дубль. Глобальный interrupt автоматически не вызывается.

### 9.4. Собрать финальный MP4 — WSL

```bash
cd /home/buch/projects/newnews-rus-studio
python3 scripts/render_avatar_clip.py \
  --clip /mnt/c/AI_FACTORY/AVATAR_FACTORY/projects/technology-001/motion.mp4 \
  --voice /mnt/c/AI_FACTORY/AVATAR_FACTORY/projects/technology-001/voice.wav \
  --intro /mnt/c/AI_FACTORY/AVATAR_FACTORY/projects/technology-001/intro.png \
  --output /mnt/c/AI_FACTORY/AVATAR_FACTORY/projects/technology-001/final.mp4
```

Для сборки используется **тот же WAV, по которому генерировались движения губ**. Другой голос поверх готового видео потребует нового lip-sync. Скрипт не определяет смысловое совпадение речи автоматически.

Видео масштабируется с сохранением пропорций и дополняется полями, если нужно; лицо и руки не обрезаются. Вся речь сохраняется. Если видео короче WAV более чем на 0.5 сек., сборка останавливается вместо длительного замораживания ведущего. До 0.5 сек. допускается удержание последнего кадра, которое нужно проверить глазами.

В эталоне использовали полный тихий промежуточный MP4 + оригинальный WAV: VHS версия `-audio.mp4` содержала 13.68 сек. видео при 13.792653 сек. звука. Полный промежуточный файл имел 14.76 сек. движения. Это объясняет, зачем сохранять raw-выход и исходную озвучку. Runner обычно скачивает `-audio.mp4`; при доступном полном silent-выходе его можно передать `--clip` для большей длины движущегося хвоста.

Для многотемного новостного пакета остаётся `scripts/render_newnews.py`: он требует источники и формат NEW NEWS. Универсальный `render_avatar_clip.py` не привязан к новостям и не требует фиктивных ссылок для художественного сценария.

## 10. Настройки генерации, которые пока не трогаем

| Настройка | Значение V1 |
|---|---|
| Размер / fps | 384×672 / 25 |
| Wan | 14B I2V 480p Q4_K_M GGUF |
| InfiniteTalk | Single Q8 GGUF |
| Precision / загрузка | bf16 / offload_device |
| Attention | sageattn |
| Block swap | 36; offload image/text embeddings; prefetch 0 |
| LoRA | Lightx2v I2V rank64; strength 1 |
| Steps / CFG / shift | 6 / 1 / 11 |
| Scheduler | dpm++_sde |
| Denoise / seed эталона | 1 / 20261103 |
| Frame window / motion frame | 81 / 9 |
| RoPE | comfy_chunked |
| Tiled VAE / CPU cache | включены |
| Audio scale / audio CFG | 1 / 1 |
| Loudness normalization | выключена в узле |
| Wav2Vec | fp16 / offload_device |
| Выход VHS | H.264, yuv420p, CRF 18, 25 fps |

Текстовый путь принципиален: native `CLIPLoader` → два `CLIPTextEncode` → `WanVideoTextEmbedBridge`. Нативный loader настроен `type=wan`, `device=cpu`. Wrapper `WanVideoTextEncodeCached` не принял установленный scaled FP8 UMT5 — уже проверенная ошибка. Не возвращать этот узел без отдельного теста.

Повышение разрешения, шагов, длительности и смена attention — отдельный эксперимент с новой записью параметров. На 8 GB нельзя считать 720p/1080p источника гарантированно доступными только потому, что файл модели хранится на диске.

## 11. Эстетика DEEP INSIDE и разные тематики

Проверенный источник дизайна: `https://github.com/EpicStarAi/deepinside-life`.
Базовые токены: фон `#030305`, панели `#0a0a0f`, приподнятые поверхности `#12121a`, текст `#f0f4f8`, вторичный текст `#8892b0`, cyan `#00ffff`, pink `#ff0055`, шрифт Inter.

| Вариант | Что меняем | Что сохраняем |
|---|---|---|
| Другой новостной ведущий | Мастер-кадр, описание личности, голос, название | Проверка источников, граф движения, QA |
| Технологии / наука | Сценарий, реквизит, студия, терминология и произношение | Порядок «текст → WAV → движение → монтаж» |
| Музыка / культура | Манера речи, оформление, материалы выпуска | Устойчивость лица и одежды, полный звук |
| DEEP INSIDE Radio | Голос, эфирные реплики, расписание, аудиооформление | TTS и паспорт ведущего; видео можно не генерировать |
| Фэнтези / игровой персонаж | Новый мастер, prompt и голос | Короткая проба; реалистичный V1 не гарантирует качество стилизации |
| Два ведущих / диалог | Отдельный проект и многоперсонажный workflow | Не выдавать Single-аватарный V1 за готовое решение диалогов |

Онлайн-радио дополнительно требует реального аудиоплейаута, микширования/переходов, сервера потока и контроля непрерывности. Ранее найденный live-room интерфейс сам по себе не доказывает, что станция вещает. Фоновая музыка, дополнительные персонажи, клонирование голоса и автоматическая публикация в V1 не настроены этим комплектом.

## 12. Проверка качества перед выпуском

Смотреть ролик целиком со звуком и отдельно замедленно. Для эталона проверялись моменты 0, 1.5, 3, 4.5, 6, 8, 10 и 12.5 сек. внутри сцены. Для нового ролика смотреть начало, конец, жесты и переходы; редкие дефекты могут находиться между контрольными кадрами.

- Лицо узнаваемо весь ролик; нет смены возраста, волос и формы глаз.
- Рот соответствует речи; зубы, губы и микрофон не «плывут».
- Плечи, локти, предплечья и кисти двигаются согласованно; нет зависшего жеста на весь ролик, лишних пальцев, слипшихся ладоней и дрожания.
- Одежда, стол, микрофон, лампа и фон сохраняются.
- Последняя фраза заканчивается полностью; нет обрезанного слова и неожиданной тишины.
- Заставка 1 секунда, без нежелательных субтитров, MP4 открывается на телефоне.
- Для новостей сохранены источники и дата проверки; для музыки/изображений известен источник материала.
- В `QA_CHECKLIST.md` записаны замечания и решение: принять, повторить голос, повторить движение или переделать мастер.

Техническая проверка:

```bash
ffprobe -v error -show_streams -show_format -of json final.mp4
ffmpeg -v error -i final.mp4 -f null -
```

Успешное декодирование не доказывает правильность пальцев или содержания новости. Этот этап остаётся визуальным и редакционным.

## 13. Типовые проблемы

| Симптом | Что проверять / делать |
|---|---|
| Двигается лицо, руки неподвижны | Проверить, что запущен InfiniteTalk всего кадра, а не старый face-crop overlay. Не выдавать приближение неподвижного фото за движение тела |
| Плохие пальцы / дрожание | Более простая поза мастера, небольшие жесты, новый короткий дубль. Negative prompt не гарантирует анатомию |
| Появляется прежняя внешность | Проверить `positivePrompt` нового профиля и фактический граф в `.job.json` |
| Сменились одежда / студия | Уточнить сохранение мастер-кадра, уменьшить движение; проверить исходник; не применять face swap как универсальное исправление |
| CUDA out of memory | Одна GPU-задача, освобождение свободного другого worker, 384×672, block swap/offload. Не повышать сразу всё |
| UMT5 unsupported scaled FP8 | Восстановить native CLIP bridge из сохранённого графа |
| Missing nodes / changed inputs | Сверить commits расширений и `/object_info`, не обновлять вслепую |
| Нет аудиомодели | Проверить `models/transformers/TencentGameMate/chinese-wav2vec2-base`, а не только Hugging Face cache |
| Ошибка WAV | Конвертировать в PCM; прослушать; для движения использовать тот же итоговый WAV |
| Обрезан конец | Проверить raw video, длины потоков и исходный WAV; не использовать `-shortest` вслепую |
| Таймаут capture | Проверить сохранённый promptId; не создавать повторную задачу автоматически |
| Неудачное произношение | Исправить сценарий, получить новый WAV, повторить движение для него |
| «Есть Full HD, но мало деталей» | Это upscale 384×672. Более высокое исходное разрешение — следующая отдельная проверка |

## 14. Сохранение и возврат к рабочей версии

Каждый проект хранить отдельной папкой: профиль, script, master, intro, WAV, API-граф, `.job.json`, raw MP4, final MP4, QA. Утверждённый файл не перезаписывать. Ветки кода не заменяют резервное копирование медиа и моделей.

Крупные модели остаются в AI_FACTORY; их SHA-256 сохранены. Для полноценного восстановления без интернета сделать отдельную резервную копию моделей, TTS-каталога и нужных установочных пакетов на другой диск. ZIP с шаблоном не заменяет эту копию.

Вернуться к исходному коду без уничтожения текущей работы можно в новом worktree:

```bash
cd /home/buch/projects/newnews-rus-studio
git fetch origin
git worktree add ../newnews-avatar-v1-baseline origin/checkpoint/avatar-motion-v1-approved-2026-11-04
```

В checkpoint сохранён код, на котором получен эталон; новые профильные инструменты добавлены позже в `codex/newnews-rus-studio`. Установленные модели не откатываются командой Git. Для них сверяем соответствующие манифесты и используем отдельную установку.

## 15. Статус и следующий безопасный шаг

Доказан один утверждённый персонаж и один короткий полный цикл. В комплекте есть профили и команды для следующих персонажей; пример технологического ведущего ещё не является готовым видеорезультатом. Следующий шаг — новый мастер, выбранный голос и тест 8–20 сек. на тех же технических настройках. Только после просмотра увеличивать длительность, менять формат или подключать распространение.

Первичные источники для обслуживания: [ComfyUI](https://github.com/comfyanonymous/ComfyUI), [WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper), [InfiniteTalk](https://github.com/MeiGen-AI/InfiniteTalk), [GGUF](https://github.com/city96/ComfyUI-GGUF), [VideoHelperSuite](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite), [Supertonic SDK](https://pypi.org/project/supertonic/), [Supertonic](https://github.com/supertone-inc/supertonic). Для воспроизведения приоритет у сохранённых точных версий и файлов, а не у текущего состояния upstream.
