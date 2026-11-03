import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, Trash2, Upload } from "lucide-react";
import type { NewsDraft, NewsWindow } from "@workspace/api-zod";

type Scene = NewsDraft["scenes"][number];
type Media = { url: string; video: boolean };

export function NewsWindowEditor({
  scene,
  onChange,
}: {
  scene: Scene;
  onChange: (windows: NewsWindow[]) => void;
}) {
  const windows = scene.windows ?? [];
  function update(id: string, change: Partial<NewsWindow>) {
    onChange(windows.map((w) => (w.id === id ? { ...w, ...change } : w)));
  }
  return (
    <div className="nn-window-editor">
      <h4>Сопровождающие окна</h4>
      <p className="nn-explainer">
        Время от начала речи этой темы. Заставка добавится отдельно. Окна
        сменяют друг друга слева сверху.
      </p>
      {windows.map((w, i) => (
        <fieldset key={w.id} className="nn-window-fields">
          <legend>Окно {i + 1}</legend>
          <label className="nn-field">
            Фото или видео
            <input
              value={w.asset}
              placeholder="material-1.jpg"
              maxLength={160}
              onChange={(e) => update(w.id, { asset: e.target.value })}
            />
          </label>
          <div className="nn-window-times">
            <label className="nn-field">
              С секунды
              <input
                type="number"
                min={0}
                max={45}
                step={0.01}
                value={w.startSeconds}
                onChange={(e) =>
                  update(w.id, { startSeconds: Number(e.target.value) })
                }
              />
            </label>
            <label className="nn-field">
              До секунды
              <input
                type="number"
                min={0}
                max={45}
                step={0.01}
                value={w.endSeconds}
                onChange={(e) =>
                  update(w.id, { endSeconds: Number(e.target.value) })
                }
              />
            </label>
            <label className="nn-field">
              Начало видео
              <input
                type="number"
                min={0}
                max={3600}
                step={0.01}
                value={w.mediaStartSeconds}
                onChange={(e) =>
                  update(w.id, { mediaStartSeconds: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <label className="nn-field">
            Фраза для переключения
            <input
              value={w.anchorText}
              maxLength={250}
              onChange={(e) => update(w.id, { anchorText: e.target.value })}
              placeholder="Когда ведущая начинает говорить об этом…"
            />
          </label>
          <label className="nn-field">
            Короткий заголовок
            <input
              value={w.headline}
              maxLength={60}
              onChange={(e) => update(w.id, { headline: e.target.value })}
            />
          </label>
          <label className="nn-field">
            Пометка материала
            <input
              value={w.label}
              maxLength={28}
              placeholder="АРХИВ · 2022 / ВИЗУАЛИЗАЦИЯ"
              onChange={(e) => update(w.id, { label: e.target.value })}
            />
          </label>
          <label className="nn-field">
            Источник в кадре
            <input
              value={w.credit}
              maxLength={42}
              placeholder="Фото: организация / автор"
              onChange={(e) => update(w.id, { credit: e.target.value })}
            />
          </label>
          <label className="nn-field">
            Ссылка на материал
            <input
              value={w.sourceUrl}
              maxLength={2000}
              type="url"
              placeholder="https://…"
              onChange={(e) => update(w.id, { sourceUrl: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="nn-text-button"
            onClick={() => onChange(windows.filter((x) => x.id !== w.id))}
          >
            <Trash2 size={14} /> Удалить окно
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="nn-secondary"
        disabled={
          windows.length >= 12 ||
          Math.max(0, ...windows.map((w) => w.endSeconds)) >
            scene.durationSeconds - 0.5
        }
        onClick={() => {
          const start = Math.max(0, ...windows.map((w) => w.endSeconds));
          onChange([
            ...windows,
            {
              id: crypto.randomUUID(),
              asset: `material-${windows.length + 1}.jpg`,
              startSeconds: start,
              endSeconds: Math.min(scene.durationSeconds, start + 4),
              mediaStartSeconds: 0,
              headline: scene.headline,
              label: "МАТЕРИАЛ ТЕМЫ",
              credit: "",
              sourceUrl: "",
              anchorText: "",
            },
          ]);
        }}
      >
        <Plus size={15} /> Добавить окно
      </button>
    </div>
  );
}

function WindowMedia({
  media,
  time,
  playing,
  alt,
}: {
  media: Media;
  time: number;
  playing: boolean;
  alt: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (Math.abs(v.currentTime - time) > 0.12)
      v.currentTime = Math.max(0, time);
    if (playing) void v.play().catch(() => {});
    else v.pause();
  }, [time, playing, media.url]);
  return media.video ? (
    <video
      ref={video}
      src={media.url}
      muted
      playsInline
      preload="auto"
      aria-label={alt}
    />
  ) : (
    <img src={media.url} alt={alt} />
  );
}

export function NewsWindowPreview({ scene }: { scene: Scene }) {
  const [media, setMedia] = useState<Record<string, Media>>({});
  const resources = useRef<string[]>([]);
  const host = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [error, setError] = useState("");
  const hostMedia = media[scene.presenterAsset];
  const duration = actualDuration ?? scene.durationSeconds;
  const active = (scene.windows ?? []).find(
    (w) => w.startSeconds <= time && time < w.endSeconds,
  );
  useEffect(
    () => () => resources.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  useEffect(() => {
    setTime(0);
    setPlaying(false);
    setActualDuration(null);
  }, [scene.id, hostMedia?.url]);
  useEffect(() => {
    if (!playing) return;
    if (hostMedia) {
      let frame: number;
      const tick = () => {
        if (host.current) setTime(host.current.currentTime);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setInterval(
      () =>
        setTime((t) => {
          if (t + 0.05 >= duration) {
            setPlaying(false);
            return duration;
          }
          return t + 0.05;
        }),
      50,
    );
    return () => window.clearInterval(timer);
  }, [playing, hostMedia, duration]);
  useEffect(() => {
    const video = host.current;
    if (!video) return;
    if (playing)
      void video.play().catch(() => {
        setPlaying(false);
        setError("Не удалось воспроизвести клип. Выберите MP4 H.264/AAC.");
      });
    else video.pause();
  }, [playing]);
  function seek(value: number) {
    setTime(value);
    if (host.current) host.current.currentTime = value;
  }
  return (
    <>
      <div className="nn-frame nn-live-frame">
        {hostMedia ? (
          <video
            ref={host}
            className="nn-approved-presenter"
            src={hostMedia.url}
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) =>
              setActualDuration(e.currentTarget.duration)
            }
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <img
            className="nn-approved-presenter"
            src={`${import.meta.env.BASE_URL}newnews/presenter-master.png`}
            alt="Утверждённая ведущая"
          />
        )}
        <div className="nn-window-brand">
          <b>NEW</b>
          <span>◎</span>
          <b>NEWS</b>
          <small>RUS</small>
        </div>
        {active && (
          <div
            className="nn-cue-card"
            style={{
              opacity: Math.min(
                1,
                (time - active.startSeconds) / 0.18,
                (active.endSeconds - time) / 0.18,
              ),
              transform: `translateX(${(-18 * Math.max(0, 1 - (time - active.startSeconds) / 0.2)) / 3}px)`,
            }}
          >
            <div className="nn-cue-chrome">
              <div className="nn-cue-label">{active.label}</div>
              <div className="nn-cue-media">
                {media[active.asset] ? (
                  <WindowMedia
                    media={media[active.asset]}
                    time={time - active.startSeconds + active.mediaStartSeconds}
                    playing={playing}
                    alt={active.headline}
                  />
                ) : (
                  <span>
                    Выберите файл
                    <br />
                    {active.asset}
                  </span>
                )}
              </div>
              <div className="nn-cue-credit">{active.credit}</div>
            </div>
            <div className="nn-cue-headline">{active.headline}</div>
          </div>
        )}
      </div>
      <div className="nn-preview-controls">
        <button
          type="button"
          className="nn-icon-button"
          aria-label={
            playing ? "Пауза предпросмотра" : "Воспроизвести предпросмотр"
          }
          onClick={() => {
            if (time >= duration) seek(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <input
          aria-label="Время предпросмотра"
          type="range"
          min={0}
          max={duration}
          step={1 / 30}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <time>
          {time.toFixed(2)} / {duration.toFixed(2)}
        </time>
      </div>
      <div className="nn-window-track" aria-label="Окна на таймлайне">
        {(scene.windows ?? []).map((w, i) => (
          <button
            key={w.id}
            title={w.anchorText || w.headline}
            className={active?.id === w.id ? "active" : ""}
            style={{
              left: `${(w.startSeconds / duration) * 100}%`,
              width: `${(Math.max(0, w.endSeconds - w.startSeconds) / duration) * 100}%`,
            }}
            onClick={() => seek(w.startSeconds + 0.2)}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <label className="nn-secondary nn-file-picker">
        <Upload size={15} /> Материалы для просмотра
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={(e) => {
            const additions: Record<string, Media> = {};
            for (const file of Array.from(e.target.files ?? [])) {
              if (!/^(image|video)\//.test(file.type)) continue;
              const url = URL.createObjectURL(file);
              resources.current.push(url);
              additions[file.name] = {
                url,
                video: file.type.startsWith("video/"),
              };
            }
            setMedia((current) => ({ ...current, ...additions }));
            setError("");
          }}
        />
      </label>
      <p className="nn-preview-caption">
        {hostMedia
          ? "Время синхронизировано с клипом ведущей."
          : "Пока показан мастер-кадр. Выберите клип ведущей и материалы с именами из выпуска."}{" "}
        Файлы остаются на компьютере. Фраза — ориентир; переключение выполняется
        по заданному времени.
      </p>
      {actualDuration !== null &&
        Math.abs(actualDuration - scene.durationSeconds) > 0.5 && (
          <p className="nn-error-text">
            Фактическая длина клипа {actualDuration.toFixed(2)} сек. Проверьте
            план и окончания окон.
          </p>
        )}
      {error && <p className="nn-error-text">{error}</p>}
    </>
  );
}
