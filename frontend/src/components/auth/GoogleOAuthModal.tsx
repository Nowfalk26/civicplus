import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (clientId: string) => void;
}

export const DEFAULT_GOOGLE_CLIENT_ID = '242104758662-jc2tau4io58q5grdirjsr471lkqt3mn3.apps.googleusercontent.com';

export const isGoogleClientIdConfigured = (clientId?: string): boolean => {
  if (!clientId) return false;
  const clean = clientId.trim();
  if (clean.includes('mock') || clean.includes('placeholder')) return false;
  return clean.endsWith('.apps.googleusercontent.com');
};

export const getEffectiveGoogleClientId = (): string => {
  const localId = localStorage.getItem('civics_google_client_id');
  if (localId && isGoogleClientIdConfigured(localId)) return localId.trim();
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (envId && isGoogleClientIdConfigured(envId)) return envId.trim();
  return DEFAULT_GOOGLE_CLIENT_ID;
};

export const GoogleOAuthModal: React.FC<GoogleOAuthModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const effective = getEffectiveGoogleClientId();
      setCurrentConfig(effective);
      setClientId(effective);
    }
  }, [isOpen]);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = clientId.trim();

    if (!cleanId) {
      toast.error('Please enter your Google OAuth Web Client ID.');
      return;
    }

    if (!cleanId.endsWith('.apps.googleusercontent.com') || !cleanId.includes('-')) {
      toast.error('Invalid Client ID format. It must look like: 1234567890-abcdef.apps.googleusercontent.com');
      return;
    }

    setLoading(true);
    try {
      // 1. Sync to backend and write to .env files
      const res = await api.post('/auth/save-google-client-id', { clientId: cleanId });

      if (res.data?.success) {
        // 2. Persist in localStorage
        localStorage.setItem('civics_google_client_id', cleanId);
        window.dispatchEvent(new Event('civics_google_client_id_changed'));

        toast.success('Real Google Client ID saved successfully!');
        if (onConfigSaved) {
          onConfigSaved(cleanId);
        }
        onClose();
      }
    } catch (err: any) {
      // Fallback: save to localStorage anyway so client can use it immediately
      localStorage.setItem('civics_google_client_id', cleanId);
      window.dispatchEvent(new Event('civics_google_client_id_changed'));
      toast.success('Saved to browser storage! You can now use Google Sign-In.');
      if (onConfigSaved) {
        onConfigSaved(cleanId);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isConfigured = isGoogleClientIdConfigured(currentConfig);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connect Real Google OAuth" maxWidth="lg">
      <div className="space-y-4">
        {/* Error 401 Explanation Alert */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
            <span className="material-symbols-outlined text-[20px] text-amber-600">error</span>
            <span>Why Google Shows "Error 401: invalid_client"</span>
          </div>
          <p className="leading-relaxed">
            Google accounts strictly require an active, registered <strong>OAuth 2.0 Web Client ID</strong> from Google Cloud Console. Because the system currently has a placeholder ID, Google's OAuth server rejected the connection request with <code>Error 401: invalid_client</code>.
          </p>
        </div>

        {/* Setup Steps */}
        <div className="space-y-2 text-xs text-on-surface">
          <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">list_alt</span>
            <span>3 Steps to Get Your Real Google Client ID:</span>
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-on-surface-variant bg-surface-container-low p-3.5 rounded-xl border border-surface-container">
            <li>
              Open{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
              >
                Google Cloud Console Credentials
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </li>
            <li>
              Click <strong>"Create Credentials"</strong> &rarr; <strong>"OAuth client ID"</strong>:
              <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-[11px]">
                <li>Application type: <strong>Web application</strong></li>
                <li>
                  Authorized JavaScript origins: <code className="bg-white px-1 py-0.5 rounded border border-surface-container-high text-primary font-mono">http://localhost:5173</code>
                </li>
              </ul>
            </li>
            <li>Copy the generated <strong>Client ID</strong> and paste it into the box below.</li>
          </ol>
        </div>

        {/* Current status */}
        <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-surface-container-lowest border border-surface-container">
          <span className="text-on-surface-variant">Current OAuth Status:</span>
          <span className={`font-bold inline-flex items-center gap-1 ${isConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
            <span className="material-symbols-outlined text-[16px]">
              {isConfigured ? 'check_circle' : 'pending'}
            </span>
            {isConfigured ? 'Valid Client ID Configured' : 'No Valid Client ID Configured'}
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              Google OAuth 2.0 Web Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 1083928172839-xxxxxxxxx.apps.googleusercontent.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs font-mono outline-none transition-all"
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              Must end with <code>.apps.googleusercontent.com</code>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high text-xs font-semibold text-on-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !clientId}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">save</span>
              )}
              <span>Save & Connect Google Sign-In</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
