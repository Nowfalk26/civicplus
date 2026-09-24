import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CategoryBadge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { GeoCameraModal } from '../../components/camera/GeoCameraModal';
import { formatCoordinates } from '../../utils/geoWatermark';

export const EmployeeDashboard: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [employeeProfile, setEmployeeProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Inspection & Verification Modal
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [verificationResult, setVerificationResult] = useState<'GENUINE' | 'FAKE' | 'NEEDS_REVIEW'>('GENUINE');
  const [progressStatus, setProgressStatus] = useState<string>('IN_PROGRESS');
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [evidenceSummary, setEvidenceSummary] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Mandatory Camera Geo-Evidence for Inspection & Sign-off
  const [verifyGeoEvidence, setVerifyGeoEvidence] = useState<{
    photoUrl: string;
    latitude: number;
    longitude: number;
    capturedAt: string;
    isLocationConfirmed: boolean;
    distanceKm: number;
  } | null>(null);
  const [isVerifyCameraOpen, setIsVerifyCameraOpen] = useState(false);

  // Work Tracking Action states
  const [workAction, setWorkAction] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionPhoto, setActionPhoto] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Geo-Stamped Work Evidence Camera states
  const [geoCameraOpen, setGeoCameraOpen] = useState(false);
  const [geoCameraStage, setGeoCameraStage] = useState<'SITE INSPECTION' | 'WORK STARTED' | 'WORK COMPLETED'>('SITE INSPECTION');
  const [geoEvidence, setGeoEvidence] = useState<{
    photoUrl: string;
    latitude: number;
    longitude: number;
    capturedAt: string;
    isLocationConfirmed: boolean;
    distanceKm: number;
  } | null>(null);

  useEffect(() => {
    fetchMyReports();
  }, [statusFilter]);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const filterQuery = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const res = await api.get(`/employees/my-reports${filterQuery}`);
      if (res.data?.success) {
        setReports(res.data.reports || []);
        if (res.data.employee) {
          setEmployeeProfile(res.data.employee);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to load assigned reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVerifyModal = (report: any) => {
    setSelectedReport(report);
    setVerificationResult(report.verificationStatus === 'PENDING_VERIFICATION' ? 'GENUINE' : report.verificationStatus);
    setProgressStatus(report.status || 'IN_PROGRESS');
    setVerificationNotes(report.verificationNotes || '');
    setEvidenceSummary('');
    setVerifyGeoEvidence(null);
    setIsVerifyCameraOpen(false);
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    if (progressStatus === 'IN_PROGRESS' && !verifyGeoEvidence?.photoUrl) {
      toast.error('Please capture a work progress photo using the camera.');
      return;
    }

    if ((progressStatus === 'RESOLVED' || progressStatus === 'COMPLETED') && !verifyGeoEvidence?.photoUrl) {
      toast.error('Please capture a completion photo using the camera before closing this complaint.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/employees/my-reports/${selectedReport.id}/verify`, {
        verificationResult,
        verificationNotes,
        progressStatus,
        evidenceSummary,
        photoUrl: verifyGeoEvidence?.photoUrl || null,
        latitude: verifyGeoEvidence?.latitude || null,
        longitude: verifyGeoEvidence?.longitude || null,
        capturedAt: verifyGeoEvidence?.capturedAt || null,
        isLocationVerified: verifyGeoEvidence?.isLocationConfirmed,
        distanceFromSiteKm: verifyGeoEvidence?.distanceKm,
        evidenceType: progressStatus === 'RESOLVED' || progressStatus === 'COMPLETED' ? 'WORK_COMPLETED' : 'WORK_IN_PROGRESS',
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Inspection sign-off saved in MongoDB!');
        setSelectedReport(null);
        setVerifyGeoEvidence(null);
        fetchMyReports();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getVerificationBadge = (vStatus: string) => {
    switch (vStatus) {
      case 'GENUINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            GENUINE
          </span>
        );
      case 'FAKE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
            <span className="material-symbols-outlined text-[13px]">cancel</span>
            FAKE
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="material-symbols-outlined text-[13px]">pending_actions</span>
            NEEDS REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            PENDING VERIFICATION
          </span>
        );
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setActionPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearWorkAction = () => {
    setWorkAction(null);
    setActionNotes('');
    setActionPhoto(null);
    setGeoEvidence(null);
    setGeoCameraOpen(false);
  };

  const handleOpenSiteVisit = (report: any) => {
    setSelectedReport(report);
    setWorkAction('site-visit');
    setGeoCameraStage('SITE INSPECTION');
    setGeoEvidence(null);
    setGeoCameraOpen(true);
  };

  const handleOpenStartWork = (report: any) => {
    setSelectedReport(report);
    setWorkAction('start-work');
    setGeoCameraStage('WORK STARTED');
    setGeoEvidence(null);
    setGeoCameraOpen(true);
  };

  const handleOpenCompleteWork = (report: any) => {
    setSelectedReport(report);
    setWorkAction('complete-work');
    setGeoCameraStage('WORK COMPLETED');
    setGeoEvidence(null);
    setGeoCameraOpen(true);
  };

  const handleGeoCaptureConfirmed = (data: {
    photoUrl: string;
    latitude: number;
    longitude: number;
    capturedAt: string;
    isLocationConfirmed: boolean;
    distanceKm: number;
  }) => {
    setGeoEvidence(data);
    setActionPhoto(data.photoUrl);
    setGeoCameraOpen(false);
  };

  const handleWorkAction = async (reportId: string, action: string) => {
    setActionSubmitting(true);
    try {
      let endpoint = '';
      let payload: any = {};
      switch (action) {
        case 'acknowledge':
          endpoint = `/complaints/${reportId}/acknowledge`;
          break;
        case 'site-visit':
          endpoint = `/complaints/${reportId}/site-visit`;
          payload = {
            visitNotes: actionNotes,
            photoUrl: geoEvidence?.photoUrl || actionPhoto,
            latitude: geoEvidence?.latitude,
            longitude: geoEvidence?.longitude,
            capturedAt: geoEvidence?.capturedAt,
          };
          break;
        case 'start-work':
          endpoint = `/complaints/${reportId}/start-work`;
          payload = {
            description: actionNotes,
            photoUrl: geoEvidence?.photoUrl || actionPhoto,
            latitude: geoEvidence?.latitude,
            longitude: geoEvidence?.longitude,
            capturedAt: geoEvidence?.capturedAt,
          };
          break;
        case 'complete-work':
          endpoint = `/complaints/${reportId}/complete-work`;
          payload = {
            description: actionNotes,
            photoUrl: geoEvidence?.photoUrl || actionPhoto,
            latitude: geoEvidence?.latitude,
            longitude: geoEvidence?.longitude,
            capturedAt: geoEvidence?.capturedAt,
          };
          break;
      }
      const res = await api.post(endpoint, payload);
      if (res.data?.success) {
        toast.success(res.data.message || `Action '${action}' completed!`);
        clearWorkAction();
        setSelectedReport(null);
        fetchMyReports();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Action '${action}' failed.`);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header with Employee ID and Zone */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              Field Inspector Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 font-mono">
              {employeeProfile?.employeeId || 'Staff ID'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Inspector: <strong>{employeeProfile?.fullName || 'Field Employee'}</strong> • Assigned Zone: <strong>{employeeProfile?.assignedZone || 'Tamil Nadu'}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMyReports}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-white border border-outline-variant hover:bg-surface-container-low font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs self-start"
        >
          <span className={`material-symbols-outlined text-[16px] text-primary ${loading ? 'animate-spin' : ''}`}>sync</span>
          <span>Refresh My Reports</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Total Assigned
          </span>
          <p className="text-2xl font-black text-on-surface mt-1">{reports.length}</p>
          <p className="text-[11px] text-on-surface-variant">Active field tickets</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
            In Progress
          </span>
          <p className="text-2xl font-black text-blue-900 mt-1">
            {reports.filter((r) => r.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-[11px] text-blue-700">Under ground work</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
            Verified Genuine
          </span>
          <p className="text-2xl font-black text-emerald-900 mt-1">
            {reports.filter((r) => r.verificationStatus === 'GENUINE').length}
          </p>
          <p className="text-[11px] text-emerald-700">Confirmed issues</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-surface-container">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
            Resolved
          </span>
          <p className="text-2xl font-black text-purple-900 mt-1">
            {reports.filter((r) => r.status === 'RESOLVED').length}
          </p>
          <p className="text-[11px] text-purple-700">Completed & closed</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-surface-container pb-3 text-xs">
        {['ALL', 'ASSIGNED', 'VIEWED', 'SITE_VISIT_COMPLETED', 'WORK_STARTED', 'IN_PROGRESS', 'RESOLVED'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              statusFilter === tab
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-surface-container shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-xs text-on-surface-variant font-medium">
              Loading your assigned reports...
            </p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <span className="material-symbols-outlined text-4xl text-emerald-600">
              task_alt
            </span>
            <h3 className="text-sm font-bold text-on-surface">No Assigned Reports Pending</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              When an Officer assigns civic complaints to your Employee ID, they will appear here for field verification and resolution.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container-lowest text-on-surface-variant">
                  <th className="p-3.5 font-bold">Report Code</th>
                  <th className="p-3.5 font-bold">Category & Description</th>
                  <th className="p-3.5 font-bold">Location</th>
                  <th className="p-3.5 font-bold">Work Status</th>
                  <th className="p-3.5 font-bold">Verification Decision</th>
                  <th className="p-3.5 font-bold">Assigned On</th>
                  <th className="p-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    {/* Code */}
                    <td className="p-3.5">
                      <span className="font-bold text-primary font-mono">{r.complaintId}</span>
                    </td>

                    {/* Category & Description */}
                    <td className="p-3.5 max-w-xs">
                      <div className="space-y-1">
                        <CategoryBadge category={r.category} />
                        <p className="font-semibold text-on-surface line-clamp-1">{r.description}</p>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="p-3.5">
                      <p className="font-medium text-on-surface">{r.location}</p>
                    </td>

                    {/* Work Status */}
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : r.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    {/* Verification Decision */}
                    <td className="p-3.5">
                      {getVerificationBadge(r.verificationStatus || 'PENDING_VERIFICATION')}
                    </td>

                    {/* Assigned Time */}
                    <td className="p-3.5 text-on-surface-variant whitespace-nowrap">
                      {formatDate(r.assignedAt || r.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenVerifyModal(r)}
                          className="px-2.5 py-1.5 rounded-xl bg-white border border-outline-variant hover:bg-surface-container-low font-bold text-[10px] flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px] text-primary">fact_check</span>
                          Verify
                        </button>

                        {r.status === 'ASSIGNED' && !r.viewedAt && (
                          <button
                            type="button"
                            onClick={() => { setSelectedReport(r); setWorkAction('acknowledge'); }}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">visibility</span>
                            Acknowledge
                          </button>
                        )}

                        {['ASSIGNED', 'VIEWED'].includes(r.status) && !r.siteVisitAt && (
                          <button
                            type="button"
                            onClick={() => handleOpenSiteVisit(r)}
                            className="px-2.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                            <span>Start Site Inspection</span>
                          </button>
                        )}

                        {['ASSIGNED', 'VIEWED', 'SITE_VISIT_COMPLETED'].includes(r.status) && !r.workStartedAt && (
                          <button
                            type="button"
                            onClick={() => handleOpenStartWork(r)}
                            className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                            <span>Start Work</span>
                          </button>
                        )}

                        {['WORK_STARTED', 'WORK_IN_PROGRESS', 'IN_PROGRESS'].includes(r.status) && r.workStartedAt && !r.completedAt && (
                          <button
                            type="button"
                            onClick={() => handleOpenCompleteWork(r)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                            <span>Complete Work</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect & Verify Modal */}
      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title={`Field Inspection & Sign-off: ${selectedReport?.complaintId}`}
      >
        <form onSubmit={handleSubmitVerification} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary font-mono">{selectedReport?.complaintId}</span>
              <CategoryBadge category={selectedReport?.category} />
            </div>
            <p className="text-on-surface">{selectedReport?.description}</p>
            <p className="text-on-surface-variant text-[11px]">Location: <strong>{selectedReport?.location}</strong></p>

            {/* Photos */}
            {selectedReport?.photos && selectedReport.photos.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">Citizen Evidence</span>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {selectedReport.photos.map((p: any, idx: number) => (
                    <a key={idx} href={p.url} target="_blank" rel="noreferrer" className="shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-surface-container">
                      <img src={p.url} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-on-surface block mb-1">
                Verification Finding
              </label>
              <select
                value={verificationResult}
                onChange={(e) => setVerificationResult(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white font-bold"
              >
                <option value="GENUINE">GENUINE (Confirmed on ground)</option>
                <option value="FAKE">FAKE (False / Invalid issue)</option>
                <option value="NEEDS_REVIEW">NEEDS REVIEW (Requires clarification)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-on-surface block mb-1">
                Update Progress Status
              </label>
              <select
                value={progressStatus}
                onChange={(e) => {
                  setProgressStatus(e.target.value);
                  setVerifyGeoEvidence(null);
                }}
                className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white font-bold"
              >
                <option value="IN_PROGRESS">IN PROGRESS (Work Underway)</option>
                <option value="RESOLVED">RESOLVED / COMPLETED (Repairs Complete)</option>
                <option value="ASSIGNED">ASSIGNED (Inspection Pending)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-on-surface block mb-1">
              Inspection Notes / Resolution Details
            </label>
            <textarea
              required
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="Describe on-site observation, measurements, actions taken, or reasons for decision..."
              rows={3}
              className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white"
            />
          </div>

          {/* Photo Capture Section - Below Inspection Notes */}
          <div className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-on-surface flex items-center gap-1.5 text-xs">
                <span className="material-symbols-outlined text-[17px] text-primary">photo_camera</span>
                <span>Field Evidence Photo {['IN_PROGRESS', 'RESOLVED'].includes(progressStatus) && <span className="text-red-500">*</span>}</span>
              </label>
              <span className="text-[10px] text-on-surface-variant font-medium">
                Direct camera capture only • Gallery upload disabled
              </span>
            </div>

            {verifyGeoEvidence ? (
              /* Watermarked Captured Evidence Card */
              <div className="bg-white p-3 rounded-xl border border-surface-container space-y-2 shadow-xs">
                <div className="relative rounded-lg overflow-hidden aspect-[16/10] bg-black max-h-56">
                  <img
                    src={verifyGeoEvidence.photoUrl}
                    alt="Captured Field Evidence"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-emerald-400 text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    <span>Watermark Burned (Bottom-Left)</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {verifyGeoEvidence.isLocationConfirmed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          ✓ Location Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">
                          <span className="material-symbols-outlined text-[12px]">warning</span>
                          ⚠ Away from reported location
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-on-surface-variant text-[10px]">
                      GPS: {formatCoordinates(verifyGeoEvidence.latitude, verifyGeoEvidence.longitude)} • Captured at {new Date(verifyGeoEvidence.capturedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsVerifyCameraOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs flex items-center justify-center gap-1 shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">refresh</span>
                      <span>Retake</span>
                    </button>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">check</span>
                      <span>Photo Ready</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Prompt to open Camera */
              <div className="text-center py-4 px-3 bg-white rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors space-y-2">
                <p className="font-bold text-xs text-on-surface">Live Device Camera Required</p>
                <p className="text-[11px] text-on-surface-variant">
                  Capture a verified work evidence photo directly using the device camera.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsVerifyCameraOpen(true)}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    <span>Capture Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-surface-container pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                (progressStatus === 'IN_PROGRESS' && !verifyGeoEvidence?.photoUrl) ||
                ((progressStatus === 'RESOLVED' || progressStatus === 'COMPLETED') && !verifyGeoEvidence?.photoUrl)
              }
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? 'Saving Sign-off...' : 'Submit Verification Sign-off'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Work Action Modal */}
      <Modal
        isOpen={Boolean(selectedReport && workAction)}
        onClose={clearWorkAction}
        title={workAction === 'acknowledge' ? 'Acknowledge Complaint' :
               workAction === 'site-visit' ? 'Complete Site Visit' :
               workAction === 'start-work' ? 'Start Work' :
               workAction === 'complete-work' ? 'Complete Work' : ''}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary font-mono">{selectedReport?.complaintId}</span>
              <CategoryBadge category={selectedReport?.category} />
            </div>
            <p className="text-on-surface">{selectedReport?.description}</p>
          </div>

          {workAction === 'acknowledge' ? (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-indigo-600">visibility</span>
              <p className="text-sm font-bold text-indigo-800">Acknowledge this complaint?</p>
              <p className="text-xs text-indigo-600">This will record that you have viewed and acknowledged the complaint.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="font-bold text-on-surface block mb-1">
                  {workAction === 'site-visit' ? 'Inspection Notes' :
                   workAction === 'start-work' ? 'Work Description' :
                   'Completion Details'} *
                </label>
                <textarea
                  required
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={workAction === 'site-visit' ? 'Describe the site condition and observations...' :
                               workAction === 'start-work' ? 'Describe the work being initiated...' :
                               'Describe the work completed and final state...'}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary bg-white"
                />
              </div>
              <div>
                <label className="font-bold text-on-surface block mb-1">
                  Mandatory Geo-Stamped Evidence Photo *
                </label>
                {geoEvidence?.photoUrl || actionPhoto ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border border-surface-container bg-black max-h-52 flex items-center justify-center">
                      <img
                        src={geoEvidence?.photoUrl || actionPhoto!}
                        alt="Geo-stamped evidence preview"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/75 text-emerald-400 font-bold text-[9px] flex items-center gap-1 backdrop-blur-xs">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        <span>Geo-Watermarked</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between text-[11px]">
                      <div>
                        <p className="font-bold text-on-surface flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                          <span className="font-mono">
                            {geoEvidence ? formatCoordinates(geoEvidence.latitude, geoEvidence.longitude) : 'GPS Acquired'}
                          </span>
                        </p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${
                          geoEvidence?.isLocationConfirmed ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {geoEvidence?.isLocationConfirmed ? '✓ Complaint Location Confirmed' : '⚠ Off-site Inspection'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setGeoCameraOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-outline-variant hover:bg-surface-container font-bold text-[10px] flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[13px] text-primary">photo_camera</span>
                        <span>Retake with Camera</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGeoCameraOpen(true)}
                    className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-3xl">photo_camera</span>
                    <span className="text-xs font-bold text-primary">Capture Mandatory Camera Evidence</span>
                    <span className="text-[10px] text-on-surface-variant font-normal">
                      Opens device camera directly • Auto-burns GPS, date & time watermark
                    </span>
                  </button>
                )}
              </div>
            </>
          )}

          <div className="border-t border-surface-container pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={clearWorkAction}
              className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => selectedReport && handleWorkAction(selectedReport.id, workAction!)}
              disabled={actionSubmitting || (workAction !== 'acknowledge' && (!actionNotes.trim() || !(geoEvidence?.photoUrl || actionPhoto)))}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold disabled:opacity-50"
            >
              {actionSubmitting ? 'Processing...' :
               workAction === 'acknowledge' ? 'Confirm Acknowledgement' :
               workAction === 'site-visit' ? 'Submit Site Visit' :
               workAction === 'start-work' ? 'Start Work' :
               'Complete Work'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Geo-Stamped Work Evidence Camera Modal (Work Actions) */}
      {selectedReport && (
        <GeoCameraModal
          isOpen={geoCameraOpen}
          onClose={() => setGeoCameraOpen(false)}
          stageTitle={geoCameraStage}
          complaint={selectedReport}
          employeeProfile={employeeProfile}
          onCaptureConfirmed={handleGeoCaptureConfirmed}
        />
      )}

      {/* Field Inspection & Sign-off Geo-Camera Modal */}
      {selectedReport && isVerifyCameraOpen && (
        <GeoCameraModal
          isOpen={isVerifyCameraOpen}
          onClose={() => setIsVerifyCameraOpen(false)}
          stageTitle={progressStatus === 'RESOLVED' || progressStatus === 'COMPLETED' ? 'WORK COMPLETED' : 'WORK IN PROGRESS'}
          complaint={selectedReport}
          employeeProfile={employeeProfile}
          onCaptureConfirmed={(data) => {
            setVerifyGeoEvidence(data);
            setIsVerifyCameraOpen(false);
            toast.success(
              `${progressStatus === 'RESOLVED' || progressStatus === 'COMPLETED' ? 'Work completion' : 'Work progress'} photo captured and geo-stamped!`
            );
          }}
        />
      )}
    </div>
  );
};
