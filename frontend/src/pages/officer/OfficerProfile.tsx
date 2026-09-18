import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { TN_DISTRICTS } from '../../lib/utils';

const DEPARTMENTS = [
  'Public Works Department (PWD)',
  'TANGEDCO (Electricity Board)',
  'TWAD (Water Supply & Drainage)',
  'Corporation Health & Sanitation',
  'Revenue & Municipal Administration',
  'Highways & Rural Works',
  'Pollution Control Board',
];

const profileChangeSchema = z.object({
  requestedDepartment: z.string().min(2, 'Please select requested department'),
  requestedDesignation: z.string().min(2, 'Please enter requested designation'),
  requestedLocation: z.string().min(2, 'Please select requested district/jurisdiction'),
  requestedPhone: z
    .string()
    .regex(/^\+?91?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number (+91)'),
  reason: z.string().min(10, 'Please state the official transfer/change justification'),
  supportingDocumentUrl: z.string().optional(),
});

type ProfileChangeFormValues = z.infer<typeof profileChangeSchema>;

export const OfficerProfile: React.FC = () => {
  const { user } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileChangeFormValues>({
    resolver: zodResolver(profileChangeSchema),
    defaultValues: {
      requestedDepartment: user?.department || '',
      requestedDesignation: user?.designation || '',
      requestedLocation: user?.location || 'Chennai, Tamil Nadu',
      requestedPhone: user?.phone || '',
    },
  });

  const fetchRequests = async () => {
    try {
      const res = await api.get('/auth/officer/profile-change-requests');
      if (res.data?.success) {
        setMyRequests(res.data.requests);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onSubmitChangeRequest = async (values: ProfileChangeFormValues) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/officer/profile-change-request', values);
      if (res.data?.success) {
        toast.success('Profile change request submitted for Controller review!');
        setShowModal(false);
        reset();
        fetchRequests();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit profile change request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Officer Official Profile</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Government of Tamil Nadu Civic Officer Credentials & Deployment Profile
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">edit_document</span>
          <span>Request Profile Change</span>
        </button>
      </div>

      {/* Official Identity Card */}
      <div className="bg-white rounded-3xl border border-surface-container shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-surface-container">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'}
            alt={user?.name || user?.username}
            className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-600 shadow-md"
          />
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
              <span>ACTIVE TAMIL NADU CIVIC OFFICER</span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface">{user?.name || user?.username}</h2>
            <p className="text-sm font-semibold text-primary">{user?.designation || 'Field Inspector'}</p>
            <p className="text-xs text-on-surface-variant">{user?.department || 'Public Grievance Redressal'}</p>
          </div>
        </div>

        {/* Read-Only Protected Attributes Notice */}
        <div className="my-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-700 text-[18px] shrink-0 mt-0.5">
            lock
          </span>
          <p>
            <strong>Official Profile Protection:</strong> To preserve civic accountability and fraud prevention, official profile details (Department, Designation, Posted District, Phone) cannot be modified directly. All alterations require approval by the State Civic Controller.
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Department</span>
            <p className="text-sm font-bold text-on-surface">{user?.department || 'Public Grievance'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Designation</span>
            <p className="text-sm font-bold text-on-surface">{user?.designation || 'Field Inspector'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Official Email</span>
            <p className="text-sm font-bold text-on-surface">{user?.email}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Registered Phone</span>
            <p className="text-sm font-bold text-on-surface">{user?.phone || 'Not provided'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Jurisdiction / Location</span>
            <p className="text-sm font-bold text-on-surface">{user?.location}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-1">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">Approval Status</span>
            <p className="text-sm font-bold text-emerald-700">APPROVED BY CONTROLLER</p>
          </div>
        </div>
      </div>

      {/* History of Profile Change Requests */}
      <div className="bg-white rounded-3xl border border-surface-container shadow-sm p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-on-surface">Your Profile Change Requests</h3>
        {myRequests.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No profile change requests filed yet.</p>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="text-on-surface-variant">
                      Submitted on {new Date(req.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="font-semibold text-on-surface">
                    Requested: {req.requestedDepartment} • {req.requestedDesignation} ({req.requestedLocation})
                  </p>
                  <p className="text-[11px] text-on-surface-variant">Reason: {req.reason}</p>
                  {req.decisionNotes && (
                    <p className="text-[11px] text-blue-700 font-medium">Controller Notes: {req.decisionNotes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Request Profile Change */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-surface-container shadow-2xl p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <h3 className="text-xl font-bold text-on-surface">Request Profile Change</h3>
                <p className="text-xs text-on-surface-variant">
                  This form will be routed directly to the State Civic Controller.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitChangeRequest)} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Requested Department *</label>
                  <select
                    {...register('requestedDepartment')}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-blue-600 outline-none bg-white text-xs"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Requested Designation *</label>
                  <input
                    {...register('requestedDesignation')}
                    type="text"
                    placeholder="e.g. Executive Engineer"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-blue-600 outline-none text-xs"
                  />
                  {errors.requestedDesignation && (
                    <p className="text-red-600 mt-1">{errors.requestedDesignation.message}</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Requested District *</label>
                  <select
                    {...register('requestedLocation')}
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-blue-600 outline-none bg-white text-xs"
                  >
                    {TN_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Requested Official Phone *</label>
                  <input
                    {...register('requestedPhone')}
                    type="tel"
                    placeholder="+919876543210"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-blue-600 outline-none text-xs"
                  />
                  {errors.requestedPhone && (
                    <p className="text-red-600 mt-1">{errors.requestedPhone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Official Transfer / Change Justification *</label>
                <textarea
                  {...register('reason')}
                  rows={3}
                  placeholder="Reference official transfer order, G.O. notification number, or departmental reallocation notice..."
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-blue-600 outline-none resize-none text-xs"
                />
                {errors.reason && <p className="text-red-600 mt-1">{errors.reason.message}</p>}
              </div>

              <div>
                <label className="block font-bold text-on-surface mb-1">Supporting Order URL (Optional)</label>
                <input
                  {...register('supportingDocumentUrl')}
                  type="text"
                  placeholder="https://tn.gov.in/orders/go-1234.pdf"
                  className="w-full px-3 py-2 rounded-xl border border-outline-variant focus:border-blue-600 outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-surface-container hover:bg-surface-container text-on-surface font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit to Controller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
