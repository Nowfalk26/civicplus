import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export const AdminProfileRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal State
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/admin/profile-change-requests?status=${filter}`);
      if (res.data?.success) {
        setRequests(res.data.requests);
      }
    } catch {
      toast.error('Failed to load profile change requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleDecision = async () => {
    if (!selectedReq) return;
    setActionLoading(selectedReq.id);
    try {
      if (decisionType === 'approve') {
        const res = await api.post(
          `/users/admin/profile-change-requests/${selectedReq.id}/approve`,
          { notes }
        );
        if (res.data?.success) {
          toast.success('Profile changes approved and applied to officer profile!');
        }
      } else {
        const res = await api.post(
          `/users/admin/profile-change-requests/${selectedReq.id}/reject`,
          { notes }
        );
        if (res.data?.success) {
          toast.success('Profile change request rejected.');
        }
      }
      setSelectedReq(null);
      setNotes('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error processing profile request.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-bold uppercase mb-1">
            <span>Controller Profile Governance • அதிகாரி விவர மாற்றம்</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
            Officer Profile Change Reviews
          </h1>
          <p className="text-xs text-on-surface-variant">
            Officers cannot modify official credentials without Controller approval. Compare current vs requested values below.
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container border border-surface-container-high self-start sm:self-auto">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === s
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-3xl border border-surface-container shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[28px] text-purple-600 mb-2">
              progress_activity
            </span>
            <p>Loading profile change requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-on-surface-variant space-y-1">
            <span className="material-symbols-outlined text-[36px] text-outline">
              task_alt
            </span>
            <p className="font-bold text-on-surface">No {filter.toLowerCase()} profile change requests.</p>
            <p>All officer credential petitions have been addressed.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-container">
            {requests.map((r) => (
              <div key={r.id} className="p-6 hover:bg-surface-container-low/50 transition-colors space-y-4">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status}
                    </span>
                    <h3 className="text-base font-bold text-on-surface">{r.officerName}</h3>
                    <span className="text-xs text-on-surface-variant">({r.officerEmail})</span>
                  </div>

                  <span className="text-xs text-on-surface-variant">
                    Submitted: {new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                {/* Diff Comparison Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Active */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                      Current Profile On Record
                    </p>
                    <p><span className="text-slate-500">Department:</span> <strong>{r.currentDepartment || 'Public Grievance'}</strong></p>
                    <p><span className="text-slate-500">Designation:</span> <strong>{r.currentDesignation || 'Field Officer'}</strong></p>
                    <p><span className="text-slate-500">District:</span> <strong>{r.currentLocation || 'Tamil Nadu'}</strong></p>
                    <p><span className="text-slate-500">Phone:</span> <strong>{r.currentPhone || 'N/A'}</strong></p>
                  </div>

                  {/* Requested Changes */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-1.5">
                    <p className="font-bold text-purple-900 uppercase text-[10px] tracking-wider mb-1">
                      Requested Official Changes
                    </p>
                    <p>
                      <span className="text-purple-700">Department:</span>{' '}
                      <strong className={r.requestedDepartment !== r.currentDepartment ? 'text-purple-900 bg-purple-100 px-1 rounded' : ''}>
                        {r.requestedDepartment}
                      </strong>
                    </p>
                    <p>
                      <span className="text-purple-700">Designation:</span>{' '}
                      <strong className={r.requestedDesignation !== r.currentDesignation ? 'text-purple-900 bg-purple-100 px-1 rounded' : ''}>
                        {r.requestedDesignation}
                      </strong>
                    </p>
                    <p>
                      <span className="text-purple-700">District:</span>{' '}
                      <strong className={r.requestedLocation !== r.currentLocation ? 'text-purple-900 bg-purple-100 px-1 rounded' : ''}>
                        {r.requestedLocation}
                      </strong>
                    </p>
                    <p>
                      <span className="text-purple-700">Phone:</span>{' '}
                      <strong className={r.requestedPhone !== r.currentPhone ? 'text-purple-900 bg-purple-100 px-1 rounded' : ''}>
                        {r.requestedPhone}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Reason & Controller notes */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface">
                  <p><strong>Official Justification:</strong> {r.reason}</p>
                  {r.supportingDocumentUrl && (
                    <p className="mt-1">
                      <strong>Supporting Order Document:</strong>{' '}
                      <a href={r.supportingDocumentUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                        {r.supportingDocumentUrl}
                      </a>
                    </p>
                  )}
                  {r.decisionNotes && (
                    <p className="text-purple-800 font-medium mt-1 pt-1 border-t border-surface-container">
                      <strong>Controller Review Notes:</strong> {r.decisionNotes}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                {r.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedReq(r);
                        setDecisionType('reject');
                      }}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors"
                    >
                      Reject Changes
                    </button>

                    <button
                      onClick={() => {
                        setSelectedReq(r);
                        setDecisionType('approve');
                      }}
                      className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                      <span>Approve & Apply to Officer</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-surface-container shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="text-lg font-bold text-on-surface">
                {decisionType === 'approve' ? 'Approve Profile Modifications' : 'Reject Profile Modifications'}
              </h3>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="text-xs space-y-1 text-on-surface-variant">
              <p>Officer: <strong>{selectedReq.officerName}</strong> ({selectedReq.officerEmail})</p>
              <p>
                {decisionType === 'approve'
                  ? 'Approving will immediately update the active officer record in the directory.'
                  : 'Rejecting will maintain the existing profile credentials without alteration.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                {decisionType === 'approve' ? 'Controller Approval Notes (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Enter remarks or order reference number..."
                className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-purple-600 outline-none text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 rounded-xl border border-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>

              <button
                onClick={handleDecision}
                disabled={actionLoading !== null || (decisionType === 'reject' && !notes.trim())}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 ${
                  decisionType === 'approve'
                    ? 'bg-purple-700 hover:bg-purple-800'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading ? 'Saving...' : decisionType === 'approve' ? 'Confirm & Apply' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
