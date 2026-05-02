import type { LucideIcon } from 'lucide-react';
import { GlassButton } from './GlassButton';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(201,162,39,0.08)' }}
      >
        <Icon className="w-8 h-8" style={{ color: 'var(--gold)' }} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--ink-900)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--ink-500)' }}>
        {description}
      </p>
      {action && (
        <GlassButton onClick={action.onClick} size="sm">
          {action.label}
        </GlassButton>
      )}
    </div>
  );
}
