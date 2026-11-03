import { z } from "zod/v4";

export const NEWS_CHANNEL = {
  id: "newnews-rus",
  name: "NEW🌏NEWS🇷🇺RUS",
  language: "ru-RU",
  timezone: "Europe/Kyiv",
  format: {
    width: 1080,
    height: 1920,
    fps: 30,
    introSeconds: 1,
    subtitles: false,
  },
} as const;

const assetName = z
  .string()
  .trim()
  .max(160)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/,
    "Используйте имя файла без папок, пробелов и URL",
  );
const sourceUrl = z
  .string()
  .trim()
  .max(2000)
  .url("Нужна ссылка на источник")
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Источник должен быть HTTPS-ссылкой без пароля");

export const NewsWindowSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,60}$/),
  asset: assetName,
  startSeconds: z.number().min(0).max(45),
  endSeconds: z.number().min(0).max(45),
  mediaStartSeconds: z.number().min(0).max(3600).default(0),
  headline: z.string().trim().min(3).max(60),
  label: z.string().trim().min(1).max(28),
  credit: z.string().trim().min(1).max(42),
  sourceUrl,
  anchorText: z.string().trim().max(250).default(""),
});
export type NewsWindow = z.infer<typeof NewsWindowSchema>;

export const NewsSceneSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9-]{1,60}$/),
    headline: z.string().trim().min(3, "Добавьте заголовок темы").max(120),
    narration: z
      .string()
      .trim()
      .min(20, "Добавьте текст для ведущей: минимум 20 символов")
      .max(1500),
    sourceUrls: z
      .array(sourceUrl)
      .min(1, "Добавьте хотя бы один источник для каждой темы")
      .max(5),
    durationSeconds: z.number().int().min(5).max(45),
    presenterAsset: assetName,
    brollAsset: z.union([assetName, z.literal("")]),
    windows: z.array(NewsWindowSchema).max(12).default([]),
  })
  .superRefine((scene, context) => {
    const sorted = [...scene.windows].sort(
      (a, b) => a.startSeconds - b.startSeconds,
    );
    if (scene.brollAsset && sorted.length)
      context.addIssue({
        code: "custom",
        path: ["windows"],
        message:
          "Выберите сопровождающие окна или прежний материал над ведущей",
      });
    if (new Set(sorted.map((w) => w.id)).size !== sorted.length)
      context.addIssue({
        code: "custom",
        path: ["windows"],
        message: "Идентификаторы окон должны быть уникальны",
      });
    sorted.forEach((window, index) => {
      if (
        window.endSeconds - window.startSeconds < 0.5 ||
        window.endSeconds > scene.durationSeconds
      )
        context.addIssue({
          code: "custom",
          path: ["windows", index],
          message: "Окно должно длиться от 0.5 сек. и укладываться в тему",
        });
      if (index && window.startSeconds < sorted[index - 1].endSeconds)
        context.addIssue({
          code: "custom",
          path: ["windows", index],
          message:
            "Сопровождающие окна не должны перекрывать друг друга по времени",
        });
    });
  });

export const NewsDraftSchema = z
  .object({
    title: z.string().trim().min(3, "Укажите название выпуска").max(100),
    focus: z.enum(["world", "russia-world", "technology"]),
    introAsset: assetName,
    scenes: z.array(NewsSceneSchema).min(1).max(6),
  })
  .superRefine((draft, context) => {
    if (
      1 + draft.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0) >
      60
    ) {
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "Выпуск вместе с заставкой должен укладываться в 60 секунд",
      });
    }
    if (
      new Set(draft.scenes.map((scene) => scene.id)).size !==
      draft.scenes.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["scenes"],
        message: "Идентификаторы тем должны быть уникальны",
      });
    }
  });

export type NewsDraft = z.infer<typeof NewsDraftSchema>;

export function createNewsPackage(
  input: unknown,
  id: string,
  createdAt = new Date().toISOString(),
) {
  const draft = NewsDraftSchema.parse(input);
  return {
    schemaVersion: 1,
    id,
    createdAt,
    channel: NEWS_CHANNEL,
    state: "awaiting_media" as const,
    ...draft,
    targetDurationSeconds:
      1 + draft.scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0),
    publication: { automatic: false as const, destinations: [] as string[] },
    production: {
      presenter: "approved-newnews-presenter",
      voice: "approved-russian-voice",
      instructions: [
        "Использовать только утверждённую ведущую NEW NEWS и её голос.",
        "Создать отдельный lip-sync MP4 с непрерывной русской речью для каждой темы.",
        "Не обрезать окончания слов. Хронометраж — ориентир; монтаж использует клипы целиком.",
        "Проверить факты по указанным источникам; ссылки сами по себе не подтверждают достоверность.",
        "Фото и видео источников добавлять только при наличии права использования.",
      ],
    },
  };
}

export type NewsPackage = ReturnType<typeof createNewsPackage>;
