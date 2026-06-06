import path from "node:path";
import os from "node:os";
import { mkdir } from "node:fs/promises";

export const rootDir = process.cwd();
export const isVercelRuntime = process.env.VERCEL === "1";
const runtimeStorageDir = isVercelRuntime ? path.join(os.tmpdir(), "ai-summary-movie-tool") : rootDir;

export const uploadDir = path.join(runtimeStorageDir, "uploads");
export const outputDir = path.join(runtimeStorageDir, "output");
export const publicUploadDir = isVercelRuntime ? uploadDir : path.join(rootDir, "public", "uploads");
export const publicOutputDir = isVercelRuntime ? outputDir : path.join(rootDir, "public", "output");

export async function ensureStorageDirs() {
  await Promise.all([
    mkdir(uploadDir, { recursive: true }),
    mkdir(outputDir, { recursive: true }),
    mkdir(publicUploadDir, { recursive: true }),
    mkdir(publicOutputDir, { recursive: true })
  ]);
}
