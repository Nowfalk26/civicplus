import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { GoogleOAuthModal, isGoogleClientIdConfigured, getEffectiveGoogleClientId } from '../../components/auth/GoogleOAuthModal';
import { formatAuthError, executeAuthWithRetry } from '../../lib/authErrors';


const officerLoginSchema = z.object({
  email: z.string().email('Please provide a valid official email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type OfficerLoginFormValues = z.infer<typeof officerLoginSchema>;

export const OfficerLogin: React.FC = () => {
  const { setAuth, language } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [currentClientId, setCurrentClientId] = useState(getEffectiveGoogleClientId);

  const isConfigured = isGoogleClientIdConfigured(currentClientId);

  React.useEffect(() => {
    const handleUpdate = () => {
      setCurrentClientId(getEffectiveGoogleClientId());
    };
    window.addEventListener('civics_google_client_id_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('civics_google_client_id_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);



  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OfficerLoginFormValues>({
    resolver: zodResolver(officerLoginSchema),
  });

  // 1. Departmental Google OAuth
  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error('Google credential not provided.');
      return;
    }

    setLoading(true);
    try {
      const res = await executeAuthWithRetry(() =>
        api.post('/auth/officer/google', {
          credential: credentialResponse.credential,
        })
      );

      if (res.data?.success) {
        const { user, accessToken, refreshToken, needsPasswordChange } = res.data;
        setAuth(user, accessToken, refreshToken);

        if (needsPasswordChange || user?.needsPasswordChange) {
          toast(
            'Temporary password detected. You must configure your permanent officer password now.',
            { icon: '🔐' }
          );
          navigate('/officer/set-password', { replace: true });
          return;
        }

        toast.success(`Welcome, Officer ${user.name || user.username}!`);
        const redirectPath = (location.state as any)?.from?.pathname;
        navigate(redirectPath || '/officer/dashboard', { replace: true });
      }
    } catch (err: any) {
      const formatted = formatAuthError(err);
      toast.error(formatted.message, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  // 2. Departmental Email & Password Login
  const onSubmit = async (values: OfficerLoginFormValues) => {
    setLoading(true);
    try {
      const res = await executeAuthWithRetry(() => api.post('/auth/officer/login', values));
      if (res.data?.success) {
        const { user, accessToken, refreshToken, needsPasswordChange } = res.data;
        setAuth(user, accessToken, refreshToken);

        if (needsPasswordChange || user?.needsPasswordChange) {
          toast(
            'Temporary password detected. You must configure your permanent officer password now.',
            { icon: '🔐' }
          );
          navigate('/officer/set-password', { replace: true });
          return;
        }

        toast.success(`Welcome, Officer ${user.name || user.username}!`);
        const redirectPath = (location.state as any)?.from?.pathname;
        navigate(redirectPath || '/officer/dashboard', { replace: true });
      }
    } catch (err: any) {
      const formatted = formatAuthError(err);
      toast.error(formatted.message, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-md bg-white rounded-3xl border border-surface-container shadow-2xl p-8 space-y-6">
        {/* Officer Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-700/25">
            <span className="material-symbols-outlined text-[30px]">engineering</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
            <span>Official Portal • அதிகாரி தளம்</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Officer Login</h1>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Authorized Tamil Nadu Civic Personnel (PWD, TANGEDCO, TWAD, Corporation Health & Sanitation).
          </p>
        </div>

        {/* Access Notice Alert */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs flex items-start gap-2.5">
          <span className="material-symbols-outlined text-blue-700 text-[18px] shrink-0 mt-0.5">
            verified_user
          </span>
          <p className="leading-relaxed">
            <strong>Approval-Based Access:</strong> Only official accounts verified and approved by the State Controller can access this portal.
          </p>
        </div>

        {/* Real Google OAuth Sign-in */}
        <div className="space-y-3">
          <div className="w-full flex justify-center">
            {isConfigured ? (
              <div className="flex flex-col items-center gap-1.5 w-full">
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      toast.error('Officer Google Sign-In failed or was cancelled.');
                    }}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    width="360"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="text-[11px] text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 mt-1"
                >
                  <span className="material-symbols-outlined text-[13px]">settings</span>
                  <span>Update Google Client ID</span>
                </button>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="w-full max-w-[360px] py-2.5 px-4 rounded-xl border border-outline-variant bg-white hover:bg-surface-container-low text-on-surface font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-3 active:scale-[0.99]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-medium inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  <span>Fix Google Error 401 (Connect Client ID)</span>
                </button>
              </div>
            )}
          </div>


          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-surface-container-high w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-outline uppercase">
              or use official credentials
            </span>
            <div className="border-t border-surface-container-high w-full" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Official Department Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                badge
              </span>
              <input
                {...register('email')}
                type="email"
                placeholder="officer1@tn.gov.in"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none transition-all"
              />
            </div>
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                lock
              </span>
              <input
                {...register('password')}
                type="password"
                placeholder="Temporary or permanent password"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-outline-variant focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-sm outline-none transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
            ) : (
              <>
                <span>Sign In as Officer</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>

          {/* Quick Demo Pre-Fill */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setValue('email', 'officer1@tn.gov.in');
                setValue('password', 'Officer@123');
              }}
              className="text-[11px] text-blue-700 font-bold hover:underline"
            >
              ⚡ Quick Fill Approved Officer Demo
            </button>
          </div>
        </form>

        {/* Officer Request Access CTA */}
        <div className="pt-4 border-t border-surface-container space-y-3">
          <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container text-center space-y-1.5">
            <p className="text-xs font-bold text-on-surface">New Departmental Officer?</p>
            <p className="text-[11px] text-on-surface-variant">
              Officers cannot sign up directly. Submit an access request with your departmental credentials for Controller approval.
            </p>
            <Link
              to="/officer/request-access"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline pt-1"
            >
              <span>Submit Officer Access Request</span>
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
            </Link>
          </div>

          {/* Portal Switching */}
          <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1">
            <span>Are you a Citizen?</span>
            <Link to="/civic/login" className="font-bold text-emerald-700 hover:underline">
              Civic Login →
            </Link>
          </div>
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>State Civic Authority?</span>
            <Link to="/controller/login" className="font-bold text-purple-700 hover:underline">
              Controller Login →
            </Link>
          </div>
        </div>
      </div>

      {/* Google OAuth Config Modal */}
      <GoogleOAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onConfigSaved={(newId) => {
          setCurrentClientId(newId);
        }}
      />
    </div>
  );
};

