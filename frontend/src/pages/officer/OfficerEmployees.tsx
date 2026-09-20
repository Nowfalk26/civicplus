import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';

interface EmployeeItem {
  id: string;
  employeeId: string; // EMP-TN-1001
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  assignedZone: string;
  accountStatus: 'ACTIVE' | 'DISABLED';
  presenceStatus?: 'ONLINE' | 'OFFLINE';
  isOnline?: boolean;
  lastActive?: string;
  assignedReportsCount: number;
  completedReportsCount: number;
  inProgressReportsCount: number;
  pendingVerificationCount: number;
  createdAt: string;
  tempPassword?: string;
}

export const OfficerEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    employeeId: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: 'Road Works & Potholes',
    designation: 'Field Inspector',
    assignedZone: 'Chennai Zone 1',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees');
      if (res.data?.success) {
        setEmployees(res.data.employees || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employee roster.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/employees', formData);
      if (res.data?.success) {
        toast.success(res.data.message || 'Employee created successfully!');
        const emp = res.data.employee;
        setCreatedCredentials({
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          email: emp.email,
          tempPassword: emp.tempPassword,
        });
        setIsAddModalOpen(false);
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          department: 'Road Works & Potholes',
          designation: 'Field Inspector',
          assignedZone: 'Chennai Zone 1',
        });
        fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: EmployeeItem) => {
    const nextStatus = emp.accountStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await api.put(`/employees/${emp.id}/status`, { status: nextStatus });
      if (res.data?.success) {
        toast.success(`Employee ${emp.fullName} is now ${nextStatus}.`);
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, accountStatus: nextStatus } : e))
        );
      }
    } catch (err: any) {
      toast.error('Failed to update employee status.');
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      e.fullName.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      e.assignedZone.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Field Employee Directory & Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Departmental Staff
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Manage authenticated departmental staff who conduct field inspections and report verifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchEmployees}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container-low font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Created Credentials Banner (Shown once after creation) */}
      {createdCredentials && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <p className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
              New Employee Credentials Generated (Save Immediately)
            </p>
            <p className="text-emerald-800">
              Employee: <strong>{createdCredentials.fullName}</strong> ({createdCredentials.employeeId}) • Email: <strong>{createdCredentials.email}</strong>
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono">
              <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-300 font-bold text-xs text-emerald-900">
                Initial Password: {createdCredentials.tempPassword}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(createdCredentials.tempPassword);
                  toast.success('Password copied to clipboard!');
                }}
                className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700"
              >
                Copy
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCreatedCredentials(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Summary KPI Cards / Workload View */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Total Staff
          </span>
          <p className="text-2xl font-black text-on-surface mt-1">{employees.length}</p>
          <p className="text-[11px] text-on-surface-variant">Active field inspectors</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Online Presence
          </span>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            {employees.filter((e) => e.isOnline).length}
          </p>
          <p className="text-[11px] text-emerald-700">Currently active on duty</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
            Assigned Work
          </span>
          <p className="text-2xl font-black text-blue-900 mt-1">
            {employees.reduce((acc, e) => acc + (e.assignedReportsCount || 0), 0)}
          </p>
          <p className="text-[11px] text-blue-700">Total active tickets</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
            Completed Inspections
          </span>
          <p className="text-2xl font-black text-purple-900 mt-1">
            {employees.reduce((acc, e) => acc + (e.completedReportsCount || 0), 0)}
          </p>
          <p className="text-[11px] text-purple-700">Verified & resolved</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name, ID, zone, email..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant text-xs outline-none bg-white focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Employees Directory Table */}
      <div className="bg-white rounded-2xl border border-surface-container shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-xs text-on-surface-variant font-medium">
              Loading employee roster...
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">
              badge
            </span>
            <h3 className="text-sm font-bold text-on-surface">No Field Employees Found</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Add employees to assign incoming civic reports and coordinate field inspections.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs"
            >
              Add First Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-lowest text-on-surface-variant">
                  <th className="p-3.5 font-bold">Employee Staff</th>
                  <th className="p-3.5 font-bold">Contact Channels</th>
                  <th className="p-3.5 font-bold">Department & Role</th>
                  <th className="p-3.5 font-bold">Assigned Zone</th>
                  <th className="p-3.5 font-bold text-center">Workload (Assigned / Done)</th>
                  <th className="p-3.5 font-bold">Presence</th>
                  <th className="p-3.5 font-bold">Status</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                    {/* Identity */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                          {emp.fullName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{emp.fullName}</p>
                          <span className="px-1.5 py-0.2 rounded bg-surface-container text-primary font-mono text-[10px] font-bold">
                            {emp.employeeId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="p-3.5">
                      <p className="font-medium text-on-surface">{emp.email}</p>
                      <p className="text-[11px] text-on-surface-variant font-mono">{emp.phone}</p>
                    </td>

                    {/* Department */}
                    <td className="p-3.5">
                      <p className="font-semibold text-on-surface">{emp.department}</p>
                      <p className="text-[11px] text-on-surface-variant">{emp.designation}</p>
                    </td>

                    {/* Zone */}
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-semibold text-[11px]">
                        {emp.assignedZone}
                      </span>
                    </td>

                    {/* Workload */}
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[10px]">
                          {emp.assignedReportsCount || 0} Assigned
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[10px]">
                          {emp.completedReportsCount || 0} Done
                        </span>
                      </div>
                    </td>

                    {/* Presence */}
                    <td className="p-3.5">
                      {emp.isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          OFFLINE
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          emp.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {emp.accountStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(emp)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          emp.accountStatus === 'ACTIVE'
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {emp.accountStatus === 'ACTIVE' ? 'Disable' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Field Employee"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-on-surface block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. S. Rajan"
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface block mb-1">Official Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rajan@civic.tn.gov.in"
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-bold text-on-surface block mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+919876543210"
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface block mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white"
              >
                <option value="Road Works & Potholes">Road Works & Potholes</option>
                <option value="Street Lighting & Electrical">Street Lighting & Electrical</option>
                <option value="Solid Waste & Sanitation">Solid Waste & Sanitation</option>
                <option value="Storm Water Drainage">Storm Water Drainage</option>
                <option value="Parks & Public Spaces">Parks & Public Spaces</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-on-surface block mb-1">Designation</label>
              <input
                type="text"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Field Inspector"
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">Assigned Area / Zone</label>
            <input
              type="text"
              required
              value={formData.assignedZone}
              onChange={(e) => setFormData({ ...formData, assignedZone: e.target.value })}
              placeholder="e.g. Chennai Zone 4, Madurai North, Tirunelveli Central"
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          <div className="border-t border-surface-container pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold"
            >
              {submitting ? 'Creating...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
