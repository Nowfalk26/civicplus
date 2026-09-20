import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';

const employeeLoginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your Employee ID, Official Email, or Mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type EmployeeLoginFormValues = z.infer<typeof employeeLoginSchema>;

export const EmployeeLogin: React.FC = () => {
  const { setAuth, language } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Change Password Modal (For mustChangePassword requirement)
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EmployeeLoginFormValues>({
    resolver: zodResolver(employeeLoginSchema),
  });

  const onSubmit = async (values: EmployeeLoginFormValues) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/employee/login', values);
      if (res.data?.success) {
        const { user, accessToken, refreshToken, mustChangePassword } = res.data;
        setAuth(user, accessToken, refreshToken);

        if (mustChangePassword) {
          setCurrentPassword(values.password);
          setChangePasswordModalOpen(true);
          toast(
            language === 'en'
              ? 'First login detected! Please set a new personal password.'
              : 'முதல் முறை உள்நுழைவு! புதிய கடவுச்சொல்லை அமைக்கவும்.',
            { icon: '🔑' }
          );
          return;
        }

        toast.success(
          language === 'en'
            ? `Welcome, ${user.name || 'Field Inspector'}!`
            : `நல்வரவு, ${user.name || 'கள ஆய்வாளர்'}!`
        );

        const redirectPath = (location.state as any)?.from?.pathname;
        navigate(redirectPath || '/employee/dashboard', { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (language === 'en'
          ? 'Invalid credentials. Check your Employee ID/Email and password.'
          : 'தவறான நற்சான்றிதழ்கள். பணியாளர் எண் மற்றும் கடவுச்சொல்லை சரிபார்க்கவும்.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(
        language === 'en'
          ? 'New password must be at least 6 characters long.'
          : 'புதிய கடவுச்சொல் குறைந்தது 6 எழுத்துகள் கொண்டிருக்க வேண்டும்.'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(
        language === 'en'
          ? 'New password and confirmation do not match.'
          : 'கடவுச்சொற்கள் பொருந்தவில்லை.'
      );
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/auth/employee/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        toast.success(
          language === 'en'
            ? 'Password updated successfully! Welcome to Field Portal.'
            : 'கடவுச்சொல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!'
        );
        setChangePasswordModalOpen(false);
        const redirectPath = (location.state as any)?.from?.pathname;
        navigate(redirectPath || '/employee/dashboard', { replace: true });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-8 space-y-6 text-white">
        {/* Header Badge & Icon */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-amber-600/30 border border-amber-400/30">
            <span className="material-symbols-outlined text-[36px]">engineering</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[11px] font-bold tracking-wide uppercase">
            <span>Field Workforce Gateway • கள பணியாளர் தளம்</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            {language === 'en' ? 'Employee Login' : 'கள பணியாளர் உள்நுழைவு'}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {language === 'en'
              ? 'Authorized Field Staff & Verification Officers of Tamil Nadu Municipal Administration.'
              : 'தமிழ்நாடு நகராட்சி நிர்வாகத்தின் அங்கீகரிக்கப்பட்ட கள பணியாளர்கள் மற்றும் சரிபார்ப்பு அலுவலர்கள்.'}
          </p>
        </div>

        {/* Credentials Notice (Strictly No Social Auth) */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-start gap-2.5">
          <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">
            security
          </span>
          <div className="text-[11px] leading-relaxed">
            <p className="font-semibold text-slate-200">
              {language === 'en'
                ? 'Department-Issued Credentials Only'
                : 'துறையால் வழங்கப்பட்ட நற்சான்றிதழ்கள் மட்டும்'}
            </p>
            <p className="text-slate-400 mt-0.5">
              {language === 'en'
                ? 'Log in using the Employee ID (EMP-TN-xxxx), official email, or registered phone number assigned by your supervising Officer.'
                : 'உங்கள் மேற்பார்வை அதிகாரி வழங்கிய பணியாளர் எண், மின்னஞ்சல் அல்லது தொலைபேசி எண்ணைப் பயன்படுத்தவும்.'}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              {language === 'en'
                ? 'Employee ID, Official Email, or Phone'
                : 'பணியாளர் எண் / மின்னஞ்சல் / தொலைபேசி'}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                badge
              </span>
              <input
                {...register('identifier')}
                type="text"
                placeholder="e.g. EMP-TN-1001 or staff@tn.gov.in"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>
            {errors.identifier && (
              <p className="text-[11px] text-red-400 mt-1">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-300">
                {language === 'en' ? 'Password' : 'கடவுச்சொல்'}
              </label>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                lock
              </span>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-amber-600 focus:ring-amber-500"
              />
              <span>{language === 'en' ? 'Remember this terminal' : 'நினைவில் கொள்க'}</span>
            </label>
            <span className="text-[11px] text-slate-500">Secure SHA-256</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>{language === 'en' ? 'Verifying Credentials...' : 'சரிபார்க்கிறது...'}</span>
              </>
            ) : (
              <>
                <span>{language === 'en' ? 'Sign In to Field Portal' : 'கள தளத்தில் உள்நுழைய'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Switch Portal Links */}
        <div className="pt-4 border-t border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-400">
            {language === 'en' ? 'Are you an Officer or Controller?' : 'அதிகாரி அல்லது கட்டுப்பாட்டாளரா?'}
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link to="/officer/login" className="text-blue-400 hover:underline font-semibold">
              Officer Portal →
            </Link>
            <span className="text-slate-700">•</span>
            <Link to="/controller/login" className="text-purple-400 hover:underline font-semibold">
              Controller Portal →
            </Link>
          </div>
        </div>
      </div>

      {/* Must Change Password Modal */}
      <Modal
        isOpen={changePasswordModalOpen}
        onClose={() => {}} // Non-dismissible until changed
        title={language === 'en' ? 'Set Your Personal Password' : 'புதிய கடவுச்சொல்லை அமைக்கவும்'}
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <p className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
              {language === 'en' ? 'First Login Security Requirement' : 'பாதுகாப்பு நடைமுறை'}
            </p>
            <p className="text-[11px] mt-1 text-amber-800">
              {language === 'en'
                ? 'Your supervising officer provided an initial temporary password. You must set your own private password to activate your field inspector dashboard.'
                : 'உங்கள் மேற்பார்வை அதிகாரி தற்காலிக கடவுச்சொல்லை வழங்கியுள்ளார். உங்கள் சொந்த கடவுச்சொல்லை அமைக்கவும்.'}
            </p>
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">
              {language === 'en' ? 'New Password (min. 6 characters)' : 'புதிய கடவுச்சொல்'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-amber-500 bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">
              {language === 'en' ? 'Confirm New Password' : 'புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-amber-500 bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors"
            >
              {changingPassword
                ? (language === 'en' ? 'Updating Password...' : 'புதுப்பிக்கிறது...')
                : (language === 'en' ? 'Save Password & Enter Dashboard' : 'கடவுச்சொல்லை சேமிக்கவும்')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
