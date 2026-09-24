import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/ui/Badge';
import { TimelineView } from '../../components/TimelineView';
import { PhotoSlider } from '../../components/PhotoSlider';
import { LeafletMap } from '../../components/LeafletMap';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const ComplaintDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useStore();
  const [complaint, setComplaint] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDetail(id);
    }
  }, [id]);

  const fetchDetail = async (complaintId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/complaints/${complaintId}`);
      if (res.data?.success && res.data?.complaint) {
        setComplaint(res.data.complaint);
      }
    } catch (err) {
      toast.error('Failed to load complaint details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
          progress_activity
        </span>
        <p className="text-xs text-on-surface-variant">Loading complaint file...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <span className="material-symbols-outlined text-outline text-[48px]">warning</span>
        <h2 className="text-lg font-bold text-on-surface">Complaint Not Found</h2>
        <p className="text-xs text-on-surface-variant">
          The requested complaint does not exist or has been archived.
        </p>
        <Link
          to="/citizen/dashboard"
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Find before and after photos if available
  const beforePhoto =
    complaint.photos?.find((p: any) => p.type === 'BEFORE')?.url ||
    complaint.photos?.[0]?.url ||
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800';

  const afterPhoto =
    complaint.photos?.find((p: any) => p.type === 'AFTER')?.url ||
    (complaint.status === 'RESOLVED'
      ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800'
      : null);

  const shareText = encodeURIComponent(
    `Civic+ TN: Track civic issue #${complaint.complaintId} (${complaint.category}) in ${complaint.location}. Status: ${complaint.status}`
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/citizen/complaints"
            className="p-2 rounded-xl bg-white border border-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-mono font-bold text-on-surface">
                {complaint.complaintId}
              </h1>
              <StatusBadge status={complaint.status} />
              {complaint.priority && <PriorityBadge priority={complaint.priority} />}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Reported on {formatDate(complaint.createdAt)} • {complaint.location}
            </p>
          </div>
        </div>

        {/* Action Buttons: Track, Share & Escalate */}
        <div className="flex items-center gap-2">
          <Link
            to={`/citizen/complaints/${complaint._id || complaint.id}/track`}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            <span>Track Progress</span>
          </Link>

          <a
            href={`https://api.whatsapp.com/send?text=${shareText}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">share</span>
            <span>Share</span>
          </a>

          <button
            onClick={() => toast.success('Complaint escalated to District Collectorate.')}
            className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container text-on-surface font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">priority_high</span>
            <span>Escalate</span>
          </button>
        </div>
      </div>

      {/* Grid: Photo & Map Showcase Left, Lifecycle Timeline Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Photos, Map, Description) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Photo Slider or Before/Evidence Gallery */}
          <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">photo_library</span>
                {afterPhoto ? 'Before & After Verification' : 'Site Photographic Evidence'}
              </h2>
              <span className="text-[11px] text-on-surface-variant">
                {complaint.photos?.length || 1} photo(s) on file
              </span>
            </div>

            {afterPhoto ? (
              <PhotoSlider
                beforeUrl={beforePhoto}
                afterUrl={afterPhoto}
                className="h-80 sm:h-96"
              />
            ) : (
              <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-surface-container border border-surface-container">
                <img
                  src={beforePhoto}
                  alt="Complaint Evidence"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 text-white font-bold text-xs rounded-lg backdrop-blur-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-amber-400">photo_camera</span>
                  Original Evidence Photo • அசல் புகைப்படம்
                </div>
              </div>
            )}
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                Issue Statement & Details
              </h2>
              <CategoryBadge category={complaint.category} />
            </div>
            <p className="text-sm text-on-surface leading-relaxed p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
              {complaint.description}
            </p>

            {complaint.rejectionReason && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  Rejection Justification:
                </p>
                <p>{complaint.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Location Map View */}
          <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">pin_drop</span>
                Precise GPS Coordinates
              </h2>
              <span className="font-mono text-xs text-primary font-semibold">
                {complaint.latitude?.toFixed(4)}, {complaint.longitude?.toFixed(4)}
              </span>
            </div>

            <LeafletMap
              center={[complaint.latitude, complaint.longitude]}
              zoom={14}
              complaints={[complaint]}
              height="240px"
            />
          </div>
        </div>

        {/* Right Column: Timeline & Assigned Officer */}
        <div className="space-y-6">
          {/* Assigned Officer Card */}
          <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
            <h2 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">engineering</span>
              Assigned Field Authority
            </h2>

            {complaint.assignedTo ? (
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-3">
                <img
                  src={
                    complaint.assignedTo.avatarUrl ||
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
                  }
                  alt={complaint.assignedTo.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-2xs"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">
                    {complaint.assignedTo.username}
                  </p>
                  <p className="text-[11px] text-primary font-semibold">
                    {complaint.assignedTo.location} Municipal Works
                  </p>
                  <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">phone</span>
                    {complaint.assignedTo.phone}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container text-center space-y-1">
                <span className="material-symbols-outlined text-[24px] text-on-surface-variant">
                  pending_actions
                </span>
                <p className="text-xs font-bold text-on-surface">Queue Dispatch Pending</p>
                <p className="text-[11px] text-on-surface-variant">
                  Complaint is in automated triage for officer assignment.
                </p>
              </div>
            )}
          </div>

          {/* Lifecycle Timeline */}
          <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">timeline</span>
              Resolution Lifecycle
            </h2>

            <TimelineView
              timeline={complaint.timeline || []}
              currentStatus={complaint.status}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
