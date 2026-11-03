import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";
import {
  NewsDraftSchema,
  createNewsPackage,
} from "../lib/api-zod/src/newsroom.ts";

const draft = () => ({
  title: "Тестовый выпуск",
  focus: "world",
  introAsset: "intro.png",
  scenes: [
    {
      id: "topic-one",
      headline: "Тестовый материал",
      narration:
        "Это техническая проверка формата, а не сообщение о реальном событии.",
      sourceUrls: ["https://example.org/source"],
      durationSeconds: 15,
      presenterAsset: "presenter-1.mp4",
      brollAsset: "",
    },
  ],
});

test("timed windows survive package export and reject overlaps, missing credits and out-of-scene times", () => {
  const input = draft();
  const window = {
    id: "cue-one",
    asset: "photo.jpg",
    startSeconds: 0,
    endSeconds: 5,
    headline: "Короткий заголовок",
    label: "АРХИВ",
    credit: "Источник: ESA",
    sourceUrl: "https://www.esa.int/",
    anchorText: "Первая фраза",
  };
  input.scenes[0].windows = [window];
  const pack = createNewsPackage(input, "test-id");
  assert.equal(pack.scenes[0].windows[0].anchorText, "Первая фраза");
  assert.equal(pack.scenes[0].windows[0].mediaStartSeconds, 0);
  for (const mutation of [
    { endSeconds: 16 },
    { credit: "" },
    { asset: "../secret.jpg" },
    { startSeconds: 4.8 },
  ]) {
    input.scenes[0].windows = [{ ...window, ...mutation }];
    assert.equal(NewsDraftSchema.safeParse(input).success, false);
  }
  input.scenes[0].windows = [
    window,
    { ...window, id: "two", startSeconds: 4, endSeconds: 8 },
  ];
  assert.equal(NewsDraftSchema.safeParse(input).success, false);
  input.scenes[0].windows[1].startSeconds = 5;
  assert.equal(NewsDraftSchema.safeParse(input).success, true);
});

test("source validation rejects missing, malformed, credential and non-HTTPS links without throwing", () => {
  for (const sourceUrls of [
    [],
    ["not-a-url"],
    ["javascript:alert(1)"],
    ["http://example.org"],
    ["https://user:password@example.org"],
  ]) {
    const input = draft();
    input.scenes[0].sourceUrls = sourceUrls;
    assert.equal(NewsDraftSchema.safeParse(input).success, false);
  }
});
test("duration budget includes one second intro; asset paths cannot escape the media folder", () => {
  const input = draft();
  input.scenes.push({ ...input.scenes[0], id: "second", durationSeconds: 45 });
  assert.equal(NewsDraftSchema.safeParse(input).success, false);
  input.scenes[1].durationSeconds = 44;
  assert.equal(NewsDraftSchema.safeParse(input).success, true);
  input.scenes[0].presenterAsset = "../../secret.mp4";
  assert.equal(NewsDraftSchema.safeParse(input).success, false);
});
test("server owns profile and publication settings even when input tries to override them", () => {
  const result = createNewsPackage(
    {
      ...draft(),
      channel: { id: "other" },
      publication: { automatic: true },
      state: "published",
    },
    "test-id",
  );
  assert.equal(result.channel.id, "newnews-rus");
  assert.equal(result.channel.format.subtitles, false);
  assert.equal(result.state, "awaiting_media");
  assert.equal(result.publication.automatic, false);
  assert.equal(result.targetDurationSeconds, 16);
});

let child, directory, base, disabledChild, disabledBase;
const token = "test-only-studio-token-not-a-secret-123456";
async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function start(extra) {
  const port = await unusedPort();
  const env = {
    ...process.env,
    DATABASE_URL: "",
    ENABLE_LEMLIST: "false",
    PORT: String(port),
    NODE_ENV: "production",
    NEWNEWS_DATA_DIR: directory,
    NEWNEWS_WEB_DIR: path.resolve("artifacts/natasha-fri/dist/public"),
    ...extra,
  };
  const process_ = spawn(
    process.execPath,
    ["artifacts/api-server/dist/index.mjs"],
    { env, stdio: ["ignore", "ignore", "pipe"] },
  );
  let errorOutput = "";
  process_.stderr.on("data", (chunk) => {
    errorOutput += chunk;
  });
  const url = `http://127.0.0.1:${port}/api`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (process_.exitCode !== null)
      throw new Error(errorOutput || "API failed to start");
    try {
      if ((await fetch(`${url}/healthz`)).ok) return [process_, url];
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process_.kill();
  throw new Error(`API startup timeout: ${errorOutput}`);
}
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "newnews-test-"));
  [child, base] = await start({ NEWNEWS_STUDIO_TOKEN: token });
  [disabledChild, disabledBase] = await start({ NEWNEWS_STUDIO_TOKEN: "" });
});
after(async () => {
  for (const process_ of [child, disabledChild])
    if (process_ && process_.exitCode === null) {
      const closed = new Promise((resolve) => process_.once("exit", resolve));
      process_.kill();
      await closed;
    }
  if (directory) await rm(directory, { recursive: true, force: true });
});
const post = (url, body, auth = token) =>
  fetch(`${url}/newsroom/packages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth}`,
    },
    body: JSON.stringify(body),
  });

test("API starts without Postgres and reports configuration, not fake render readiness", async () => {
  const response = await fetch(`${base}/newsroom/status`);
  const data = await response.json();
  assert.equal(data.storageConfigured, true);
  assert.equal(data.rendering, "manual-local");
  assert.equal(data.publishing, "not-connected");
  assert.equal(JSON.stringify(data).includes(token), false);
});

test("local single-process server serves the studio and keeps API misses as JSON", async () => {
  const web = await fetch(base.replace(/\/api$/, "/"));
  assert.equal(web.status, 200);
  assert.match(await web.text(), /NEW🌏NEWS🇷🇺RUS/);
  const missing = await fetch(`${base}/unknown`);
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get("content-type"), /application\/json/);
});
test("writes are disabled without a server token and rejected for invalid auth", async () => {
  assert.equal((await post(disabledBase, draft())).status, 503);
  assert.equal((await post(base, draft(), "wrong")).status, 401);
});
test("invalid drafts create no files", async () => {
  const before = await readdir(directory);
  assert.equal((await post(base, { title: "invalid" })).status, 400);
  assert.deepEqual(await readdir(directory), before);
});
test("package is saved durably, retrieved with auth, and concurrent requests use separate files", async () => {
  const responses = await Promise.all([
    post(base, draft()),
    post(base, draft()),
  ]);
  assert.deepEqual(
    responses.map((response) => response.status),
    [201, 201],
  );
  const results = await Promise.all(
    responses.map((response) => response.json()),
  );
  assert.notEqual(results[0].id, results[1].id);
  for (const result of results) {
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(directory, `${result.id}.json`), "utf8"),
      ),
      result,
    );
    const url = `${base}/newsroom/packages/${result.id}`;
    assert.equal((await fetch(url)).status, 401);
    assert.deepEqual(
      await (
        await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      ).json(),
      result,
    );
  }
  assert.equal(
    (
      await fetch(`${base}/newsroom/packages/invalid`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).status,
    400,
  );
});
