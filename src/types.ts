export interface Preset {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number;
  aspectLabel: string;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropResult {
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  filename: string;
}

export type AppState = 'upload' | 'crop' | 'custom-crop' | 'download';
