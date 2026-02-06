export function initDropzone(
  dropzone: HTMLElement,
  fileInput: HTMLInputElement,
  onFile: (file: File) => void,
  onError: (message: string) => void
): void {
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB

  function handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      onError('Please drop an image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > MAX_SIZE) {
      onError('Image is too large. Please use an image under 20MB.');
      return;
    }
    onFile(file);
  }

  // Prevent default browser drag behavior on the whole document
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((evt) => {
    document.addEventListener(evt, (e) => e.preventDefault());
  });

  // Visual feedback on drag
  dropzone.addEventListener('dragover', () => dropzone.classList.add('drag-over'));
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

  // Handle drop
  dropzone.addEventListener('drop', (e: DragEvent) => {
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  });

  // Handle click-to-browse
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
    fileInput.value = ''; // Reset so same file can be re-selected
  });
}
