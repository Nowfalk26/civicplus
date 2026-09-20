import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CategoryBadge, StatusBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';

export const OfficerReportAssignment: React.FC = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Assignment Modal
  const [targetComplaint, setTargetComplaint] = useState<any | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [assignNotes, setAssignNotes] = useState<string>('');
  const [assigning, setAssigning] = useState<boolean>(false);

  // History Modal
  const [historyComplaint, setHistoryComplaint] = useState<any | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filterQuery = statusFilter === 'ALL' ? '' : `?assignmentStatus=${statusFilter}`;
      const [cRes, eRes] = await Promise.all([
        api.get(`/complaints${filterQuery}`),
        api.get('/employees'),
      ]);

      if (cRes.data?.success) {
        setComplaints(cRes.data.complaints || []);
      }
      if (eRes.data?.success) {
        setEmployees(eRes.data.employees || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = (complaint: any) => {
    setTargetComplaint(complaint);
    setSelectedEmployeeId(complaint.assignedEmployeeId?.id || complaint.assignedEmployeeId?._id || '');
    setAssignNotes('');
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetComplaint || !selectedEmployeeId) {
      toast.error('Please select an active employee.');
      return;
    }

    setAssigning(true);
    try {
      const isReassignment = Boolean(targetComplaint.assignedEmployeeId);
      const res = await api.post(`/complaints/${targetComplaint.id}/assign-employee`, {
        employeeId: selectedEmployeeId,
        notes: assignNotes,
        reason: isReassignment ? assignNotes || 'Reassigned by Officer' : undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Employee assigned successfully!');
        setTargetComplaint(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  const handleViewHistory = async (complaint: any) => {
    setHistoryComplaint(complaint);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/complaints/${complaint.id}/assignment-history`);
      if (res.data?.success) {
        setAssignmentHistory(res.data.history || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch assignment trail.');
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Report Assignment Desk
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              Work Distribution
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Assign filed civic reports to active departmental field employees for ground verification and resolution.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container-low font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <span className={`material-symbols-outlined text-[16px] text-primary ${loading ? 'animate-spin' : ''}`}>sync</span>
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-container pb-3 text-xs">
        {['ALL', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'REASSIGNED'].map((tab) => (
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

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-surface-container shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-xs text-on-surface-variant font-medium">
              Loading report queue...
            </p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">
              assignment_turned_in
            </span>
            <h3 className="text-sm font-bold text-on-surface">No Reports in this Queue</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              New citizen submissions will automatically arrive here as Pending Assignment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-lowest text-on-surface-variant">
                  <th className="p-3.5 font-bold">Report Code</th>
                  <th className="p-3.5 font-bold">Category & Issue</th>
                  <th className="p-3.5 font-bold">Location</th>
                  <th className="p-3.5 font-bold">Assignment Status</th>
                  <th className="p-3.5 font-bold">Assigned Employee</th>
                  <th className="p-3.5 font-bold">Submitted At</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {complaints.map((c) => {
                  const assignedEmp = c.assignedEmployeeId;
                  const isAssigned = Boolean(assignedEmp);

                  return (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                      {/* Code */}
                      <td className="p-3.5">
                        <span className="font-bold text-primary font-mono">{c.complaintId}</span>
                      </td>

                      {/* Category & Description */}
                      <td className="p-3.5 max-w-xs">
                        <div className="space-y-1">
                          <CategoryBadge category={c.category} />
                          <p className="font-semibold text-on-surface line-clamp-1">{c.description}</p>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="p-3.5">
                        <p className="font-medium text-on-surface">{c.location}</p>
                      </td>

                      {/* Assignment Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.assignmentStatus === 'ASSIGNED'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : c.assignmentStatus === 'REASSIGNED'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.assignmentStatus === 'ASSIGNED'
                                ? 'bg-blue-600'
                                : c.assignmentStatus === 'REASSIGNED'
                                ? 'bg-amber-600'
                                : 'bg-red-600'
                            }`}
                          />
                          {c.assignmentStatus ? c.assignmentStatus.replace('_', ' ') : 'PENDING'}
                        </span>
                      </td>

                      {/* Assigned Employee */}
                      <td className="p-3.5">
                        {isAssigned ? (
                          <div>
                            <p className="font-bold text-on-surface">{assignedEmp.fullName}</p>
                            <p className="text-[10px] text-primary font-mono">
                              {assignedEmp.employeeId} • {assignedEmp.department || 'Inspection'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant italic">Unassigned</span>
                        )}
                      </td>

                      {/* Submitted At */}
                      <td className="p-3.5 text-on-surface-variant whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(c)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shadow-xs ${
                              isAssigned
                                ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                                : 'bg-primary text-white hover:bg-primary-hover'
                            }`}
                          >
                            {isAssigned ? 'Reassign' : 'Assign Employee'}
                          </button>

                          {isAssigned && (
                            <button
                              type="button"
                              onClick={() => handleViewHistory(c)}
                              className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                              title="View Assignment History Trail"
                            >
                              <span className="material-symbols-outlined text-[16px]">history</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign / Reassign Employee Modal */}
      <Modal
        isOpen={Boolean(targetComplaint)}
        onClose={() => setTargetComplaint(null)}
        title={targetComplaint?.assignedEmployeeId ? 'Reassign Employee' : 'Assign Field Employee'}
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
            <p className="text-on-surface">
              Report Code: <strong className="text-primary font-mono">{targetComplaint?.complaintId}</strong>
            </p>
            <p className="text-on-surface-variant text-[11px]">{targetComplaint?.location}</p>
            {targetComplaint?.assignedEmployeeId && (
              <p className="text-amber-800 font-semibold pt-1">
                Currently assigned to: {targetComplaint.assignedEmployeeId.fullName} ({targetComplaint.assignedEmployeeId.employeeId})
              </p>
            )}
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">
              Select Field Employee (Active Staff)
            </label>
            <select
              required
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white font-medium"
            >
              <option value="">-- Choose active employee --</option>
              {employees
                .filter((e) => e.accountStatus === 'ACTIVE')
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeId}) — {emp.assignedZone} ({emp.assignedReportsCount || 0} active tickets)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">
              Assignment / Reassignment Notes & Instructions
            </label>
            <textarea
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="e.g. Please conduct priority site inspection, verify photo evidence, and assess repair scope."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white"
            />
          </div>

          <div className="border-t border-surface-container pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTargetComplaint(null)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold"
            >
              {assigning ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assignment History Audit Modal */}
      <Modal
        isOpen={Boolean(historyComplaint)}
        onClose={() => setHistoryComplaint(null)}
        title={`Assignment History: ${historyComplaint?.complaintId}`}
      >
        <div className="space-y-3 text-xs">
          {loadingHistory ? (
            <div className="p-8 text-center space-y-2">
              <span className="material-symbols-outlined text-2xl text-primary animate-spin">
                progress_activity
              </span>
              <p className="text-on-surface-variant">Loading assignment logs...</p>
            </div>
          ) : assignmentHistory.length === 0 ? (
            <p className="text-center p-6 text-on-surface-variant">No previous assignment records found.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {assignmentHistory.map((h, i) => (
                <div key={h.id || i} className="p-3 rounded-xl border border-surface-container bg-surface-container-lowest space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-on-surface">{h.employeeName}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      h.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {h.status}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-[11px]">
                    Assigned by: <strong>{h.assignedByUserName}</strong> on {formatDate(h.assignedAt)}
                  </p>
                  {h.previousEmployeeName && (
                    <p className="text-amber-800 text-[11px]">
                      Reassigned from: <strong>{h.previousEmployeeName}</strong>
                    </p>
                  )}
                  {h.reassignmentReason && (
                    <p className="text-on-surface text-[11px] italic bg-white p-2 rounded-lg border border-surface-container/60">
                      Reason: "{h.reassignmentReason}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-surface-container pt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setHistoryComplaint(null)}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high font-bold text-on-surface"
            >
              Close History
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
