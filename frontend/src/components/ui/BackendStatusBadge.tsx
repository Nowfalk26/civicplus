import React, { useState, useEffect } from 'react';
import { API_URL, pingBackendHealth, setBackendUrl, resetBackendUrl } from '../../lib/api';
import { Modal } from './Modal';
import toast from 'react-hot-toast';

export const BackendStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'degraded' | 'offline'>('checking');
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'unknown'>('unknown');
  const [latency, setLatency] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency?: number; data?: any } | null>(null);

  const checkStatus = async () => {
    setStatus('checking');
    const res = await pingBackendHealth();
    if (res.ok) {
      setStatus('online');
      setDbStatus('connected');
      setLatency(res.latency);
    } else if (res.data?.status === 'degraded' || res.data?.database === 'disconnected' || res.data?.database === 'connecting') {
      setStatus('degraded');
      setDbStatus(res.data?.database || 'disconnected');
      setLatency(res.latency);
    } else {
      setStatus('offline');
      setDbStatus('disconnected');
      setLatency(null);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    setCustomInput(API_URL);
    setTestResult(null);
    setIsOpen(true);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await pingBackendHealth(customInput);
      setTestResult(res);
      if (res.ok) {
        toast.success(`Server reachable! Latency: ${res.latency}ms`);
      } else {
        toast.error(`Health status: ${res.message}`);
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) {
      resetBackendUrl();
      toast.success('Reset to default API endpoint.');
      return;
    }
    setBackendUrl(customInput);
    toast.success('Backend URL updated! Reconnecting...');
    setIsOpen(false);
  };

  const handleUsePreset = (url: string) => {
    setCustomInput(url);
  };

  return (
    <>
      {/* Floating Status Pill */}
      <div className="fixed bottom-3 right-3 z-40">
        <button
          type="button"
          onClick={handleOpen}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border shadow-md transition-all backdrop-blur-md ${
            status === 'online'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900'
              : status === 'degraded'
              ? 'bg-amber-950/90 text-amber-300 border-amber-700/60 hover:bg-amber-900'
              : status === 'checking'
              ? 'bg-slate-900/90 text-slate-300 border-slate-700/60 hover:bg-slate-800'
              : 'bg-red-950/90 text-red-300 border-red-700/60 hover:bg-red-900 animate-pulse'
          }`}
          title="Click to check or configure backend server connection"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'online'
                ? 'bg-emerald-400 shadow-xs shadow-emerald-400'
                : status === 'degraded'
                ? 'bg-amber-400 shadow-xs shadow-amber-400 animate-pulse'
                : status === 'checking'
                ? 'bg-blue-400 animate-spin'
                : 'bg-red-500'
            }`}
          />
          <span>
            {status === 'online'
              ? `Backend & DB Online (${latency}ms)`
              : status === 'degraded'
              ? `Backend Online • DB ${dbStatus} (${latency}ms)`
              : status === 'checking'
              ? 'Checking Backend...'
              : 'Backend Offline (Click to Fix)'}
          </span>
          <span className="material-symbols-outlined text-[14px]">settings</span>
        </button>
      </div>

      {/* Connection Diagnostic Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Backend Server & Database Diagnostics"
      >
        <div className="space-y-4 text-xs">
          {/* Diagnostic Info Grid */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-surface-container border border-outline-variant font-mono text-[11px]">
            <div>
              <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Frontend Origin:</span>
              <span className="text-on-surface font-semibold truncate block">{typeof window !== 'undefined' ? window.location.origin : 'N/A'}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Backend API URL:</span>
              <span className="text-on-surface font-semibold truncate block">{API_URL}</span>
            </div>
            <div>
              <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Backend Service:</span>
              <span className={`font-semibold ${status === 'online' || status === 'degraded' ? 'text-emerald-600' : 'text-red-600'}`}>
                {status === 'online' || status === 'degraded' ? 'ONLINE (HTTP 200)' : 'UNREACHABLE'}
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Database Status:</span>
              <span className={`font-semibold ${dbStatus === 'connected' ? 'text-emerald-600' : dbStatus === 'connecting' ? 'text-amber-600' : 'text-red-600'}`}>
                {dbStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Current Status Box */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              status === 'online'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : status === 'degraded'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[24px] shrink-0 mt-0.5 ${
                status === 'online' ? 'text-emerald-600' : status === 'degraded' ? 'text-amber-600' : 'text-red-600'
              }`}
            >
              {status === 'online' ? 'cloud_done' : status === 'degraded' ? 'cloud_sync' : 'cloud_off'}
            </span>
            <div className="space-y-1">
              <p className="font-bold text-sm">
                {status === 'online'
                  ? 'Backend & Database Connected'
                  : status === 'degraded'
                  ? 'Backend Online • Database Reconnecting'
                  : 'Backend Server Is Unreachable'}
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                {status === 'online'
                  ? 'Authentication, civic complaints, and field verification queries are communicating with MongoDB Atlas.'
                  : status === 'degraded'
                  ? 'Backend is responding to requests, but database connection is reconnecting. Ensure IP is whitelisted in MongoDB Atlas.'
                  : 'The frontend cannot reach your backend API. Verify the configured endpoint below.'}
              </p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="font-bold text-on-surface block text-[11px]">
              Quick Endpoint Presets:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleUsePreset(`${window.location.origin}/api`)}
                className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant font-mono text-[10px] hover:bg-surface-container-high transition-colors"
              >
                Same Origin ({window.location.origin}/api)
              </button>
              <button
                type="button"
                onClick={() => handleUsePreset('http://localhost:3000/api')}
                className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant font-mono text-[10px] hover:bg-surface-container-high transition-colors"
              >
                Local Dev (http://localhost:3000/api)
              </button>
            </div>
          </div>

          {/* Form to change backend URL */}
          <form onSubmit={handleSave} className="space-y-3 pt-1">
            <div>
              <label className="font-bold text-on-surface block mb-1">
                Backend API Endpoint URL:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="e.g. https://your-backend.vercel.app/api or /api"
                  className="flex-1 p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary font-mono text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3.5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest font-bold text-xs shrink-0 flex items-center gap-1 transition-colors"
                >
                  {testing ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">network_check</span>
                  )}
                  <span>Test Ping</span>
                </button>
              </div>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-medium'
                    : 'bg-red-50 text-red-900 border-red-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">
                    {testResult.ok ? 'check_circle' : 'error'}
                  </span>
                  <span>{testResult.message}</span>
                </div>
                {testResult.latency !== undefined && (
                  <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                    {testResult.latency}ms
                  </span>
                )}
              </div>
            )}

            <div className="border-t border-surface-container pt-3 flex justify-between items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetBackendUrl();
                  toast.success('Reset to default.');
                  setIsOpen(false);
                }}
                className="text-[11px] text-on-surface-variant hover:text-red-600 underline font-medium"
              >
                Reset to Default
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors"
                >
                  Apply & Reconnect
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};
