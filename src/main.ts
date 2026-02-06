import './style.css';
import { initDropzone } from './dropzone';
import { cropImageCustom, getCoverCropRect } from './cropper';
import { createCropOverlay } from './crop-overlay';
import type { CropOverlay } from './crop-overlay';
import { transitionTo, showPreview, showCustomCropImage, renderPresets, showResult, showError } from './ui';
import type { Preset } from './types';

let currentImage: HTMLImageElement | null = null;
let currentPreviewUrl: string | null = null;
let cropOverlay: CropOverlay | null = null;
let aspectLocked = false;
/** When set, we're in "reposition preset" mode: overlay has fixed aspect, apply uses preset dimensions. */
let currentPreset: Preset | null = null;

// --- DOM refs ---
const dropzone = document.getElementById('dropzone')!;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const presetsContainer = document.getElementById('presets')!;
const widthInput = document.getElementById('custom-width') as HTMLInputElement;
const heightInput = document.getElementById('custom-height') as HTMLInputElement;
const aspectLockBtn = document.getElementById('aspect-lock')!;
const presetHintEl = document.getElementById('custom-crop-preset-hint')!;
const presetDimsEl = document.getElementById('custom-crop-preset-dims')!;
const dimsRowEl = document.getElementById('custom-crop-dims-row')!;

// --- Handlers ---

function handleFile(file: File): void {
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
  }

  const url = URL.createObjectURL(file);
  currentPreviewUrl = url;

  const img = new Image();
  img.onload = () => {
    currentImage = img;
    showPreview(url);
    transitionTo('crop');
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    currentPreviewUrl = null;
    showError('Could not load image. Please try a different file.');
  };
  img.src = url;
}

function handlePreset(preset: Preset): void {
  if (!currentImage || !currentPreviewUrl) return;

  currentPreset = preset;
  presetHintEl.hidden = false;
  presetDimsEl.textContent = `${preset.width} × ${preset.height}`;
  dimsRowEl.hidden = true;

  showCustomCropImage(currentPreviewUrl);
  transitionTo('custom-crop');

  destroyOverlay();
  requestAnimationFrame(() => {
    const container = document.getElementById('crop-overlay-container')!;
    const overlayImage = document.getElementById('crop-overlay-image') as HTMLImageElement;
    const aspect = preset.width / preset.height;
    const initialRect = getCoverCropRect(currentImage!, aspect);

    cropOverlay = createCropOverlay({
      container,
      image: overlayImage,
      initialRect,
      initialAspectRatio: aspect,
      onChange() {
        // In preset mode we don't sync dim inputs
      },
    });
  });
}

function destroyOverlay(): void {
  if (cropOverlay) {
    cropOverlay.destroy();
    cropOverlay = null;
  }
}

function handleCustomClick(): void {
  if (!currentImage || !currentPreviewUrl) return;

  currentPreset = null;
  presetHintEl.hidden = true;
  dimsRowEl.hidden = false;
  widthInput.value = '';
  heightInput.value = '';
  aspectLocked = false;
  aspectLockBtn.setAttribute('aria-pressed', 'false');

  showCustomCropImage(currentPreviewUrl);
  transitionTo('custom-crop');

  destroyOverlay();
  requestAnimationFrame(() => {
    const container = document.getElementById('crop-overlay-container')!;
    const overlayImage = document.getElementById('crop-overlay-image') as HTMLImageElement;

    cropOverlay = createCropOverlay({
      container,
      image: overlayImage,
      onChange(rect) {
        widthInput.value = Math.round(rect.width).toString();
        heightInput.value = Math.round(rect.height).toString();
      },
    });
  });
}

async function handleApplyCustomCrop(): Promise<void> {
  if (!currentImage || !cropOverlay) return;

  const rect = cropOverlay.getRect();
  let outputW: number;
  let outputH: number;

  if (currentPreset) {
    outputW = currentPreset.width;
    outputH = currentPreset.height;
  } else {
    outputW = widthInput.value ? parseInt(widthInput.value, 10) : Math.round(rect.width);
    outputH = heightInput.value ? parseInt(heightInput.value, 10) : Math.round(rect.height);
    if (outputW < 1 || outputH < 1 || isNaN(outputW) || isNaN(outputH)) {
      showError('Please enter valid dimensions.');
      return;
    }
  }

  try {
    const result = await cropImageCustom(currentImage, rect, outputW, outputH, currentPreset ?? undefined);
    showResult(result);
    destroyOverlay();
    currentPreset = null;
    presetHintEl.hidden = true;
    dimsRowEl.hidden = false;
    transitionTo('download');
  } catch {
    showError('Failed to crop image. Please try again.');
  }
}

function handleDimInputChange(): void {
  if (!cropOverlay || !aspectLocked) return;

  const w = parseInt(widthInput.value, 10);
  const h = parseInt(heightInput.value, 10);

  if (w > 0 && h > 0) {
    cropOverlay.setAspectRatio(w / h);
  }
}

function toggleAspectLock(): void {
  aspectLocked = !aspectLocked;
  aspectLockBtn.setAttribute('aria-pressed', aspectLocked.toString());

  if (cropOverlay) {
    if (aspectLocked) {
      const w = parseInt(widthInput.value, 10);
      const h = parseInt(heightInput.value, 10);
      if (w > 0 && h > 0) {
        cropOverlay.setAspectRatio(w / h);
      }
    } else {
      cropOverlay.setAspectRatio(null);
    }
  }
}

function resetApp(): void {
  destroyOverlay();
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = null;
  }
  currentImage = null;
  transitionTo('upload');
}

// --- Initialize ---

initDropzone(dropzone, fileInput, handleFile, showError);
renderPresets(presetsContainer, handlePreset, handleCustomClick);

// Navigation buttons
document.getElementById('change-image')!.addEventListener('click', () => {
  transitionTo('upload');
});

document.getElementById('crop-another')!.addEventListener('click', () => {
  destroyOverlay();
  transitionTo('crop');
});

document.getElementById('start-over')!.addEventListener('click', resetApp);

// Custom crop controls
document.getElementById('apply-custom-crop')!.addEventListener('click', handleApplyCustomCrop);

document.getElementById('cancel-custom-crop')!.addEventListener('click', () => {
  currentPreset = null;
  presetHintEl.hidden = true;
  dimsRowEl.hidden = false;
  destroyOverlay();
  transitionTo('crop');
});

aspectLockBtn.addEventListener('click', toggleAspectLock);

widthInput.addEventListener('input', handleDimInputChange);
heightInput.addEventListener('input', handleDimInputChange);

// Start in upload state
transitionTo('upload');
