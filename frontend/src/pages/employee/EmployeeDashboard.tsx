import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CategoryBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';

export const EmployeeDashboard: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspection & Verification Modal
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [verificationResult, setVerificationResult] = useState<'GENUINE' | 'FAKE' | 'NEEDS_REVIEW'>('GENUINE');
  const [progressStatus, setProgressStatus] = useState<string>('IN_PROGRESS');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [evidenceSummary, setEvidenceSummary] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchMyReports();
  }, [statusFilter]);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const filterQuery = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const res = await api.get(`/employees/my-reports${filterQuery}`);
      if (res.data?.success) {
        setReports(res.data.reports || []);
        if (res.data.employee) {
          setEmployeeProfile(res.data.employee);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to load assigned reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerifyModal = (report: any) => {
    setSelectedReport(report);
    setVerificationResult(report.verificationStatus === 'PENDING_VERIFICATION' ? 'GENUINE' : report.verificationStatus);
    setProgressStatus(report.status || 'IN_PROGRESS');
    setVerificationNotes(report.verificationNotes || '');
    setEvidenceSummary('');
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/employees/my-reports/${selectedReport.id}/verify`, {
        verificationResult,
        verificationNotes,
        progressStatus,
        evidenceSummary,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Inspection sign-off saved in MongoDB!');
        setSelectedReport(null);
        fetchMyReports();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getVerificationBadge = (vStatus: string) => {
    switch (vStatus) {
      case 'GENUINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            GENUINE
          </span>
        );
      case 'FAKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
            <span className="material-symbols-outlined text-[13px]">cancel</span>
            FAKE
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="material-symbols-outlined text-[13px]">pending_actions</span>
            NEEDS REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            PENDING VERIFICATION
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header with Employee ID and Zone */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Field Inspector Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 font-mono">
              {employeeProfile?.employeeId || 'Staff ID'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Inspector: <strong>{employeeProfile?.fullName || 'Field Employee'}</strong> • Assigned Zone: <strong>{employeeProfile?.assignedZone || 'Tamil Nadu'}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMyReports}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container-low font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs self-start"
        >
          <span className={`material-symbols-outlined text-[16px] text-primary ${loading ? 'animate-spin' : ''}`}>sync</span>
          <span>Refresh My Reports</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Total Assigned
          </span>
          <p className="text-2xl font-black text-on-surface mt-1">{reports.length}</p>
          <p className="text-[11px] text-on-surface-variant">Active field tickets</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-black text-blue-900 mt-1">
            {reports.filter((r) => r.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-[11px] text-blue-700">Under ground work</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Verified Genuine
          </span>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            {reports.filter((r) => r.verificationStatus === 'GENUINE').length}
          </p>
          <p className="text-[11px] text-emerald-700">Confirmed issues</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
            Resolved
          </span>
          <p className="text-2xl font-black text-purple-900 mt-1">
            {reports.filter((r) => r.status === 'RESOLVED').length}
          </p>
          <p className="text-[11px] text-purple-700">Completed & closed</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-container pb-3 text-xs">
        {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === tab
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-surface-container shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-xs text-on-surface-variant font-medium">
              Loading your assigned reports...
            </p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <span className="material-symbols-outlined text-4xl text-emerald-600">
              task_alt
            </span>
            <h3 className="text-sm font-bold text-on-surface">No Assigned Reports Pending</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              When an Officer assigns civic complaints to your Employee ID, they will appear here for field verification and resolution.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-lowest text-on-surface-variant">
                  <th className="p-3.5 font-bold">Report Code</th>
                  <th className="p-3.5 font-bold">Category & Description</th>
                  <th className="p-3.5 font-bold">Location</th>
                  <th className="p-3.5 font-bold">Work Status</th>
                  <th className="p-3.5 font-bold">Verification Decision</th>
                  <th className="p-3.5 font-bold">Assigned On</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    {/* Code */}
                    <td className="p-3.5">
                      <span className="font-bold text-primary font-mono">{r.complaintId}</span>
                    </td>

                    {/* Category & Description */}
                    <td className="p-3.5 max-w-xs">
                      <div className="space-y-1">
                        <CategoryBadge category={r.category} />
                        <p className="font-semibold text-on-surface line-clamp-1">{r.description}</p>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-3.5">
                      <p className="font-medium text-on-surface">{r.location}</p>
                    </td>

                    {/* Work Status */}
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : r.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    {/* Verification Decision */}
                    <td className="p-3.5">
                      {getVerificationBadge(r.verificationStatus || 'PENDING_VERIFICATION')}
                    </td>

                    {/* Assigned Time */}
                    <td className="p-3.5 text-on-surface-variant whitespace-nowrap">
                      {formatDate(r.assignedAt || r.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenVerifyModal(r)}
                        className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1 ml-auto"
                      >
                        <span className="material-symbols-outlined text-[15px]">fact_check</span>
                        <span>Inspect / Verify</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect & Verify Modal */}
      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title={`Field Inspection & Sign-off: ${selectedReport?.complaintId}`}
      >
        <form onSubmit={handleSubmitVerification} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary font-mono">{selectedReport?.complaintId}</span>
              <CategoryBadge category={selectedReport?.category} />
            </div>
            <p className="text-on-surface">{selectedReport?.description}</p>
            <p className="text-on-surface-variant text-[11px]">Location: <strong>{selectedReport?.location}</strong></p>

            {/* Photos */}
            {selectedReport?.photos && selectedReport.photos.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Citizen Evidence</span>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {selectedReport.photos.map((p: any, idx: number) => (
                    <a key={idx} href={p.url} target="_blank" rel="noreferrer" className="shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-surface-container">
                      <img src={p.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface block mb-1">
                Verification Finding
              </label>
              <select
                value={verificationResult}
                onChange={(e) => setVerificationResult(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white font-bold"
              >
                <option value="GENUINE">GENUINE (Confirmed on ground)</option>
                <option value="FAKE">FAKE (False / Invalid issue)</option>
                <option value="NEEDS_REVIEW">NEEDS REVIEW (Requires clarification)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-on-surface block mb-1">
                Update Progress Status
              </label>
              <select
                value={progressStatus}
                onChange={(e) => setProgressStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white font-bold"
              >
                <option value="IN_PROGRESS">IN PROGRESS (Work Underway)</option>
                <option value="RESOLVED">RESOLVED (Repairs Complete)</option>
                <option value="ASSIGNED">ASSIGNED (Inspection Pending)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">
              Inspection Notes / Resolution Details
            </label>
            <textarea
              required
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Describe on-site observation, measurements, actions taken, or reasons for decision..."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white"
            />
          </div>

          <div className="border-t border-surface-container pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold"
            >
              {submitting ? 'Saving Sign-off...' : 'Submit Verification Sign-off'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
