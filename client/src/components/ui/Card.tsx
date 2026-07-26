import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-surface-200 shadow-card p-6',
        onClick && 'cursor-pointer hover:shadow-elevated transition-shadow duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}
