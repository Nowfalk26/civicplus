import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const AdminSettings: React.FC = () => {
  // Governance policy toggles
  const [autoBanEnabled, setAutoBanEnabled] = useState(true);
  const [requirePhotos, setRequirePhotos] = useState(true);
  const [gpsValidation, setGpsValidation] = useState(true);
  const [warningSms, setWarningSms] = useState(true);

  // Template editor
  const [smsTemplate, setSmsTemplate] = useState(
    '[Civics Plus TN] உங்கள் புகார் {COMPLAINT_ID} வெற்றிகரமாக பதிவு செய்யப்பட்டது. Track at civicsplus.tn.gov.in'
  );
  const [banTemplate, setBanTemplate] = useState(
    'Civics Plus TN: Your account has been temporarily suspended due to civic fraud violations until {BANNED_DATE}.'
  );

  const handleSaveSettings = () => {
    toast.success('System governance policies saved successfully.');
  };

  const adminUsers = [
    { name: 'Chief State Administrator', email: 'admin1@tn.gov.in', district: 'Chennai', role: 'Super Admin' },
    { name: 'South Zone Director', email: 'admin2@tn.gov.in', district: 'Madurai', role: 'Regional Admin' },
    { name: 'West Zone Director', email: 'admin3@tn.gov.in', district: 'Coimbatore', role: 'Regional Admin' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Platform Governance & Settings</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Configure automated fraud enforcement thresholds, notification templates, and system policies
        </p>
      </div>

      {/* Enforcement Rules Toggles */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">security</span>
          Anti-Fraud & Policy Thresholds
        </h2>

        <div className="space-y-4 text-xs">
          {/* Toggle 1: Auto-ban */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div>
              <p className="font-bold text-on-surface">
                Automated 7-Day Ban on High Fraud Score (&gt; 80 points)
              </p>
              <p className="text-on-surface-variant">
                Instantly restricts account from submitting new reports if fraud threshold is breached.
              </p>
            </div>
            <button
              onClick={() => setAutoBanEnabled(!autoBanEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                autoBanEnabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  autoBanEnabled ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Require Photos */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div>
              <p className="font-bold text-on-surface">Mandatory Photographic Evidence</p>
              <p className="text-on-surface-variant">
                Enforce at least 1 verified photograph upload for every civic ticket submission.
              </p>
            </div>
            <button
              onClick={() => setRequirePhotos(!requirePhotos)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                requirePhotos ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  requirePhotos ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: GPS Distance Validation */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div>
              <p className="font-bold text-on-surface">
                GPS Anomaly & Distance Verification (&gt;50km check)
              </p>
              <p className="text-on-surface-variant">
                Flag user submissions positioned more than 50km apart within 24 hours (+25 pts).
              </p>
            </div>
            <button
              onClick={() => setGpsValidation(!gpsValidation)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                gpsValidation ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  gpsValidation ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle 4: Warning SMS */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
            <div>
              <p className="font-bold text-on-surface">
                Automated Disciplinary Warning SMS on 50+ Fraud Points
              </p>
              <p className="text-on-surface-variant">
                Dispatch bilingual cautionary text warning citizen before suspension is applied.
              </p>
            </div>
            <button
              onClick={() => setWarningSms(!warningSms)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                warningSms ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  warningSms ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Template Editor */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">sms</span>
          Bilingual SMS Notification Templates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-on-surface">
              Complaint Registration SMS (Tamil & English):
            </label>
            <textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-on-surface">Account Suspension SMS Notice:</label>
            <textarea
              value={banTemplate}
              onChange={(e) => setBanTemplate(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="py-2.5 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs shadow-sm transition-all"
        >
          Save All System Policies
        </button>
      </div>

      {/* Authorized Administrators List */}
      <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-4">
        <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-purple-700">
            admin_panel_settings
          </span>
          Authorized State Administrators (Tamil Nadu)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-container bg-surface-container-low text-on-surface-variant">
                <th className="p-3 font-bold">Officer Name</th>
                <th className="p-3 font-bold">Designation</th>
                <th className="p-3 font-bold">Administrative Email</th>
                <th className="p-3 font-bold">Zone District</th>
                <th className="p-3 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {adminUsers.map((a, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-3 font-bold text-on-surface">{a.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                      {a.role}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-primary">{a.email}</td>
                  <td className="p-3 text-on-surface">{a.district}</td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
