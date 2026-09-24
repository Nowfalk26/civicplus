import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import {
  drawGeoWatermark,
  formatCoordinates,
  calculateDistanceKm,
  GeoWatermarkMetadata,
} from '../../utils/geoWatermark';

export interface GeoCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageTitle: 'SITE INSPECTION' | 'WORK STARTED' | 'WORK COMPLETED';
  complaint: {
    id?: string;
    complaintId: string;
    category?: string;
    description?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
  };
  employeeProfile?: {
    fullName?: string;
    employeeId?: string;
  };
  onCaptureConfirmed: (data: {
    photoUrl: string;
    latitude: number;
    longitude: number;
    capturedAt: string;
    isLocationConfirmed: boolean;
    distanceKm: number;
  }) => void;
}

// Configurable threshold: 500 meters (0.5 km)
const DEFAULT_GEOFENCE_RADIUS_KM = 0.5;

export const GeoCameraModal: React.FC<GeoCameraModalProps> = ({
  isOpen,
  onClose,
  stageTitle,
  complaint,
  employeeProfile,
  onCaptureConfirmed,
}) => {
  // Camera & Stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);

  // GPS states
  const [gpsLoading, setGpsLoading] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState<boolean>(false);

  // Captured snapshot state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedMeta, setCapturedMeta] = useState<GeoWatermarkMetadata | null>(null);

  // Initialize GPS when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setCapturedMeta(null);
      fetchGpsLocation();
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError(null);
    try {
      // Request camera stream with back camera priority (environment)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Direct WebRTC stream unavailable, falling back to camera input capture:', err);
      setCameraError('Live camera stream not supported or blocked in this browser. Use Direct Camera Shutter below.');
    } finally {
      setCameraLoading(false);
    }
  };

  const fetchGpsLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your device browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ latitude: lat, longitude: lon });
        setGpsLoading(false);

        // Calculate proximity against complaint coordinates if present
        if (complaint.latitude && complaint.longitude) {
          const dist = calculateDistanceKm(lat, lon, complaint.latitude, complaint.longitude);
          setDistanceKm(dist);
          setIsLocationConfirmed(dist <= DEFAULT_GEOFENCE_RADIUS_KM);
        } else {
          // If complaint had no recorded GPS coordinates, accept current device location
          setDistanceKm(0);
          setIsLocationConfirmed(true);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        let msg = 'Location access is required to capture verified work evidence.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please allow location access in your browser settings to verify work evidence.';
        } else if (err.code === 2) {
          msg = 'Unable to acquire accurate GPS position. Please ensure device location is enabled.';
        } else if (err.code === 3) {
          msg = 'GPS acquisition timed out. Please retry in an open area.';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  /**
   * Watermarks an image element/video onto canvas and sets capturedPhoto
   */
  const processAndWatermark = (source: CanvasImageSource, sWidth: number, sHeight: number) => {
    if (!coords) {
      toast.error('Location is required before capturing evidence.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = sWidth;
    canvas.height = sHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw source photo onto canvas
    ctx.drawImage(source, 0, 0, sWidth, sHeight);

    // Prepare timestamp and watermark metadata
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const meta: GeoWatermarkMetadata = {
      stageTitle,
      dateStr,
      timeStr,
      latitude: coords.latitude,
      longitude: coords.longitude,
      employeeName: employeeProfile?.fullName || 'Field Employee',
      employeeId: employeeProfile?.employeeId || '',
      isLocationConfirmed,
      distanceMeters: distanceKm !== null ? distanceKm * 1000 : null,
    };

    // Burn permanent tamper-evident watermark into canvas pixels
    drawGeoWatermark(ctx, sWidth, sHeight, meta);

    const watermarkedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(watermarkedDataUrl);
    setCapturedMeta(meta);
  };

  /**
   * Capture frame directly from live video viewfinder
   */
  const handleSnapLiveCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera stream not ready yet. Please wait a moment.');
      return;
    }

    processAndWatermark(video, video.videoWidth, video.videoHeight);
  };

  /**
   * Fallback: Capture directly using HTML5 camera input (capture="environment")
   */
  const handleDirectCameraInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (event) => {
      img.onload = () => {
        processAndWatermark(img, img.naturalWidth, img.naturalHeight);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCapturedMeta(null);
    if (!stream && !cameraError) {
      startCamera();
    }
  };

  const handleConfirm = () => {
    if (!capturedPhoto || !coords) return;
    stopCamera();
    onCaptureConfirmed({
      photoUrl: capturedPhoto,
      latitude: coords.latitude,
      longitude: coords.longitude,
      capturedAt: new Date().toISOString(),
      isLocationConfirmed,
      distanceKm: distanceKm || 0,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={`Live Geo-Evidence Camera: ${stageTitle}`}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Complaint Context Header */}
        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-3">
          <div>
            <span className="font-bold text-primary font-mono">{complaint.complaintId}</span>
            <p className="text-on-surface font-medium truncate max-w-sm">{complaint.description || complaint.location}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
            {stageTitle}
          </span>
        </div>

        {/* GPS Status Banner */}
        <div
          className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition-all ${
            gpsLoading
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : gpsError
              ? 'bg-red-50 border-red-200 text-red-900'
              : isLocationConfirmed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-2">
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                gpsLoading ? 'animate-spin' : ''
              }`}
            >
              {gpsLoading
                ? 'progress_activity'
                : gpsError
                ? 'location_off'
                : isLocationConfirmed
                ? 'check_circle'
                : 'near_me_disabled'}
            </span>
            <div>
              <p className="font-bold text-xs">
                {gpsLoading
                  ? 'Acquiring GPS Fix from Device...'
                  : gpsError
                  ? 'GPS Access Required'
                  : isLocationConfirmed
                  ? 'Complaint Location Confirmed'
                  : 'You appear away from the reported complaint location'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {gpsLoading ? (
                  'Triangulating accurate coordinates via device satellites/network...'
                ) : gpsError ? (
                  gpsError
                ) : (
                  <>
                    Position: <strong className="font-mono">{formatCoordinates(coords!.latitude, coords!.longitude)}</strong>
                    {distanceKm !== null && (
                      <span> • Distance: <strong>{Math.round(distanceKm * 1000)}m</strong> from ticket location</span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          {(gpsError || (!gpsLoading && coords)) && (
            <button
              type="button"
              onClick={fetchGpsLocation}
              className="px-2.5 py-1 rounded-lg bg-white border border-current font-bold text-[10px] shrink-0 hover:opacity-80 transition-opacity"
            >
              Refresh GPS
            </button>
          )}
        </div>

        {/* Camera Viewfinder or Captured Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] max-h-[380px] flex items-center justify-center border border-surface-container shadow-inner">
          {capturedPhoto ? (
            /* Watermarked Preview */
            <div className="relative w-full h-full">
              <img
                src={capturedPhoto}
                alt="Captured Geo-Evidence"
                className="w-full h-full object-contain bg-black"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/75 text-emerald-400 font-bold text-[10px] flex items-center gap-1 backdrop-blur-xs">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                <span>Watermark Burned & Ready</span>
              </div>
            </div>
          ) : stream ? (
            /* Live Camera Stream with HUD */
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => videoRef.current?.play()}
              />

              {/* Viewfinder crosshairs */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border border-white/30 rounded-2xl relative">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary" />
                </div>
              </div>

              {/* Live HUD info overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
                <div className="px-2.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono space-y-0.5">
                  <p className="font-bold text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                    LIVE VIEW • {stageTitle}
                  </p>
                  {coords && (
                    <p className="text-slate-300">
                      {coords.latitude.toFixed(4)}° N, {coords.longitude.toFixed(4)}° E
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Camera Loading or Fallback Trigger */
            <div className="p-6 text-center text-slate-300 space-y-3">
              {cameraLoading ? (
                <>
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                    progress_activity
                  </span>
                  <p className="font-medium text-xs">Accessing camera hardware...</p>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-4xl text-slate-400">
                    photo_camera
                  </span>
                  <p className="text-xs text-slate-300 font-medium max-w-xs mx-auto">
                    {cameraError || 'Camera shutter is ready. Click below to take a fresh photo.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!coords}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    <span>Open Device Camera</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Hidden strictly-camera input fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleDirectCameraInput}
            className="hidden"
          />
        </div>

        {/* Proximity Warning Alert if off-site */}
        {!gpsLoading && !gpsError && coords && !isLocationConfirmed && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">warning</span>
            <span>
              You are approximately <strong>{Math.round((distanceKm || 0) * 1000)} meters</strong> away from the ticket location. Evidence will be logged with your current GPS coordinates for audit inspection.
            </span>
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="border-t border-surface-container pt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">refresh</span>
                  <span>Retake Photo</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Confirm & Save Evidence</span>
                </button>
              </>
            ) : stream ? (
              <button
                type="button"
                onClick={handleSnapLiveCamera}
                disabled={!coords || gpsLoading}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">camera</span>
                <span>{coords ? 'Capture Evidence Photo' : 'Waiting for GPS...'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!coords || gpsLoading}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Open Device Camera</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
