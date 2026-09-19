import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  phone: string;
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN';
  location: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  needsPasswordChange?: boolean;
  approvedAt?: string | null;
  approvedById?: string | null;
  fraudScore: number;
  isBanned: boolean;
  bannedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}


interface AppState {
  user: User | null;
  token: string | null;
  language: 'en' | 'ta';
  selectedDistrict: string;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  updateUser: (userPartial: Partial<User>) => void;
  logout: () => void;
  toggleLanguage: () => void;
  setLanguage: (lang: 'en' | 'ta') => void;
  setSelectedDistrict: (district: string) => void;
}

export const useStore = create<AppState>((set) => {
  // Ensure fresh start: Purge any old demo/stale sessions
  let initialUser: User | null = null;
  let initialToken: string | null = null;
  const storedUser = localStorage.getItem('civics_user');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (
        parsed.id?.includes('seed') ||
        parsed.id?.startsWith('usr-citizen') ||
        parsed.id?.startsWith('usr-officer')
      ) {
        localStorage.removeItem('civics_user');
        localStorage.removeItem('civics_access_token');
        localStorage.removeItem('civics_refresh_token');
      } else {
        initialUser = parsed;
        initialToken = localStorage.getItem('civics_access_token') || null;

        // Session validation (Case G): Check if access token is expired
        if (initialToken) {
          try {
            const parts = initialToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload.exp && payload.exp * 1000 < Date.now()) {
                // Access token expired, check if refresh token is valid
                const refreshToken = localStorage.getItem('civics_refresh_token');
                let refreshValid = false;
                if (refreshToken) {
                  try {
                    const rParts = refreshToken.split('.');
                    if (rParts.length === 3) {
                      const rPayload = JSON.parse(atob(rParts[1]));
                      if (rPayload.exp && rPayload.exp * 1000 > Date.now()) {
                        refreshValid = true;
                      }
                    }
                  } catch {
                    refreshValid = false;
                  }
                }
                if (!refreshValid) {
                  localStorage.removeItem('civics_user');
                  localStorage.removeItem('civics_access_token');
                  localStorage.removeItem('civics_refresh_token');
                  initialUser = null;
                  initialToken = null;
                }
              }
            }
          } catch {
            localStorage.removeItem('civics_user');
            localStorage.removeItem('civics_access_token');
            localStorage.removeItem('civics_refresh_token');
            initialUser = null;
            initialToken = null;
          }
        }
      }
    } catch {
      localStorage.removeItem('civics_user');
      localStorage.removeItem('civics_access_token');
      localStorage.removeItem('civics_refresh_token');
    }
  }
  const initialLang = (localStorage.getItem('civics_lang') as 'en' | 'ta') || 'en';

  return {
    user: initialUser,
    token: initialToken,
    language: initialLang,
    selectedDistrict: 'All Districts',

    setAuth: (user, token, refreshToken) => {
      localStorage.setItem('civics_user', JSON.stringify(user));
      localStorage.setItem('civics_access_token', token);
      if (refreshToken) {
        localStorage.setItem('civics_refresh_token', refreshToken);
      }
      set({ user, token });
    },

    updateUser: (userPartial) => {
      set((state) => {
        if (!state.user) return state;
        const updated = { ...state.user, ...userPartial };
        localStorage.setItem('civics_user', JSON.stringify(updated));
        return { user: updated };
      });
    },

    logout: () => {
      localStorage.removeItem('civics_user');
      localStorage.removeItem('civics_access_token');
      localStorage.removeItem('civics_refresh_token');
      set({ user: null, token: null });
    },

    toggleLanguage: () => {
      set((state) => {
        const nextLang = state.language === 'en' ? 'ta' : 'en';
        localStorage.setItem('civics_lang', nextLang);
        return { language: nextLang };
      });
    },

    setLanguage: (lang) => {
      localStorage.setItem('civics_lang', lang);
      set({ language: lang });
    },

    setSelectedDistrict: (district) => {
      set({ selectedDistrict: district });
    },
  };
});

if (typeof window !== 'undefined') {
  window.addEventListener('civics_session_expired', () => {
    useStore.getState().logout();
  });
}
