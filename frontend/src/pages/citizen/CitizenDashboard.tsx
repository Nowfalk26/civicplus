import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LeafletMap, UserLiveLocation } from '../../components/LeafletMap';
import { ComplaintCard } from '../../components/ComplaintCard';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { DISTRICT_COORDS } from '../../lib/utils';

export const CitizenDashboard: React.FC = () => {
  const { user, language } = useStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'MINE' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Real Geolocation States (Strictly client-side, never stored in DB)
  const [userLiveLocation, setUserLiveLocation] = useState<UserLiveLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const [flyTrigger, setFlyTrigger] = useState<number>(0);
  const [userHasManuallyPanned, setUserHasManuallyPanned] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<{
    type: 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'INSECURE';
    message: string;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Clean up geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // 1. Core Real Geolocation API Fetcher
  const handleGetLiveLocation = (enableContinuousTracking: boolean = false) => {
    setLocationError(null);

    // Browser support verification
    if (!('geolocation' in navigator)) {
      const msg =
        language === 'en'
          ? 'Geolocation is not supported by your browser.'
          : 'உங்கள் உலாவி இருப்பிடச் சேவையை ஆதரிக்கவில்லை.';
      setLocationError({ type: 'UNSUPPORTED', message: msg });
      toast.error(msg);
      return;
    }

    // HTTPS / Secure Context verification
    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      const msg =
        language === 'en'
          ? 'Live Location requires a secure HTTPS connection in production.'
          : 'நேரடி இருப்பிடத்திற்கு பாதுகாப்பான HTTPS இணைப்பு தேவை.';
      setLocationError({ type: 'INSECURE', message: msg });
      toast.error(msg);
      return;
    }

    setIsLocating(true);
    const loadingToast = toast.loading(
      language === 'en'
        ? 'Requesting device location...'
        : 'சாதன இருப்பிடத்தை கோருகிறது...',
      { id: 'geo-status' }
    );

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    // Native browser Geolocation prompt & measurement
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        toast.dismiss(loadingToast);

        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = position.coords.accuracy;

        setUserLiveLocation({
          lat,
          lng,
          accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });

        setUserHasManuallyPanned(false);
        setFlyTrigger((prev) => prev + 1);

        const accNotice =
          accuracy && accuracy > 0
            ? language === 'en'
              ? ` (Accuracy: ~${Math.round(accuracy)}m)`
              : ` (துல்லியம்: ~${Math.round(accuracy)} மீ)`
            : '';

        toast.success(
          language === 'en'
            ? `Live Location acquired!${accNotice}`
            : `நேரடி இருப்பிடம் பெறப்பட்டது!${accNotice}`,
          { id: 'geo-status' }
        );

        if (enableContinuousTracking) {
          startLiveTrackingWatcher();
        }
      },
      (error) => {
        setIsLocating(false);
        toast.dismiss(loadingToast);

        switch (error.code) {
          case error.PERMISSION_DENIED: {
            const msg =
              language === 'en'
                ? 'Location permission was denied. Please allow location access in your browser settings to use My Live Location.'
                : 'இருப்பிட அனுமதி மறுக்கப்பட்டது. நேரடி இருப்பிடத்தைப் பயன்படுத்த உங்கள் உலாவி அமைப்புகளில் அனுமதியை வழங்கவும்.';
            setLocationError({ type: 'DENIED', message: msg });
            toast.error(msg, { duration: 5500 });
            break;
          }
          case error.POSITION_UNAVAILABLE: {
            const msg =
              language === 'en'
                ? 'Your current location could not be determined.'
                : 'உங்கள் தற்போதைய இருப்பிடத்தை தீர்மானிக்க முடியவில்லை.';
            setLocationError({ type: 'UNAVAILABLE', message: msg });
            toast.error(msg);
            break;
          }
          case error.TIMEOUT: {
            const msg =
              language === 'en'
                ? 'Location request timed out. Please try again.'
                : 'இருப்பிட கோரிக்கை நேரம் முடிந்தது. மீண்டும் முயற்சிக்கவும்.';
            setLocationError({ type: 'TIMEOUT', message: msg });
            toast.error(msg);
            break;
          }
          default: {
            const msg =
              language === 'en'
                ? 'Unable to retrieve your current location.'
                : 'தற்போதைய இருப்பிடத்தைப் பெற முடியவில்லை.';
            setLocationError({ type: 'UNAVAILABLE', message: msg });
            toast.error(msg);
            break;
          }
        }
      },
      geoOptions
    );
  };

  // 2. Continuous Real Live Tracking Watcher
  const startLiveTrackingWatcher = () => {
    if (!('geolocation' in navigator)) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setIsLiveTracking(true);

    const watchOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = position.coords.accuracy;

        setUserLiveLocation({
          lat,
          lng,
          accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        });

        // Only synchronize camera if user has not manually panned the map away
        if (!userHasManuallyPanned) {
          setFlyTrigger((prev) => prev + 1);
        }
      },
      (error) => {
        console.warn('Geolocation live watcher update:', error.message);
      },
      watchOptions
    );
  };

  // 3. Stop Live Location Tracking
  const stopLiveLocation = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    toast.success(
      language === 'en'
        ? 'Live location tracking stopped.'
        : 'நேரடி இருப்பிட கண்காணிப்பு நிறுத்தப்பட்டது.'
    );
  };

  // 4. Center on User Position
  const handleCenterOnMe = () => {
    if (userLiveLocation) {
      setUserHasManuallyPanned(false);
      setFlyTrigger((prev) => prev + 1);
      toast.success(language === 'en' ? 'Centered on your location' : 'உங்கள் இருப்பிடத்தில் நிலைநிறுத்தப்பட்டது');
    } else {
      handleGetLiveLocation(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get('/complaints?limit=100');
      if (res.data?.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine user's district coordinate center
  const userDistrict = user?.location || 'Tirunelveli';
  const defaultCenterInfo = (DISTRICT_COORDS as any)[userDistrict] || {
    lat: 8.7139,
    lng: 77.7567,
  };
  const mapCenter: [number, number] = [defaultCenterInfo.lat, defaultCenterInfo.lng];

  // Apply filters
  const filteredComplaints = complaints.filter((c) => {
    if (filter === 'MINE' && c.reportedById !== user?.id) return false;
    if (filter === 'UNRESOLVED' && c.status === 'RESOLVED') return false;
    if (filter === 'RESOLVED' && c.status !== 'RESOLVED') return false;
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.complaintId.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-surface">
      {/* Top Filter Bar */}
      <div className="bg-white border-b border-surface-container-high px-4 py-2.5 z-20 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ALL'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'All Issues' : 'அனைத்தும்'} ({complaints.length})
          </button>

          <button
            onClick={() => setFilter('MINE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'MINE'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'My Reports' : 'எனது புகார்கள்'} (
            {complaints.filter((c) => c.reportedById === user?.id).length})
          </button>

          <button
            onClick={() => setFilter('UNRESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'UNRESOLVED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'Unresolved' : 'தீர்க்கப்படாதவை'} (
            {complaints.filter((c) => c.status !== 'RESOLVED').length})
          </button>

          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'RESOLVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            {language === 'en' ? 'Resolved' : 'தீர்க்கப்பட்டவை'} (
            {complaints.filter((c) => c.status === 'RESOLVED').length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'en' ? 'Search ID, street, ward...' : 'தேடுக...'}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-xs outline-none focus:border-primary"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-outline-variant bg-white text-on-surface outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="ROAD_DAMAGE">Road Damage</option>
            <option value="STREET_LIGHT">Street Light</option>
            <option value="ELECTRICAL_WIRE">Electrical Wire</option>
            <option value="GARBAGE_WASTE">Garbage Waste</option>
            <option value="STORM_WATER_DRAIN">Storm Water Drain</option>
            <option value="PUBLIC_SPACE">Public Space</option>
          </select>

          {/* Quick "📍 My Live Location" Header Button */}
          <button
            onClick={() => {
              if (isLiveTracking) {
                stopLiveLocation();
              } else {
                handleGetLiveLocation(false);
              }
            }}
            disabled={isLocating}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              isLiveTracking
                ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                : userLiveLocation
                ? 'bg-primary text-white shadow-xs'
                : 'bg-primary-light text-primary hover:bg-primary/20 border border-primary/30'
            }`}
          >
            {isLocating ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">
                {isLiveTracking ? 'radar' : 'my_location'}
              </span>
            )}
            <span>
              {isLocating
                ? 'Locating...'
                : isLiveTracking
                ? 'Live Active'
                : userLiveLocation
                ? 'My Location'
                : '📍 My Live Location'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas & Overlay Drawer */}
      <div className="relative flex-1 w-full h-full">
        {/* Full-screen Leaflet Map with Live Location Support */}
        <LeafletMap
          complaints={filteredComplaints}
          center={mapCenter}
          zoom={12}
          height="100%"
          className="rounded-none border-0"
          userLocation={userLiveLocation}
          flyToUserLocationTrigger={flyTrigger}
          onUserPanned={() => setUserHasManuallyPanned(true)}
        />

        {/* Floating "📍 My Live Location" Hub Card */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 max-w-[280px] sm:max-w-xs">
          {!userLiveLocation ? (
            <button
              onClick={() => handleGetLiveLocation(false)}
              disabled={isLocating}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-blue-50 text-primary border-2 border-primary/30 hover:border-primary shadow-lg font-bold text-xs sm:text-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLocating ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin text-primary">
                    progress_activity
                  </span>
                  <span>{language === 'en' ? 'Acquiring GPS...' : 'இருப்பிடத்தை பெறுகிறது...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px] text-primary">my_location</span>
                  <span>{language === 'en' ? '📍 My Live Location' : '📍 எனது நேரடி இருப்பிடம்'}</span>
                </>
              )}
            </button>
          ) : (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-surface-container shadow-xl text-xs space-y-2.5 w-full">
              {/* Header with Radar Pulse Indicator */}
              <div className="flex items-center justify-between gap-2 border-b border-surface-container pb-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center w-3 h-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                  </div>
                  <span className="font-bold text-on-surface">
                    {language === 'en' ? 'Live Location Active' : 'நேரடி இருப்பிடம் செயலில்'}
                  </span>
                </div>
                {userLiveLocation.accuracy && (
                  <span className="text-[10px] font-semibold text-primary bg-primary-light px-2 py-0.5 rounded-full">
                    ±{Math.round(userLiveLocation.accuracy)}m
                  </span>
                )}
              </div>

              {/* Coordinates and Accuracy Details */}
              <div className="text-[11px] text-on-surface-variant space-y-1">
                <p className="flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-primary">pin_drop</span>
                  <span>
                    {userLiveLocation.lat.toFixed(5)}, {userLiveLocation.lng.toFixed(5)}
                  </span>
                </p>
                {userLiveLocation.accuracy && (
                  <p className="text-[10px] text-outline">
                    {language === 'en'
                      ? `Accuracy: approximately ${Math.round(userLiveLocation.accuracy)} meters`
                      : `துல்லியம்: தோராயமாக ${Math.round(userLiveLocation.accuracy)} மீட்டர்கள்`}
                  </p>
                )}
              </div>

              {/* Actions: Center on Me & Live Tracking Toggle */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={handleCenterOnMe}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs hover:bg-primary-dark transition-all"
                  title="Center map on your current location"
                >
                  <span className="material-symbols-outlined text-[16px]">center_focus_strong</span>
                  <span>{language === 'en' ? 'Center' : 'மையம்'}</span>
                </button>

                {isLiveTracking ? (
                  <button
                    onClick={stopLiveLocation}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                    title="Stop active continuous tracking"
                  >
                    <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                    <span>{language === 'en' ? 'Stop Live' : 'நிறுத்து'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => startLiveTrackingWatcher()}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                    title="Track device movement in real time"
                  >
                    <span className="material-symbols-outlined text-[16px]">radar</span>
                    <span>{language === 'en' ? 'Track' : 'பின்தொடர்'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Real Geolocation Error / Warning Banner */}
        {locationError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-md bg-white border-2 border-amber-300 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-[26px] shrink-0 mt-0.5">
                {locationError.type === 'DENIED'
                  ? 'location_disabled'
                  : locationError.type === 'TIMEOUT'
                  ? 'timer_off'
                  : 'error'}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-on-surface">
                  {locationError.type === 'DENIED'
                    ? language === 'en' ? 'Permission Denied' : 'அனுமதி மறுக்கப்பட்டது'
                    : locationError.type === 'TIMEOUT'
                    ? language === 'en' ? 'Request Timed Out' : 'கோரிக்கை நேரம் முடிந்தது'
                    : language === 'en' ? 'Location Unavailable' : 'இருப்பிடம் கிடைக்கவில்லை'}
                </h4>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {locationError.message}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {(locationError.type === 'TIMEOUT' || locationError.type === 'UNAVAILABLE') && (
                    <button
                      onClick={() => handleGetLiveLocation(false)}
                      className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-dark transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">refresh</span>
                      <span>{language === 'en' ? 'Try Again' : 'மீண்டும் முயற்சி செய்'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setLocationError(null)}
                    className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-semibold transition-colors"
                  >
                    {language === 'en' ? 'Dismiss' : 'மூடு'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setLocationError(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Map Legend Floating Pill */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-md border border-surface-container text-[11px] font-semibold space-y-1 hidden md:block">
          <p className="font-bold text-xs text-on-surface border-b border-surface-container pb-1">
            Map Legend • வரைபட விளக்கம்
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Submitted (சமர்ப்பிக்கப்பட்டது)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Assigned / In Progress (செயலில்)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Resolved (தீர்க்கப்பட்டது)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span>Rejected (நிராகரிக்கப்பட்டது)</span>
          </div>
        </div>

        {/* Floating Action Button (FAB) "+" to Report Issue */}
        <Link
          to="/citizen/report"
          className="absolute bottom-6 right-6 z-20 px-5 py-3.5 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-xl shadow-primary/40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:rotate-90 transition-transform">
            add
          </span>
          <span className="hidden sm:inline">
            {language === 'en' ? 'Report New Problem' : 'புதிய புகார் அளி'}
          </span>
        </Link>
      </div>
    </div>
  );
};
