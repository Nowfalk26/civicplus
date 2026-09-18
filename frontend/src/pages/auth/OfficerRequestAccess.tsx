import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
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

const requestAccessSchema = z.object({
  name: z.string().min(3, 'Full official name is required'),
  email: z.string().email('Valid official email address is required'),
  phone: z
    .string()
    .regex(/^\+?91?[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number (+91)'),
  department: z.string().min(2, 'Please select your department'),
  designation: z.string().min(2, 'Designation / Post title is required'),
  district: z.string().min(2, 'Please select your posted district'),
  governmentIdProof: z.string().min(5, 'Government ID Proof or Service Badge Number is mandatory'),
  idProofType: z.string().default('TN_CIVIC_BADGE'),
  reason: z.string().min(10, 'Please state the official reason for requesting portal access'),
});

type RequestAccessFormValues = z.infer<typeof requestAccessSchema>;

export const OfficerRequestAccess: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RequestAccessFormValues>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      idProofType: 'TN_CIVIC_BADGE',
      district: 'Chennai',
    },
  });

  const onSubmit = async (values: RequestAccessFormValues) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/officer/request-access', values);
      if (res.data?.success) {
        setSubmitted(true);
        setSubmittedRequest(res.data.request);
        toast.success('Official access application submitted successfully!');
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to submit application. Please check details.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-surface-container shadow-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[36px]">schedule</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-on-surface">Application Under Review</h1>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Your officer access request has been securely registered in the State Controller's pending approvals queue.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant">Applicant Name:</span>
              <span className="font-bold text-on-surface">{submittedRequest?.name}</span>
            </div>
            <div className="flex justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant">Official Email:</span>
              <span className="font-bold text-on-surface">{submittedRequest?.email}</span>
            </div>
            <div className="flex justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant">Department:</span>
              <span className="font-bold text-primary">{submittedRequest?.department}</span>
            </div>
            <div className="flex justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant">Designation:</span>
              <span className="font-bold text-on-surface">{submittedRequest?.designation}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-on-surface-variant">Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                PENDING CONTROLLER APPROVAL
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs text-left flex items-start gap-2.5">
            <span className="material-symbols-outlined text-blue-700 text-[18px] shrink-0 mt-0.5">
              mail
            </span>
            <p>
              Once approved by the Controller, you will receive an official notification email containing your temporary one-time login credentials.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-4">
            <Link
              to="/officer/login"
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary-dark transition-colors shadow-sm"
            >
              Return to Officer Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-10 px-4 bg-surface flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-surface-container shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="border-b border-surface-container pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>Official Government Request • அரசு உத்தியோகபூர்வ கோரிக்கை</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
            Officer Access Request
          </h1>
          <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
            Civic officers require controller authorization prior to account creation. Please complete your official credentials below.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Officer Full Name *
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="e.g. Dr. A. Selvaraj"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none"
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Official Email */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Official Departmental Email *
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="e.g. selvaraj.pwd@tn.gov.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none"
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Official Phone */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Phone Number (+91) *
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="+919876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none"
              />
              {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Jurisdiction / District *
              </label>
              <select
                {...register('district')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none bg-white"
              >
                {TN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Department / Authority *
              </label>
              <select
                {...register('department')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none bg-white"
              >
                <option value="">-- Select Department --</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="text-red-600 text-xs mt-1">{errors.department.message}</p>
              )}
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Official Designation / Title *
              </label>
              <input
                {...register('designation')}
                type="text"
                placeholder="e.g. Assistant Executive Engineer (AEE)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none"
              />
              {errors.designation && (
                <p className="text-red-600 text-xs mt-1">{errors.designation.message}</p>
              )}
            </div>
          </div>

          {/* Government ID Proof */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Govt Service Badge ID / Official Employee Number *
            </label>
            <input
              {...register('governmentIdProof')}
              type="text"
              placeholder="e.g. TN-PWD-EMP-44892 or IFHRMS Employee ID"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none"
            />
            {errors.governmentIdProof && (
              <p className="text-red-600 text-xs mt-1">{errors.governmentIdProof.message}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Duty Jurisdiction / Purpose of Access *
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Briefly state your jurisdictional jurisdiction, field crew assignment, and official responsibilities..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none resize-none"
            />
            {errors.reason && <p className="text-red-600 text-xs mt-1">{errors.reason.message}</p>}
          </div>

          {/* Submit */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/officer/login"
              className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              ← Back to Officer Login
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
              ) : (
                <>
                  <span>Submit Request for Controller Review</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
