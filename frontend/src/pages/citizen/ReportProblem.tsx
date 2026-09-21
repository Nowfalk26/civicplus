import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { LeafletMap } from '../../components/LeafletMap';
import { MapErrorBoundary } from '../../components/ui/MapErrorBoundary';
import { PhotoUpload, ImageValidationResult } from '../../components/PhotoUpload';
import { VoiceRecorder } from '../../components/VoiceRecorder';
import { reverseGeocodeCoordinates, ReverseGeocodeResult, matchTamilNaduDistrict } from '../../lib/geocoding';
import { CATEGORY_INFO, TN_DISTRICTS } from '../../lib/utils';
import { api } from '../../lib/api';
import { isValidLatLng } from '../../lib/mapService';
import {
  MapPin,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Volume2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Navigation,
  FileText,
  Clock,
  Send,
} from 'lucide-react';

export const ReportProblem: React.FC = () => {
  const { user, language } = useStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<any | null>(null);

  // Form State
  const [category, setCategory] = useState<string>('ROAD_DAMAGE');
  const [priority, setPriority] = useState<string>('MEDIUM');

  // Step 3 State: Exact Map Location & Geocoding
  const [latitude, setLatitude] = useState<number>(8.7139);
  const [longitude, setLongitude] = useState<number>(77.7567);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [district, setDistrict] = useState<string>('Tirunelveli');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const geocodeRequestIdRef = useRef<number>(0);
  const geocodeAbortRef = useRef<AbortController | null>(null);

  // Step 4 State: Photo Upload & AI Vision Validation
  const [photos, setPhotos] = useState<string[]>([]);
  const [isImageValid, setIsImageValid] = useState<boolean>(true);
  const [imageValidationData, setImageValidationData] = useState<ImageValidationResult | null>(null);

  // Step 5 State: Description (Text and/or Voice)
  const [description, setDescription] = useState<string>('');
  const [voiceAudio, setVoiceAudio] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);

  // Auto-reverse geocode helper with race-condition guard
  const performReverseGeocoding = async (lat: number, lng: number) => {
    if (!isValidLatLng(lat, lng)) return;

    // Increment request ID so previous pending requests are discarded
    const currentRequestId = ++geocodeRequestIdRef.current;

    if (geocodeAbortRef.current) {
      geocodeAbortRef.current.abort();
    }
    const abortController = new AbortController();
    geocodeAbortRef.current = abortController;

    setIsGeocoding(true);
    setGeocodingError(null);
    // Clear stale address while resolving new coordinates
    setLocationAddress('');

    try {
      const result: ReverseGeocodeResult = await reverseGeocodeCoordinates(
        lat,
        lng,
        abortController.signal
      );

      // Check if this is still the latest request
      if (currentRequestId !== geocodeRequestIdRef.current) {
        return;
      }

      if (result.success && result.formattedAddress) {
        setLocationAddress(result.formattedAddress);
        if (result.district) {
          const matched = matchTamilNaduDistrict(result.district);
          if (matched) {
            setDistrict(matched);
          }
        }
      } else {
        setLocationAddress(`Point (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
        setGeocodingError('Could not fetch exact address name. Using GPS coordinates.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (currentRequestId === geocodeRequestIdRef.current) {
        console.error('Reverse geocoding error:', err);
        setLocationAddress(`Point (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
        setGeocodingError('Geocoding service unavailable. You can enter the street name manually below.');
      }
    } finally {
      if (currentRequestId === geocodeRequestIdRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  // Initial geocoding on mount
  useEffect(() => {
    performReverseGeocoding(latitude, longitude);
  }, []);

  // Map pin selection handler (tap on map)
  const handleMapPinSelected = (coord: { lat: number; lng: number }) => {
    setLatitude(coord.lat);
    setLongitude(coord.lng);
    performReverseGeocoding(coord.lat, coord.lng);
    toast.success(`Location pinned: ${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`);
  };

  // GPS button handler
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    toast.loading('Acquiring high-accuracy GPS coordinates...', { id: 'gps' });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        if (!isValidLatLng(lat, lng)) {
          toast.error('Invalid coordinates received.', { id: 'gps' });
          return;
        }
        setLatitude(lat);
        setLongitude(lng);
        performReverseGeocoding(lat, lng);
        toast.success('GPS coordinates locked!', { id: 'gps' });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission was denied in browser.', { id: 'gps' });
        } else {
          toast.error('Could not acquire device GPS. Please select on the map.', { id: 'gps' });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  };

  // Handle Photo Validation Callback
  const handlePhotoValidationChange = (isValid: boolean, valData?: ImageValidationResult | null) => {
    setIsImageValid(isValid);
    setImageValidationData(valData || null);
  };

  // Step 5 Submit Complaint Handler
  const handleSubmitComplaint = async () => {
    const hasText = Boolean(description && description.trim().length > 0);
    const hasVoice = Boolean(voiceAudio && voiceAudio.trim().length > 0);

    if (!hasText && !hasVoice) {
      toast.error('Please describe the issue using text, voice, or both.');
      return;
    }

    if (photos.length === 0) {
      toast.error('Please upload at least 1 photo.');
      setStep(4);
      return;
    }

    if (!isImageValid || (imageValidationData && imageValidationData.decision !== 'MATCH')) {
      toast.error('The uploaded photo does not match the selected category. Please upload an appropriate photo.');
      setStep(4);
      return;
    }

    setSubmitting(true);
    try {
      const finalLocation = locationAddress.trim() || `Location (${latitude.toFixed(6)}, ${longitude.toFixed(6)}), ${district}`;

      const payload = {
        category,
        description: description.trim(),
        voiceAudio: voiceAudio || undefined,
        voiceDuration: voiceDuration || 0,
        location: finalLocation,
        district,
        latitude,
        longitude,
        priority,
        photos,
        imageValidation: imageValidationData,
      };

      const res = await api.post('/complaints', payload);

      if (res.data?.success && res.data?.complaint) {
        setSubmittedComplaint(res.data.complaint);
        toast.success('Complaint submitted successfully to Tamil Nadu Municipal Queue!');
      } else {
        throw new Error(res.data?.message || 'Failed to submit complaint');
      }
    } catch (err: any) {
      console.error('Submit complaint error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit complaint.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const quickDescriptions: Record<string, string[]> = {
    ROAD_DAMAGE: [
      'Deep pothole on main carriageway damaging vehicles.',
      'Asphalt completely eroded causing dust and accidents.',
      'Open trench left unattended after pipeline work.',
    ],
    STREET_LIGHT: [
      'Street lights not functioning for 4 consecutive days.',
      'Flickering high mast light at traffic junction.',
      'Damaged light pole leaning dangerously over road.',
    ],
    ELECTRICAL_WIRE: [
      'Low hanging wire touching bus roofs near market.',
      'Sparking electrical transformer on roadside.',
      'Open junction box accessible to children.',
    ],
    GARBAGE_WASTE: [
      'Overflowing garbage bin blocking walkway.',
      'Illegal construction rubble dumped near residential area.',
      'Poultry waste causing foul smell and health hazard.',
    ],
    STORM_WATER_DRAIN: [
      'Clogged drain causing dirty water overflow.',
      'Broken concrete slab posing severe hazard to pedestrians.',
      'Missing manhole cover on main road.',
    ],
    PUBLIC_SPACE: [
      'Broken park playground equipment.',
      'Encroachment on public pedestrian footpath.',
      'Leaking drinking water public distribution tap.',
    ],
  };

  // Success Screen
  if (submittedComplaint) {
    const shareText = encodeURIComponent(
      `Civics Plus TN: My civic complaint #${submittedComplaint.complaintId} regarding ${submittedComplaint.category} in ${submittedComplaint.location} has been registered with Tamil Nadu Municipal Authority.`
    );

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-surface-container shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <span className="material-symbols-outlined text-[42px]">verified</span>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Complaint Registered • பதிவு செய்யப்பட்டது
            </span>
            <h1 className="text-3xl font-extrabold text-on-surface">
              {submittedComplaint.complaintId}
            </h1>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Your issue has been logged into the Tamil Nadu Central Civic Queue. Field officers have been alerted and dispatched.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-surface-container-low p-4 rounded-2xl border border-surface-container text-left text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-surface-container">
              <span className="text-on-surface-variant">Category:</span>
              <span className="font-bold text-on-surface">{submittedComplaint.category}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-container">
              <span className="text-on-surface-variant">Location:</span>
              <span className="font-bold text-on-surface truncate max-w-[220px]">{submittedComplaint.location}</span>
            </div>
            {submittedComplaint.district && (
              <div className="flex justify-between py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">District:</span>
                <span className="font-bold text-on-surface">{submittedComplaint.district}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-on-surface-variant">Status:</span>
              <span className="font-bold text-red-600">SUBMITTED (In Review)</span>
            </div>
          </div>

          {/* Share Actions */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">
              Share Tracking Link
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={`https://api.whatsapp.com/send?text=${shareText}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Share on WhatsApp
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Civics Plus Complaint ID: ${submittedComplaint.complaintId}`
                  );
                  toast.success('Complaint ID copied to clipboard!');
                }}
                className="px-5 py-2.5 rounded-xl bg-white border border-outline-variant hover:bg-surface-container text-on-surface font-bold text-xs flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Copy ID
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-container flex gap-3">
            <button
              onClick={() => navigate('/citizen/dashboard')}
              className="flex-1 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-bold text-xs transition-colors"
            >
              Back to Map
            </button>
            <button
              onClick={() => navigate(`/citizen/complaints/${submittedComplaint.id}`)}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-xs transition-colors shadow-sm"
            >
              Track Status Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* 5-Step Indicator Header */}
      <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-primary font-bold text-base">Step {step} of 5</span>
            <span className="text-xs text-on-surface-variant font-medium">/ படி {step} / 5</span>
          </div>

          <span className="text-xs font-bold text-on-surface">
            {step === 1 && (language === 'en' ? 'Choose Category • பிரிவு' : 'பிரிவு')}
            {step === 2 && (language === 'en' ? 'Urgency & Priority • முன்னுரிமை' : 'முன்னுரிமை')}
            {step === 3 && (language === 'en' ? 'Exact Map Location • இருப்பிடம்' : 'இருப்பிடம்')}
            {step === 4 && (language === 'en' ? 'AI Photo Validation • புகைப்படம்' : 'புகைப்படம்')}
            {step === 5 && (language === 'en' ? 'Description & Submit • விளக்கம்' : 'விளக்கம்')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: CATEGORY SELECTION */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">
              {language === 'en' ? 'Select Civic Issue Category' : 'புகார் வகையைத் தேர்ந்தெடுக்கவும்'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {language === 'en'
                ? 'Select the category of the defect. AI vision will verify your photos against this category.'
                : 'பொருத்தமான நகராட்சி துறைக்கு புகாரை அனுப்ப உதவுகிறது.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
              <div
                key={key}
                onClick={() => setCategory(key)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3.5 ${
                  category === key
                    ? 'border-primary bg-primary-light/50 shadow-sm'
                    : 'border-surface-container hover:border-outline-variant bg-white'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  <span className="material-symbols-outlined text-[24px]">{cat.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface">{cat.labelEn}</p>
                  <p className="text-xs text-on-surface-variant">{cat.labelTa}</p>
                </div>
                {category === key && (
                  <span className="material-symbols-outlined text-primary ml-auto text-[22px]">
                    check_circle
                  </span>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Continue to Priority</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: PRIORITY */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">
              {language === 'en' ? 'Select Urgency / Priority' : 'முன்னுரிமை நிலை'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              How severely does this affect pedestrian and vehicle safety?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'LOW',
                title: 'Low Urgency',
                subtitle: 'Minor cosmetic issue, does not obstruct passage',
                color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-700',
              },
              {
                id: 'MEDIUM',
                title: 'Medium Urgency',
                subtitle: 'Moderate defect requiring scheduled repair',
                color: 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-700',
              },
              {
                id: 'HIGH',
                title: 'High Urgency',
                subtitle: 'Active hazard causing vehicular disruption',
                color: 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-700',
              },
              {
                id: 'CRITICAL',
                title: 'Critical Emergency',
                subtitle: 'Severe threat to human life or electric safety',
                color: 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-700',
              },
            ].map((lvl) => (
              <div
                key={lvl.id}
                onClick={() => setPriority(lvl.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  priority === lvl.id
                    ? `${lvl.color} shadow-sm ring-1 ring-primary`
                    : 'border-surface-container hover:border-outline-variant bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-on-surface">{lvl.title}</h3>
                  <span className="text-xs font-mono font-bold">{lvl.id}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{lvl.subtitle}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Map Location</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: EXACT MAP LOCATION & REVERSE GEOCODING */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {language === 'en' ? 'Pin Exact Issue Location' : 'சரியான இடத்தை தேர்வு செய்யவும்'}
              </h2>
              <span className="text-xs font-mono bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              {language === 'en'
                ? 'Click or drag the red pin on the map to place it at the exact civic issue. The address and district auto-sync directly from the selected coordinates.'
                : 'வரைபடத்தில் தட்டி சரியான இடத்தை தேர்வு செய்யவும்.'}
            </p>
          </div>

          {/* Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="w-full min-h-[50px] bg-primary text-white rounded-xl px-4 py-2.5 flex items-center justify-between shadow-md hover:bg-primary-dark transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Use My Current Device GPS</p>
                <p className="text-[10px] opacity-90 leading-tight">தானியங்கி இருப்பிடம் கண்டறிதல்</p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-lg">
              Locate Me
            </span>
          </button>

          {/* Interactive Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Interactive Leaflet Map (Tap or drag pin to position)</span>
              {isGeocoding ? (
                <span className="text-primary animate-pulse font-medium flex items-center gap-1">
                  <RotateCcw className="w-3 h-3 animate-spin" /> Resolving address...
                </span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Coordinates Locked
                </span>
              )}
            </div>

            <MapErrorBoundary>
              <div className="rounded-xl overflow-hidden border border-surface-container shadow-inner">
                <LeafletMap
                  center={[latitude, longitude]}
                  zoom={15}
                  interactivePicker={true}
                  selectedCoord={[latitude, longitude]}
                  onLocationSelect={handleMapPinSelected}
                  height="300px"
                />
              </div>
            </MapErrorBoundary>
          </div>

          {/* Geocoding Notice / Error */}
          {geocodingError && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{geocodingError}</span>
              </div>
              <button
                type="button"
                onClick={() => performReverseGeocoding(latitude, longitude)}
                className="px-2.5 py-1 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 rounded font-bold text-[11px] shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Synchronized Address & District Display */}
          <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-on-surface">
                  Resolved Street / Area Address
                </label>
                <button
                  type="button"
                  onClick={() => performReverseGeocoding(latitude, longitude)}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Re-sync
                </button>
              </div>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder={isGeocoding ? 'Fetching address from coordinates...' : 'e.g. South Car Street, Vannarpettai'}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none bg-white font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-on-surface">
                  Tamil Nadu District (Auto-matched from Coordinates)
                </label>
                <span className="text-[10px] text-slate-500 font-medium">Source: Pin Location</span>
              </div>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none bg-white font-medium"
              >
                {TN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-1/3 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isValidLatLng(latitude, longitude)) {
                  toast.error('Please select valid coordinates on the map.');
                  return;
                }
                setStep(4);
              }}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Photos</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: AI IMAGE VALIDATION */}
      {step === 4 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {language === 'en' ? 'AI Photo Evidence Validation' : 'புகைப்பட ஆதார சரிபார்ப்பு'}
              </h2>
              <span className="text-xs bg-primary-light text-primary font-bold px-2.5 py-0.5 rounded-full">
                {CATEGORY_INFO[category]?.labelEn}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Upload clear photo evidence (min 1, max 5). The AI vision engine will verify that the image matches the selected problem category ({CATEGORY_INFO[category]?.labelEn}).
            </p>
          </div>

          <PhotoUpload
            photos={photos}
            onChange={setPhotos}
            maxPhotos={5}
            category={category}
            onValidationChange={handlePhotoValidationChange}
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-1/3 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (photos.length === 0) {
                  toast.error('Please upload at least 1 photo of the issue.');
                  return;
                }
                if (!isImageValid || (imageValidationData && imageValidationData.decision !== 'MATCH')) {
                  toast.error(
                    `Photo verification failed: ${imageValidationData?.reason || 'The uploaded photo does not match the category'}. Please upload a matching photo.`
                  );
                  return;
                }
                setStep(5);
              }}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Description</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: CIVIC ISSUE DESCRIPTION (TEXT AND/OR VOICE) + REVIEW & SUBMIT */}
      {step === 5 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {language === 'en' ? 'Describe the Civic Issue' : 'பிரச்சனையை விவரிக்கவும்'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              You can describe the issue by typing text, recording a voice message, or both. At least one description method is required.
            </p>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-outline uppercase tracking-wider">
              Quick Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {(quickDescriptions[category] || []).map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDescription(prompt)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-xs text-on-surface text-left transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Option A: Text Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface">
              Option A: Written Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Explain what happened, any nearby landmarks or danger to citizens..."
              className="w-full p-3 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none resize-none font-sans"
            />
            <div className="flex justify-between text-[11px] text-on-surface-variant">
              <span>{description.trim().length > 0 ? `${description.length} chars` : 'Optional if voice note provided'}</span>
              <span>{description.length}/500</span>
            </div>
          </div>

          {/* Option B: Voice Recording */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-on-surface">
              Option B: Voice Description (Audio Recording)
            </label>
            <VoiceRecorder
              onAudioRecorded={(audioUrl, duration) => {
                setVoiceAudio(audioUrl);
                setVoiceDuration(duration);
              }}
              existingAudioUrl={voiceAudio}
            />
          </div>

          {/* Comprehensive Review Summary Card */}
          <div className="bg-surface-container-low rounded-2xl p-4 border border-surface-container space-y-3 text-xs mt-4">
            <h3 className="font-bold text-on-surface border-b border-surface-container pb-1.5">
              Review Report Summary
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-on-surface-variant">Category:</span>
                <p className="font-bold text-on-surface">{CATEGORY_INFO[category]?.labelEn}</p>
              </div>
              <div>
                <span className="text-on-surface-variant">Priority:</span>
                <p className="font-bold text-primary">{priority}</p>
              </div>
            </div>

            <div>
              <span className="text-on-surface-variant">Selected Location:</span>
              <p className="font-bold text-on-surface">
                {locationAddress || `Point (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`}
              </p>
              <p className="text-[11px] text-slate-500">
                District: <span className="font-semibold text-on-surface">{district}</span> • Coordinates: <span className="font-mono">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-surface-container">
              <div>
                <span className="text-on-surface-variant">Photos:</span>
                <p className="font-semibold text-on-surface">{photos.length} uploaded</p>
              </div>
              <div>
                <span className="text-on-surface-variant">AI Vision Status:</span>
                <p className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified MATCH
                </p>
              </div>
            </div>

            <div className="pt-1 border-t border-surface-container">
              <span className="text-on-surface-variant">Description Provided:</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {description.trim().length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                    Text: {description.length} chars
                  </span>
                )}
                {voiceAudio && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Voice Note ({voiceDuration}s)
                  </span>
                )}
                {!description.trim() && !voiceAudio && (
                  <span className="text-red-600 font-bold">
                    None yet (Please provide text or voice)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="w-1/3 py-3.5 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={submitting || (!description.trim() && !voiceAudio)}
              onClick={handleSubmitComplaint}
              className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin text-[22px]">
                  progress_activity
                </span>
              ) : (
                <>
                  <span>Submit Complaint</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
