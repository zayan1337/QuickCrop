import type { AppState, Preset, CropResult } from './types';
import { PRESETS } from './presets';

const sections: Record<AppState, string> = {
  upload: 'upload-section',
  crop: 'crop-section',
  'custom-crop': 'custom-crop-section',
  download: 'download-section',
};

export function transitionTo(state: AppState): void {
  Object.entries(sections).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (key === state) {
      el.removeAttribute('hidden');
      // Trigger reflow then add active for animation
      requestAnimationFrame(() => {
        el.classList.add('active');
      });
    } else {
      el.classList.remove('active');
      el.setAttribute('hidden', '');
    }
  });
}

export function showPreview(objectUrl: string): void {
  const img = document.getElementById('preview-image') as HTMLImageElement;
  img.src = objectUrl;
}

export function showCustomCropImage(objectUrl: string): void {
  const img = document.getElementById('crop-overlay-image') as HTMLImageElement;
  img.src = objectUrl;
}

export function renderPresets(
  container: HTMLElement,
  onPresetClick: (preset: Preset) => void,
  onCustomClick: () => void
): void {
  container.innerHTML = '';
  PRESETS.forEach((preset) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Crop to ${preset.name} (${preset.width}\u00D7${preset.height})`);
    btn.innerHTML = `
      <span class="preset-platform">${preset.name}</span>
      <span class="preset-dims">${preset.width} \u00D7 ${preset.height}</span>
    `;
    btn.addEventListener('click', () => onPresetClick(preset));
    container.appendChild(btn);
  });

  // Custom crop button — spans full width
  const customBtn = document.createElement('button');
  customBtn.className = 'preset-btn preset-btn--custom';
  customBtn.type = 'button';
  customBtn.setAttribute('aria-label', 'Custom crop with manual dimensions');
  customBtn.innerHTML = `
    <span class="preset-platform">Custom</span>
    <span class="preset-dims">Any size</span>
  `;
  customBtn.addEventListener('click', onCustomClick);
  container.appendChild(customBtn);
}

export function showResult(result: CropResult): void {
  const img = document.getElementById('result-image') as HTMLImageElement;
  img.src = result.objectUrl;

  const dims = document.getElementById('result-dims');
  if (dims) dims.textContent = `${result.width} \u00D7 ${result.height} px`;

  const link = document.getElementById('download-link') as HTMLAnchorElement;
  link.href = result.objectUrl;
  link.download = result.filename;
}

export function showError(message: string): void {
  // Create a toast-style error that auto-dismisses
  const existing = document.querySelector('.toast-error');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-error';
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
