import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PhotoSlider } from '../../components/PhotoSlider';
import { StatusBadge, CategoryBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const OfficerVerify: React.FC = () => {
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints?limit=50');
      if (res.data?.success) {
        // Filter tickets that are in progress or resolved needing audit
        const tickets = (res.data.complaints || []).filter(
          (c: any) => c.status === 'IN_PROGRESS' || c.status === 'RESOLVED'
        );
        setPendingVerifications(tickets);
        if (tickets.length > 0) {
          setSelectedTicket(tickets[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuditAction = async (status: 'RESOLVED' | 'IN_PROGRESS' | 'REJECTED') => {
    if (!selectedTicket) return;
    setProcessing(true);
    try {
      const res = await api.post(`/complaints/${selectedTicket.id}/status`, {
        status,
        notes: auditNotes || `Verification completed with action: ${status}`,
      });

      if (res.data?.success) {
        toast.success(`Verification action '${status}' applied successfully!`);
        setAuditNotes('');
        fetchTickets();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification update failed.');
    } finally {
      setProcessing(false);
    }
  };

  const beforePhoto =
    selectedTicket?.photos?.find((p: any) => p.type === 'BEFORE')?.url ||
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800';

  const afterPhoto =
    selectedTicket?.photos?.find((p: any) => p.type === 'AFTER')?.url ||
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Resolution Verification Desk</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Inspect field completion before final sign-off and citizen resolution certificate release
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
            progress_activity
          </span>
        </div>
      ) : pendingVerifications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-surface-container text-center max-w-md mx-auto space-y-3">
          <span className="material-symbols-outlined text-[48px] text-emerald-600">
            check_circle
          </span>
          <h3 className="font-bold text-base text-on-surface">All Verifications Cleared</h3>
          <p className="text-xs text-on-surface-variant">
            No completed field works are currently pending verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Tickets Queue */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-surface-container shadow-sm p-4 space-y-2">
            <h2 className="text-xs font-bold text-outline uppercase tracking-wider px-2">
              Queue for Sign-Off ({pendingVerifications.length})
            </h2>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {pendingVerifications.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                      isSelected
                        ? 'border-primary bg-primary-light/50 shadow-xs'
                        : 'border-surface-container hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        {t.complaintId}
                      </span>
                      <StatusBadge status={t.status} />
                    </div>

                    <p className="text-xs font-bold text-on-surface truncate">{t.description}</p>
                    <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">location_on</span>
                      <span className="truncate">{t.location}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Detailed Verification Suite */}
          {selectedTicket && (
            <div className="lg:col-span-8 bg-white rounded-2xl border border-surface-container shadow-xl p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary">
                      {selectedTicket.complaintId}
                    </span>
                    <CategoryBadge category={selectedTicket.category} />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Filed on {formatDate(selectedTicket.createdAt)} • {selectedTicket.location}
                  </p>
                </div>

                <StatusBadge status={selectedTicket.status} />
              </div>

              {/* Interactive Before/After Photo Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                  <span>Interactive Before / After Slider (Drag Center Divider)</span>
                  <span className="text-emerald-700">Slide to compare repair work</span>
                </div>

                <PhotoSlider
                  beforeUrl={beforePhoto}
                  afterUrl={afterPhoto}
                  className="h-80 sm:h-96"
                />
              </div>

              {/* Citizen Description & Officer Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container space-y-1">
                  <span className="font-bold text-on-surface">Citizen Original Complaint:</span>
                  <p className="text-on-surface-variant leading-relaxed">
                    {selectedTicket.description}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container space-y-1">
                  <span className="font-bold text-on-surface">Audit Sign-Off Feedback:</span>
                  <textarea
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Enter audit notes for the engineering team..."
                    rows={3}
                    className="w-full p-2 rounded-lg border border-outline-variant bg-white text-xs outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>

              {/* 3 Action Buttons */}
              <div className="pt-2 border-t border-surface-container flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAuditAction('RESOLVED')}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Approve & Mark Resolved</span>
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAuditAction('IN_PROGRESS')}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">replay</span>
                  <span>Request More Work / Photo</span>
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleAuditAction('REJECTED')}
                  className="py-3 px-4 rounded-xl bg-white border border-red-300 hover:bg-red-50 text-red-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  <span>Reject Resolution</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
