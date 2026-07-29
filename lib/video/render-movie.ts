import path from "node:path";
import { existsSync } from "node:fs";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { getMovieTemplate } from "@/lib/templates/movieTemplates";
import { publicOutputDir } from "@/lib/video/paths";
import { runFfmpeg, runFfprobe } from "@/lib/video/ffmpeg";
import type { RenderMovieInput, RenderMovieResult, UploadedAsset } from "@/lib/video/types";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const IMAGE_SECONDS = 4;
const VIDEO_SECONDS = 7;
const H264_FAST_QUALITY_ARGS = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-threads", "0"];

function escapeDrawText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function compactCaption(caption: string): string {
  return caption.replace(/\s+/g, " ").trim().slice(0, 72);
}

function getFontOption(): string {
  const candidates = [
    process.env.FFMPEG_FONT_PATH,
    "C:/Windows/Fonts/meiryo.ttc",
    "C:/Windows/Fonts/YuGothM.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
  ].filter(Boolean) as string[];

  const fontPath = candidates.find((candidate) => existsSync(candidate));
  if (!fontPath) return "";

  return `:fontfile='${fontPath.replace(/\\/g, "/").replace(/:/g, "\\:")}'`;
}

function normalizeForFfmpeg(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const output = await runFfprobe([
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);
    const duration = Number.parseFloat(output);
    return Number.isFinite(duration) ? duration : VIDEO_SECONDS;
  } catch {
    return VIDEO_SECONDS;
  }
}

function makeTextFilter(caption: string): string {
  const safeCaption = escapeDrawText(compactCaption(caption));
  const fontOption = getFontOption();
  return [
    "scale=1920:1080:force_original_aspect_ratio=decrease",
    "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#111827",
    "setsar=1",
    "format=yuv420p",
    "drawbox=x=0:y=820:w=1920:h=170:color=black@0.42:t=fill",
    `drawtext=text='${safeCaption}'${fontOption}:fontcolor=white:fontsize=52:line_spacing=12:x=(w-text_w)/2:y=872:box=0`
  ].join(",");
}

async function renderTitleClip(workDir: string, fileName: string, title: string, caption: string, seconds = 4) {
  const outputPath = path.join(workDir, fileName);
  const titleText = escapeDrawText(compactCaption(title));
  const captionText = escapeDrawText(compactCaption(caption));
  const fontOption = getFontOption();

  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=#172033:s=${WIDTH}x${HEIGHT}:d=${seconds}:r=${FPS}`,
    "-vf",
    [
      `drawtext=text='${titleText}'${fontOption}:fontcolor=white:fontsize=86:x=(w-text_w)/2:y=410`,
      `drawtext=text='${captionText}'${fontOption}:fontcolor=#e8f5f3:fontsize=46:x=(w-text_w)/2:y=535`
    ].join(","),
    ...H264_FAST_QUALITY_ARGS,
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputPath
  ]);

  return outputPath;
}

async function renderAssetClip(workDir: string, index: number, asset: UploadedAsset, caption: string): Promise<string> {
  const outputPath = path.join(workDir, `clip-${String(index).padStart(3, "0")}.mp4`);
  const textFilter = makeTextFilter(caption);

  if (asset.type === "image") {
    await runFfmpeg([
      "-y",
      "-loop",
      "1",
      "-t",
      String(IMAGE_SECONDS),
      "-i",
      asset.path,
      "-vf",
      `${textFilter},fade=t=in:st=0:d=0.45,fade=t=out:st=${IMAGE_SECONDS - 0.55}:d=0.55`,
      "-r",
      String(FPS),
      ...H264_FAST_QUALITY_ARGS,
      "-pix_fmt",
      "yuv420p",
      "-an",
      outputPath
    ]);
    return outputPath;
  }

  const duration = Math.min(Math.max(await getVideoDuration(asset.path), 1), VIDEO_SECONDS);

  await runFfmpeg([
    "-y",
    "-t",
    duration.toFixed(2),
    "-i",
    asset.path,
    "-vf",
    `${textFilter},fade=t=in:st=0:d=0.35,fade=t=out:st=${Math.max(duration - 0.5, 0.4).toFixed(2)}:d=0.5`,
    "-r",
    String(FPS),
    ...H264_FAST_QUALITY_ARGS,
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputPath
  ]);

  return outputPath;
}

async function concatClips(workDir: string, clips: string[], outputPath: string) {
  const concatFile = path.join(workDir, "concat.txt");
  const lines = clips.map((clip) => `file '${normalizeForFfmpeg(clip)}'`).join("\n");
  await writeFile(concatFile, lines, "utf8");

  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", outputPath]);
}

async function addBgm(videoPath: string, bgmPath: string, outputPath: string, startSeconds = 0, endSeconds?: number) {
  const safeStart = Math.max(0, startSeconds);
  const delayMs = Math.round(safeStart * 1000);
  const trimPart = endSeconds && endSeconds > safeStart ? `,atrim=0:${(endSeconds - safeStart).toFixed(2)}` : "";
  const audioFilter = `[1:a]volume=0.18${trimPart},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs}[a]`;

  await runFfmpeg([
    "-y",
    "-i",
    videoPath,
    "-stream_loop",
    "-1",
    "-i",
    bgmPath,
    "-filter_complex",
    audioFilter,
    "-map",
    "0:v:0",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    outputPath
  ]);
}

function buildAssetCaption(asset: UploadedAsset, fallbackCaption: string, storyInstruction?: string) {
  const parts = [asset.sceneNote ? `${asset.sceneNote}:` : "", fallbackCaption];
  if (storyInstruction) parts.push(`構成意図: ${storyInstruction}`);
  return parts.filter(Boolean).join(" ");
}

export async function renderMovie(input: RenderMovieInput): Promise<RenderMovieResult> {
  if (input.assets.length === 0) {
    throw new Error("動画にする素材を1つ以上アップロードしてください。");
  }

  const template = getMovieTemplate(input.templateId);
  const storyInstruction = input.storyInstruction?.trim();
  const editInstruction = input.editInstruction?.trim();
  const bgmNote = input.bgmNote?.trim();
  const workDir = await mkdtemp(path.join(os.tmpdir(), `movie-${input.jobId}-`));
  const fileName = `${input.jobId}.mp4`;
  const outputPath = path.join(publicOutputDir, fileName);

  try {
    const clips: string[] = [];
    const openingCaption = [
      template.chapters[0]?.caption ?? template.tone,
      storyInstruction ? `構成メモ: ${storyInstruction}` : ""
    ]
      .filter(Boolean)
      .join(" ");

    clips.push(await renderTitleClip(workDir, "clip-000-title.mp4", template.title, openingCaption));

    for (const [index, asset] of input.assets.entries()) {
      const chapter = template.chapters[(index % Math.max(template.chapters.length - 2, 1)) + 1];
      clips.push(await renderAssetClip(workDir, index + 1, asset, buildAssetCaption(asset, chapter.caption, storyInstruction)));
    }

    const endingCaption = editInstruction
      ? `再編集メモ: ${editInstruction}`
      : bgmNote
        ? `BGM指定: ${bgmNote}`
        : "ご視聴ありがとうございました";
    clips.push(await renderTitleClip(workDir, "clip-999-ending.mp4", template.ending, endingCaption, 4));

    const silentPath = path.join(workDir, "silent.mp4");
    await concatClips(workDir, clips, silentPath);

    if (input.bgmPath) {
      await addBgm(silentPath, input.bgmPath, outputPath, input.bgmStartSeconds, input.bgmEndSeconds);
    } else {
      await copyFile(silentPath, outputPath);
    }

    return {
      outputPath,
      outputUrl: `/output/${fileName}`,
      fileName
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
