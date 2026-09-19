import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LeafletMap, UserLiveLocation, MapPlacePoint } from '../../components/LeafletMap';
import { ComplaintCard } from '../../components/ComplaintCard';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { DISTRICT_COORDS } from '../../lib/utils';
import {
  searchLocation,
  fetchRoute,
  LocationSearchResult,
  RouteResult,
} from '../../lib/mapService';

export const CitizenDashboard: React.FC = () => {
  const { user, language } = useStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'MINE' | 'UNRESOLVED' | 'RESOLVED'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Advanced Civic Portal Map Controls (Civic Portal ONLY)
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [showDirections, setShowDirections] = useState<boolean>(false);
  const [fromInput, setFromInput] = useState<string>('');
  const [toInput, setToInput] = useState<string>('');
  const [fromCoords, setFromCoords] = useState<MapPlacePoint | null>(null);
  const [toCoords, setToCoords] = useState<MapPlacePoint | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<LocationSearchResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<LocationSearchResult[]>([]);
  const [isSearchingFrom, setIsSearchingFrom] = useState<boolean>(false);
  const [isSearchingTo, setIsSearchingTo] = useState<boolean>(false);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [fitRouteTrigger, setFitRouteTrigger] = useState<number>(0);
  const [pendingFromCurrentLocation, setPendingFromCurrentLocation] = useState<boolean>(false);

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

  // Auto-fill From field once Live Location is fetched if requested
  useEffect(() => {
    if (pendingFromCurrentLocation && userLiveLocation) {
      setFromCoords({
        lat: userLiveLocation.lat,
        lng: userLiveLocation.lng,
        name: language === 'en' ? 'My Current Location' : 'எனது தற்போதைய இருப்பிடம்',
      });
      setFromInput(language === 'en' ? '📍 My Current Location' : '📍 எனது தற்போதைய இருப்பிடம்');
      setPendingFromCurrentLocation(false);
      setFromSuggestions([]);
    }
  }, [userLiveLocation, pendingFromCurrentLocation, language]);

  // Debounced Search for "From" location
  useEffect(() => {
    if (!fromInput || fromInput.startsWith('📍') || (fromCoords && fromCoords.name === fromInput)) {
      setFromSuggestions([]);
      return;
    }
    if (fromInput.trim().length < 2) {
      setFromSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingFrom(true);
      const results = await searchLocation(fromInput);
      setFromSuggestions(results);
      setIsSearchingFrom(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [fromInput, fromCoords]);

  // Debounced Search for "To" location
  useEffect(() => {
    if (!toInput || (toCoords && toCoords.name === toInput)) {
      setToSuggestions([]);
      return;
    }
    if (toInput.trim().length < 2) {
      setToSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTo(true);
      const results = await searchLocation(toInput);
      setToSuggestions(results);
      setIsSearchingTo(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [toInput, toCoords]);

  // Handle "Use My Location" for From field
  const handleUseMyLocationForFrom = () => {
    if (userLiveLocation) {
      setFromCoords({
        lat: userLiveLocation.lat,
        lng: userLiveLocation.lng,
        name: language === 'en' ? 'My Current Location' : 'எனது தற்போதைய இருப்பிடம்',
      });
      setFromInput(language === 'en' ? '📍 My Current Location' : '📍 எனது தற்போதைய இருப்பிடம்');
      setFromSuggestions([]);
    } else {
      setPendingFromCurrentLocation(true);
      handleGetLiveLocation(false);
    }
  };

  // Select suggestion for From
  const handleSelectFrom = (item: LocationSearchResult) => {
    setFromCoords({
      lat: item.lat,
      lng: item.lng,
      name: item.name,
    });
    setFromInput(item.displayName);
    setFromSuggestions([]);
  };

  // Select suggestion for To
  const handleSelectTo = (item: LocationSearchResult) => {
    setToCoords({
      lat: item.lat,
      lng: item.lng,
      name: item.name,
    });
    setToInput(item.displayName);
    setToSuggestions([]);
  };

  // Swap From & To
  const handleSwapFromTo = () => {
    const prevFromInput = fromInput;
    const prevFromCoords = fromCoords;
    setFromInput(toInput);
    setFromCoords(toCoords);
    setToInput(prevFromInput);
    setToCoords(prevFromCoords);
    setFromSuggestions([]);
    setToSuggestions([]);

    if (activeRoute && prevFromCoords && toCoords) {
      fetchRoute(toCoords.lat, toCoords.lng, prevFromCoords.lat, prevFromCoords.lng).then((res) => {
        if (res && res.success) {
          setActiveRoute(res);
          setFitRouteTrigger((p) => p + 1);
        }
      });
    }
  };

  // Calculate directions
  const handleCalculateRoute = async () => {
    if (!fromCoords || !toCoords) {
      toast.error(
        language === 'en'
          ? 'Please pick or search both starting and destination points.'
          : 'தொடக்க மற்றும் சேருமிடத்தைத் தேர்ந்தெடுக்கவும்.'
      );
      return;
    }

    setIsRouting(true);
    const toastId = toast.loading(
      language === 'en' ? 'Calculating road directions...' : 'வழித்தடத்தை கணக்கிடுகிறது...'
    );

    const result = await fetchRoute(fromCoords.lat, fromCoords.lng, toCoords.lat, toCoords.lng);
    setIsRouting(false);
    toast.dismiss(toastId);

    if (result && result.success && result.coordinates.length > 0) {
      setActiveRoute(result);
      setFitRouteTrigger((p) => p + 1);
      toast.success(
        language === 'en'
          ? `Route: ${result.distanceKm} • ${result.durationFormatted}`
          : `வழித்தடம்: ${result.distanceKm} • ${result.durationFormatted}`
      );
    } else {
      toast.error(
        language === 'en'
          ? 'Could not calculate road route between these locations. Try picking a nearby road location.'
          : 'இந்த இடங்களுக்கு இடையே சாலை வழித்தடத்தை கணக்கிட முடியவில்லை.'
      );
    }
  };

  // Clear directions & markers
  const handleClearRoute = () => {
    setActiveRoute(null);
    setFromCoords(null);
    setToCoords(null);
    setFromInput('');
    setToInput('');
    setFromSuggestions([]);
    setToSuggestions([]);
    toast.success(
      language === 'en' ? 'Directions cleared' : 'வழித்தடம் அழிக்கப்பட்டது'
    );
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
        {/* Full-screen Leaflet Map with Live Location and Advanced Satellite/Route Support */}
        <LeafletMap
          complaints={filteredComplaints}
          center={mapCenter}
          zoom={12}
          height="100%"
          className="rounded-none border-0"
          userLocation={userLiveLocation}
          flyToUserLocationTrigger={flyTrigger}
          onUserPanned={() => setUserHasManuallyPanned(true)}
          mapType={mapType}
          routeGeometry={activeRoute?.coordinates}
          fromLocation={fromCoords}
          destinationLocation={toCoords}
          fitRouteTrigger={fitRouteTrigger}
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

        {/* Google Maps-Style Top-Left Controls: Satellite Switcher & Directions Hub */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-md">
          {/* Segmented Map Type & Directions Pill */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Map / Satellite Segmented Switcher */}
            <div className="bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-surface-container flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMapType('streets')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mapType === 'streets'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
                <span>{language === 'en' ? 'Map' : 'வரைபடம்'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mapType === 'satellite'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">satellite_alt</span>
                <span>{language === 'en' ? 'Satellite' : 'செயற்கைக்கோள்'}</span>
              </button>
            </div>

            {/* Directions Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDirections(!showDirections)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg border ${
                showDirections || activeRoute
                  ? 'bg-blue-600 text-white border-blue-700 shadow-blue-500/20'
                  : 'bg-white/95 backdrop-blur-md text-on-surface hover:bg-blue-50 border-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">directions</span>
              <span>{language === 'en' ? 'Directions' : 'வழித்தடம்'}</span>
              {activeRoute && (
                <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {activeRoute.distanceKm}
                </span>
              )}
            </button>
          </div>

          {/* Google Maps-Style Floating Directions & Route Planning Hub */}
          {showDirections && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-surface-container w-full sm:w-96 text-xs space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-surface-container pb-2">
                <div className="flex items-center gap-1.5 font-bold text-on-surface text-sm">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">
                    alt_route
                  </span>
                  <span>{language === 'en' ? 'From → To Route Search' : 'வழித்தடத் தேடல்'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDirections(false)}
                  className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Inputs Container */}
              <div className="relative space-y-2">
                {/* Swap button placed absolutely between From and To */}
                <button
                  type="button"
                  onClick={handleSwapFromTo}
                  title="Swap starting point and destination"
                  className="absolute right-2 top-8 z-10 p-1.5 bg-white border border-surface-container-high rounded-full shadow-md text-on-surface-variant hover:text-primary hover:bg-blue-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] block">swap_vert</span>
                </button>

                {/* From Input */}
                <div className="relative">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      {language === 'en' ? 'From (Starting Point)' : 'புறப்படும் இடம்'}
                    </span>
                    {fromCoords && (
                      <span className="text-[10px] text-emerald-600 font-semibold lowercase">
                        {fromCoords.lat.toFixed(3)}, {fromCoords.lng.toFixed(3)}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fromInput}
                      onChange={(e) => {
                        setFromInput(e.target.value);
                        if (fromCoords && fromCoords.name !== e.target.value) {
                          setFromCoords(null);
                        }
                      }}
                      placeholder={
                        language === 'en'
                          ? 'Search starting place or use location...'
                          : 'புறப்படும் இடத்தை தேடவும்...'
                      }
                      className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    {isSearchingFrom && (
                      <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-primary animate-spin text-[16px]">
                        progress_activity
                      </span>
                    )}
                    {fromInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setFromInput('');
                          setFromCoords(null);
                          setFromSuggestions([]);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>

                  {/* Quick "My Current Location" Option */}
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleUseMyLocationForFrom}
                      className="text-[11px] font-bold text-primary hover:text-primary-dark flex items-center gap-1 py-0.5 px-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">my_location</span>
                      <span>
                        {language === 'en' ? '📍 My Current Location' : '📍 எனது தற்போதைய இருப்பிடம்'}
                      </span>
                    </button>
                  </div>

                  {/* From Suggestions Dropdown */}
                  {fromSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-surface-container z-30 max-h-48 overflow-y-auto divide-y divide-surface-container-low">
                      {fromSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectFrom(item)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex items-start gap-2"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">
                            pin_drop
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-on-surface truncate">{item.name}</p>
                            <p className="text-[10px] text-on-surface-variant truncate">
                              {item.displayName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* To Input */}
                <div className="relative">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      {language === 'en' ? 'To (Destination)' : 'சேருமிடம்'}
                    </span>
                    {toCoords && (
                      <span className="text-[10px] text-red-600 font-semibold lowercase">
                        {toCoords.lat.toFixed(3)}, {toCoords.lng.toFixed(3)}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={toInput}
                      onChange={(e) => {
                        setToInput(e.target.value);
                        if (toCoords && toCoords.name !== e.target.value) {
                          setToCoords(null);
                        }
                      }}
                      placeholder={
                        language === 'en'
                          ? 'Search destination place or landmark...'
                          : 'சேருமிடத்தை தேடவும்...'
                      }
                      className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-surface-container-high bg-surface-container-lowest text-on-surface outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                    {isSearchingTo && (
                      <span className="material-symbols-outlined absolute right-8 top-1/2 -translate-y-1/2 text-primary animate-spin text-[16px]">
                        progress_activity
                      </span>
                    )}
                    {toInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setToInput('');
                          setToCoords(null);
                          setToSuggestions([]);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>

                  {/* To Suggestions Dropdown */}
                  {toSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-surface-container z-30 max-h-48 overflow-y-auto divide-y divide-surface-container-low">
                      {toSuggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTo(item)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex items-start gap-2"
                        >
                          <span className="material-symbols-outlined text-red-600 text-[16px] shrink-0 mt-0.5">
                            flag
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-on-surface truncate">{item.name}</p>
                            <p className="text-[10px] text-on-surface-variant truncate">
                              {item.displayName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Get Directions & Clear */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCalculateRoute}
                  disabled={isRouting || !fromCoords || !toCoords}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    !fromCoords || !toCoords
                      ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                      : isRouting
                      ? 'bg-blue-700 text-white shadow-md'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 active:scale-[0.98]'
                  }`}
                >
                  {isRouting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                      <span>
                        {language === 'en' ? 'Calculating...' : 'கணக்கிடுகிறது...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">navigation</span>
                      <span>{language === 'en' ? 'Get Directions' : 'வழித்தடம் காண்க'}</span>
                    </>
                  )}
                </button>

                {(activeRoute || fromCoords || toCoords || fromInput || toInput) && (
                  <button
                    type="button"
                    onClick={handleClearRoute}
                    className="py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold text-xs transition-colors"
                    title="Clear route and destination"
                  >
                    {language === 'en' ? 'Clear' : 'அழி'}
                  </button>
                )}
              </div>

              {/* Real Route Summary Card (Visible when route is calculated) */}
              {activeRoute && (
                <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-blue-950">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px] text-blue-700">
                        directions_car
                      </span>
                      <span>{language === 'en' ? 'Driving Route' : 'சாலை வழித்தடம்'}</span>
                    </span>
                    <span className="bg-blue-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                      {activeRoute.distanceKm}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-blue-900 font-medium pt-0.5">
                    <span>
                      {language === 'en' ? 'Est. Travel Time:' : 'மதிப்பிடப்பட்ட நேரம்:'}{' '}
                      <strong className="text-blue-950 font-bold">{activeRoute.durationFormatted}</strong>
                    </span>
                    {activeRoute.summary && (
                      <span className="text-[10px] text-blue-700 truncate max-w-[140px]">
                        {activeRoute.summary}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Legend Floating Pill (Positioned neatly at bottom left) */}
        <div className="absolute bottom-6 left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-md border border-surface-container text-[11px] font-semibold space-y-1 hidden md:block">
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
