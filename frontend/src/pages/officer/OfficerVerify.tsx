import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PhotoSlider } from '../../components/PhotoSlider';
import { StatusBadge, CategoryBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const OfficerVerify: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    fetchVerificationReports();
  }, [verificationFilter]);

  const fetchVerificationReports = async () => {
    setLoading(true);
    try {
      const url =
        verificationFilter === 'ALL'
          ? '/complaints?limit=100'
          : `/complaints?verificationStatus=${verificationFilter}&limit=100`;

      const res = await api.get(url);
      if (res.data?.success) {
        const list = res.data.complaints || [];
        setReports(list);
        if (list.length > 0) {
          setSelectedReport((prev: any) => {
            const found = list.find((r: any) => r.id === prev?.id);
            return found || list[0];
          });
        } else {
          setSelectedReport(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load verification reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (decision: 'GENUINE' | 'FAKE' | 'NEEDS_REVIEW') => {
    if (!selectedReport) return;
    setProcessing(true);
    try {
      const res = await api.post(`/complaints/${selectedReport.id}/verify`, {
        verificationResult: decision,
        verificationNotes: auditNotes || `Officer verification marked as ${decision}`,
        progressStatus: decision === 'GENUINE' ? 'IN_PROGRESS' : undefined,
      });

      if (res.data?.success) {
        toast.success(`Report ${selectedReport.complaintId} marked as ${decision}! Stored in MongoDB.`);
        setAuditNotes('');
        fetchVerificationReports();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification update failed.');
    } finally {
      setProcessing(false);
    }
  };

  const getVerificationBadge = (vStatus: string) => {
    switch (vStatus) {
      case 'GENUINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            GENUINE
          </span>
        );
      case 'FAKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            FAKE
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="material-symbols-outlined text-[14px]">pending_actions</span>
            NEEDS REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            PENDING VERIFICATION
          </span>
        );
    }
  };

  const photos = selectedReport?.photos || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Report Verification Desk
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Officer Inspection Authority
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Review submitted civic evidence, inspect geo-locations, and verify whether reports are Genuine, Fake, or Need Review.
          </p>
        </div>

        <button
          onClick={fetchVerificationReports}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container-low font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <span className={`material-symbols-outlined text-[16px] text-primary ${loading ? 'animate-spin' : ''}`}>sync</span>
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-container pb-3 text-xs">
        {['ALL', 'PENDING_VERIFICATION', 'GENUINE', 'FAKE', 'NEEDS_REVIEW'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setVerificationFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              verificationFilter === tab
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined animate-spin text-primary text-[36px]">
            progress_activity
          </span>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-surface-container text-center max-w-md mx-auto space-y-3 shadow-xs">
          <span className="material-symbols-outlined text-[48px] text-emerald-600">
            check_circle
          </span>
          <h3 className="font-bold text-base text-on-surface">Queue Cleared</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            No civic reports currently match this verification criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Reports Queue */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-surface-container shadow-xs p-4 space-y-2 max-h-[700px] overflow-y-auto">
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-2">
              Verification Queue ({reports.length})
            </h2>

            <div className="space-y-2 mt-2">
              {reports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-surface-container hover:border-outline-variant bg-surface-container-lowest'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary font-mono">{r.complaintId}</span>
                      {getVerificationBadge(r.verificationStatus || 'PENDING_VERIFICATION')}
                    </div>

                    <p className="font-semibold text-on-surface line-clamp-1">{r.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1 border-t border-surface-container/60">
                      <span>{r.location}</span>
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Verification Inspection Details */}
          {selectedReport && (
            <div className="lg:col-span-7 bg-white rounded-2xl border border-surface-container shadow-xs p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-container pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-on-surface">{selectedReport.complaintId}</h2>
                    <CategoryBadge category={selectedReport.category} />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Reported by: <span className="font-bold text-on-surface">{selectedReport.reportedById?.name || selectedReport.reportedById?.username || 'Civic Resident'}</span>
                    {selectedReport.reportedById?.accountNumber && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded bg-surface-container text-primary font-mono text-[10px] font-bold">
                        {selectedReport.reportedById.accountNumber}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  {getVerificationBadge(selectedReport.verificationStatus || 'PENDING_VERIFICATION')}
                </div>
              </div>

              {/* Description & Location */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">Citizen Description</span>
                  <p className="text-on-surface mt-1 leading-relaxed">{selectedReport.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-surface-container-low">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Location</span>
                    <p className="font-semibold text-on-surface mt-0.5">{selectedReport.location}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container-low">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Submitted At</span>
                    <p className="font-semibold text-on-surface mt-0.5">{formatDate(selectedReport.createdAt)}</p>
                  </div>
                </div>

                {/* Evidence Photos */}
                {photos.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Submitted Photo Evidence ({photos.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {photos.map((p: any, idx: number) => (
                        <a
                          key={idx}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-xl overflow-hidden border border-surface-container aspect-video hover:opacity-95"
                        >
                          <img src={p.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification History Log */}
                {selectedReport.verifiedByName && (
                  <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container space-y-1">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Last Verification Audit</span>
                    <p className="text-on-surface">
                      Decision: <span className="font-bold">{selectedReport.verificationStatus}</span> by {selectedReport.verifiedByName} on {formatDate(selectedReport.verifiedAt)}
                    </p>
                    {selectedReport.verificationNotes && (
                      <p className="text-on-surface-variant text-[11px] italic">
                        Notes: "{selectedReport.verificationNotes}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Notes Input */}
              <div className="space-y-2 text-xs">
                <label className="font-bold text-on-surface block">
                  Officer Inspection Notes / Findings
                </label>
                <textarea
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="Enter details of field inspection, physical confirmation, or reasons for decision..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-outline-variant outline-none focus:border-primary text-xs bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="border-t border-surface-container pt-4 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleVerify('GENUINE')}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Mark as GENUINE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerify('NEEDS_REVIEW')}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                    <span>Needs Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerify('FAKE')}
                    disabled={processing}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    <span>Mark as FAKE</span>
                  </button>
                </div>

                <p className="text-[11px] text-on-surface-variant text-center pt-1">
                  Marking a report FAKE records the verification decision in MongoDB and does NOT delete the citizen account.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
