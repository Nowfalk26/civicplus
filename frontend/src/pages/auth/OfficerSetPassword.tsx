import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

const setPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please confirm your temporary password'),
    newPassword: z
      .string()
      .min(8, 'Permanent password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export const OfficerSetPassword: React.FC = () => {
  const { user, updateUser } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onSubmit = async (values: SetPasswordFormValues) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/officer/set-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (res.data?.success) {
        updateUser({ needsPasswordChange: false });
        toast.success('Permanent password configured successfully! Welcome to your Officer Dashboard.');
        navigate('/officer/dashboard', { replace: true });
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to configure password. Please check your temporary password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-md bg-white rounded-3xl border border-surface-container shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-600/25">
            <span className="material-symbols-outlined text-[30px]">password</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
            <span>First-Time Officer Login • கட்டாய கடவுச்சொல் மாற்றம்</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Set Permanent Password</h1>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
            You are logged in with a temporary credentials issued upon Controller approval. You must configure your official permanent password.
          </p>
        </div>

        {/* Security guidelines */}
        <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface-variant space-y-1">
          <p className="font-bold text-on-surface">Password Requirements:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
            <li>Minimum 8 characters length</li>
            <li>At least one uppercase letter & one number</li>
            <li>At least one special character (!@#$%^&*)</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Current Temporary Password
            </label>
            <input
              {...register('currentPassword')}
              type="password"
              placeholder="Enter the one-time temporary password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 text-sm outline-none"
            />
            {errors.currentPassword && (
              <p className="text-red-600 text-xs mt-1">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              New Permanent Password
            </label>
            <input
              {...register('newPassword')}
              type="password"
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 text-sm outline-none"
            />
            {errors.newPassword && (
              <p className="text-red-600 text-xs mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Confirm New Permanent Password
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 text-sm outline-none"
            />
            {errors.confirmPassword && (
              <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
            ) : (
              <>
                <span>Save Password & Access Dashboard</span>
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
