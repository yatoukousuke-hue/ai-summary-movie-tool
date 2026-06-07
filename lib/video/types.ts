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
  sceneNote?: string;
};

export type RenderMovieInput = {
  jobId: string;
  templateId: string;
  assets: UploadedAsset[];
  bgmPath?: string;
  bgmStartSeconds?: number;
  bgmEndSeconds?: number;
  bgmNote?: string;
  storyInstruction?: string;
  editInstruction?: string;
};

export type RenderMovieResult = {
  outputPath: string;
  outputUrl: string;
  fileName: string;
};
