import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  Clapperboard,
  FileText,
  Globe2,
  Link2,
  Moon,
  Plus,
  Save,
  Settings2,
  Sun,
  Trash2,
} from "lucide-react";
import {
  NEWS_CHANNEL,
  NewsDraftSchema,
  createNewsPackage,
  type NewsDraft,
} from "@workspace/api-zod";
import { z } from "zod/v4";
import "./newsroom.css";
import { NewsWindowEditor, NewsWindowPreview } from "../components/NewsWindows";

const STORAGE_KEY = "newnews-rus-draft-v1";
const blankScene = (index: number): NewsDraft["scenes"][number] => ({
  id: crypto.randomUUID(),
  headline: "",
  narration: "",
  sourceUrls: [],
  durationSeconds: 15,
  presenterAsset: `presenter-${index}.mp4`,
  brollAsset: "",
  windows: [],
});
const initialDraft = (): NewsDraft => ({
  title: "",
  focus: "world",
  introAsset: "intro.png",
  scenes: [blankScene(1)],
});
// Incomplete drafts must survive reloads, but malformed/unbounded storage must not.
const storedDraft = z.object({
  title: z.string().max(100),
  focus: z.enum(["world", "russia-world", "technology"]),
  introAsset: z.string().max(160),
  scenes: z
    .array(
      z.object({
        id: z.string().max(60),
        headline: z.string().max(120),
        narration: z.string().max(1500),
        sourceUrls: z.array(z.string().max(2000)).max(5),
        durationSeconds: z.number().int().min(5).max(45),
        presenterAsset: z.string().max(160),
        brollAsset: z.string().max(160),
        windows: z
          .array(
            z.object({
              id: z.string().max(60),
              asset: z.string().max(160),
              startSeconds: z.number(),
              endSeconds: z.number(),
              mediaStartSeconds: z.number(),
              headline: z.string().max(60),
              label: z.string().max(28),
              credit: z.string().max(42),
              sourceUrl: z.string().max(2000),
              anchorText: z.string().max(250),
            }),
          )
          .max(12)
          .default([]),
      }),
    )
    .min(1)
    .max(6),
});
function loadDraft(): NewsDraft {
  try {
    const parsed = storedDraft.safeParse(
      JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"),
    );
    return parsed.success ? parsed.data : initialDraft();
  } catch {
    return initialDraft();
  }
}
const timecode = (seconds: number) => `00:${String(seconds).padStart(2, "0")}`;
type ServerStatus = {
  storageConfigured: boolean;
  rendering: string;
  publishing: string;
};

export default function Newsroom() {
  const [draft, setDraft] = useState<NewsDraft>(loadDraft);
  const [tab, setTab] = useState<"episode" | "sources" | "production">(
    "episode",
  );
  const [selected, setSelected] = useState(0);
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [apiState, setApiState] = useState("Проверяем соединение");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [clock, setClock] = useState(new Date());
  const [lastPackage, setLastPackage] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSaved(true);
    } catch {
      setSaved(false);
    }
    setErrors([]);
    setMessage("");
    setLastPackage("");
  }, [draft]);
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function checkServer() {
    setApiState("Проверяем соединение");
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/newsroom/status`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (
        result.channel?.id !== NEWS_CHANNEL.id ||
        typeof result.storageConfigured !== "boolean"
      )
        throw new Error();
      setStatus(result);
      setApiState("API подключён");
    } catch {
      setStatus(null);
      setApiState("API недоступен · экспорт работает");
    }
  }
  useEffect(() => {
    void checkServer();
  }, []);

  const scene = draft.scenes[selected] ?? draft.scenes[0];
  const duration =
    1 + draft.scenes.reduce((sum, item) => sum + item.durationSeconds, 0);
  const sourceCount = new Set(
    draft.scenes.flatMap((item) => item.sourceUrls).filter(Boolean),
  ).size;
  const words = scene.narration.trim().split(/\s+/).filter(Boolean).length;
  const updateScene = (changes: Partial<typeof scene>) =>
    setDraft((current) => ({
      ...current,
      scenes: current.scenes.map((item) =>
        item.id === scene.id ? { ...item, ...changes } : item,
      ),
    }));

  function addScene() {
    let assetIndex = draft.scenes.length + 1;
    while (
      draft.scenes.some(
        (item) => item.presenterAsset === `presenter-${assetIndex}.mp4`,
      )
    )
      assetIndex++;
    setDraft({ ...draft, scenes: [...draft.scenes, blankScene(assetIndex)] });
    setSelected(draft.scenes.length);
  }

  function validate() {
    const result = NewsDraftSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        result.error.issues.map((issue) => {
          const index =
            typeof issue.path[1] === "number"
              ? `Тема ${issue.path[1] + 1}: `
              : "";
          return `${index}${issue.message}`;
        }),
      );
      setMessage("");
      return null;
    }
    setErrors([]);
    return result.data;
  }
  function download() {
    const valid = validate();
    if (!valid) return;
    const pack = createNewsPackage(valid, crypto.randomUUID());
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `newnews-rus-${pack.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Пакет скачан. Подготовьте указанные медиафайлы и запустите локальную сборку.",
    );
  }
  async function saveOnServer() {
    const valid = validate();
    if (!valid) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/newsroom/packages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(valid),
          signal: AbortSignal.timeout(15000),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Не удалось сохранить выпуск");
      setLastPackage(result.id);
      setMessage("Выпуск сохранён на сервере. Статус: ожидает медиа.");
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Сервер недоступен"]);
    } finally {
      setBusy(false);
    }
  }
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem("newnews-theme", next);
    } catch {
      /* optional preference */
    }
  }

  return (
    <div className="newsroom">
      <aside className="nn-sidebar">
        <a
          href={import.meta.env.BASE_URL}
          className="nn-brand"
          aria-label={NEWS_CHANNEL.name}
        >
          <Globe2 size={28} />
          <span>
            NEW
            <span className="nn-brand-line">
              NEWS<span className="nn-rus">🇷🇺 RUS</span>
            </span>
          </span>
        </a>
        <div className="nn-sidebar-label">РЕДАКЦИЯ / 01</div>
        <nav aria-label="Разделы студии">
          <button
            className={tab === "episode" ? "active" : ""}
            onClick={() => setTab("episode")}
          >
            <FileText size={18} />
            Выпуск
            <ChevronRight size={14} />
          </button>
          <button
            className={tab === "sources" ? "active" : ""}
            onClick={() => setTab("sources")}
          >
            <Link2 size={18} />
            Источники<span className="nn-count">{sourceCount}</span>
          </button>
          <button
            className={tab === "production" ? "active" : ""}
            onClick={() => setTab("production")}
          >
            <Clapperboard size={18} />
            Производство
          </button>
        </nav>
        <div className="nn-sidebar-bottom">
          <div className="nn-mini-label">ВАШ КАНАЛ</div>
          <strong>{NEWS_CHANNEL.name}</strong>
          <p>
            Мир. Контекст. Главное.
            <br />
            На русском языке.
          </p>
          <div className="nn-sidebar-format">
            9:16 <span>FULL HD</span>
          </div>
        </div>
      </aside>
      <div className="nn-workspace">
        <header className="nn-topbar">
          <span>
            <span className="nn-dot" /> СТУДИЯ ВЫПУСКОВ
          </span>
          <div>
            <time>
              {new Intl.DateTimeFormat("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: NEWS_CHANNEL.timezone,
              }).format(clock)}{" "}
              · КИЕВ
            </time>
            <button
              className="nn-icon-button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Включить светлую тему"
                  : "Включить тёмную тему"
              }
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className="nn-main">
          <div className="nn-heading">
            <div>
              <div className="nn-eyebrow">DEEP INSIDE / NEW NEWS RUS</div>
              <h1>
                {tab === "episode" ? (
                  <>
                    Главное.
                    <br />
                    <em>По-русски.</em>
                  </>
                ) : tab === "sources" ? (
                  <>
                    Сначала
                    <br />
                    <em>источник.</em>
                  </>
                ) : (
                  <>
                    От сценария
                    <br />
                    <em>к выпуску.</em>
                  </>
                )}
              </h1>
              <p>
                {tab === "episode"
                  ? "Соберите короткий выпуск с нашей ведущей."
                  : tab === "sources"
                    ? "У каждой новости — ссылка и понятный контекст."
                    : "Подготовьте материалы и соберите вертикальное видео локально."}
              </p>
            </div>
            <div className="nn-issue-mark">
              <span>ФОРМАТ ВЫПУСКА</span>
              <strong>
                01<span>—</span>60
              </strong>
              <small>СЕКУНД · ОДНА ИСТОРИЯ ИЛИ ДАЙДЖЕСТ</small>
            </div>
          </div>
          <div className="nn-summary">
            <span>
              <i className="nn-dot" /> ЧЕРНОВИК
            </span>
            <span>
              {draft.scenes.length}{" "}
              {draft.scenes.length === 1 ? "тема" : "темы"}
            </span>
            <span className={duration > 60 ? "nn-error-text" : ""}>
              {duration} / 60 сек.
            </span>
            <span className="nn-saved">
              {saved ? <Check size={14} /> : null}
              {saved ? "Сохранено в браузере" : "Автосохранение недоступно"}
            </span>
          </div>
          <div className="nn-grid">
            <section className="nn-editor" aria-label="Редактор выпуска">
              {tab === "episode" && (
                <>
                  <div className="nn-section-title">
                    <span>01 / СЦЕНАРИЙ</span>
                    <FileText size={17} />
                  </div>
                  <label className="nn-field">
                    Название выпуска
                    <input
                      maxLength={100}
                      value={draft.title}
                      onChange={(event) =>
                        setDraft({ ...draft, title: event.target.value })
                      }
                      placeholder="О чём сегодня говорим?"
                    />
                  </label>
                  <label className="nn-field">
                    Фокус редакции
                    <select
                      value={draft.focus}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          focus: event.target.value as NewsDraft["focus"],
                        })
                      }
                    >
                      <option value="world">Мировые новости на русском</option>
                      <option value="russia-world">Россия и мир</option>
                      <option value="technology">Технологии и AI</option>
                    </select>
                  </label>
                  <div className="nn-scene-tabs" aria-label="Темы выпуска">
                    {draft.scenes.map((item, index) => (
                      <button
                        key={item.id}
                        className={selected === index ? "active" : ""}
                        onClick={() => setSelected(index)}
                      >
                        Тема {String(index + 1).padStart(2, "0")}
                      </button>
                    ))}
                    <button
                      disabled={draft.scenes.length >= 6}
                      aria-label="Добавить тему"
                      onClick={addScene}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <label className="nn-field">
                    Заголовок темы
                    <input
                      maxLength={120}
                      value={scene.headline}
                      onChange={(event) =>
                        updateScene({ headline: event.target.value })
                      }
                      placeholder="Один факт, который важно знать"
                    />
                  </label>
                  <label className="nn-field">
                    Текст ведущей
                    <textarea
                      rows={6}
                      maxLength={1500}
                      value={scene.narration}
                      onChange={(event) =>
                        updateScene({ narration: event.target.value })
                      }
                      placeholder="Что произошло → почему это важно → что будет дальше. Пишите живой разговорной речью, опираясь на источники."
                    />
                  </label>
                  <div className="nn-script-footer">
                    <span>
                      {words} слов · ≈ {Math.ceil(words / 2.4)} сек. речи
                    </span>
                    <label>
                      План{" "}
                      <input
                        aria-label="Длительность темы в секундах"
                        type="number"
                        min={5}
                        max={45}
                        value={scene.durationSeconds}
                        onChange={(event) =>
                          updateScene({
                            durationSeconds: Math.max(
                              5,
                              Math.min(45, Number(event.target.value) || 5),
                            ),
                          })
                        }
                      />{" "}
                      сек.
                    </label>
                    {draft.scenes.length > 1 && (
                      <button
                        className="nn-icon-button"
                        aria-label="Удалить текущую тему"
                        onClick={() => {
                          setDraft({
                            ...draft,
                            scenes: draft.scenes.filter(
                              (item) => item.id !== scene.id,
                            ),
                          });
                          setSelected(0);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    className="nn-text-button"
                    onClick={() => setTab("sources")}
                  >
                    Добавить источники к темам <ArrowRight size={16} />
                  </button>
                </>
              )}
              {tab === "sources" && (
                <>
                  <div className="nn-section-title">
                    <span>02 / ИСТОЧНИКИ</span>
                    <Link2 size={17} />
                  </div>
                  <p className="nn-explainer">
                    Ссылка на первоисточник нужна для каждой темы. Указанные
                    ссылки сохраняются в пакете; студия не проверяет их
                    содержание автоматически.
                  </p>
                  {draft.scenes.map((item, index) => (
                    <div className="nn-source-block" key={item.id}>
                      <h3>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        {item.headline || "Тема без заголовка"}
                      </h3>
                      <label className="nn-field">
                        Ссылки HTTPS · по одной на строку
                        <textarea
                          rows={3}
                          value={item.sourceUrls.join("\n")}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              scenes: draft.scenes.map((s) =>
                                s.id === item.id
                                  ? {
                                      ...s,
                                      sourceUrls: event.target.value
                                        .split("\n")
                                        .slice(0, 5),
                                    }
                                  : s,
                              ),
                            })
                          }
                          placeholder="https://…"
                        />
                      </label>
                      <p className="nn-hint">
                        До 5 ссылок. Для спорных утверждений добавьте
                        независимое подтверждение.
                      </p>
                    </div>
                  ))}
                  <button
                    className="nn-text-button"
                    onClick={() => setTab("production")}
                  >
                    Перейти к материалам <ArrowRight size={16} />
                  </button>
                </>
              )}
              {tab === "production" && (
                <>
                  <div className="nn-section-title">
                    <span>03 / МАТЕРИАЛЫ</span>
                    <Settings2 size={17} />
                  </div>
                  <p className="nn-explainer">
                    Для монтажа нужны готовые клипы утверждённой ведущей с
                    голосом. Имена ниже связывают сценарий с файлами в папке
                    материалов на вашем ПК.
                  </p>
                  <label className="nn-field">
                    Заставка · 1 секунда
                    <input
                      value={draft.introAsset}
                      maxLength={160}
                      onChange={(event) =>
                        setDraft({ ...draft, introAsset: event.target.value })
                      }
                    />
                  </label>
                  {draft.scenes.map((item, index) => (
                    <div key={item.id} className="nn-media-row">
                      <h3>Тема {index + 1}</h3>
                      <label className="nn-field">
                        Клип ведущей с озвучкой
                        <input
                          value={item.presenterAsset}
                          maxLength={160}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              scenes: draft.scenes.map((s) =>
                                s.id === item.id
                                  ? { ...s, presenterAsset: event.target.value }
                                  : s,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="nn-field">
                        Фото или видео темы · необязательно
                        <input
                          value={item.brollAsset}
                          maxLength={160}
                          placeholder={`broll-${index + 1}.mp4`}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              scenes: draft.scenes.map((s) =>
                                s.id === item.id
                                  ? { ...s, brollAsset: event.target.value }
                                  : s,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <div className="nn-scene-tabs">
                    {draft.scenes.map((item, index) => (
                      <button
                        key={item.id}
                        className={selected === index ? "active" : ""}
                        onClick={() => setSelected(index)}
                      >
                        Окна темы {index + 1}
                      </button>
                    ))}
                  </div>
                  <NewsWindowEditor
                    scene={scene}
                    onChange={(windows) =>
                      updateScene({
                        windows,
                        ...(windows.length ? { brollAsset: "" } : {}),
                      })
                    }
                  />
                  <label className="nn-secondary nn-file-picker">
                    Импорт выпуска JSON
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          const parsed = NewsDraftSchema.parse(
                            JSON.parse(await file.text()),
                          );
                          setDraft(parsed);
                          setSelected(0);
                          setMessage(
                            "Выпуск загружен. Выберите его медиафайлы для предпросмотра.",
                          );
                        } catch {
                          setMessage(
                            "Не удалось импортировать выпуск: проверьте формат, источники и таймкоды.",
                          );
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <div className="nn-connection">
                    <div>
                      <strong>{apiState}</strong>
                      <button
                        className="nn-text-button"
                        onClick={() => void checkServer()}
                      >
                        Проверить
                      </button>
                    </div>
                    <p>
                      Монтаж запускается локально. Аккаунты публикации ещё не
                      подключены.
                    </p>
                    {status?.storageConfigured && (
                      <>
                        <label className="nn-field">
                          Ключ студии
                          <input
                            type="password"
                            autoComplete="off"
                            value={token}
                            onChange={(event) => setToken(event.target.value)}
                            placeholder="Для сохранения на сервере"
                          />
                        </label>
                        <button
                          className="nn-secondary"
                          disabled={busy || !token}
                          onClick={() => void saveOnServer()}
                        >
                          <Save size={16} />
                          {busy ? "Сохраняем…" : "Сохранить на сервере"}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </section>
            <aside className="nn-preview-panel" aria-label="Макет видео">
              <div className="nn-section-title">
                <span>МАКЕТ КАДРА</span>
                <span>1080 × 1920</span>
              </div>
              <NewsWindowPreview scene={scene} />
              <div className="nn-format-list">
                <span>
                  <Check size={14} />
                  Заставка 1 сек.
                </span>
                <span>
                  <Check size={14} />
                  Без субтитров
                </span>
                <span>
                  <Check size={14} />
                  Клипы без обрезки речи
                </span>
              </div>
            </aside>
          </div>
          <section className="nn-timeline" aria-label="Хронометраж выпуска">
            <div className="nn-section-title">
              <span>ПЛАН ВЫПУСКА</span>
              <span className={duration > 60 ? "nn-error-text" : ""}>
                {timecode(duration)}
              </span>
            </div>
            <div className="nn-timeline-track">
              <div className="nn-intro">
                <span>00:00</span>
                <strong>Заставка</strong>
                <small>1 сек.</small>
              </div>
              {draft.scenes.map((item, index) => (
                <button
                  key={item.id}
                  className={selected === index ? "active" : ""}
                  style={{ flex: item.durationSeconds }}
                  onClick={() => {
                    setSelected(index);
                    setTab("episode");
                  }}
                >
                  <span>
                    {timecode(
                      1 +
                        draft.scenes
                          .slice(0, index)
                          .reduce((sum, s) => sum + s.durationSeconds, 0),
                    )}
                  </span>
                  <strong>{item.headline || `Тема ${index + 1}`}</strong>
                  <small>{item.durationSeconds} сек.</small>
                </button>
              ))}
            </div>
          </section>
          <div className="nn-export">
            <div>
              <strong>Следующий шаг — подготовить медиа</strong>
              <p>Пакет содержит сценарий, источники и параметры монтажа.</p>
            </div>
            <button className="nn-primary" onClick={download}>
              <ArrowDownToLine size={18} />
              Скачать пакет
            </button>
          </div>
          {errors.length > 0 && (
            <div className="nn-feedback nn-feedback-error" role="alert">
              <strong>Нужно дополнить выпуск</strong>
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {message && (
            <div className="nn-feedback" role="status">
              {message}
              {lastPackage && <small>ID: {lastPackage}</small>}
            </div>
          )}
          <footer className="nn-footer">
            <span>NEW🌏NEWS🇷🇺RUS</span>
            <span>РЕДАКЦИОННАЯ СТУДИЯ · V1</span>
            <span>СОБРАНО С КОНТЕКСТОМ</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
