import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { LeafletMap } from '../../components/LeafletMap';
import { PhotoUpload } from '../../components/PhotoUpload';
import { CATEGORY_INFO, TN_DISTRICTS } from '../../lib/utils';
import { api } from '../../lib/api';

export const ReportProblem: React.FC = () => {
  const { user, language } = useStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<any | null>(null);

  // Form State
  const [location, setLocation] = useState<string>(
    user?.location ? `Ward 14, Palayamkottai, ${user.location}` : 'Ward 14, Tirunelveli'
  );
  const [latitude, setLatitude] = useState<number>(8.7139);
  const [longitude, setLongitude] = useState<number>(77.7567);
  const [category, setCategory] = useState<string>('ROAD_DAMAGE');
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<string>('MEDIUM');

  // Auto GPS detection handler
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      toast.loading('Acquiring precise GPS coordinates...', { id: 'gps' });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          setLocation(`GPS Pin Location (${lat}, ${lng}), ${user?.location || 'Tamil Nadu'}`);
          toast.success('GPS coordinates locked!', { id: 'gps' });
        },
        (err) => {
          toast.error(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission was denied. Please allow location access in your browser settings.'
              : 'Unable to determine device location.',
            { id: 'gps' }
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
    }
  };

  const handleMapPinSelected = (coord: { lat: number; lng: number }) => {
    setLatitude(coord.lat);
    setLongitude(coord.lng);
    toast.success(`Marker placed at ${coord.lat}, ${coord.lng}`);
  };

  const handleSubmitComplaint = async () => {
    if (photos.length === 0) {
      toast.error('Please upload at least 1 photo of the issue.');
      setStep(3);
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast.error('Please provide a detailed description (min 10 chars).');
      setStep(4);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/complaints', {
        category,
        description,
        location,
        latitude,
        longitude,
        priority,
        photos,
      });

      if (res.data?.success && res.data?.complaint) {
        setSubmittedComplaint(res.data.complaint);
        toast.success('Complaint submitted successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint.');
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

  // Success Screen when Complaint is Submitted
  if (submittedComplaint) {
    const shareText = encodeURIComponent(
      `Civics Plus TN: My civic complaint #${submittedComplaint.complaintId} regarding ${submittedComplaint.category} in ${submittedComplaint.location} has been registered with Tamil Nadu Municipal Authority. Track resolution here!`
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
              <span className="font-bold text-on-surface truncate max-w-[200px]">{submittedComplaint.location}</span>
            </div>
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
      {/* Step Indicator Header */}
      <div className="bg-white rounded-2xl p-5 border border-surface-container shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-primary font-bold text-base">Step {step} of 5</span>
            <span className="text-xs text-on-surface-variant font-medium">/ படி {step} / 5</span>
          </div>

          <span className="text-xs font-bold text-on-surface">
            {step === 1 && (language === 'en' ? 'Select Location • இருப்பிடம்' : 'இருப்பிடம்')}
            {step === 2 && (language === 'en' ? 'Choose Category • பிரிவு' : 'பிரிவு')}
            {step === 3 && (language === 'en' ? 'Upload Photos • புகைப்படம்' : 'புகைப்படம்')}
            {step === 4 && (language === 'en' ? 'Description • விளக்கம்' : 'விளக்கம்')}
            {step === 5 && (language === 'en' ? 'Review & Submit • சமர்ப்பித்தல்' : 'சமர்ப்பித்தல்')}
          </span>
        </div>

        {/* 5-Step Progress Bar */}
        <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: LOCATION */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">
              {language === 'en' ? 'Pin Exact Issue Location' : 'சரியான இடத்தை தேர்வு செய்யவும்'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {language === 'en'
                ? 'Use automatic GPS or tap directly on the map to set coordinates.'
                : 'தானியங்கி ஜி.பி.எஸ் பயன்படுத்தவும் அல்லது வரைபடத்தில் தட்டவும்.'}
            </p>
          </div>

          {/* Current Location Button */}
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            className="w-full min-h-[54px] bg-primary text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-md hover:bg-primary-dark transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">my_location</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold leading-tight">Use My Current Location</p>
                <p className="text-[11px] opacity-90 leading-tight">எனது தற்போதைய இருப்பிடம்</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px]">near_me</span>
          </button>

          {/* Interactive Map Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Map Marker Picker (Click on map to position pin)</span>
              <span className="font-mono text-[11px] text-primary">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            </div>

            <LeafletMap
              center={[latitude, longitude]}
              zoom={13}
              interactivePicker={true}
              selectedCoord={[latitude, longitude]}
              onLocationSelect={handleMapPinSelected}
              height="280px"
            />
          </div>

          {/* Address and District selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Street / Landmark Description
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Near Bus Stand, South Car Street"
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Tamil Nadu District
              </label>
              <select
                value={user?.location || 'Tirunelveli'}
                onChange={(e) => setLocation(`Ward 12, ${e.target.value}`)}
                className="w-full px-3 py-2.5 rounded-xl border border-outline-variant focus:border-primary text-xs outline-none bg-white"
              >
                {TN_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Continue to Category</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      )}

      {/* STEP 2: CATEGORY */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">
              {language === 'en' ? 'Select Complaint Category' : 'புகார் வகையைத் தேர்ந்தெடுக்கவும்'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {language === 'en'
                ? 'Assigns the complaint to the relevant engineering and municipal body.'
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

          {/* Priority selection */}
          <div className="space-y-2 pt-2 border-t border-surface-container">
            <label className="block text-xs font-bold text-on-surface">Urgency / Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    priority === p
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant border-surface-container'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Photos</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: UPLOAD PHOTOS */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">
              {language === 'en' ? 'Upload Photo Evidence' : 'புகைப்பட ஆதாரத்தை பதிவேற்றவும்'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {language === 'en'
                ? 'Clear photos ensure swift triage and prevent fraudulent complaints (min 1, max 5).'
                : 'தெளிவான படங்கள் உடனடி தீர்வு காண உதவும் (குறைந்தது 1, அதிகபட்சம் 5).'}
            </p>
          </div>

          <PhotoUpload photos={photos} onChange={setPhotos} maxPhotos={5} />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-1/3 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (photos.length === 0) {
                  toast.error('Please upload at least 1 photo.');
                  return;
                }
                setStep(4);
              }}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Description</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DESCRIPTION */}
      {step === 4 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">
              {language === 'en' ? 'Describe the Civic Issue' : 'பிரச்சனையை விவரிக்கவும்'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              Provide specific details (nearby shop, landmarks, hazard level). Max 500 characters.
            </p>
          </div>

          {/* Quick chips */}
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

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="Explain the issue clearly (e.g. Dangerously exposed cable near fruit stall on North Street...)"
              className="w-full p-3 rounded-xl border border-outline-variant focus:border-primary text-sm outline-none resize-none"
            />
            <div className="flex justify-between text-[11px] text-on-surface-variant mt-1">
              <span>Minimum 10 characters required</span>
              <span>{description.length}/500</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-1/3 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (description.trim().length < 10) {
                  toast.error('Description must be at least 10 characters.');
                  return;
                }
                setStep(5);
              }}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Review Summary</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & SUBMIT */}
      {step === 5 && (
        <div className="bg-white rounded-2xl p-6 border border-surface-container shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface">
              {language === 'en' ? 'Review & Confirm Submission' : 'விவரங்களை சரிபார்த்து சமர்ப்பிக்கவும்'}
            </h2>
            <p className="text-xs text-on-surface-variant">
              Confirm all details before submitting to Tamil Nadu Municipal Authority.
            </p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-5 border border-surface-container space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant font-medium">Category:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-on-surface">{CATEGORY_INFO[category]?.labelEn}</span>
                <button
                  onClick={() => setStep(2)}
                  className="text-primary hover:underline font-bold"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant font-medium">Location:</span>
              <div className="flex items-center gap-2 max-w-[260px] truncate">
                <span className="font-bold text-on-surface truncate">{location}</span>
                <button
                  onClick={() => setStep(1)}
                  className="text-primary hover:underline font-bold shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant font-medium">Coordinates:</span>
              <span className="font-mono text-on-surface font-bold">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <span className="text-on-surface-variant font-medium">Priority:</span>
              <span className="font-bold text-primary">{priority}</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-medium">Description:</span>
                <button
                  onClick={() => setStep(4)}
                  className="text-primary hover:underline font-bold"
                >
                  Edit
                </button>
              </div>
              <p className="p-2.5 bg-white rounded-xl border border-surface-container text-on-surface leading-relaxed">
                {description}
              </p>
            </div>

            {/* Photo thumbnails */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant font-medium">
                  Photos ({photos.length}):
                </span>
                <button
                  onClick={() => setStep(3)}
                  className="text-primary hover:underline font-bold"
                >
                  Edit
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt="Upload thumbnail"
                    className="w-16 h-16 rounded-xl object-cover border border-surface-container shrink-0"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="w-1/3 py-3.5 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
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
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
