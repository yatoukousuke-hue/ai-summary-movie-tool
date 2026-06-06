"use client";

import { useMemo, useState } from "react";
import { Download, Film, ImageIcon, Loader2, Music, Upload, Wand2 } from "lucide-react";
import { movieTemplates } from "@/lib/templates/movieTemplates";

type LocalAsset = {
  id: string;
  file: File;
  url: string;
  type: "image" | "video";
  order: number;
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

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MovieMaker() {
  const [templateId, setTemplateId] = useState(movieTemplates[0].id);
  const [assets, setAssets] = useState<LocalAsset[]>([]);
  const [bgm, setBgm] = useState<File | null>(null);
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [error, setError] = useState("");
  const [outputUrl, setOutputUrl] = useState("");

  const selectedTemplate = useMemo(
    () => movieTemplates.find((template) => template.id === templateId) ?? movieTemplates[0],
    [templateId]
  );

  function addAssets(files: FileList | null) {
    if (!files) return;

    const nextAssets = Array.from(files)
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("image/") ? ("image" as const) : ("video" as const),
        order: assets.length + index + 1
      }));

    setAssets((current) => [...current, ...nextAssets]);
    setOutputUrl("");
    setError("");
    setProgress("idle");
  }

  function clearAssets() {
    assets.forEach((asset) => URL.revokeObjectURL(asset.url));
    setAssets([]);
    setOutputUrl("");
    setError("");
    setProgress("idle");
  }

  async function createMovie() {
    if (assets.length === 0) {
      setError("画像または動画を1つ以上アップロードしてください。");
      setProgress("error");
      return;
    }

    setError("");
    setOutputUrl("");
    setProgress("uploading");

    const formData = new FormData();
    formData.append("templateId", templateId);
    assets.forEach((asset) => formData.append("assets", asset.file));
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
          写真・動画をアップロードするだけで、イベント用のまとめムービーを作成します。
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">テンプレート選択</h2>
            <div className="space-y-2">
              {movieTemplates.map((template) => (
                <label
                  key={template.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 transition hover:border-accent"
                >
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
        </aside>

        <div className="space-y-5">
          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <h2 className="mb-3 text-lg font-semibold">ファイルアップロード</h2>
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

            <div className="mt-4 rounded-md border border-line p-4">
              <label className="mb-2 flex items-center gap-2 font-medium">
                <Music className="h-4 w-4 text-coral" />
                BGMファイル
              </label>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac"
                onChange={(event) => setBgm(event.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              {bgm ? <p className="mt-2 text-sm text-slate-600">{bgm.name}</p> : null}
            </div>
          </section>

          <section className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">素材一覧</h2>
              {assets.length > 0 ? (
                <button
                  type="button"
                  onClick={clearAssets}
                  className="rounded-md border border-line px-3 py-2 text-sm font-medium hover:border-coral hover:text-coral"
                >
                  クリア
                </button>
              ) : null}
            </div>

            {assets.length === 0 ? (
              <p className="rounded-md bg-paper p-4 text-sm text-slate-600">まだ素材がありません。アップロード順にムービーへ並びます。</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {assets.map((asset) => (
                  <article key={asset.id} className="grid grid-cols-[96px_1fr] gap-3 rounded-md border border-line p-3">
                    <div className="h-20 w-24 overflow-hidden rounded bg-slate-100">
                      {asset.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.url} alt={asset.file.name} className="h-full w-full object-cover" />
                      ) : (
                        <video src={asset.url} className="h-full w-full object-cover" muted />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                        {asset.type === "image" ? <ImageIcon className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                        {asset.order}番目
                      </div>
                      <p className="truncate text-sm text-ink" title={asset.file.name}>
                        {asset.file.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {asset.type === "image" ? "画像" : "動画"} / {formatBytes(asset.file.size)}
                      </p>
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
                onClick={createMovie}
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
              <h2 className="mb-3 text-lg font-semibold">プレビュー</h2>
              <video src={outputUrl} controls className="aspect-video w-full rounded-md bg-black" />
              <a
                href={outputUrl}
                download
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                <Download className="h-5 w-5" />
                mp4をダウンロード
              </a>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
