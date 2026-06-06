import type { UploadedAsset } from "@/lib/video/types";

export function isAiAnalysisEnabled(): boolean {
  return process.env.ENABLE_AI_ANALYSIS === "true";
}

export type MediaAnalysisResult = {
  assets: UploadedAsset[];
};

export async function analyzeMediaFiles(assets: UploadedAsset[]): Promise<MediaAnalysisResult> {
  // MVPでは外部AI APIへ画像・動画を送信しない。将来AI分析を追加する場合も環境変数で明示的に有効化する。
  if (!isAiAnalysisEnabled()) {
    return { assets };
  }

  return { assets };
}

export async function organizeAssetsForMvp(assets: UploadedAsset[]): Promise<UploadedAsset[]> {
  const analysis = await analyzeMediaFiles([...assets].sort((a, b) => a.order - b.order));
  return analysis.assets;
}
