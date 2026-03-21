let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText =
      'position:fixed;top:calc(var(--header-height) + 8px);left:50%;transform:translateX(-50%);z-index:300;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:90vw';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000): void {
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const bgColors = {
    success: '#388E3C',
    error: '#d32f2f',
    info: '#455A64',
  };

  toast.style.cssText = `
    background:${bgColors[type]};
    color:#fff;
    padding:10px 20px;
    border-radius:var(--radius-sm);
    font-size:0.875rem;
    font-family:var(--font-family);
    box-shadow:var(--shadow-md);
    pointer-events:auto;
    animation:toastIn 0.2s ease-out;
    max-width:100%;
    text-align:center;
  `;
  toast.textContent = message;

  getContainer().appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.2s ease-in forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// Inject keyframes once
const style = document.createElement('style');
style.textContent = `
  @keyframes toastIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes toastOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(-8px); } }
`;
document.head.appendChild(style);
