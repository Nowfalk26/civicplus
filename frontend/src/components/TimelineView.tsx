import React from 'react';
import { formatDate, STATUS_INFO } from '../lib/utils';
import { useStore } from '../store/useStore';

export interface TimelineItem {
  id: string;
  stage: string;
  timestamp: string;
  officerName?: string | null;
  notes?: string | null;
}

interface TimelineViewProps {
  timeline: TimelineItem[];
  currentStatus: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ timeline, currentStatus }) => {
  const { language } = useStore();

  const stageOrder = ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

  return (
    <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
      {timeline.map((item, idx) => {
        const isCurrent = item.stage === currentStatus;
        const statusMeta = STATUS_INFO[item.stage] || STATUS_INFO.SUBMITTED;

        return (
          <div key={item.id || idx} className="relative group">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-transform ${
                isCurrent ? 'scale-125 ring-4 ring-primary/20' : ''
              }`}
              style={{ backgroundColor: statusMeta.pinColor }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>

            {/* Stage content */}
            <div className="bg-white p-4 rounded-xl border border-surface-container shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span
                  className="font-bold text-sm tracking-tight"
                  style={{ color: statusMeta.pinColor }}
                >
                  {language === 'en' ? statusMeta.labelEn : statusMeta.labelTa}
                </span>
                <span className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {formatDate(item.timestamp)}
                </span>
              </div>

              {item.officerName && (
                <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">badge</span>
                  Officer: {item.officerName}
                </p>
              )}

              {item.notes && (
                <p className="text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-surface-container leading-relaxed">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
