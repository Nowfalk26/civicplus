import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

export const OfficerAssign: React.FC = () => {
  const { language } = useStore();
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [autoAssign, setAutoAssign] = useState<boolean>(true);
  const [unassignedComplaints, setUnassignedComplaints] = useState<any[]>([]);
  const [selectedComplaintIds, setSelectedComplaintIds] = useState<string[]>([]);
  const [targetOfficerId, setTargetOfficerId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchUnassigned();
  }, []);

  const fetchUnassigned = async () => {
    try {
      const res = await api.get('/complaints?limit=50');
      if (res.data?.success) {
        const unassigned = (res.data.complaints || []).filter(
          (c: any) => !c.assignedToId && c.status !== 'RESOLVED' && c.status !== 'REJECTED'
        );
        setUnassignedComplaints(unassigned);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const departments = [
    { key: 'ALL', name: 'All Departments' },
    { key: 'PWD', name: 'PWD & Highways (நெடுஞ்சாலை)' },
    { key: 'TANGEDCO', name: 'Electricity Board (மின்வாரியம்)' },
    { key: 'TWAD', name: 'Water & Drainage (குடிநீர் & வடிகால்)' },
    { key: 'MUNICIPALITY', name: 'Municipality Sanitation (தூய்மை)' },
  ];

  const officers = [
    {
      id: 'usr-officer-001',
      name: 'Er. S. Murugesan',
      dept: 'PWD',
      role: 'Highways AE',
      district: 'Tirunelveli',
      activeTickets: 8,
      efficiency: '96%',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
    {
      id: 'usr-officer-002',
      name: 'Er. K. Anbarasan',
      dept: 'TANGEDCO',
      role: 'Electrical Inspector',
      district: 'Tirunelveli',
      activeTickets: 5,
      efficiency: '94%',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    {
      id: 'usr-officer-003',
      name: 'Dr. V. Karpagam',
      dept: 'MUNICIPALITY',
      role: 'Chief Sanitation Officer',
      district: 'Tirunelveli',
      activeTickets: 12,
      efficiency: '91%',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    },
    {
      id: 'usr-officer-004',
      name: 'Er. R. Senthil Kumar',
      dept: 'TWAD',
      role: 'Drainage Engineer',
      district: 'Chennai',
      activeTickets: 9,
      efficiency: '95%',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
    {
      id: 'usr-officer-005',
      name: 'Er. M. Sivakumar',
      dept: 'PWD',
      role: 'Zone Engineer',
      district: 'Chennai',
      activeTickets: 6,
      efficiency: '98%',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    },
  ];

  const filteredOfficers = officers.filter(
    (o) => selectedDept === 'ALL' || o.dept === selectedDept
  );

  const toggleSelectComplaint = (id: string) => {
    setSelectedComplaintIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    if (selectedComplaintIds.length === 0) {
      toast.error('Please select at least 1 complaint to assign.');
      return;
    }
    if (!targetOfficerId) {
      toast.error('Please select target field officer.');
      return;
    }

    setSubmitting(true);
    try {
      for (const compId of selectedComplaintIds) {
        await api.post(`/complaints/${compId}/assign`, {
          officerId: targetOfficerId,
          notes: 'Bulk assigned through workforce allocation engine.',
        });
      }
      toast.success(
        `Successfully assigned ${selectedComplaintIds.length} complaints to selected officer!`
      );
      setSelectedComplaintIds([]);
      fetchUnassigned();
    } catch (err: any) {
      toast.error('Failed to complete bulk assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Workforce & Officer Assignment</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Optimize engineering dispatch, prevent officer overload, and auto-route civic tickets
          </p>
        </div>

        {/* Auto-assign toggle */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-surface-container shadow-2xs">
          <div className="text-right">
            <p className="text-xs font-bold text-on-surface">AI Smart Auto-Assign</p>
            <p className="text-[10px] text-on-surface-variant">
              Round-robin by nearest ward & availability
            </p>
          </div>
          <button
            onClick={() => {
              setAutoAssign(!autoAssign);
              toast.success(`Smart Auto-Assign is now ${!autoAssign ? 'ACTIVE' : 'PAUSED'}`);
            }}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              autoAssign ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                autoAssign ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Department Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {departments.map((d) => (
          <button
            key={d.key}
            onClick={() => setSelectedDept(d.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedDept === d.key
                ? 'bg-primary text-white shadow-xs'
                : 'bg-white border border-surface-container text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      {/* Field Officers Workload Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-on-surface">Active Department Officers (Capacity)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOfficers.map((off) => (
            <div
              key={off.id}
              className={`p-4 rounded-2xl border transition-all bg-white shadow-2xs hover:shadow-md flex items-center justify-between ${
                targetOfficerId === off.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-surface-container'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={off.avatar}
                  alt={off.name}
                  className="w-12 h-12 rounded-full object-cover border border-surface-container shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{off.name}</p>
                  <p className="text-[11px] text-primary font-semibold truncate">
                    {off.role} • {off.district}
                  </p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    Active Tasks: <span className="font-bold text-on-surface">{off.activeTickets}</span> | Rating: <span className="font-bold text-emerald-600">{off.efficiency}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTargetOfficerId(off.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ml-2 ${
                  targetOfficerId === off.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-primary hover:bg-surface-container'
                }`}
              >
                {targetOfficerId === off.id ? 'Selected' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Unassigned Complaints Bulk Queue */}
      <div className="bg-white rounded-2xl border border-surface-container shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-on-surface">
              Unassigned Complaints Queue ({unassignedComplaints.length})
            </h2>
            <p className="text-xs text-on-surface-variant">
              Select complaints below and click assign to deploy work order
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-primary">
              {selectedComplaintIds.length} Selected
            </span>
            <button
              onClick={handleBulkAssign}
              disabled={submitting || selectedComplaintIds.length === 0 || !targetOfficerId}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {submitting ? 'Assigning...' : 'Assign Selected Tickets'}
            </button>
          </div>
        </div>

        {unassignedComplaints.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-8">
            No unassigned complaints in queue. All active tickets are currently handled!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-low text-on-surface-variant">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={
                        selectedComplaintIds.length === unassignedComplaints.length &&
                        unassignedComplaints.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedComplaintIds(unassignedComplaints.map((c) => c.id));
                        } else {
                          setSelectedComplaintIds([]);
                        }
                      }}
                      className="rounded text-primary"
                    />
                  </th>
                  <th className="p-3 font-bold">ID</th>
                  <th className="p-3 font-bold">Category</th>
                  <th className="p-3 font-bold">Location</th>
                  <th className="p-3 font-bold">Description</th>
                  <th className="p-3 font-bold">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {unassignedComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedComplaintIds.includes(c.id)}
                        onChange={() => toggleSelectComplaint(c.id)}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-primary">{c.complaintId}</td>
                    <td className="p-3 font-semibold text-on-surface">{c.category}</td>
                    <td className="p-3 text-on-surface truncate max-w-[180px]">{c.location}</td>
                    <td className="p-3 text-on-surface-variant truncate max-w-[240px]">
                      {c.description}
                    </td>
                    <td className="p-3 font-bold text-amber-600">{c.priority || 'MEDIUM'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
