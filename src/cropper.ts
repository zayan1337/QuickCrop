import type { Preset, CropRect, CropResult } from './types';

/** Returns the center "cover" crop rect in natural image coords for a given aspect ratio. */
export function getCoverCropRect(image: HTMLImageElement, targetAspect: number): CropRect {
  const srcAspect = image.naturalWidth / image.naturalHeight;
  let sx: number, sy: number, sw: number, sh: number;

  if (srcAspect > targetAspect) {
    sh = image.naturalHeight;
    sw = sh * targetAspect;
    sx = (image.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = image.naturalWidth;
    sh = sw / targetAspect;
    sx = 0;
    sy = (image.naturalHeight - sh) / 2;
  }
  return { x: sx, y: sy, width: sw, height: sh };
}

export function cropImage(image: HTMLImageElement, preset: Preset): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = preset.width;
    canvas.height = preset.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    // Cover-crop: scale image to fill target, center-crop overflow
    const srcAspect = image.naturalWidth / image.naturalHeight;
    const tgtAspect = preset.width / preset.height;

    let sx: number, sy: number, sw: number, sh: number;

    if (srcAspect > tgtAspect) {
      // Source is wider than target: crop the sides
      sh = image.naturalHeight;
      sw = sh * tgtAspect;
      sx = (image.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      // Source is taller than target: crop top/bottom
      sw = image.naturalWidth;
      sh = sw / tgtAspect;
      sx = 0;
      sy = (image.naturalHeight - sh) / 2;
    }

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, preset.width, preset.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export image'));
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const filename = `quickcrop-${preset.id}-${preset.width}x${preset.height}.png`;
      resolve({ blob, objectUrl, width: preset.width, height: preset.height, filename });
    }, 'image/png');
  });
}

export function cropImageCustom(
  image: HTMLImageElement,
  sourceRect: CropRect,
  outputWidth: number,
  outputHeight: number,
  preset?: Preset
): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    ctx.drawImage(
      image,
      sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
      0, 0, outputWidth, outputHeight
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to export image'));
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const filename = preset
        ? `quickcrop-${preset.id}-${preset.width}x${preset.height}.png`
        : `quickcrop-custom-${outputWidth}x${outputHeight}.png`;
      resolve({ blob, objectUrl, width: outputWidth, height: outputHeight, filename });
    }, 'image/png');
  });
}
