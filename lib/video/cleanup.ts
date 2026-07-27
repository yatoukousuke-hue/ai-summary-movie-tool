import { readdir, rm, stat } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import { outputDir, publicOutputDir, publicUploadDir, uploadDir } from "@/lib/video/paths";

const DEFAULT_RETENTION_HOURS = 24;

function getRetentionMs() {
  const configured = Number.parseFloat(process.env.FILE_RETENTION_HOURS ?? "");
  const hours = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RETENTION_HOURS;
  return hours * 60 * 60 * 1000;
}

async function cleanupDirectory(directory: string, now: number, retentionMs: number) {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name !== ".gitkeep")
      .map(async (entry) => {
        const filePath = path.join(directory, entry.name);
        const fileStat = await stat(filePath);
        if (now - fileStat.mtimeMs > retentionMs) {
          await rm(filePath, { force: true });
        }
      })
  );
}

export async function cleanupExpiredFiles() {
  const retentionMs = getRetentionMs();
  const now = Date.now();
  const directories = Array.from(new Set([uploadDir, outputDir, publicUploadDir, publicOutputDir]));
  await Promise.all(directories.map((directory) => cleanupDirectory(directory, now, retentionMs)));
}
