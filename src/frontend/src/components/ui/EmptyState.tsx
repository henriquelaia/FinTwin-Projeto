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
        style={{ background: 'rgba(73,62,229,0.08)' }}
      >
        <Icon className="w-8 h-8 text-[#493ee5]" />
      </div>
      <h3 className="text-base font-semibold text-[#101c29] mb-1">{title}</h3>
      <p className="text-sm text-[#464555]/70 max-w-xs mb-6">{description}</p>
      {action && (
        <GlassButton onClick={action.onClick} size="sm">
          {action.label}
        </GlassButton>
      )}
    </div>
  );
}
