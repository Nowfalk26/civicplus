import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { formatAuthError, executeAuthWithRetry } from '../../lib/authErrors';

const controllerLoginSchema = z.object({
  identifier: z.string().min(1, 'Controller Email or Official ID is required'),
  password: z.string().min(6, 'Password is required'),
});

type ControllerLoginFormValues = z.infer<typeof controllerLoginSchema>;

export const ControllerLogin: React.FC = () => {
  const { setAuth, language } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ControllerLoginFormValues>({
    resolver: zodResolver(controllerLoginSchema),
  });

  const onSubmit = async (values: ControllerLoginFormValues) => {
    setLoading(true);
    try {
      const res = await executeAuthWithRetry(() => api.post('/auth/controller/login', values));
      if (res.data?.success) {
        const { user, accessToken, refreshToken } = res.data;
        setAuth(user, accessToken, refreshToken);
        toast.success(`Welcome, State Civic Controller!`);

        const redirectPath = (location.state as any)?.from?.pathname;
        navigate(redirectPath || '/admin/dashboard', { replace: true });
      }
    } catch (err: any) {
      const formatted = formatAuthError(err);
      toast.error(formatted.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-8 space-y-6 text-white">
        {/* Controller Seal */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-purple-600/30 border border-purple-400/30">
            <span className="material-symbols-outlined text-[36px]">shield</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-950/80 border border-purple-800/80 text-purple-300 text-[11px] font-bold tracking-wide uppercase">
            <span>State Controller Authority • தலைமை நிர்வாக பலகை</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Controller Login
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authorized State Civic Controller Access for Tamil Nadu Governance Platform.
          </p>
        </div>

        {/* Security Warning */}
        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-900/50 text-purple-200 text-xs flex items-start gap-2.5">
          <span className="material-symbols-outlined text-purple-400 text-[18px] shrink-0 mt-0.5">
            lock
          </span>
          <p className="text-[11px] leading-relaxed text-slate-300">
            Dedicated administrative console for reviewing officer applications, approving profile change requests, and enforcing anti-fraud protocols.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Controller Email or ID
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                admin_panel_settings
              </span>
              <input
                {...register('identifier')}
                type="text"
                placeholder="nowfal@gmail.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-white outline-none transition-all"
              />
            </div>
            {errors.identifier && (
              <p className="text-red-400 text-xs mt-1">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                key
              </span>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm text-white outline-none transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
            ) : (
              <>
                <span>Authenticate Controller Session</span>
                <span className="material-symbols-outlined text-[18px]">vpn_key</span>
              </>
            )}
          </button>

          {/* Quick Demo Pre-Fill */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setValue('identifier', 'nowfal@gmail.com');
                setValue('password', 'Admin@123');
              }}
              className="text-[11px] text-purple-400 font-bold hover:underline"
            >
              ⚡ Quick Fill Controller Credentials (nowfal@gmail.com)
            </button>
          </div>
        </form>


        {/* Portal Switching */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Looking for Civic portal?</span>
            <Link to="/civic/login" className="font-bold text-emerald-400 hover:underline">
              Civic Login →
            </Link>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Departmental Officer?</span>
            <Link to="/officer/login" className="font-bold text-blue-400 hover:underline">
              Officer Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
