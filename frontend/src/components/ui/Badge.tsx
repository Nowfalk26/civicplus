import React from 'react';
import { CATEGORY_INFO, STATUS_INFO, cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({
  status,
  className,
}) => {
  const { language } = useStore();
  const info = STATUS_INFO[status] || STATUS_INFO.SUBMITTED;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs',
        info.bg,
        info.text,
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: info.pinColor }}
      />
      <span>{language === 'en' ? info.labelEn : info.labelTa}</span>
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: string; className?: string }> = ({
  category,
  className,
}) => {
  const { language } = useStore();
  const info = CATEGORY_INFO[category] || CATEGORY_INFO.ROAD_DAMAGE;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border',
        info.badgeBg,
        className
      )}
    >
      <span className="material-symbols-outlined text-[15px]">{info.icon}</span>
      <span>{language === 'en' ? info.labelEn : info.labelTa}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string; className?: string }> = ({
  priority,
  className,
}) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    LOW: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', label: 'Low' },
    MEDIUM: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Medium' },
    HIGH: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'High' },
    CRITICAL: { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Critical' },
  };

  const p = map[priority] || map.MEDIUM;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider',
        p.bg,
        p.text,
        className
      )}
    >
      {p.label}
    </span>
  );
};

export const FraudScoreBadge: React.FC<{ score: number; showText?: boolean }> = ({
  score,
  showText = true,
}) => {
  let color = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let label = 'Low Risk (Genuine)';
  let icon = 'verified';

  if (score > 80) {
    color = 'bg-red-100 text-red-800 border-red-300 animate-pulse';
    label = 'Critical Fraud (Auto-Banned)';
    icon = 'gpp_bad';
  } else if (score > 50) {
    color = 'bg-orange-100 text-orange-800 border-orange-300';
    label = 'Suspicious Account';
    icon = 'warning';
  } else if (score > 20) {
    color = 'bg-amber-100 text-amber-800 border-amber-300';
    label = 'Flagged for Audit';
    icon = 'flag';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border',
        color
      )}
      title={`Fraud Points: ${score}/100`}
    >
      <span className="material-symbols-outlined text-[15px]">{icon}</span>
      <span>{score} pts</span>
      {showText && <span className="hidden sm:inline font-medium">({label})</span>}
    </span>
  );
};
