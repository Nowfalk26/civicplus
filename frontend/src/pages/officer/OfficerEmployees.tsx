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
  address?: string;
  notes?: string;
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

  // Add Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [autoGenPassword, setAutoGenPassword] = useState<boolean>(true);
  const [customPassword, setCustomPassword] = useState<string>('');

  // Edit Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    department: 'Road Works & Potholes',
    designation: 'Field Inspector',
    assignedZone: '',
    address: '',
    notes: '',
  });

  // Details Modal states
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeItem | null>(null);

  // Reset Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetTargetEmployee, setResetTargetEmployee] = useState<EmployeeItem | null>(null);
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [resettingPassword, setResettingPassword] = useState<boolean>(false);

  // Success Credentials Display (Shown after creation or password reset)
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    employeeId: string;
    email: string;
    phone: string;
    tempPassword: string;
  } | null>(null);

  // Form states for Add Employee
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: 'Road Works & Potholes',
    designation: 'Field Inspector',
    assignedZone: 'Chennai Zone 1',
    address: '',
    notes: '',
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
      const payload: any = {
        ...formData,
      };
      if (!autoGenPassword && customPassword.trim().length >= 6) {
        payload.password = customPassword.trim();
      }

      const res = await api.post('/employees', payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'Employee created successfully!');
        const emp = res.data.employee;
        setCreatedCredentials({
          fullName: emp.fullName,
          employeeId: emp.employeeId,
          email: emp.email,
          phone: emp.phone,
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
          address: '',
          notes: '',
        });
        setCustomPassword('');
        setAutoGenPassword(true);
        fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEditFormData({
      fullName: emp.fullName,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      assignedZone: emp.assignedZone,
      address: emp.address || '',
      notes: emp.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/employees/${editingEmployee.id}`, editFormData);
      if (res.data?.success) {
        toast.success('Employee details updated successfully!');
        setIsEditModalOpen(false);
        setEditingEmployee(null);
        fetchEmployees();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update employee.');
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

  const handleOpenResetPassword = (emp: EmployeeItem) => {
    setResetTargetEmployee(emp);
    setNewResetPassword('');
    setIsResetModalOpen(true);
  };

  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetEmployee) return;

    setResettingPassword(true);
    try {
      const res = await api.post(`/employees/${resetTargetEmployee.id}/reset-password`, {
        newPassword: newResetPassword || undefined,
      });

      if (res.data?.success) {
        toast.success(`Password reset for ${resetTargetEmployee.fullName}!`);
        setIsResetModalOpen(false);
        setCreatedCredentials({
          fullName: resetTargetEmployee.fullName,
          employeeId: resetTargetEmployee.employeeId,
          email: resetTargetEmployee.email,
          phone: resetTargetEmployee.phone,
          tempPassword: res.data.tempPassword,
        });
        setResetTargetEmployee(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset employee password.');
    } finally {
      setResettingPassword(false);
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
            <span>+ Add Employee</span>
          </button>
        </div>
      </div>

      {/* Created / Reset Credentials Banner (Save immediately) */}
      {createdCredentials && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start justify-between gap-3 shadow-xs">
          <div className="space-y-1.5">
            <p className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
              Employee Credentials Generated (Copy and hand to Staff)
            </p>
            <p className="text-emerald-800">
              Staff: <strong>{createdCredentials.fullName}</strong> • ID: <strong className="font-mono">{createdCredentials.employeeId}</strong> • Email: <strong>{createdCredentials.email}</strong> • Phone: <strong className="font-mono">{createdCredentials.phone}</strong>
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono">
              <span className="bg-white px-3 py-1 rounded-lg border border-emerald-300 font-bold text-xs text-emerald-900">
                Password: {createdCredentials.tempPassword}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Civics Plus Employee Login\nID: ${createdCredentials.employeeId}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.tempPassword}\nPortal: ${window.location.origin}/employee/login`
                  );
                  toast.success('Credentials copied to clipboard!');
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>Copy Credentials</span>
              </button>
            </div>
            <p className="text-[11px] text-emerald-700">
              Employee can log in directly at <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono">/employee/login</code> using this ID or Email.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreatedCredentials(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
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
              + Add First Employee
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
                      <div className="inline-flex items-center gap-1.5">
                        {/* View Details */}
                        <button
                          type="button"
                          title="View Details"
                          onClick={() => {
                            setViewingEmployee(emp);
                            setIsDetailsModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          title="Edit Details"
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          title="Reset Password"
                          onClick={() => handleOpenResetPassword(emp)}
                          className="p-1 rounded-lg text-on-surface-variant hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">key</span>
                        </button>

                        {/* Toggle Status */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                            emp.accountStatus === 'ACTIVE'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {emp.accountStatus === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
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
        title="Add New Field Employee"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-on-surface block mb-1">Full Name *</label>
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
              <label className="font-bold text-on-surface block mb-1">Official Email *</label>
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
              <label className="font-bold text-on-surface block mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+919876543210"
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface block mb-1">Department *</label>
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
              <label className="font-bold text-on-surface block mb-1">Designation *</label>
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
            <label className="font-bold text-on-surface block mb-1">Assigned Area / Zone *</label>
            <input
              type="text"
              required
              value={formData.assignedZone}
              onChange={(e) => setFormData({ ...formData, assignedZone: e.target.value })}
              placeholder="e.g. Chennai Zone 4, Madurai North, Tirunelveli Central"
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">Office / Base Address (Optional)</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Ward 12 Depot, Anna Nagar"
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          {/* Initial Password Configuration */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">key</span>
                <span>Initial Staff Password</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenPassword}
                  onChange={(e) => setAutoGenPassword(e.target.checked)}
                  className="rounded text-primary"
                />
                <span>Auto-generate secure password</span>
              </label>
            </div>

            {!autoGenPassword && (
              <div>
                <input
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Enter initial password (min 6 characters)"
                  className="w-full p-2 rounded-lg border border-outline-variant text-xs outline-none focus:border-primary bg-white"
                />
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant">
              Employee will be prompted to set their personal private password upon first login.
            </p>
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
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors"
            >
              {submitting ? 'Creating...' : 'Register Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Employee: ${editingEmployee?.fullName || ''}`}
      >
        <form onSubmit={handleUpdateEmployee} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-on-surface block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={editFormData.fullName}
              onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface block mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-on-surface block mb-1">Department</label>
              <select
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white"
              >
                <option value="Road Works & Potholes">Road Works & Potholes</option>
                <option value="Street Lighting & Electrical">Street Lighting & Electrical</option>
                <option value="Solid Waste & Sanitation">Solid Waste & Sanitation</option>
                <option value="Storm Water Drainage">Storm Water Drainage</option>
                <option value="Parks & Public Spaces">Parks & Public Spaces</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface block mb-1">Designation</label>
              <input
                type="text"
                required
                value={editFormData.designation}
                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-bold text-on-surface block mb-1">Assigned Zone</label>
              <input
                type="text"
                required
                value={editFormData.assignedZone}
                onChange={(e) => setEditFormData({ ...editFormData, assignedZone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">Office / Base Address</label>
            <input
              type="text"
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          <div className="border-t border-surface-container pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset Password: ${resetTargetEmployee?.fullName || ''}`}
      >
        <form onSubmit={handleExecuteResetPassword} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <p className="font-bold">Reset Employee Login Credentials</p>
            <p className="text-[11px] mt-0.5">
              Resetting will invalidate their existing password and generate a new temporary password.
            </p>
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">
              New Password (Optional - leave blank to auto-generate)
            </label>
            <input
              type="password"
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              placeholder="Auto-generated if left blank"
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary"
            />
          </div>

          <div className="border-t border-surface-container pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resettingPassword}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
            >
              {resettingPassword ? 'Resetting...' : 'Confirm Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Staff Details: ${viewingEmployee?.fullName || ''}`}
      >
        {viewingEmployee && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-surface-container">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-lg">
                {viewingEmployee.fullName[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">{viewingEmployee.fullName}</h3>
                <p className="text-primary font-mono font-bold text-xs">{viewingEmployee.employeeId}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold mt-1 ${viewingEmployee.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {viewingEmployee.isOnline ? '● Currently Online' : '○ Offline'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-surface-container">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Email</span>
                <p className="font-semibold text-on-surface mt-0.5">{viewingEmployee.email}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-surface-container">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Phone</span>
                <p className="font-semibold text-on-surface font-mono mt-0.5">{viewingEmployee.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-surface-container">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Department</span>
                <p className="font-semibold text-on-surface mt-0.5">{viewingEmployee.department}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-surface-container">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Designation</span>
                <p className="font-semibold text-on-surface mt-0.5">{viewingEmployee.designation}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-surface-container">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">Assigned Zone</span>
              <p className="font-semibold text-on-surface mt-0.5">{viewingEmployee.assignedZone}</p>
            </div>

            {viewingEmployee.address && (
              <div className="p-2.5 rounded-xl bg-white border border-surface-container">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Base Address</span>
                <p className="text-on-surface mt-0.5">{viewingEmployee.address}</p>
              </div>
            )}

            {viewingEmployee.notes && (
              <div className="p-2.5 rounded-xl bg-white border border-surface-container">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Internal Notes</span>
                <p className="text-on-surface mt-0.5">{viewingEmployee.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800">Assigned</span>
                <p className="text-base font-black text-amber-900">{viewingEmployee.assignedReportsCount || 0}</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800">Completed</span>
                <p className="text-base font-black text-emerald-900">{viewingEmployee.completedReportsCount || 0}</p>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800">In Progress</span>
                <p className="text-base font-black text-blue-900">{viewingEmployee.inProgressReportsCount || 0}</p>
              </div>
            </div>

            <div className="border-t border-surface-container pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
