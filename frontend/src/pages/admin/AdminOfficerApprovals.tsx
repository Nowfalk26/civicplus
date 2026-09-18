import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export const AdminOfficerApprovals: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Decision Modal State
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [lastApprovedResult, setLastApprovedResult] = useState<any | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/admin/officer-requests?status=${filter}`);
      if (res.data?.success) {
        setRequests(res.data.requests);
      }
    } catch (err: any) {
      toast.error('Failed to load officer access requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleDecision = async () => {
    if (!selectedRequest) return;
    setActionLoading(selectedRequest.id);
    try {
      if (decisionType === 'approve') {
        const res = await api.post(`/users/admin/officer-requests/${selectedRequest.id}/approve`, {
          notes,
        });
        if (res.data?.success) {
          toast.success(res.data.message || 'Officer access approved!');
          setLastApprovedResult({
            email: selectedRequest.email,
            tempPassword: res.data.tempPassword,
            name: selectedRequest.name,
          });
        }
      } else {
        const res = await api.post(`/users/admin/officer-requests/${selectedRequest.id}/reject`, {
          notes,
        });
        if (res.data?.success) {
          toast.success('Officer access application rejected.');
        }
      }
      setSelectedRequest(null);
      setNotes('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error executing action.');
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
            <span>Controller Authority • அதிகாரி அனுமதி பலகை</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
            Officer Access Approvals
          </h1>
          <p className="text-xs text-on-surface-variant">
            Review civic officer applications, verify credentials, and dispatch temporary access credentials.
          </p>
        </div>

        {/* Filter Pills */}
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

      {/* Success Callout when Temp Password Generated */}
      {lastApprovedResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[24px]">
              mark_email_read
            </span>
            <div>
              <p className="font-bold">
                Account Approved for Officer {lastApprovedResult.name} ({lastApprovedResult.email})
              </p>
              <p className="text-emerald-800">
                Temporary Password Dispatched: <strong className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">{lastApprovedResult.tempPassword}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastApprovedResult(null)}
            className="text-[11px] font-bold text-emerald-800 hover:underline self-end sm:self-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white rounded-3xl border border-surface-container shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[28px] text-purple-600 mb-2">
              progress_activity
            </span>
            <p>Loading officer requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-on-surface-variant space-y-1">
            <span className="material-symbols-outlined text-[36px] text-outline">
              check_circle
            </span>
            <p className="font-bold text-on-surface">No {filter.toLowerCase()} officer requests found.</p>
            <p>All departmental access petitions have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-container">
            {requests.map((r) => (
              <div key={r.id} className="p-6 hover:bg-surface-container-low/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left applicant info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : r.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                      <h3 className="text-base font-bold text-on-surface">{r.name}</h3>
                      <span className="text-xs text-on-surface-variant">•</span>
                      <span className="text-xs font-semibold text-purple-700">{r.designation}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-on-surface-variant">
                      <div>
                        <span className="font-bold text-on-surface">Department:</span> {r.department}
                      </div>
                      <div>
                        <span className="font-bold text-on-surface">Email:</span> {r.email}
                      </div>
                      <div>
                        <span className="font-bold text-on-surface">Phone:</span> {r.phone}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface space-y-1">
                      <p>
                        <strong className="text-on-surface-variant">Govt ID / Service Badge:</strong>{' '}
                        <span className="font-mono font-bold text-blue-800">{r.governmentIdProof}</span> ({r.district || 'Tamil Nadu'})
                      </p>
                      <p>
                        <strong className="text-on-surface-variant">Purpose & Jurisdiction:</strong>{' '}
                        {r.reason || 'Civic duty allocation'}
                      </p>
                      {r.decisionNotes && (
                        <p className="text-purple-800 font-medium pt-1 border-t border-surface-container">
                          <strong>Controller Decision Note:</strong> {r.decisionNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {r.status === 'PENDING' && (
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setDecisionType('reject');
                        }}
                        className="px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setDecisionType('approve');
                        }}
                        className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Approve Officer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Approve / Reject Decision */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-surface-container shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="text-lg font-bold text-on-surface">
                {decisionType === 'approve' ? 'Approve Officer Access' : 'Reject Officer Access'}
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="text-xs space-y-2 text-on-surface-variant">
              <p>
                Applicant: <strong>{selectedRequest.name}</strong> ({selectedRequest.email})
              </p>
              <p>Department: {selectedRequest.department}</p>
              <p>Badge ID: {selectedRequest.governmentIdProof}</p>

              {decisionType === 'approve' ? (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                  A secure one-time temporary password will be generated, the account will be created/activated, and an official onboarding email will be dispatched to {selectedRequest.email}.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
                  The application will be rejected and an official notification will be dispatched explaining the rationale.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                {decisionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={
                  decisionType === 'approve'
                    ? 'e.g. Employee badge and service roster confirmed with nodal department.'
                    : 'e.g. Employee credentials could not be matched against current roster.'
                }
                className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-purple-600 outline-none text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRequest(null)}
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
                {actionLoading ? 'Processing...' : decisionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
