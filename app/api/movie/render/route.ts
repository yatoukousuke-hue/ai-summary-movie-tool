import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { organizeAssetsForMvp } from "@/lib/analysis/organizeAssets";
import { ensureStorageDirs, isVercelRuntime, publicUploadDir, uploadDir } from "@/lib/video/paths";
import { renderMovie } from "@/lib/video/renderMovie";
import type { AssetKind, UploadedAsset } from "@/lib/video/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const audioTypes = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"]);
const shouldReturnVideoDataUrl = isVercelRuntime || process.env.RETURN_VIDEO_DATA_URL === "true";

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const base = path
    .basename(fileName, ext)
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "asset"}${ext}`;
}

function detectKind(file: File): AssetKind | null {
  if (imageTypes.has(file.type)) return "image";
  if (videoTypes.has(file.type)) return "video";
  return null;
}

async function saveFile(file: File, directory: string, jobId: string, index: number) {
  const storedName = `${jobId}-${String(index).padStart(3, "0")}-${sanitizeFileName(file.name)}`;
  const filePath = path.join(directory, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, bytes);
  return { storedName, filePath };
}

async function makeVideoDataUrl(outputPath: string) {
  const video = await readFile(outputPath);
  return `data:video/mp4;base64,${video.toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    await ensureStorageDirs();

    const formData = await request.formData();
    const templateId = String(formData.get("templateId") ?? "exam-camp-emotional");
    const files = formData.getAll("assets").filter((value): value is File => value instanceof File);
    const bgm = formData.get("bgm");
    const jobId = crypto.randomUUID();

    if (files.length === 0) {
      return NextResponse.json({ error: "画像または動画ファイルをアップロードしてください。" }, { status: 400 });
    }

    const assets: UploadedAsset[] = [];

    for (const [index, file] of files.entries()) {
      const kind = detectKind(file);
      if (!kind) {
        return NextResponse.json(
          { error: `${file.name} は対応していない形式です。jpg / png / webp / mp4 / mov / webm を使用してください。` },
          { status: 400 }
        );
      }

      const saved = await saveFile(file, publicUploadDir, jobId, index);
      assets.push({
        id: crypto.randomUUID(),
        originalName: file.name,
        storedName: saved.storedName,
        path: saved.filePath,
        publicUrl: isVercelRuntime ? "" : `/uploads/${saved.storedName}`,
        type: kind,
        order: index + 1,
        mimeType: file.type
      });
    }

    let bgmPath: string | undefined;
    if (bgm instanceof File && bgm.size > 0) {
      if (!audioTypes.has(bgm.type)) {
        return NextResponse.json({ error: "BGMは mp3 / wav / m4a / aac を使用してください。" }, { status: 400 });
      }
      const savedBgm = await saveFile(bgm, uploadDir, jobId, 999);
      bgmPath = savedBgm.filePath;
    }

    const organizedAssets = await organizeAssetsForMvp(assets);
    const result = await renderMovie({
      jobId,
      templateId,
      assets: organizedAssets,
      bgmPath
    });

    return NextResponse.json({
      status: "完了",
      outputUrl: shouldReturnVideoDataUrl ? "" : result.outputUrl,
      videoDataUrl: shouldReturnVideoDataUrl ? await makeVideoDataUrl(result.outputPath) : undefined,
      fileName: result.fileName,
      assets
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "動画生成中に不明なエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
