import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const ffmpegStaticPath = typeof ffmpegStatic === "string" ? ffmpegStatic : undefined;
const ffprobeStaticPath =
  typeof ffprobeStatic === "object" && "path" in ffprobeStatic ? ffprobeStatic.path : undefined;

function firstExisting(paths: Array<string | undefined>) {
  return paths.find((candidate) => candidate && existsSync(candidate));
}

const localFfmpegPath = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");
const localFfprobePath = path.join(
  process.cwd(),
  "node_modules",
  "ffprobe-static",
  "bin",
  "win32",
  process.arch === "ia32" ? "ia32" : "x64",
  "ffprobe.exe"
);

export const ffmpegPath =
  firstExisting([process.env.FFMPEG_PATH, ffmpegStaticPath, localFfmpegPath]) ?? process.env.FFMPEG_PATH ?? "ffmpeg";

export const ffprobePath =
  firstExisting([process.env.FFPROBE_PATH, ffprobeStaticPath, localFfprobePath]) ?? process.env.FFPROBE_PATH ?? "ffprobe";

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `FFmpegを起動できませんでした。FFMPEG_PATHを設定するか、ffmpeg-staticをインストールしてください。詳細: ${error.message}`
        )
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpegの処理に失敗しました。${stderr.slice(-1200)}`));
    });
  });
}

export function runFfprobe(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffprobePath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`FFprobeを起動できませんでした。詳細: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(`FFprobeの処理に失敗しました。${stderr.slice(-800)}`));
    });
  });
}
