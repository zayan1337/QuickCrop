import type { CropRect } from './types';

type DragMode = 'none' | 'move' | 'resize' | 'new';
type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Handle {
  id: HandleId;
  x: number;
  y: number;
}

export interface CropOverlay {
  setAspectRatio(ratio: number | null): void;
  setRect(rect: CropRect): void;
  getRect(): CropRect;
  destroy(): void;
}

interface CropOverlayOptions {
  container: HTMLElement;
  image: HTMLImageElement;
  onChange: (rect: CropRect) => void;
}

const HANDLE_SIZE = 8;
const HANDLE_HIT = 14; // larger hit area for touch
const MIN_SIZE = 20;

export function createCropOverlay(options: CropOverlayOptions): CropOverlay {
  const { container, image, onChange } = options;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.cursor = 'crosshair';
  container.appendChild(canvas);

  let scale = 1;
  let rect: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  let aspectRatio: number | null = null;
  let dragMode: DragMode = 'none';
  let activeHandle: HandleId | null = null;
  let dragStart = { x: 0, y: 0 };
  let rectStart: CropRect = { x: 0, y: 0, width: 0, height: 0 };

  function updateScale(): void {
    const displayW = image.clientWidth;
    const displayH = image.clientHeight;
    if (displayW === 0 || displayH === 0) return;
    canvas.width = displayW;
    canvas.height = displayH;
    canvas.style.width = displayW + 'px';
    canvas.style.height = displayH + 'px';
    scale = image.naturalWidth / displayW;
  }

  function initRect(): void {
    // Start with 80% centered rectangle
    const margin = 0.1;
    rect = {
      x: image.naturalWidth * margin,
      y: image.naturalHeight * margin,
      width: image.naturalWidth * (1 - 2 * margin),
      height: image.naturalHeight * (1 - 2 * margin),
    };
    if (aspectRatio) {
      constrainToAspect();
    }
  }

  function constrainToAspect(): void {
    if (!aspectRatio) return;
    const currentAspect = rect.width / rect.height;
    if (currentAspect > aspectRatio) {
      // too wide, shrink width
      const newW = rect.height * aspectRatio;
      rect.x += (rect.width - newW) / 2;
      rect.width = newW;
    } else {
      // too tall, shrink height
      const newH = rect.width / aspectRatio;
      rect.y += (rect.height - newH) / 2;
      rect.height = newH;
    }
    clampRect();
  }

  function clampRect(): void {
    // Enforce minimum size
    rect.width = Math.max(MIN_SIZE, rect.width);
    rect.height = Math.max(MIN_SIZE, rect.height);
    // Keep within image bounds
    rect.x = Math.max(0, Math.min(rect.x, image.naturalWidth - rect.width));
    rect.y = Math.max(0, Math.min(rect.y, image.naturalHeight - rect.height));
    rect.width = Math.min(rect.width, image.naturalWidth - rect.x);
    rect.height = Math.min(rect.height, image.naturalHeight - rect.y);
  }

  function toDisplay(r: CropRect): CropRect {
    return {
      x: r.x / scale,
      y: r.y / scale,
      width: r.width / scale,
      height: r.height / scale,
    };
  }

  function getHandles(dr: CropRect): Handle[] {
    const cx = dr.x + dr.width / 2;
    const cy = dr.y + dr.height / 2;
    return [
      { id: 'nw', x: dr.x, y: dr.y },
      { id: 'n', x: cx, y: dr.y },
      { id: 'ne', x: dr.x + dr.width, y: dr.y },
      { id: 'e', x: dr.x + dr.width, y: cy },
      { id: 'se', x: dr.x + dr.width, y: dr.y + dr.height },
      { id: 's', x: cx, y: dr.y + dr.height },
      { id: 'sw', x: dr.x, y: dr.y + dr.height },
      { id: 'w', x: dr.x, y: cy },
    ];
  }

  function render(): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const dr = toDisplay(rect);

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, w, h);

    // Clear crop region to reveal image
    ctx.clearRect(dr.x, dr.y, dr.width, dr.height);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(dr.x, dr.y, dr.width, dr.height);

    // Rule-of-thirds (during drag)
    if (dragMode !== 'none') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        const xLine = dr.x + (dr.width * i) / 3;
        const yLine = dr.y + (dr.height * i) / 3;
        ctx.beginPath();
        ctx.moveTo(xLine, dr.y);
        ctx.lineTo(xLine, dr.y + dr.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dr.x, yLine);
        ctx.lineTo(dr.x + dr.width, yLine);
        ctx.stroke();
      }
    }

    // Handles
    const handles = getHandles(dr);
    const half = HANDLE_SIZE / 2;
    for (const handle of handles) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(handle.x - half, handle.y - half, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(handle.x - half, handle.y - half, HANDLE_SIZE, HANDLE_SIZE);
    }
  }

  function hitTest(px: number, py: number): { mode: DragMode; handle: HandleId | null } {
    const dr = toDisplay(rect);
    const handles = getHandles(dr);
    const halfHit = HANDLE_HIT / 2;

    // Check handles first
    for (const h of handles) {
      if (Math.abs(px - h.x) <= halfHit && Math.abs(py - h.y) <= halfHit) {
        return { mode: 'resize', handle: h.id };
      }
    }

    // Check inside rect
    if (px >= dr.x && px <= dr.x + dr.width && py >= dr.y && py <= dr.y + dr.height) {
      return { mode: 'move', handle: null };
    }

    // Outside: start new selection
    return { mode: 'new', handle: null };
  }

  function getCursorForHandle(handle: HandleId): string {
    const cursors: Record<HandleId, string> = {
      nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
      se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
    };
    return cursors[handle];
  }

  function onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);

    const canvasRect = canvas.getBoundingClientRect();
    const px = e.clientX - canvasRect.left;
    const py = e.clientY - canvasRect.top;

    const hit = hitTest(px, py);
    dragMode = hit.mode;
    activeHandle = hit.handle;
    dragStart = { x: px, y: py };
    rectStart = { ...rect };

    if (dragMode === 'new') {
      // Start new rectangle at pointer position
      rect = {
        x: px * scale,
        y: py * scale,
        width: MIN_SIZE,
        height: MIN_SIZE,
      };
      activeHandle = 'se';
      dragMode = 'resize';
      rectStart = { ...rect };
    }

    if (activeHandle) {
      canvas.style.cursor = getCursorForHandle(activeHandle);
    } else if (dragMode === 'move') {
      canvas.style.cursor = 'grabbing';
    }

    render();
  }

  function onPointerMove(e: PointerEvent): void {
    if (dragMode === 'none') {
      // Update cursor on hover
      const canvasRect = canvas.getBoundingClientRect();
      const px = e.clientX - canvasRect.left;
      const py = e.clientY - canvasRect.top;
      const hit = hitTest(px, py);
      if (hit.handle) {
        canvas.style.cursor = getCursorForHandle(hit.handle);
      } else if (hit.mode === 'move') {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = 'crosshair';
      }
      return;
    }

    e.preventDefault();
    const canvasRect = canvas.getBoundingClientRect();
    const px = e.clientX - canvasRect.left;
    const py = e.clientY - canvasRect.top;
    const dx = (px - dragStart.x) * scale;
    const dy = (py - dragStart.y) * scale;

    if (dragMode === 'move') {
      rect.x = rectStart.x + dx;
      rect.y = rectStart.y + dy;
      clampRect();
    } else if (dragMode === 'resize' && activeHandle) {
      applyResize(activeHandle, dx, dy);
    }

    render();
    onChange(rect);
  }

  function applyResize(handle: HandleId, dx: number, dy: number): void {
    const s = rectStart;

    // Calculate new edges based on which handle is dragged
    let left = s.x;
    let top = s.y;
    let right = s.x + s.width;
    let bottom = s.y + s.height;

    if (handle.includes('w')) left = s.x + dx;
    if (handle.includes('e')) right = s.x + s.width + dx;
    if (handle.includes('n')) top = s.y + dy;
    if (handle.includes('s')) bottom = s.y + s.height + dy;

    // Ensure minimum size
    if (right - left < MIN_SIZE) {
      if (handle.includes('w')) left = right - MIN_SIZE;
      else right = left + MIN_SIZE;
    }
    if (bottom - top < MIN_SIZE) {
      if (handle.includes('n')) top = bottom - MIN_SIZE;
      else bottom = top + MIN_SIZE;
    }

    rect.x = left;
    rect.y = top;
    rect.width = right - left;
    rect.height = bottom - top;

    // Apply aspect ratio constraint
    if (aspectRatio) {
      const currentAspect = rect.width / rect.height;
      if (handle === 'n' || handle === 's') {
        // Vertical-only handles: adjust width based on height
        rect.width = rect.height * aspectRatio;
        // Re-center horizontally relative to start center
        const startCenterX = s.x + s.width / 2;
        rect.x = startCenterX - rect.width / 2;
      } else if (handle === 'e' || handle === 'w') {
        // Horizontal-only handles: adjust height based on width
        rect.height = rect.width / aspectRatio;
        const startCenterY = s.y + s.height / 2;
        rect.y = startCenterY - rect.height / 2;
      } else {
        // Corner handles: use the dominant axis
        if (currentAspect > aspectRatio) {
          // Width dominant: adjust width to match
          rect.width = rect.height * aspectRatio;
          if (handle.includes('w')) rect.x = right - rect.width;
        } else {
          // Height dominant: adjust height to match
          rect.height = rect.width / aspectRatio;
          if (handle.includes('n')) rect.y = bottom - rect.height;
        }
      }
    }

    clampRect();
  }

  function onPointerUp(e: PointerEvent): void {
    if (dragMode === 'none') return;
    canvas.releasePointerCapture(e.pointerId);
    dragMode = 'none';
    activeHandle = null;
    canvas.style.cursor = 'crosshair';
    render();
    onChange(rect);
  }

  // ResizeObserver
  const resizeObserver = new ResizeObserver(() => {
    updateScale();
    render();
  });
  resizeObserver.observe(container);

  // Attach events
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);

  // Initialize once image is loaded
  function init(): void {
    updateScale();
    initRect();
    render();
    onChange(rect);
  }

  if (image.complete && image.naturalWidth > 0) {
    // Use rAF to ensure layout has settled
    requestAnimationFrame(init);
  } else {
    image.addEventListener('load', init, { once: true });
  }

  return {
    setAspectRatio(ratio: number | null): void {
      aspectRatio = ratio;
      if (ratio) {
        constrainToAspect();
        render();
        onChange(rect);
      }
    },

    setRect(newRect: CropRect): void {
      rect = { ...newRect };
      clampRect();
      render();
      onChange(rect);
    },

    getRect(): CropRect {
      return { ...rect };
    },

    destroy(): void {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    },
  };
}
