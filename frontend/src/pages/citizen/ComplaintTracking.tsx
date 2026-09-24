import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { STATUS_INFO, formatDate, formatDuration } from '../../lib/utils';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/ui/Badge';
import { formatCoordinates } from '../../utils/geoWatermark';

const WORKFLOW_STAGES = [
  { key: 'SUBMITTED', label: 'Complaint Submitted', labelTa: 'புகார் சமர்ப்பிக்கப்பட்டது', icon: 'edit_note' },
  { key: 'ASSIGNED', label: 'Employee Assigned', labelTa: 'பணியாளர் ஒதுக்கப்பட்டார்', icon: 'person_add' },
  { key: 'VIEWED', label: 'Complaint Acknowledged', labelTa: 'புகார் ஏற்கப்பட்டது', icon: 'visibility' },
  { key: 'SITE_VISIT_COMPLETED', label: 'Site Visit Completed', labelTa: 'தள பரிசோதனை முடிந்தது', icon: 'location_on' },
  { key: 'WORK_STARTED', label: 'Work Started', labelTa: 'பணி தொடங்கியது', icon: 'construction' },
  { key: 'WORK_IN_PROGRESS', label: 'Work In Progress', labelTa: 'பணி நடைபெறுகிறது', icon: 'engineering' },
  { key: 'RESOLVED', label: 'Work Completed', labelTa: 'பணி முடிந்தது', icon: 'check_circle' },
];

const STATUS_ORDER = ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'VIEWED', 'SITE_VISIT_COMPLETED', 'WORK_STARTED', 'WORK_IN_PROGRESS', 'IN_PROGRESS', 'RESOLVED'];

function mapStatusToStage(status: string): string {
  const map: Record<string, string> = {
    SUBMITTED: 'SUBMITTED', ACCEPTED: 'SUBMITTED', ASSIGNED: 'ASSIGNED',
    VIEWED: 'VIEWED', SITE_VISIT_COMPLETED: 'SITE_VISIT_COMPLETED',
    WORK_STARTED: 'WORK_STARTED', WORK_IN_PROGRESS: 'WORK_IN_PROGRESS',
    IN_PROGRESS: 'WORK_IN_PROGRESS', RESOLVED: 'RESOLVED',
  };
  return map[status] || status;
}

function evidenceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CITIZEN_SUBMISSION: 'Before', SITE_VISIT: 'Site Visit',
    WORK_STARTED: 'Work Started', WORK_IN_PROGRESS: 'Work In Progress', WORK_COMPLETED: 'Completed',
  };
  return labels[type] || type;
}

export const ComplaintTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTracking = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/complaints/${id}/tracking`);
        if (res.data?.success) {
          setData(res.data);
        } else {
          setError('Failed to load tracking data.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Unable to load tracking details.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTracking();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
        <p className="text-xs text-on-surface-variant font-medium">Loading complaint tracking...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-red-500">error</span>
        <p className="text-sm text-red-600 font-semibold">{error || 'Tracking data unavailable.'}</p>
        <Link to="/citizen/complaints" className="text-xs text-primary underline">← Back to My Complaints</Link>
      </div>
    );
  }

  const { complaint, tracking, timeline, evidence } = data;
  const currentStage = mapStatusToStage(complaint.status);
  const currentStageIdx = STATUS_ORDER.indexOf(currentStage);

  const complaintAge = now - new Date(complaint.createdAt).getTime();
  let workDurationLive: number | null = null;
  if (tracking.workStartedAt) {
    workDurationLive = tracking.completedAt
      ? new Date(tracking.completedAt).getTime() - new Date(tracking.workStartedAt).getTime()
      : now - new Date(tracking.workStartedAt).getTime();
  }

  const isOverdue = tracking.dueDate ? now > new Date(tracking.dueDate).getTime() : false;

  const findTimelineEntry = (stageKey: string) => {
    return timeline.find((t: any) => t.stage === stageKey);
  };

  const findEvidence = (stageKey: string) => {
    const typeMap: Record<string, string[]> = {
      SUBMITTED: ['CITIZEN_SUBMISSION'],
      SITE_VISIT_COMPLETED: ['SITE_VISIT'],
      WORK_STARTED: ['WORK_STARTED', 'WORK_IN_PROGRESS'],
      WORK_IN_PROGRESS: ['WORK_IN_PROGRESS', 'WORK_STARTED'],
      RESOLVED: ['WORK_COMPLETED'],
    };
    const types = typeMap[stageKey];
    if (!types) return null;
    return evidence.find((e: any) => types.includes(e.type));
  };

  const stageIsCompleted = (stageKey: string) => {
    const stageIdx = STATUS_ORDER.indexOf(stageKey);
    if (stageIdx < 0) return false;
    if (stageIdx < currentStageIdx) return true;
    if (stageKey === currentStage && currentStage === 'RESOLVED') return true;
    return !!findTimelineEntry(stageKey) && stageIdx < currentStageIdx;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Link to="/citizen/complaints" className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to My Complaints
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-black text-on-surface font-mono tracking-tight">{complaint.complaintId}</h1>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            <CategoryBadge category={complaint.category} />
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Reported on {formatDate(complaint.createdAt)} • {complaint.location}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Current Status */}
        <div className="p-4 rounded-2xl bg-white border border-surface-container space-y-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</span>
          <p className={`text-sm font-black ${STATUS_INFO[complaint.status]?.text || 'text-on-surface'}`}>
            {STATUS_INFO[complaint.status]?.labelEn || complaint.status}
          </p>
        </div>

        {/* Due Date */}
        <div className="p-4 rounded-2xl bg-white border border-surface-container space-y-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Due Date</span>
          {tracking.dueDate ? (
            <>
              <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatDate(tracking.dueDate)}
              </p>
              {isOverdue && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                  <span className="material-symbols-outlined text-[12px]">warning</span>OVERDUE
                </span>
              )}
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">—</p>
          )}
        </div>

        {/* Complaint Age */}
        <div className="p-4 rounded-2xl bg-white border border-surface-container space-y-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Complaint Age</span>
          <p className="text-sm font-bold text-on-surface font-mono">{formatDuration(complaintAge)}</p>
        </div>

        {/* Work Duration */}
        <div className="p-4 rounded-2xl bg-white border border-surface-container space-y-1">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Work Duration</span>
          {workDurationLive !== null ? (
            <div className="flex items-center gap-1.5">
              {!tracking.completedAt && (
                <span className="material-symbols-outlined text-[14px] text-sky-600 animate-spin">timer</span>
              )}
              <p className={`text-sm font-bold font-mono ${tracking.completedAt ? 'text-emerald-600' : 'text-sky-600'}`}>
                {formatDuration(workDurationLive)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Not started</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timeline - Main Column */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-surface-container shadow-sm">
          <h2 className="font-bold text-sm text-on-surface flex items-center gap-1.5 mb-5">
            <span className="material-symbols-outlined text-[18px] text-primary">timeline</span>
            Work Progress Timeline
          </h2>
          <div className="relative pl-0 space-y-0">
            {WORKFLOW_STAGES.map((stage, idx) => {
              const entry = findTimelineEntry(stage.key);
              const stageEvidence = findEvidence(stage.key);
              const isCompleted = stageIsCompleted(stage.key);
              const isCurrent = stage.key === currentStage && currentStage !== 'RESOLVED';
              const isResolved = stage.key === 'RESOLVED' && currentStage === 'RESOLVED';
              const isPending = !isCompleted && !isCurrent && !isResolved;

              return (
                <div key={stage.key} className="relative pb-8 last:pb-0">
                  {/* Connecting line */}
                  {idx < WORKFLOW_STAGES.length - 1 && (
                    <div className={`absolute left-[15px] top-8 w-0.5 h-full ${
                      isCompleted || isResolved ? 'bg-emerald-300' : isCurrent ? 'bg-primary/30' : 'bg-surface-container-high'
                    }`} />
                  )}
                  <div className="flex items-start gap-4">
                    {/* Dot */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isCompleted || isResolved
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {isCompleted || isResolved ? (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">{stage.icon}</span>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`font-bold text-sm ${
                          isCompleted || isResolved ? 'text-emerald-700' : isCurrent ? 'text-primary' : 'text-on-surface-variant'
                        }`}>{stage.label}</h3>
                        {entry && (
                          <span className="text-[11px] text-on-surface-variant shrink-0">{formatDate(entry.timestamp)}</span>
                        )}
                      </div>

                      {entry && (
                        <div className="mt-2 space-y-2">
                          {entry.officerName && (
                            <p className="text-xs text-primary font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">badge</span>
                              {entry.officerName}
                            </p>
                          )}
                          {entry.notes && (
                            <p className="text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-lg border border-surface-container">
                              {entry.notes}
                            </p>
                          )}
                          {stageEvidence && (
                            <div className="mt-2 p-2.5 rounded-xl bg-surface-container-low border border-surface-container space-y-2 max-w-sm">
                              <a href={stageEvidence.fileUrl} target="_blank" rel="noreferrer" className="block relative rounded-lg overflow-hidden group">
                                <img
                                  src={stageEvidence.fileUrl}
                                  alt={`${stage.label} evidence`}
                                  className="w-full h-32 object-cover rounded-lg border border-surface-container shadow-xs group-hover:scale-102 transition-transform"
                                />
                                <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/75 text-emerald-400 font-bold text-[9px] flex items-center gap-0.5 backdrop-blur-xs">
                                  <span className="material-symbols-outlined text-[11px]">verified</span>
                                  <span>Geo-Stamped</span>
                                </div>
                              </a>

                              <div className="space-y-1 text-[11px]">
                                {stageEvidence.latitude && stageEvidence.longitude ? (
                                  <div className="flex items-center justify-between text-on-surface">
                                    <span className="font-mono font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
                                      {formatCoordinates(stageEvidence.latitude, stageEvidence.longitude)}
                                    </span>
                                    {stageEvidence.isLocationVerified ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ✓ Verified On-Site
                                      </span>
                                    ) : stageEvidence.distanceFromSiteKm ? (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        {Math.round(stageEvidence.distanceFromSiteKm * 1000)}m away
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}

                                <p className="text-on-surface-variant text-[10px] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                                  Captured: {formatDate(stageEvidence.capturedAt || stageEvidence.uploadedAt)}
                                </p>

                                {stageEvidence.description && (
                                  <p className="text-on-surface italic text-[11px]">"{stageEvidence.description}"</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Live timer for active work */}
                      {(stage.key === 'WORK_STARTED' || stage.key === 'WORK_IN_PROGRESS') && isCurrent && tracking.workStartedAt && !tracking.completedAt && (
                        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200">
                          <span className="material-symbols-outlined text-[16px] text-sky-600 animate-spin">timer</span>
                          <span className="text-sm font-bold text-sky-800 font-mono">
                            {formatDuration(now - new Date(tracking.workStartedAt).getTime())}
                          </span>
                          <span className="text-[11px] text-sky-600">elapsed work time</span>
                        </div>
                      )}

                      {isPending && (
                        <p className="text-xs text-on-surface-variant mt-1 italic opacity-60">Pending</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Assigned Employee Card */}
          {tracking.assignedEmployee && (
            <div className="bg-white rounded-2xl p-4 border border-surface-container shadow-sm space-y-3">
              <h3 className="font-bold text-xs text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">engineering</span>
                Assigned Employee
              </h3>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-on-surface">{tracking.assignedEmployee.fullName}</p>
                <p className="text-[11px] text-primary font-mono font-semibold">{tracking.assignedEmployee.employeeId}</p>
                <p className="text-[11px] text-on-surface-variant">{tracking.assignedEmployee.department}</p>
                <p className="text-[11px] text-on-surface-variant">{tracking.assignedEmployee.designation}</p>
              </div>
            </div>
          )}

          {/* Complaint Description */}
          <div className="bg-white rounded-2xl p-4 border border-surface-container shadow-sm space-y-2">
            <h3 className="font-bold text-xs text-on-surface-variant uppercase tracking-wider">Description</h3>
            <p className="text-xs text-on-surface leading-relaxed">{complaint.description}</p>
          </div>

          {/* SLA Info */}
          {tracking.dueDate && (
            <div className={`rounded-2xl p-4 border shadow-sm space-y-2 ${
              isOverdue ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <h3 className={`font-bold text-xs uppercase tracking-wider ${isOverdue ? 'text-red-700' : 'text-emerald-700'}`}>
                {isOverdue ? '⚠ SLA Overdue' : '✓ Within SLA'}
              </h3>
              <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                Expected resolution by {formatDate(tracking.dueDate)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Gallery */}
      {evidence && evidence.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-primary">photo_library</span>
              Geo-Stamped Work Evidence
            </h2>
            <span className="text-[11px] text-on-surface-variant font-medium">
              Camera-captured on ground with GPS & timestamp watermark
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {evidence.map((ev: any, idx: number) => (
              <div key={idx} className="bg-surface-container-lowest p-3 rounded-2xl border border-surface-container shadow-xs space-y-2.5">
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] bg-black">
                  <a href={ev.fileUrl} target="_blank" rel="noreferrer">
                    <img
                      src={ev.fileUrl}
                      alt={ev.type}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </a>
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 text-white text-[10px] font-bold backdrop-blur-xs">
                    {evidenceTypeLabel(ev.type)}
                  </span>
                  {ev.isLocationVerified && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-0.5 shadow-xs">
                      <span className="material-symbols-outlined text-[11px]">verified</span>
                      <span>GPS Confirmed</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-on-surface-variant space-y-1">
                  <div className="flex items-center justify-between text-on-surface font-semibold">
                    <span className="truncate">{ev.uploadedByName}</span>
                    <span className="text-[10px] text-on-surface-variant shrink-0 font-normal">
                      {formatDate(ev.capturedAt || ev.uploadedAt)}
                    </span>
                  </div>

                  {ev.latitude && ev.longitude ? (
                    <p className="font-mono text-[10px] text-on-surface flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-lg border border-surface-container">
                      <span className="material-symbols-outlined text-[12px] text-primary shrink-0">location_on</span>
                      <span className="truncate">{formatCoordinates(ev.latitude, ev.longitude)}</span>
                      {ev.distanceFromSiteKm !== null && ev.distanceFromSiteKm !== undefined && (
                        <span className="ml-auto text-[9px] text-on-surface-variant shrink-0">
                          {Math.round(ev.distanceFromSiteKm * 1000)}m
                        </span>
                      )}
                    </p>
                  ) : null}

                  {ev.description && <p className="italic text-on-surface text-[11px] line-clamp-2">"{ev.description}"</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
