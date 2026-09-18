import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge, CategoryBadge, PriorityBadge } from './ui/Badge';
import { formatDate } from '../lib/utils';
import { useStore } from '../store/useStore';

export interface ComplaintCardProps {
  complaint: {
    id: string;
    complaintId: string;
    category: string;
    description: string;
    location: string;
    status: string;
    priority?: string;
    createdAt: string;
    photos?: { url: string; type: string }[];
  };
  linkPrefix?: string;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint,
  linkPrefix = '/citizen/complaints',
}) => {
  const { language } = useStore();
  const photoUrl =
    complaint.photos && complaint.photos.length > 0
      ? complaint.photos[0].url
      : 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600';

  return (
    <div className="bg-white rounded-2xl border border-surface-container shadow-2xs hover:shadow-md transition-all p-4 flex flex-col justify-between group">
      <div>
        {/* Top bar: ID and Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-mono text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-md border border-primary/20">
            {complaint.complaintId}
          </span>
          <StatusBadge status={complaint.status} />
        </div>

        {/* Thumbnail & Info grid */}
        <div className="flex gap-3 mb-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container shrink-0 border border-surface-container">
            <img
              src={photoUrl}
              alt="Issue preview"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <CategoryBadge category={complaint.category} />
              {complaint.priority && <PriorityBadge priority={complaint.priority} />}
            </div>

            <p className="text-xs text-on-surface line-clamp-2 leading-relaxed">
              {complaint.description}
            </p>
          </div>
        </div>

        {/* Location & timestamp */}
        <div className="space-y-1 text-xs text-on-surface-variant border-t border-surface-container pt-2.5">
          <p className="flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
              location_on
            </span>
            <span className="truncate">{complaint.location}</span>
          </p>
          <p className="flex items-center gap-1 text-[11px]">
            <span className="material-symbols-outlined text-[14px] shrink-0">calendar_today</span>
            <span>{formatDate(complaint.createdAt)}</span>
          </p>
        </div>
      </div>

      {/* Action CTA */}
      <Link
        to={`${linkPrefix}/${complaint.id}`}
        className="mt-4 w-full py-2 px-3 rounded-xl bg-surface-container-low hover:bg-primary hover:text-white text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-1 text-center"
      >
        <span>{language === 'en' ? 'Track & View Details' : 'விவரங்களை காண்க'}</span>
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    </div>
  );
};
