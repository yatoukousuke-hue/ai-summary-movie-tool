export type AssetKind = "image" | "video";

export type UploadedAsset = {
  id: string;
  originalName: string;
  storedName: string;
  path: string;
  publicUrl: string;
  type: AssetKind;
  order: number;
  mimeType: string;
};

export type RenderMovieInput = {
  jobId: string;
  templateId: string;
  assets: UploadedAsset[];
  bgmPath?: string;
};

export type RenderMovieResult = {
  outputPath: string;
  outputUrl: string;
  fileName: string;
};
