import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { StatusBadge, CategoryBadge, PriorityBadge } from '../../components/ui/Badge';
import { LeafletMap } from '../../components/LeafletMap';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';

export const OfficerInbox: React.FC = () => {
  const { user, language } = useStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);

  // Status update form states in side panel
  const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
  const [officerNote, setOfficerNote] = useState<string>('');
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, usersRes] = await Promise.all([
        api.get('/complaints?limit=100'),
        api.get('/analytics/district/Tirunelveli'), // get sample active officers
      ]);

      if (compRes.data?.success) {
        setComplaints(compRes.data.complaints || []);
      }
      if (usersRes.data?.officers) {
        setOfficers(usersRes.data.officers);
      }
    } catch (err) {
      console.error('Error loading inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'All Tickets' },
    { key: 'UNASSIGNED', label: 'Unassigned (Submitted)' },
    { key: 'ASSIGNED', label: 'Assigned / In Progress' },
    { key: 'PENDING_VERIFY', label: 'Pending Verification' },
    { key: 'RESOLVED', label: 'Resolved' },
  ];

  const filtered = complaints.filter((c) => {
    if (tab === 'UNASSIGNED' && (c.status !== 'SUBMITTED' || c.assignedToId)) return false;
    if (tab === 'ASSIGNED' && (c.status !== 'ASSIGNED' && c.status !== 'IN_PROGRESS' && c.status !== 'ACCEPTED'))
      return false;
    if (tab === 'PENDING_VERIFY' && c.status !== 'IN_PROGRESS') return false;
    if (tab === 'RESOLVED' && c.status !== 'RESOLVED') return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        c.complaintId.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUpdateStatus = async () => {
    if (!selectedComplaint) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/complaints/${selectedComplaint.id}/status`, {
        status: newStatus,
        notes: officerNote || `Status updated to ${newStatus} by ${user?.username}`,
      });

      if (res.data?.success) {
        toast.success(`Complaint status set to ${newStatus}`);
        setSelectedComplaint(res.data.complaint);
        setOfficerNote('');
        // Update local list
        setComplaints((prev) =>
          prev.map((c) => (c.id === selectedComplaint.id ? res.data.complaint : c))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignOfficer = async () => {
    if (!selectedComplaint || !selectedOfficerId) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/complaints/${selectedComplaint.id}/assign`, {
        officerId: selectedOfficerId,
        notes: `Assigned to field engineer via Officer Inbox.`,
      });

      if (res.data?.success) {
        toast.success('Officer assigned successfully!');
        setSelectedComplaint(res.data.complaint);
        setComplaints((prev) =>
          prev.map((c) => (c.id === selectedComplaint.id ? res.data.complaint : c))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign officer.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Officer Complaint Inbox</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Triage, field dispatch, status updates, and verification of reported issues
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search complaint ID, location..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant text-xs outline-none focus:border-primary bg-white"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Split Table & Side Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Complaints Table */}
        <div
          className={`bg-white rounded-2xl border border-surface-container shadow-sm overflow-hidden transition-all ${
            selectedComplaint ? 'lg:col-span-7' : 'lg:col-span-12'
          }`}
        >
          <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low">
            <span className="text-xs font-bold text-on-surface">
              Showing {filtered.length} Complaints
            </span>
            <span className="text-[11px] text-on-surface-variant">
              Click any row to inspect & update status
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-lowest text-on-surface-variant">
                  <th className="p-3 font-bold">ID</th>
                  <th className="p-3 font-bold">Category</th>
                  <th className="p-3 font-bold">Priority</th>
                  <th className="p-3 font-bold">Location</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold">Date</th>
                  <th className="p-3 font-bold text-right">Triage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filtered.map((c) => {
                  const isSelected = selectedComplaint?.id === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setSelectedComplaint(c);
                        setNewStatus(c.status);
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary-light/60 font-semibold'
                          : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-primary">{c.complaintId}</td>
                      <td className="p-3">
                        <CategoryBadge category={c.category} />
                      </td>
                      <td className="p-3">
                        <PriorityBadge priority={c.priority || 'MEDIUM'} />
                      </td>
                      <td className="p-3 text-on-surface truncate max-w-[160px]">{c.location}</td>
                      <td className="p-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="p-3 text-on-surface-variant">{formatDate(c.createdAt)}</td>
                      <td className="p-3 text-right">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          chevron_right
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Complaint Side Action Panel */}
        {selectedComplaint && (
          <div className="lg:col-span-5 bg-white rounded-2xl border border-surface-container shadow-xl p-5 space-y-5 animate-in fade-in sticky top-20">
            {/* Header & Close */}
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div>
                <span className="font-mono text-sm font-bold text-primary">
                  {selectedComplaint.complaintId}
                </span>
                <p className="text-[11px] text-on-surface-variant">
                  {selectedComplaint.location}
                </p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Photo Gallery Thumbnail */}
            <div className="relative h-44 rounded-xl overflow-hidden bg-surface-container border border-surface-container">
              <img
                src={
                  selectedComplaint.photos?.[0]?.url ||
                  'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'
                }
                alt="Complaint"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <StatusBadge status={selectedComplaint.status} />
              </div>
            </div>

            {/* Description */}
            <div className="text-xs space-y-1">
              <span className="font-bold text-on-surface">Citizen Statement:</span>
              <p className="p-2.5 rounded-lg bg-surface-container-low border border-surface-container text-on-surface leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>

            {/* Mini Map */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-on-surface">GPS Location Pin:</span>
              <LeafletMap
                center={[selectedComplaint.latitude, selectedComplaint.longitude]}
                zoom={14}
                complaints={[selectedComplaint]}
                height="150px"
              />
            </div>

            {/* Status Workflow Advance */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container space-y-3">
              <span className="text-xs font-bold text-on-surface block">
                Workflow Action (Update Status)
              </span>

              <div className="grid grid-cols-2 gap-2">
                {['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewStatus(s)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      newStatus === s
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white text-on-surface border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                  Official Officer Notes / Action Log:
                </label>
                <textarea
                  value={officerNote}
                  onChange={(e) => setOfficerNote(e.target.value)}
                  placeholder="e.g. Field inspection completed; dispatched asphalt crew..."
                  rows={2}
                  className="w-full p-2 rounded-lg border border-outline-variant text-xs outline-none focus:border-primary bg-white resize-none"
                />
              </div>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleUpdateStatus}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {actionLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Commit Status Update</span>
                  </>
                )}
              </button>
            </div>

            {/* Officer Assignment Dropdown */}
            <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container space-y-2">
              <span className="text-xs font-bold text-on-surface block">
                Assign / Transfer Field Officer
              </span>
              <div className="flex gap-2">
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="flex-1 p-2 rounded-lg border border-outline-variant text-xs bg-white outline-none"
                >
                  <option value="">Select Field Officer</option>
                  <option value="usr-officer-001">Er. S. Murugesan (PWD Highways)</option>
                  <option value="usr-officer-002">Er. K. Anbarasan (TANGEDCO Electricity)</option>
                  <option value="usr-officer-003">Dr. V. Karpagam (Health & Sanitation)</option>
                  <option value="usr-officer-004">Er. R. Senthil Kumar (TWAD Water)</option>
                </select>
                <button
                  type="button"
                  disabled={!selectedOfficerId || actionLoading}
                  onClick={handleAssignOfficer}
                  className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
