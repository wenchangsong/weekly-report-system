import { useUIStore } from '../../stores/uiStore';
import { cn } from '../../utils/cn';

const iconMap = {
  success: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l4 4 8-8" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l10 10M14 4L4 14" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5v.01M9 9v4" />
    </svg>
  ),
};

const colorMap = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-lg border shadow-elevated text-sm font-medium animate-slide-in',
            colorMap[toast.type]
          )}
        >
          {iconMap[toast.type]}
          <span>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-60 hover:opacity-100">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l8 8M11 3L3 11" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
