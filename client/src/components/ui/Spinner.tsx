import { cn } from '../../utils/cn';

export function Spinner({ className, fullScreen }: { className?: string; fullScreen?: boolean }) {
  const spinner = (
    <svg className={cn('animate-spin h-6 w-6 text-primary-600', className)} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen">{spinner}</div>
    );
  }

  return spinner;
}
