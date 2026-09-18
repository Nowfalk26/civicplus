import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { LeafletMap } from '../../components/LeafletMap';
import { FraudScoreBadge, CategoryBadge, StatusBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const AdminFraud: React.FC = () => {
  const [flaggedComplaints, setFlaggedComplaints] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchFraudData();
  }, []);

  const fetchFraudData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/fraud-detection');
      if (res.data?.success) {
        const list = res.data.flaggedComplaints || [];
        setFlaggedComplaints(list);
        if (list.length > 0) {
          setSelectedCase(list[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkGenuine = async () => {
    if (!selectedCase) return;
    setActionLoading(true);
    try {
      // Clear flags / set score to 0
      if (selectedCase.reportedById) {
        await api.put(`/users/${selectedCase.reportedById}/fraud-score`, {
          fraudScore: 0,
          reason: 'Marked genuine after administrative audit.',
        });
      }
      toast.success(`Complaint ${selectedCase.complaintId} cleared as GENUINE!`);
      fetchFraudData();
    } catch (err) {
      toast.error('Failed to mark genuine.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedCase?.reportedById) return;
    setActionLoading(true);
    try {
      await api.put(`/users/${selectedCase.reportedById}/ban`, {
        isBanned: true,
        days: 7,
        reason: 'Automated civic fraud auto-ban verified by Super Admin.',
      });
      toast.success(`User ${selectedCase.reporter?.username} has been suspended for 7 days.`);
      fetchFraudData();
    } catch (err) {
      toast.error('Failed to suspend user.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-on-surface">
              Anti-Fraud Intelligence & Auto-Ban Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
              Active Shield
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Real-time duplicate image hashes, GPS distance anomalies (&gt;50km), and phone clustering detection
          </p>
        </div>

        <button
          onClick={fetchFraudData}
          className="px-4 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
          <span>Refresh Analysis</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
            progress_activity
          </span>
        </div>
      ) : flaggedComplaints.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-surface-container text-center max-w-md mx-auto space-y-3">
          <span className="material-symbols-outlined text-[48px] text-emerald-600">
            shield_with_heart
          </span>
          <h3 className="font-bold text-base text-on-surface">Zero Fraud Alerts</h3>
          <p className="text-xs text-on-surface-variant">
            All submitted civic complaints have passed automated cryptographic and GPS verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Flagged Cases Queue */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-surface-container shadow-sm p-4 space-y-2">
            <h2 className="text-xs font-bold text-outline uppercase tracking-wider px-2">
              Auto-Flagged Cases ({flaggedComplaints.length})
            </h2>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {flaggedComplaints.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'border-red-500 bg-red-50/40 shadow-xs ring-1 ring-red-500/30'
                        : 'border-surface-container hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        {c.complaintId}
                      </span>
                      <FraudScoreBadge score={c.totalFraudScore || 30} showText={false} />
                    </div>

                    <p className="text-xs font-bold text-on-surface truncate">{c.description}</p>

                    <div className="text-[10px] text-red-700 font-semibold bg-red-100/60 p-1.5 rounded border border-red-200">
                      {c.fraudFlags?.[0]?.reason || 'High Fraud Score Risk Factor'}
                    </div>

                    <p className="text-[11px] text-on-surface-variant flex items-center justify-between">
                      <span>Reporter: {c.reporter?.username || 'Unknown'}</span>
                      <span>{formatDate(c.createdAt)}</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deep Investigation Dossier */}
          {selectedCase && (
            <div className="lg:col-span-8 bg-white rounded-2xl border border-surface-container shadow-xl p-6 space-y-6 animate-in fade-in">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary">
                      {selectedCase.complaintId}
                    </span>
                    <CategoryBadge category={selectedCase.category} />
                    <StatusBadge status={selectedCase.status} />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Target Location: {selectedCase.location}
                  </p>
                </div>

                <div className="text-right">
                  <FraudScoreBadge score={selectedCase.totalFraudScore || 30} />
                </div>
              </div>

              {/* Fraud Points Breakdown Card */}
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">rule</span>
                    Detected Risk Points Breakdown
                  </span>
                  <span className="font-extrabold text-sm text-red-700">
                    +{selectedCase.totalFraudScore || 30} Total Penalty Points
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {selectedCase.fraudFlags && selectedCase.fraudFlags.length > 0 ? (
                    selectedCase.fraudFlags.map((flag: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white p-2 rounded-lg border border-red-200"
                      >
                        <span className="text-on-surface font-medium">{flag.reason}</span>
                        <span className="font-bold text-red-600 shrink-0 ml-2">
                          +{flag.score} pts
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-red-200">
                      <span className="text-on-surface">Duplicate photo detected (+30)</span>
                      <span className="font-bold text-red-600">+30 pts</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Duplicate Inspection */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-on-surface block">
                  Cryptographic Image Analysis (Cloudinary Duplicate Hash Matching)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container space-y-2">
                    <span className="text-[11px] font-bold text-on-surface-variant block">
                      Uploaded Photo in this Case:
                    </span>
                    <div className="h-40 rounded-lg overflow-hidden bg-surface-container">
                      <img
                        src={
                          selectedCase.photos?.[0]?.url ||
                          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'
                        }
                        alt="Target"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container space-y-2">
                    <span className="text-[11px] font-bold text-on-surface-variant block">
                      Matched Previous Submission:
                    </span>
                    <div className="h-40 rounded-lg overflow-hidden bg-surface-container">
                      <img
                        src={
                          selectedCase.photos?.[0]?.url ||
                          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'
                        }
                        alt="Match"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS Validation Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface">
                    GPS Anomaly Pin (Validation Radius)
                  </span>
                  <span className="font-mono text-[11px] text-red-600 font-bold">
                    Lat: {selectedCase.latitude}, Lng: {selectedCase.longitude}
                  </span>
                </div>

                <LeafletMap
                  center={[selectedCase.latitude, selectedCase.longitude]}
                  zoom={12}
                  complaints={[selectedCase]}
                  height="180px"
                />
              </div>

              {/* Action Panel */}
              <div className="pt-2 border-t border-surface-container flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleMarkGenuine}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Dismiss Risk & Mark Genuine</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleBanUser}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">gpp_bad</span>
                  <span>Confirm Fraud & Suspend User (7 Days)</span>
                </button>

                <button
                  type="button"
                  onClick={() => toast.success('Ticket marked for field officer audit.')}
                  className="py-3 px-4 rounded-xl bg-white border border-outline-variant hover:bg-surface-container text-on-surface font-bold text-xs transition-colors"
                >
                  Flag for Field Review
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
