import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { TN_DISTRICTS } from '../lib/utils';
import { api } from '../lib/api';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must have at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .regex(/^\+?91?[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (+91...)'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  location: z.string().min(1, 'Please select your Tamil Nadu district'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { setAuth, language } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: '+9198',
      password: '',
      location: 'Tirunelveli',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      // Normalize phone number format
      let formattedPhone = values.phone.trim();
      if (!formattedPhone.startsWith('+91')) {
        if (formattedPhone.startsWith('91')) {
          formattedPhone = '+' + formattedPhone;
        } else {
          formattedPhone = '+91' + formattedPhone;
        }
      }

      const res = await api.post('/auth/register', {
        ...values,
        phone: formattedPhone,
      });

      if (res.data?.success && res.data?.user) {
        const { user, accessToken, refreshToken } = res.data;
        setAuth(user, accessToken, refreshToken);
        toast.success(
          language === 'en'
            ? 'Account registered successfully! Welcome to Civic+.'
            : 'கணக்கு வெற்றிகரமாக பதிவு செய்யப்பட்டது!'
        );
        navigate('/citizen/dashboard');
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          (err.response?.data?.errors && err.response.data.errors.join(', ')) ||
          'Registration failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-md bg-white rounded-2xl border border-surface-container shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mx-auto shadow-md shadow-primary/25">
            <span className="material-symbols-outlined text-[26px]">person_add</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">
            {language === 'en' ? 'Register Citizen Account' : 'குடிமகன் கணக்கு பதிவு'}
          </h1>
          <p className="text-xs text-on-surface-variant">
            {language === 'en'
              ? 'Join Tamil Nadu civic network and help improve your city'
              : 'தமிழ்நாடு குடிமை அமைப்பில் இணைந்து உங்கள் பகுதியை மேம்படுத்துங்கள்'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              {language === 'en' ? 'Full Name / Username' : 'முழு பெயர் / பயனர்பெயர்'}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                badge
              </span>
              <input
                {...register('username')}
                type="text"
                placeholder="e.g. karthik_raja"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
              />
            </div>
            {errors.username && (
              <p className="text-red-600 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              {language === 'en' ? 'Email Address' : 'மின்னஞ்சல் முகவரி'}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                mail
              </span>
              <input
                {...register('email')}
                type="email"
                placeholder="karthik@example.com"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              {language === 'en' ? 'Mobile Phone (+91 Indian format)' : 'மொபைல் எண் (+91)'}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                phone_iphone
              </span>
              <input
                {...register('phone')}
                type="text"
                placeholder="+919876543210"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
              />
            </div>
            {errors.phone && (
              <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              {language === 'en' ? 'Home District (Tamil Nadu)' : 'சொந்த மாவட்டம் (தமிழ்நாடு)'}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                location_city
              </span>
              <select
                {...register('location')}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none bg-white transition-all appearance-none"
              >
                {TN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
                expand_more
              </span>
            </div>
            {errors.location && (
              <p className="text-red-600 text-xs mt-1">{errors.location.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              {language === 'en' ? 'Create Password (min 8 characters)' : 'கடவுச்சொல் (குறைந்தது 8 எழுத்துக்கள்)'}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                password
              </span>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
            ) : (
              <>
                <span>{language === 'en' ? 'Register Account' : 'பதிவு செய்க'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-on-surface-variant">
          {language === 'en' ? 'Already have an account?' : 'ஏற்கனவே கணக்கு உள்ளதா?'}{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            {language === 'en' ? 'Log in' : 'உள்நுழைக'}
          </Link>
        </p>
      </div>
    </div>
  );
};
