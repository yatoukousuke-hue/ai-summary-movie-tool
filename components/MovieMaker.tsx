"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Download,
  Film,
  ImageIcon,
  Loader2,
  Music,
  PencilLine,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Trash2,
  Upload,
  Wand2
} from "lucide-react";
import { movieTemplates } from "@/lib/templates/movieTemplates";

type LocalAsset = {
  id: string;
  file: File;
  url: string;
  type: "image" | "video";
  order: number;
  sceneNote: string;
};

type ProgressState = "idle" | "uploading" | "organizing" | "rendering" | "done" | "error";

const progressLabels: Record<ProgressState, string> = {
  idle: "待機中",
  uploading: "アップロード中",
  organizing: "素材を整理中",
  rendering: "動画を生成中",
  done: "完了",
  error: "エラー"
};

const sceneQuickNotes = ["集中して勉強", "先生の激励", "仲間と笑顔", "集合写真", "最後の振り返り"];
const storyQuickInstructions = [
  "前半は緊張感、後半は達成感を強める",
  "仲間と乗り越えた雰囲気を大切にする",
  "先生と保護者への感謝で締める"
];
const bgmQuickNotes = ["前半は静かに、後半で盛り上げる", "集合写真から音楽を強めたい", "最後は余韻が残る雰囲気にする"];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function estimateMovieSeconds(assets: LocalAsset[]) {
  const bodySeconds = assets.reduce((total, asset) => total + (asset.type === "image" ? 4 : 7), 0);
  return bodySeconds + 8;
}

function estimateRenderMinutes(assets: LocalAsset[], hasBgm: boolean) {
  if (assets.length === 0) return "素材を追加すると表示されます";
  const movieSeconds = estimateMovieSeconds(assets);
  const processingSeconds = Math.ceil(movieSeconds * 0.95 + assets.length * 5 + (hasBgm ? 14 : 0));
  const min = Math.max(1, Math.floor(processingSeconds / 60));
  const max = Math.max(min + 1, Math.ceil(processingSeconds / 45));
  return `約${min}〜${max}分`;
}

function renumberAssets(nextAssets: LocalAsset[]) {
  return nextAssets.map((asset, index) => ({ ...asset, order: index + 1 }));
}

function appendInstruction(current: string, addition: string) {
  return current.trim() ? `${current.trim()} / ${addition}` : addition;
}

export function MovieMaker() {
  const [templateId, setTemplateId] = useState(movieTemplates[0].id);
  const [accessPassword, setAccessPassword] = useState("");
  const [assets, setAssets] = useState<LocalAsset[]>([]);
  const [batchSceneNote, setBatchSceneNote] = useState("");
  const [bgm, setBgm] = useState<File | null>(null);
  const [bgmStartSeconds, setBgmStartSeconds] = useState("0");
  const [bgmEndSeconds, setBgmEndSeconds] = useState("");
  const [bgmNote, setBgmNote] = useState("");
  const [storyInstruction, setStoryInstruction] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [error, setError] = useState("");
  const [outputUrl, setOutputUrl] = useState("");

  const selectedTemplate = useMemo(
    () => movieTemplates.find((template) => template.id === templateId) ?? movieTemplates[0],
    [templateId]
  );
  const movieSeconds = estimateMovieSeconds(assets);
  const estimateLabel = estimateRenderMinutes(assets, Boolean(bgm));

  function addAssets(files: FileList | null) {
    if (!files) return;

    const nextAssets = Array.from(files)
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("image/") ? ("image" as const) : ("video" as const),
        order: assets.length + index + 1,
        sceneNote: batchSceneNote
      }));

    setAssets((current) => [...current, ...nextAssets]);
    setOutputUrl("");
    setError("");
    setProgress("idle");
  }

  function updateAssetSceneNote(id: string, sceneNote: string) {
    setAssets((current) => current.map((asset) => (asset.id === id ? { ...asset, sceneNote } : asset)));
  }

  function removeAsset(id: string) {
    setAssets((current) => {
      const removed = current.find((asset) => asset.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return renumberAssets(current.filter((asset) => asset.id !== id));
    });
    setOutputUrl("");
  }

  function moveAsset(id: string, direction: -1 | 1) {
    setAssets((current) => {
      const index = current.findIndex((asset) => asset.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return renumberAssets(next);
    });
    setOutputUrl("");
  }

  function clearAssets() {
    assets.forEach((asset) => URL.revokeObjectURL(asset.url));
    setAssets([]);
    setOutputUrl("");
    setError("");
    setProgress("idle");
  }

  async function createMovie(options?: { reedit?: boolean }) {
    if (assets.length === 0) {
      setError("画像または動画を1つ以上アップロードしてください。");
      setProgress("error");
      return;
    }

    setError("");
    setOutputUrl("");
    setProgress("uploading");

    const formData = new FormData();
    formData.append("accessPassword", accessPassword);
    formData.append("templateId", templateId);
    formData.append("storyInstruction", storyInstruction);
    formData.append("editInstruction", options?.reedit ? editInstruction : "");
    formData.append("bgmStartSeconds", bgmStartSeconds);
    formData.append("bgmEndSeconds", bgmEndSeconds);
    formData.append("bgmNote", bgmNote);
    assets.forEach((asset) => {
      formData.append("assets", asset.file);
      formData.append("sceneNotes", asset.sceneNote);
    });
    if (bgm) formData.append("bgm", bgm);

    try {
      window.setTimeout(() => setProgress("organizing"), 500);
      window.setTimeout(() => setProgress("rendering"), 1100);

      const response = await fetch("/api/movie/render", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { outputUrl?: string; videoDataUrl?: string; error?: string };
      const movieUrl = data.videoDataUrl ?? data.outputUrl;
      if (!response.ok || !movieUrl) {
        throw new Error(data.error ?? "動画を生成できませんでした。");
      }

      setOutputUrl(data.videoDataUrl ? movieUrl : `${movieUrl}?t=${Date.now()}`);
      setProgress("done");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "動画生成中にエラーが発生しました。");
      setProgress("error");
    }
  }

  const isBusy = progress === "uploading" || progress === "organizing" || progress === "rendering";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8">
      <section className="mb-7">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-sm text-ink">
          <Film className="h-4 w-4 text-accent" />
          ローカル処理MVP
        </div>
        <h1 className="text-3xl font-bold tracking-normal text-ink sm:text-4xl">AIまとめムービー作成ツール</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
          写真・動画をアップロードするだけで、イベント用のまとめムービーを作成します。場面指定や構成メモを加えると、より意図に近い動画にできます。
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">先生用パスワード</h2>
            <input
              value={accessPassword}
              onChange={(event) => setAccessPassword(event.target.value)}
              type="password"
              placeholder="共通パスワード"
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
            <p className="mt-2 text-sm leading-6 text-slate-600">本番ではRenderの環境変数 APP_ACCESS_PASSWORD で設定します。</p>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">テンプレート選択</h2>
            <div className="space-y-2">
              {movieTemplates.map((template) => (
                <label key={template.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 transition hover:border-accent">
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={template.id === templateId}
                    onChange={(event) => setTemplateId(event.target.value as typeof templateId)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{template.name}</span>
                    <span className="block text-sm leading-6 text-slate-600">{template.tone}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">自動ストーリー構成</h2>
            <ol className="space-y-2">
              {selectedTemplate.chapters.map((chapter) => (
                <li key={chapter.id} className="rounded-md bg-paper px-3 py-2">
                  <div className="text-sm font-semibold text-accent">{chapter.label}</div>
                  <div className="text-sm text-ink">{chapter.title}</div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5 text-accent" />
              作成完了予想時間
            </h2>
            <p className="text-2xl font-bold text-ink">{estimateLabel}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              素材 {assets.length}件 / 完成尺目安 {Math.floor(movieSeconds / 60)}分{movieSeconds % 60}秒。PC性能や素材サイズで前後します。
            </p>
          </section>
        </aside>

        <div className="space-y-5">
          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">ファイルアップロード</h2>
            <label className="mb-3 block text-sm font-medium">これから追加する素材の場面指定</label>
            <input
              value={batchSceneNote}
              onChange={(event) => setBatchSceneNote(event.target.value)}
              placeholder="例: 集中して勉強している場面 / 先生の激励 / 集合写真"
              className="mb-4 w-full rounded-md border border-line px-3 py-2 text-sm"
            />
            <div className="mb-4 flex flex-wrap gap-2">
              {sceneQuickNotes.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setBatchSceneNote(note)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                >
                  {note}
                </button>
              ))}
            </div>
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-line bg-paper px-5 py-7 text-center transition hover:border-accent">
              <Upload className="mb-3 h-8 w-8 text-accent" />
              <span className="font-medium">写真・動画を選択</span>
              <span className="mt-1 text-sm text-slate-600">jpg / jpeg / png / webp / mp4 / mov / webm に対応</span>
              <input
                className="sr-only"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                onChange={(event) => addAssets(event.target.files)}
              />
            </label>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <PencilLine className="h-5 w-5 text-accent" />
              ストーリー構成の指示
            </h2>
            <textarea
              value={storyInstruction}
              onChange={(event) => setStoryInstruction(event.target.value)}
              placeholder="例: 前半は緊張感、後半は仲間との達成感を強めたい。最後は保護者への感謝で締めたい。"
              className="min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm leading-6"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {storyQuickInstructions.map((instruction) => (
                <button
                  key={instruction}
                  type="button"
                  onClick={() => setStoryInstruction((current) => appendInstruction(current, instruction))}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent"
                >
                  {instruction}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Music className="h-5 w-5 text-coral" />
              BGM設定
            </h2>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac"
              onChange={(event) => setBgm(event.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            {bgm ? <p className="mt-2 text-sm text-slate-600">{bgm.name}</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">
                開始秒
                <input value={bgmStartSeconds} onChange={(event) => setBgmStartSeconds(event.target.value)} className="mt-1 w-full rounded-md border border-line px-3 py-2" />
              </label>
              <label className="text-sm font-medium">
                終了秒
                <input value={bgmEndSeconds} onChange={(event) => setBgmEndSeconds(event.target.value)} placeholder="空欄なら最後まで" className="mt-1 w-full rounded-md border border-line px-3 py-2" />
              </label>
            </div>
            <textarea
              value={bgmNote}
              onChange={(event) => setBgmNote(event.target.value)}
              placeholder="例: オープニングは静かに、後半の集合写真から少し盛り上げたい。"
              className="mt-3 min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm leading-6"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {bgmQuickNotes.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setBgmNote((current) => appendInstruction(current, note))}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-coral hover:text-coral"
                >
                  {note}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">素材一覧</h2>
              {assets.length > 0 ? (
                <button type="button" onClick={clearAssets} className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:border-coral hover:text-coral">
                  クリア
                </button>
              ) : null}
            </div>

            {assets.length === 0 ? (
              <p className="rounded-md bg-paper p-4 text-sm text-slate-600">まだ素材がありません。アップロード順にムービーへ並びます。</p>
            ) : (
              <div className="grid gap-3">
                {assets.map((asset) => (
                  <article key={asset.id} className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-[120px_1fr]">
                    <div className="h-24 w-full overflow-hidden rounded bg-slate-100 sm:w-28">
                      {asset.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.url} alt={asset.file.name} className="h-full w-full object-cover" />
                      ) : (
                        <video src={asset.url} className="h-full w-full object-cover" muted />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                        <span className="inline-flex items-center gap-2">
                          {asset.type === "image" ? <ImageIcon className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                          {asset.order}番目
                        </span>
                        <span className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveAsset(asset.id, -1)}
                            disabled={asset.order === 1}
                            className="rounded border border-line p-1 hover:border-accent disabled:opacity-35"
                            title="上へ"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveAsset(asset.id, 1)}
                            disabled={asset.order === assets.length}
                            className="rounded border border-line p-1 hover:border-accent disabled:opacity-35"
                            title="下へ"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAsset(asset.id)}
                            className="rounded border border-line p-1 hover:border-coral hover:text-coral"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      </div>
                      <p className="truncate text-sm text-ink" title={asset.file.name}>
                        {asset.file.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {asset.type === "image" ? "画像" : "動画"} / {formatBytes(asset.file.size)}
                      </p>
                      <input
                        value={asset.sceneNote}
                        onChange={(event) => updateAssetSceneNote(asset.id, event.target.value)}
                        placeholder="この素材の場面メモ"
                        className="mt-3 w-full rounded-md border border-line px-3 py-2 text-sm"
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => createMovie()}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                ムービーを作成する
              </button>
              <div className="text-sm">
                <span className="font-semibold">生成状況: </span>
                <span className={progress === "error" ? "text-coral" : "text-slate-700"}>{progressLabels[progress]}</span>
              </div>
            </div>
            {error ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          </section>

          {outputUrl ? (
            <section className="rounded-md border border-line bg-white p-5 shadow-soft">
              <h2 className="mb-3 text-lg font-semibold">プレビューと再編集</h2>
              <video src={outputUrl} controls className="aspect-video w-full rounded-md bg-black" />
              <textarea
                value={editInstruction}
                onChange={(event) => setEditInstruction(event.target.value)}
                placeholder="例: 2番目の素材のテロップをもっと短く。最後を感謝の言葉で締めたい。"
                className="mt-4 min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm leading-6"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => createMovie({ reedit: true })}
                  className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-3 font-semibold hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className="h-5 w-5" />
                  指示を反映して再編集
                </button>
                <a href={outputUrl} download className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-semibold text-white hover:bg-slate-800">
                  <Download className="h-5 w-5" />
                  mp4をダウンロード
                </a>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
