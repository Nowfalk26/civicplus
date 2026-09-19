import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LeafletMap, UserLiveLocation, MapPlacePoint } from '../../components/LeafletMap';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import { DISTRICT_COORDS, STATUS_INFO, CATEGORY_INFO } from '../../lib/utils';
import {
  searchLocation,
  fetchRoute,
  filterReportsAlongRoute,
  LocationSearchResult,
  RouteResult,
  RouteComplaintMatch,
} from '../../lib/mapService';

export const RouteReports: React.FC = () => {
  const { user, language } = useStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState<boolean>(true);

  // Map Tile Type (Streets vs Satellite)
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  // Route Planning Inputs
  const [fromInput, setFromInput] = useState<string>('');
  const [toInput, setToInput] = useState<string>('');
  const [fromCoords, setFromCoords] = useState<MapPlacePoint | null>(null);
  const [toCoords, setToCoords] = useState<MapPlacePoint | null>(null);
  const [fromSuggestions, setFromSuggestions] = useState<LocationSearchResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<LocationSearchResult[]>([]);
  const [isSearchingFrom, setIsSearchingFrom] = useState<boolean>(false);
  const [isSearchingTo, setIsSearchingTo] = useState<boolean>(false);
  const [pendingFromCurrentLocation, setPendingFromCurrentLocation] = useState<boolean>(false);

  // Route Results & Execution
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [fitRouteTrigger, setFitRouteTrigger] = useState<number>(0);

  // Route Corridor & Filters
  const [corridorMeters, setCorridorMeters] = useState<number>(500);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Mobile View Switcher (Map vs Reports Panel)
  const [mobileView, setMobileView] = useState<'map' | 'panel'>('panel');

  // Real Geolocation States
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
  const reportListRef = useRef<HTMLDivElement>(null);

  // Clean up geolocation watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Fetch Complaints on Mount
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const res = await api.get('/complaints?limit=150');
      if (res.data?.success) {
        setComplaints(res.data.complaints || []);
      }
    } catch (err) {
      console.error('Failed to load complaints for route analysis:', err);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Real Geolocation Fetcher
  const handleGetLiveLocation = (enableContinuousTracking: boolean = false) => {
    setLocationError(null);

    if (!('geolocation' in navigator)) {
      const msg =
        language === 'en'
          ? 'Geolocation is not supported by your browser.'
          : 'உங்கள் உலாவி இருப்பிடச் சேவையை ஆதரிக்கவில்லை.';
      setLocationError({ type: 'UNSUPPORTED', message: msg });
      toast.error(msg);
      return;
    }

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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        toast.dismiss(loadingToast);

        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = pos.coords.accuracy;

        setUserLiveLocation({
          lat,
          lng,
          accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });

        setUserHasManuallyPanned(false);
        setFlyTrigger((prev) => prev + 1);

        toast.success(
          language === 'en' ? 'Live Location acquired!' : 'நேரடி இருப்பிடம் பெறப்பட்டது!',
          { id: 'geo-status' }
        );

        if (enableContinuousTracking) {
          startLiveTrackingWatcher();
        }
      },
      (err) => {
        setIsLocating(false);
        toast.dismiss(loadingToast);
        let msg =
          language === 'en'
            ? 'Unable to retrieve your current location.'
            : 'தற்போதைய இருப்பிடத்தைப் பெற முடியவில்லை.';
        let type: 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' = 'UNAVAILABLE';

        if (err.code === err.PERMISSION_DENIED) {
          type = 'DENIED';
          msg =
            language === 'en'
              ? 'Location permission denied. Please allow location access in browser settings.'
              : 'இருப்பிட அனுமதி மறுக்கப்பட்டது.';
        } else if (err.code === err.TIMEOUT) {
          type = 'TIMEOUT';
          msg = language === 'en' ? 'Location request timed out.' : 'இருப்பிட கோரிக்கை நேரம் முடிந்தது.';
        }

        setLocationError({ type, message: msg });
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Continuous Tracking Watcher
  const startLiveTrackingWatcher = () => {
    if (!('geolocation' in navigator)) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setIsLiveTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setUserLiveLocation({
          lat,
          lng,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });

        if (!userHasManuallyPanned) {
          setFlyTrigger((prev) => prev + 1);
        }
      },
      (err) => console.warn('Watcher error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  };

  const stopLiveLocation = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    toast.success(
      language === 'en' ? 'Live tracking stopped.' : 'நேரடி கண்காணிப்பு நிறுத்தப்பட்டது.'
    );
  };

  // Auto-fill From when user requested live location
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

  // Debounced From Location Search
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
      const res = await searchLocation(fromInput);
      setFromSuggestions(res);
      setIsSearchingFrom(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [fromInput, fromCoords]);

  // Debounced To Location Search
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
      const res = await searchLocation(toInput);
      setToSuggestions(res);
      setIsSearchingTo(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [toInput, toCoords]);

  // Use My Current Location for From field
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

  const handleSelectFrom = (item: LocationSearchResult) => {
    setFromCoords({ lat: item.lat, lng: item.lng, name: item.name });
    setFromInput(item.displayName);
    setFromSuggestions([]);
  };

  const handleSelectTo = (item: LocationSearchResult) => {
    setToCoords({ lat: item.lat, lng: item.lng, name: item.name });
    setToInput(item.displayName);
    setToSuggestions([]);
  };

  const handleSwapLocations = () => {
    const prevInput = fromInput;
    const prevCoords = fromCoords;
    setFromInput(toInput);
    setFromCoords(toCoords);
    setToInput(prevInput);
    setToCoords(prevCoords);
    setFromSuggestions([]);
    setToSuggestions([]);

    if (activeRoute && prevCoords && toCoords) {
      fetchRoute(toCoords.lat, toCoords.lng, prevCoords.lat, prevCoords.lng).then((res) => {
        if (res && res.success) {
          setActiveRoute(res);
          setFitRouteTrigger((p) => p + 1);
        }
      });
    }
  };

  // Calculate Real Road Route
  const handleGetRoute = async () => {
    if (!fromCoords || !toCoords) {
      toast.error(
        language === 'en'
          ? 'Please pick both starting point and destination.'
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
      // Auto-switch to map on mobile so user sees the route
      if (window.innerWidth < 768) {
        setMobileView('map');
      }
      toast.success(
        language === 'en'
          ? `Route: ${result.distanceKm} • ${result.durationFormatted}`
          : `வழித்தடம்: ${result.distanceKm} • ${result.durationFormatted}`
      );
    } else {
      toast.error(
        language === 'en'
          ? 'Could not calculate a road route between these points. Try nearby road addresses.'
          : 'இந்த இடங்களுக்கு இடையே சாலை வழித்தடத்தை கணக்கிட முடியவில்லை.'
      );
    }
  };

  // Clear current route query
  const handleClearRoute = () => {
    setActiveRoute(null);
    setFromCoords(null);
    setToCoords(null);
    setFromInput('');
    setToInput('');
    setFromSuggestions([]);
    setToSuggestions([]);
    setSelectedComplaintId(null);
    toast.success(language === 'en' ? 'Route cleared' : 'வழித்தடம் அழிக்கப்பட்டது');
  };

  // Compute Route Corridor Matches & Filtered Reports
  const { matchedReports, filteredRouteMatches, mapDisplayComplaints } = useMemo(() => {
    if (!activeRoute || activeRoute.coordinates.length === 0) {
      return {
        matchedReports: [],
        filteredRouteMatches: [],
        mapDisplayComplaints: complaints,
      };
    }

    // 1. Filter all complaints strictly inside the geographic corridor of the route
    const rawMatches = filterReportsAlongRoute(complaints, activeRoute.coordinates, corridorMeters);

    // 2. Apply category, status, and text search filters
    const filtered = rawMatches.filter((item) => {
      const c = item.complaint;
      if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
      if (selectedStatus !== 'ALL' && c.status !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.complaintId.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return {
      matchedReports: rawMatches,
      filteredRouteMatches: filtered,
      mapDisplayComplaints: filtered.map((m) => m.complaint),
    };
  }, [complaints, activeRoute, corridorMeters, selectedCategory, selectedStatus, searchQuery]);

  // Center on user district by default
  const userDistrict = user?.location || 'Tirunelveli';
  const defaultCenterInfo = (DISTRICT_COORDS as any)[userDistrict] || {
    lat: 8.7139,
    lng: 77.7567,
  };
  const mapCenter: [number, number] = [defaultCenterInfo.lat, defaultCenterInfo.lng];

  // Scroll to selected report card when selected
  const handleSelectComplaintFromList = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    if (window.innerWidth < 768) {
      setMobileView('map');
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-surface">
      {/* Top Breadcrumb & Mobile View Switcher Bar */}
      <div className="bg-white border-b border-surface-container-high px-4 py-2.5 z-20 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/citizen/dashboard"
            className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Return to Main Civic Map"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="hidden sm:inline">
              {language === 'en' ? 'Main Civic Map' : 'முதன்மை வரைபடம்'}
            </span>
          </Link>

          <div className="h-4 w-px bg-surface-container-high hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">alt_route</span>
            </div>
            <div>
              <h1 className="font-bold text-xs sm:text-sm text-on-surface leading-tight">
                {language === 'en'
                  ? 'Directions & Route Report Discovery'
                  : 'பயண வழித்தடமும் மக்கள் புகார்களும்'}
              </h1>
              <p className="text-[10px] text-on-surface-variant hidden md:block">
                {language === 'en'
                  ? 'Discover road hazards, sanitation issues & civic complaints along your travel path'
                  : 'உங்கள் பயண பாதையில் உள்ள சாலை சேதங்கள் மற்றும் புகார்களை கண்டறியவும்'}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile View Toggle Switcher (Map vs Panel) */}
        <div className="flex md:hidden items-center gap-1 bg-surface-container-low p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileView('panel')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mobileView === 'panel'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">tune</span>
            <span>{language === 'en' ? 'Route & List' : 'பாதை'}</span>
            {activeRoute && (
              <span className="ml-1 bg-white/20 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {filteredRouteMatches.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileView('map')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              mobileView === 'map'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">map</span>
            <span>{language === 'en' ? 'Map' : 'வரைபடம்'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Side Panel + Full Map */}
      <div className="relative flex-1 flex w-full h-full overflow-hidden">
        {/* Left Side Panel: Route Controls, Corridor Filter & Report List */}
        <div
          className={`w-full md:w-[420px] lg:w-[440px] h-full bg-white border-r border-surface-container-high flex flex-col z-10 shrink-0 shadow-lg transition-all duration-200 ${
            mobileView === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Top Sticky Route Inputs Card */}
          <div className="p-4 border-b border-surface-container space-y-3 bg-surface-container-lowest shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  route
                </span>
                <span>{language === 'en' ? 'Plan Your Travel Route' : 'பயண பாதையை திட்டமிடுங்கள்'}</span>
              </span>
              {activeRoute && (
                <button
                  type="button"
                  onClick={handleClearRoute}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  <span>{language === 'en' ? 'Clear Route' : 'வழித்தடம் நீக்கு'}</span>
                </button>
              )}
            </div>

            {/* Inputs Container */}
            <div className="relative space-y-2.5">
              {/* Swap Button */}
              <button
                type="button"
                onClick={handleSwapLocations}
                title="Swap origin and destination"
                className="absolute right-2 top-8 z-10 p-1.5 bg-white border border-surface-container rounded-full shadow-md text-on-surface-variant hover:text-primary hover:bg-blue-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] block">swap_vert</span>
              </button>

              {/* From Input */}
              <div className="relative">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>{language === 'en' ? 'From (Starting Point)' : 'புறப்படும் இடம்'}</span>
                  </span>
                  {fromCoords && (
                    <span className="text-[10px] text-emerald-600 font-semibold">
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
                        ? 'Search start address or use My Location...'
                        : 'புறப்படும் இடத்தை தேடவும்...'
                    }
                    className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-surface-container bg-white text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
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
                      {language === 'en' ? '📍 Use My Current Location' : '📍 எனது தற்போதைய இருப்பிடம்'}
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
                    <span>{language === 'en' ? 'To (Destination)' : 'சேருமிடம்'}</span>
                  </span>
                  {toCoords && (
                    <span className="text-[10px] text-red-600 font-semibold">
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
                        ? 'Search destination landmark or street...'
                        : 'சேருமிடத்தை தேடவும்...'
                    }
                    className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-surface-container bg-white text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
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

            {/* "Get Route" Action CTA */}
            <button
              type="button"
              onClick={handleGetRoute}
              disabled={isRouting || !fromCoords || !toCoords}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                !fromCoords || !toCoords
                  ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-75'
                  : isRouting
                  ? 'bg-primary-dark text-white shadow-md'
                  : 'bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/25 active:scale-[0.99]'
              }`}
            >
              {isRouting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>{language === 'en' ? 'Calculating Route...' : 'வழித்தடத்தை கணக்கிடுகிறது...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">navigation</span>
                  <span>{language === 'en' ? 'Get Route' : 'வழித்தடம் காண்க'}</span>
                </>
              )}
            </button>
          </div>

          {/* Route Active Summary & Corridor Config */}
          {activeRoute && (
            <div className="p-3.5 border-b border-surface-container bg-blue-50/70 shrink-0 space-y-3">
              {/* Route Metric Pills */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">directions_car</span>
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs sm:text-sm">
                      <span>{activeRoute.distanceKm}</span>
                      <span className="text-blue-400">•</span>
                      <span>{activeRoute.durationFormatted}</span>
                    </div>
                    {activeRoute.summary && (
                      <p className="text-[10px] text-blue-700 truncate max-w-[200px]">
                        {activeRoute.summary}
                      </p>
                    )}
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-200 text-blue-900">
                  {filteredRouteMatches.length}{' '}
                  {language === 'en' ? 'Reports' : 'புகார்கள்'}
                </span>
              </div>

              {/* Corridor Distance Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">
                      straighten
                    </span>
                    <span>{language === 'en' ? 'Route Corridor Radius:' : 'பாதை தாழ்வார தூரம்:'}</span>
                  </span>
                  <span className="font-bold text-primary text-xs">
                    {corridorMeters >= 1000 ? `${corridorMeters / 1000} km` : `${corridorMeters} m`}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[250, 500, 1000, 2000].map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => setCorridorMeters(dist)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        corridorMeters === dist
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-on-surface hover:bg-surface-container border border-surface-container'
                      }`}
                    >
                      {dist >= 1000 ? `${dist / 1000} km` : `${dist} m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Status Dropdown Filters */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">
                    {language === 'en' ? 'Category' : 'வகை'}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs font-semibold py-1.5 px-2 rounded-xl border border-surface-container bg-white text-on-surface outline-none"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="ROAD_DAMAGE">Road Damage</option>
                    <option value="STREET_LIGHT">Street Light</option>
                    <option value="ELECTRICAL_WIRE">Electrical Wire</option>
                    <option value="GARBAGE_WASTE">Garbage Waste</option>
                    <option value="STORM_WATER_DRAIN">Drainage Issue</option>
                    <option value="PUBLIC_SPACE">Public Space</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">
                    {language === 'en' ? 'Status' : 'நிலை'}
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full text-xs font-semibold py-1.5 px-2 rounded-xl border border-surface-container bg-white text-on-surface outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUBMITTED">Pending / Submitted</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Report List / Empty Guide */}
          <div
            ref={reportListRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface min-h-0"
          >
            {!activeRoute ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">navigation</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface">
                  {language === 'en' ? 'No Route Active' : 'வழித்தடம் எதுவும் தேர்ந்தெடுக்கப்படவில்லை'}
                </h3>
                <p className="text-xs max-w-xs leading-relaxed">
                  {language === 'en'
                    ? 'Enter starting location (or use your live GPS) and destination above to discover civic issues along your route.'
                    : 'உங்கள் பயண பாதையில் உள்ள மக்கள் புகார்களை காண தொடக்க மற்றும் சேருமிடத்தை உள்ளிடவும்.'}
                </p>
              </div>
            ) : filteredRouteMatches.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant space-y-2 bg-white rounded-2xl border border-surface-container">
                <span className="material-symbols-outlined text-[36px] text-emerald-600">
                  check_circle
                </span>
                <h4 className="font-bold text-xs sm:text-sm text-on-surface">
                  {language === 'en'
                    ? 'No reports found along this route.'
                    : 'இந்த வழித்தடத்தில் புகார்கள் எதுவும் இல்லை.'}
                </h4>
                <p className="text-xs text-on-surface-variant">
                  {language === 'en'
                    ? `No civic issues match your current filters within ${
                        corridorMeters >= 1000 ? `${corridorMeters / 1000}km` : `${corridorMeters}m`
                      } of this route.`
                    : 'தேர்ந்தெடுக்கப்பட்ட வடிகட்டிகளில் புகார்கள் எதுவும் பொருந்தவில்லை.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSelectedStatus('ALL');
                    setCorridorMeters(1000);
                  }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                >
                  {language === 'en' ? 'Expand Corridor to 1 km' : 'தாழ்வார தூரத்தை 1 கிமீ ஆக அதிகரிக்கவும்'}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant px-1">
                  <span>
                    {language === 'en'
                      ? `${filteredRouteMatches.length} Reports along route:`
                      : `வழித்தடத்தில் ${filteredRouteMatches.length} புகார்கள்:`}
                  </span>
                  <span className="text-[10px] text-outline">
                    {language === 'en' ? 'Click card to locate on map' : 'வரைபடத்தில் பார்க்க கிளிக் செய்யவும்'}
                  </span>
                </div>

                {filteredRouteMatches.map((match) => {
                  const c = match.complaint;
                  const statusInfo = STATUS_INFO[c.status] || STATUS_INFO.SUBMITTED;
                  const catInfo = CATEGORY_INFO[c.category] || CATEGORY_INFO.ROAD_DAMAGE;
                  const isSelected = selectedComplaintId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectComplaintFromList(c.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-600/30'
                          : 'bg-white hover:bg-surface-container-low border-surface-container shadow-2xs hover:border-outline-variant'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[14px]"
                            style={{ backgroundColor: statusInfo.pinColor }}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {catInfo.icon}
                            </span>
                          </span>
                          <span className="font-bold text-xs text-on-surface">
                            {c.complaintId}
                          </span>
                        </div>

                        {/* Distance from Route Badge */}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">
                            near_me
                          </span>
                          <span>{match.distanceFormatted}</span>
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-on-surface line-clamp-2 mb-2">
                        {c.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-on-surface-variant pt-1 border-t border-surface-container">
                        <span className="truncate max-w-[180px]">📍 {c.location}</span>
                        <span
                          className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded"
                          style={{
                            color: statusInfo.pinColor,
                            backgroundColor: `${statusInfo.pinColor}15`,
                          }}
                        >
                          {statusInfo.labelEn}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Map Canvas (Interactive Route & Corridor Display) */}
        <div
          className={`flex-1 relative w-full h-full ${
            mobileView === 'panel' ? 'hidden md:block' : 'block'
          }`}
        >
          <LeafletMap
            complaints={mapDisplayComplaints}
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
            selectedComplaintId={selectedComplaintId}
            onComplaintSelect={(c) => setSelectedComplaintId(c.id)}
          />

          {/* Floating Map/Satellite Segmented Switcher (Top Left) */}
          <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-lg border border-surface-container flex items-center gap-1">
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

          {/* Floating "📍 My Live Location" Action Hub (Top Right) */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 max-w-[280px] sm:max-w-xs">
            {!userLiveLocation ? (
              <button
                type="button"
                onClick={() => handleGetLiveLocation(false)}
                disabled={isLocating}
                className="px-4 py-2 rounded-2xl bg-white hover:bg-blue-50 text-primary border-2 border-primary/30 hover:border-primary shadow-lg font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                {isLocating ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin text-primary">
                      progress_activity
                    </span>
                    <span>{language === 'en' ? 'Locating...' : 'பெறுகிறது...'}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      my_location
                    </span>
                    <span>{language === 'en' ? '📍 My Live Location' : '📍 நேரடி இருப்பிடம்'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 border border-surface-container shadow-xl text-xs space-y-2 w-full">
                <div className="flex items-center justify-between gap-2 border-b border-surface-container pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                    <span className="font-bold text-on-surface text-[11px]">
                      {language === 'en' ? 'GPS Active' : 'இருப்பிடம் செயலில்'}
                    </span>
                  </div>
                  {userLiveLocation.accuracy && (
                    <span className="text-[9px] font-semibold text-primary bg-primary-light px-1.5 py-0.5 rounded-full">
                      ±{Math.round(userLiveLocation.accuracy)}m
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserHasManuallyPanned(false);
                      setFlyTrigger((p) => p + 1);
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-primary text-white font-bold text-[10px] flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">center_focus_strong</span>
                    <span>{language === 'en' ? 'Center' : 'மையம்'}</span>
                  </button>

                  {isLiveTracking ? (
                    <button
                      type="button"
                      onClick={stopLiveLocation}
                      className="flex-1 py-1 px-2 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold text-[10px]"
                    >
                      {language === 'en' ? 'Stop' : 'நிறுத்து'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startLiveTrackingWatcher()}
                      className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]"
                    >
                      {language === 'en' ? 'Track' : 'பின்தொடர்'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Map Legend (Bottom Left) */}
          <div className="absolute bottom-6 left-4 z-20 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-md border border-surface-container text-[11px] font-semibold space-y-1 hidden md:block">
            <p className="font-bold text-xs text-on-surface border-b border-surface-container pb-1">
              Route Reports • வழியிலுள்ள புகார்கள்
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Start (தொடக்கப் புள்ளி)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Destination (சேருமிடம்)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded bg-blue-600" />
              <span>Driving Route ({corridorMeters}m corridor)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
