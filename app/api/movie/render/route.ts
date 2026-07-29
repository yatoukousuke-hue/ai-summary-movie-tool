import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { organizeAssetsForMvp } from "@/lib/analysis/organizeAssets";
import { isValidAccessPassword } from "@/lib/security/access";
import { cleanupExpiredFiles } from "@/lib/video/cleanup";
import { ensureStorageDirs, isVercelRuntime, publicUploadDir, uploadDir } from "@/lib/video/paths";
import { renderMovie } from "@/lib/video/render-movie";
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

function parseNumber(value: FormDataEntryValue | null): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    await cleanupExpiredFiles();

    const formData = await request.formData();
    const accessPassword = String(formData.get("accessPassword") ?? "");
    const templateId = String(formData.get("templateId") ?? "exam-camp-emotional");
    const files = formData.getAll("assets").filter((value): value is File => value instanceof File);
    const sceneNotes = formData.getAll("sceneNotes").map((value) => String(value ?? ""));
    const bgm = formData.get("bgm");
    const bgmStartSeconds = parseNumber(formData.get("bgmStartSeconds"));
    const bgmEndSeconds = parseNumber(formData.get("bgmEndSeconds"));
    const bgmNote = String(formData.get("bgmNote") ?? "");
    const storyInstruction = String(formData.get("storyInstruction") ?? "");
    const editInstruction = String(formData.get("editInstruction") ?? "");
    const jobId = crypto.randomUUID();

    if (!isValidAccessPassword(accessPassword)) {
      return NextResponse.json({ error: "パスワードが違います。先生用の共通パスワードを入力してください。" }, { status: 401 });
    }

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
        mimeType: file.type,
        sceneNote: sceneNotes[index]?.trim() || undefined
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
      bgmPath,
      bgmStartSeconds,
      bgmEndSeconds,
      bgmNote,
      storyInstruction,
      editInstruction
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
