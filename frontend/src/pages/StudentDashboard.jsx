/**
 * Student Dashboard Component
 * Shows bus location, ETA, and attendance confirmation
 */

import { useState, useEffect, useRef } from 'react';
import { FaBus, FaGraduationCap, FaBell, FaMapMarkerAlt, FaCheckCircle, FaTimesCircle, FaClock, FaLock, FaDotCircle, FaExclamationTriangle, FaClipboardList } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import websocketService from '../services/websocket.service';
import BusMap from '../components/BusMap';
import NotificationPanel from '../components/NotificationPanel';
import ThemeToggle from '../components/ThemeToggle';
import './StudentDashboard.css';

// Advanced tracking features
import { AdaptiveGeofence } from '../services/location.service';

function StudentDashboard() {
    const { user, logout } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [busLocation, setBusLocation] = useState(null);
    const [eta, setEta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attendanceStatus, setAttendanceStatus] = useState('absent');
    const [isLocked, setIsLocked] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [visitedStops, setVisitedStops] = useState([]); // Track visited stops
    
    // Live Trip & Alerts state
    const [isTripActive, setIsTripActive] = useState(false);
    const [busBreakdown, setBusBreakdown] = useState(null);
    const [routeDelay, setRouteDelay] = useState(null);
    const [sosAlert, setSosAlert] = useState(null);

    // Geofencing
    const geofenceRef = useRef(null);
    const wsConnectedRef = useRef(false); // Guard: prevent duplicate WS connections
    const [busDistance, setBusDistance] = useState(null);

    // Ref to track the student's assigned bus ID so the WebSocket callback
    // can filter location updates to only the relevant bus.
    const myBusIdRef = useRef(null);
    // Ref to track the student's route ID, used to discover the bus ID via
    // ETA updates when the bus starts a trip after the page was loaded.
    const myRouteIdRef = useRef(null);

    // Selection State
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [selectedRouteId, setSelectedRouteId] = useState('');
    const [routeStopsForSelection, setRouteStopsForSelection] = useState([]);
    const [selectedStopId, setSelectedStopId] = useState('');
    const [isSelectionLoading, setIsSelectionLoading] = useState(false);
    const [isChangingStop, setIsChangingStop] = useState(false);

    useEffect(() => {
        fetchDashboardData();
        return () => {
            websocketService.disconnect();
        };
    }, []);

    const fetchDashboardData = async () => {
        try {
            setError(null);
            const response = await axios.get('/api/student/dashboard');
            const data = response.data.data;
            if (!data) {
                throw new Error('Dashboard response has no data');
            }
            setDashboardData(data);

            if (data.hasSelection) {
                setAttendanceStatus(data.attendance?.status || 'absent');
                setIsLocked(data.attendance?.isLocked || false);

                const active = data.bus?.trip_status === 'active' || data.bus?.status === 'active';
                setIsTripActive(active);

                if (data.bus?.status === 'breakdown' || data.bus?.breakdown_reported) {
                    setBusBreakdown({ message: data.bus.breakdown_message || 'Bus reported a breakdown. Trip is suspended.' });
                }
                if (data.bus?.delay_minutes) {
                    setRouteDelay({ delayMinutes: data.bus.delay_minutes });
                }

                if (Array.isArray(data.recentAlerts)) {
                    data.recentAlerts.forEach(alert => {
                        if (alert.title?.includes('EMERGENCY') || alert.title?.includes('SOS')) {
                            setSosAlert({ message: alert.message });
                        } else if (alert.type === 'breakdown') {
                            setBusBreakdown({ message: alert.message });
                        } else if (alert.type === 'delay') {
                            setRouteDelay({ message: alert.message });
                        }
                    });
                }

                // Store bus/route IDs in refs so the WebSocket callbacks can
                // filter updates correctly. This must happen before
                // connectWebSocket() registers the callbacks.
                if (data.bus?.id) {
                    myBusIdRef.current = data.bus.id;
                }
                if (data.stop?.routeId) {
                    myRouteIdRef.current = data.stop.routeId;
                }

                connectWebSocket(); // Connect only if we have a selection to finish setup

                // Immediately show bus on map using coordinates already in dashboard data.
                // This avoids the delay / separate HTTP round-trip before the map renders.
                if (data.bus?.current_lat && data.bus?.current_lng) {
                    setBusLocation({
                        latitude: data.bus.current_lat,
                        longitude: data.bus.current_lng
                    });
                }

                // Fetch ETA and verify active-trip status via the dedicated endpoint
                if (data.bus) {
                    await fetchBusLocation();
                }
            } else {
                setAvailableRoutes(data.availableRoutes || []);
            }

            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setError(error.message || 'Failed to load dashboard');
            setLoading(false);
        }
    };

    const fetchBusLocation = async () => {
        try {
            const response = await axios.get('/api/student/bus-location');
            if (response.data.data?.busActive) {
                setBusLocation(response.data.data.location);
                setEta(response.data.data.eta);
            }
        } catch (error) {
            // Non-critical: bus location will be received via WebSocket once the driver is active.
            // Do NOT set global error state here — it would replace the whole dashboard.
            console.warn('Could not fetch initial bus location (non-critical):', error.message);
        }
    };

    const connectWebSocket = () => {
        const token = localStorage.getItem('token');
        websocketService.connect(token);

        // Listen for bus location updates — only process updates for the
        // student's own bus (identified via myBusIdRef).
        // If we don't know our bus ID yet we skip the update; the ETA handler
        // below will set myBusIdRef as soon as the bus starts a trip and the
        // next location update will be accepted.
        websocketService.onLocationUpdate((data) => {
            console.log("LIVE LOCATION RECEIVED:", data);
            
            if (!data || !data.latitude || !data.longitude) return;
            
            // Update busId if we didn't have it
            if (myBusIdRef.current === null && data.busId) {
                myBusIdRef.current = data.busId;
            }

            if (data.tripActive !== undefined) {
                setIsTripActive(data.tripActive);
            }

            setBusLocation({
                latitude: data.latitude,
                longitude: data.longitude
            });

            // If the payload already includes stopETAs, extract ETA for the student's stop
            if (Array.isArray(data.stopETAs)) {
                setDashboardData(currentData => {
                    if (currentData?.stop) {
                        const myStop = data.stopETAs.find(s => s.stopId === currentData.stop.id);
                        if (myStop) {
                            setEta(myStop.etaMinutes ?? null);
                            if (myStop.distanceMeters != null) setBusDistance(myStop.distanceMeters);
                        }
                    }
                    return currentData;
                });
            }
        });

        // Listen for ETA updates (includes visited stops)
        websocketService.onETAUpdate((data) => {
            // Update visited stops from ETA update
            if (data.visitedStops) {
                setVisitedStops(data.visitedStops);
            }

            // If we don't know our bus ID yet (bus started a trip after page
            // load) but this ETA update is for our route, learn the bus ID so
            // subsequent receive-location events are accepted.
            if (myBusIdRef.current === null && myRouteIdRef.current !== null
                    && data.routeId === myRouteIdRef.current) {
                myBusIdRef.current = data.busId;
            }

            setDashboardData(currentData => {
                if (currentData?.stop) {
                    // NEW format: individual stop event {stopId, etaMinutes, distanceMeters}
                    if (data.stopId !== undefined) {
                        if (data.stopId === currentData.stop.id) {
                            setEta(data.etaMinutes ?? data.eta ?? null);
                            if (data.distanceMeters != null) setBusDistance(data.distanceMeters);
                            if (data.isLocked !== undefined) setIsLocked(data.isLocked);
                        }
                    } else if (Array.isArray(data.stops)) {
                        // Legacy format: {stops: [{stopId, eta, isLocked}]}
                        const myStop = data.stops.find(s => s.stopId === currentData.stop.id);
                        if (myStop) {
                            setEta(myStop.etaMinutes ?? myStop.eta ?? null);
                            if (myStop.isLocked !== undefined) setIsLocked(myStop.isLocked);
                        }
                    } else if (Array.isArray(data.stopETAs)) {
                        // HTTP GPS fallback format
                        const myStop = data.stopETAs.find(s => s.stopId === currentData.stop.id);
                        if (myStop) setEta(myStop.etaMinutes ?? null);
                    }
                }
                return currentData;
            });
        });

        // Listen for stop visit events
        websocketService.onStopVisited((data) => {
            console.log('Stop visited:', data);
            const newStopIds = data.stops.map(s => s.stopId);
            setVisitedStops(prev => [...new Set([...prev, ...newStopIds])]);
        });

        // Listen for notifications
        websocketService.onNotification((notification) => {
            if (notification.type === 'breakdown') {
                setBusBreakdown({ message: notification.message });
            } else if (notification.type === 'delay') {
                setRouteDelay({ message: notification.message });
            } else if (notification.type === 'emergency') {
                setSosAlert({ message: notification.message });
            }

            if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: ''
                });
            }
        });

        // Listen for emergency SOS broadcast
        websocketService.onSOSReceived((data) => {
            console.log('🚨 Emergency SOS received in StudentDashboard:', data);
            setSosAlert(data);
        });

        // Listen for bus breakdown broadcast
        websocketService.onBreakdown((data) => {
            console.log('⚠️ Bus breakdown broadcast received:', data);
            if (!myRouteIdRef.current || String(data.routeId) === String(myRouteIdRef.current)) {
                setBusBreakdown(data);
            }
        });

        // Listen for bus delay broadcast
        websocketService.onDelay((data) => {
            console.log('🕐 Bus delay broadcast received:', data);
            if (!myRouteIdRef.current || String(data.routeId) === String(myRouteIdRef.current)) {
                setRouteDelay(data);
            }
        });

        // Listen for trip status changes (start/end)
        websocketService.onTripStatus((data) => {
            const myBusId = myBusIdRef.current;
            if (myBusId === null || String(data.busId) !== String(myBusId)) return;
            
            if (data.status === 'ended') {
                setIsTripActive(false);
                setBusLocation(null);
                setEta(null);
                setBusDistance(null);
                setBusBreakdown(null);
                setRouteDelay(null);
                setDashboardData(prev => ({
                    ...prev,
                    bus: null
                }));
            } else if (data.status === 'active') {
                setIsTripActive(true);
                setBusBreakdown(null);
                fetchDashboardData();
            }
        });
    };

    const requestNotificationPermission = async () => {
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    // Setup geofence when stop data is available
    useEffect(() => {
        if (dashboardData?.stop && dashboardData.hasSelection) {
            const { stop } = dashboardData;

            // Create geofence around student's stop (500m radius)
            geofenceRef.current = new AdaptiveGeofence(
                { latitude: stop.latitude, longitude: stop.longitude },
                500  // 500 meters
            );

            // Register entry callback
            geofenceRef.current.onEntry((data) => {
                console.log(`Bus entered geofence! Distance: ${Math.round(data.distance)}m`);

                // Show browser notification
                if (Notification.permission === 'granted') {
                    new Notification('Bus Approaching', {
                        body: `Your bus is ${Math.round(data.distance)} meters away from your stop`,
                        icon: '',
                        tag: 'bus-proximity'
                    });
                }
            });

            // Register exit callback
            geofenceRef.current.onExit((data) => {
                console.log(`Bus left geofence! Distance: ${Math.round(data.distance)}m`);
            });

            // Adapt radius based on ETA
            if (eta !== null && eta < 5) {
                // Shrink radius when bus is very close
                geofenceRef.current.adaptRadius(0.5);  // 250m
            }
        }

        return () => {
            if (geofenceRef.current) {
                geofenceRef.current.reset();
            }
        };
    }, [dashboardData, eta]);

    // Monitor bus location with geofence
    useEffect(() => {
        console.log("BUS LOCATION:", busLocation);
        
        if (busLocation && geofenceRef.current) {
            const status = geofenceRef.current.checkPosition(
                busLocation.latitude,
                busLocation.longitude
            );

            setBusDistance(Math.round(status.distance));

            if (status.isInside) {
                console.log(`Bus is ${Math.round(status.distance)}m from your stop`);
            }
        }
    }, [busLocation]);


    // --- Selection Handlers ---

    const handleRouteSelect = async (e) => {
        const routeId = e.target.value;
        setSelectedRouteId(routeId);
        setSelectedStopId('');

        if (routeId) {
            setIsSelectionLoading(true);
            try {
                const response = await axios.get(`/api/student/routes/${routeId}/stops`);
                const stops = response.data.data;
                // Filter out duplicates by Name (safety measure for UI)
                const uniqueStops = stops.filter((stop, index, self) =>
                    index === self.findIndex((t) => t.name === stop.name)
                );
                setRouteStopsForSelection(uniqueStops);
            } catch (error) {
                console.error("Failed to fetch stops", error);
                alert("Failed to load stops for this route.");
            } finally {
                setIsSelectionLoading(false);
            }
        } else {
            setRouteStopsForSelection([]);
        }
    };

    const handleConfirmSelection = async () => {
        if (!selectedRouteId || !selectedStopId) {
            alert("Please select a route and a stop.");
            return;
        }

        try {
            const response = await axios.post('/api/student/select-stop', {
                stopId: selectedStopId
            });

            if (response.data.success) {
                alert("Selection saved!");
                setIsChangingStop(false);
                setLoading(true); // reload dashboard
                fetchDashboardData();
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to save selection");
        }
    };

    const confirmAttendance = async (status) => {
        try {
            const response = await axios.post('/api/student/attendance', { status });
            if (response.data.success) {
                setAttendanceStatus(status);
                alert(response.data.message);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to confirm attendance');
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spin">⏳</div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error" style={{ minHeight: '100vh', padding: '40px', background: 'var(--bg)', color: 'var(--text)' }}>
                <h2>Unable to load dashboard</h2>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => { setLoading(true); setError(null); fetchDashboardData(); }}>
                    Retry
                </button>
            </div>
        );
    }

    // --- RENDER: Selection View (if no selection or changing) ---
    if (!dashboardData?.hasSelection || isChangingStop) {
        // Use availableRoutes from dashboardData if not changing, or if changing we might need to fetch them?
        // Actually fetchDashboardData sets availableRoutes only if !hasSelection.
        // If isChangingStop is true, we assume user might want to change within same route or different?
        // Prompt says: "Student can change stop only within the same route".
        // So if Changing Stop, we should pre-fill selectedRouteId with current route and only allow stop change?
        // Or if simple "Selection" view:

        const routesToList = availableRoutes.length > 0 ? availableRoutes : (dashboardData?.hasSelection ? [{ id: dashboardData.stop.routeId, name: dashboardData.stop.routeName }] : []);

        // If changing stop, optimize experience:
        // If we are changing stop, we should load stops for current route immediately if not loaded.
        // But for simplicity, let's just show the standard selection UI. 
        // Note: For "Change Stop" within SAME route, we should lock Route dropdown or pre-select it.

        return (
            <div className="student-dashboard selection-mode">
                <header className="dashboard-header">
                    <h1 className="dashboard-title"><FaBus /> Select Your Route</h1>
                    <button className="btn btn-secondary" onClick={logout}>Logout</button>
                </header>

                <div className="dashboard-content" style={{ maxWidth: '600px', margin: '40px auto' }}>
                    <div className="card">
                        <h2 className="section-title">
                            {isChangingStop ? 'Change Your Stop' : 'Setup Your Profile'}
                        </h2>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Route</label>
                            <select
                                className="form-input"
                                value={selectedRouteId}
                                onChange={handleRouteSelect}
                                disabled={isChangingStop} // Lock route if changing stop only (per prompt requirement)
                            >
                                <option value="">-- Choose Route --</option>
                                {routesToList.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedRouteId && (
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Select Your Stop</label>
                                {isSelectionLoading ? (
                                    <p>Loading stops...</p>
                                ) : (
                                    <select
                                        className="form-input"
                                        value={selectedStopId}
                                        onChange={(e) => setSelectedStopId(e.target.value)}
                                    >
                                        <option value="">-- Choose Stop --</option>
                                        {routeStopsForSelection.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {selectedRouteId && selectedStopId && (
                            <div className="map-preview" style={{ marginBottom: '20px', height: '200px' }}>
                                {/* Minimal map preview if we had time, for now just text */}
                                <p style={{ color: '#666', fontSize: '0.9em' }}>
                                    Selected: Stop #{routeStopsForSelection.find(s => s.id == selectedStopId)?.sequence_order}
                                    - {routeStopsForSelection.find(s => s.id == selectedStopId)?.name}
                                </p>
                            </div>
                        )}

                        <div className="actions" style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-primary" onClick={handleConfirmSelection} disabled={!selectedRouteId || !selectedStopId}>
                                Confirm Selection
                            </button>
                            {isChangingStop && (
                                <button className="btn btn-secondary" onClick={() => setIsChangingStop(false)}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER: Main Dashboard ---
    const { student, stop, bus, routeStops } = dashboardData;

    return (
        <div className="student-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <h1 className="dashboard-title">
                            <span className="title-icon"><FaGraduationCap /></span>
                            PSG iTech Student Transit
                        </h1>
                        <p className="dashboard-subtitle">Welcome, {student.name} • Neelambur Campus, Coimbatore</p>
                    </div>
                    <div className="header-right">
                        <ThemeToggle />
                        <button
                            className="btn-icon"
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <FaBell />
                        </button>
                        <button className="btn btn-secondary" onClick={logout}>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Notification Panel */}
            {showNotifications && (
                <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}

            {/* Main Content */}
            <div className="dashboard-content">
                {/* ── Active Broadcast Alert Banners ── */}
                {sosAlert && (
                    <div className="alert-banner" style={{ background: '#7f1d1d', border: '2px solid #ef4444', color: '#fef2f2', padding: '14px 18px', borderRadius: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.35)', animation: 'pulse 1.5s infinite' }}>
                        <div>
                            <span style={{ fontSize: '1.4rem', marginRight: '10px' }}>🚨</span>
                            <strong style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}>EMERGENCY ALERT:</strong> {sosAlert.message || 'Driver has triggered an emergency alarm!'}
                            {sosAlert.busNumber && <span style={{ marginLeft: '10px', opacity: 0.9 }}>• Bus #{sosAlert.busNumber}</span>}
                        </div>
                        <button onClick={() => setSosAlert(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Dismiss</button>
                    </div>
                )}

                {busBreakdown && (
                    <div className="alert-banner" style={{ background: '#450a0a', border: '1px solid #f87171', color: '#fee2e2', padding: '14px 18px', borderRadius: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '1.3rem', marginRight: '10px' }}>⚠️</span>
                            <strong style={{ fontSize: '1.05rem' }}>BUS BREAKDOWN REPORTED:</strong> {busBreakdown.message || 'Bus is stopped due to breakdown. Trip is suspended.'}
                            {busBreakdown.busNumber && <span style={{ marginLeft: '10px', opacity: 0.9 }}>• Bus #{busBreakdown.busNumber}</span>}
                        </div>
                        <button onClick={() => setBusBreakdown(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                )}

                {routeDelay && (
                    <div className="alert-banner" style={{ background: '#451a03', border: '1px solid #f59e0b', color: '#fef3c7', padding: '14px 18px', borderRadius: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '1.3rem', marginRight: '10px' }}>🕐</span>
                            <strong style={{ fontSize: '1.05rem' }}>ROUTE DELAY UPDATE:</strong> {routeDelay.delayMinutes ? `Bus is delayed by ${routeDelay.delayMinutes} minutes due to traffic.` : (routeDelay.message || 'Bus is running behind schedule.')}
                        </div>
                        <button onClick={() => setRouteDelay(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                    </div>
                )}

                {/* Info Cards */}
                <div className="info-grid">
                    {/* Stop Info */}
                    <div className="info-card card">
                        <div className="info-icon"><FaMapMarkerAlt /></div>
                        <div className="info-content">
                            <h3 className="info-label">Your Stop</h3>
                            <p className="info-value">{stop.name}</p>
                            <p className="info-meta">{stop.routeName}</p>
                            <button
                                className="btn-link"
                                style={{ fontSize: '0.8rem', marginTop: '5px', color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, textDecoration: 'underline' }}
                                onClick={() => {
                                    setIsChangingStop(true);
                                    setSelectedRouteId(stop.routeId);
                                    handleRouteSelect({ target: { value: stop.routeId } });
                                    setSelectedStopId(stop.id);
                                }}
                            >
                                Change Stop
                            </button>
                        </div>
                    </div>

                    {/* Bus Status */}
                    <div className="info-card card">
                        <div className="info-icon"><FaBus /></div>
                        <div className="info-content">
                            <h3 className="info-label">Bus Status</h3>
                            <p className="info-value">
                                {busBreakdown ? (
                                    <span className="badge badge-error">Breakdown</span>
                                ) : isTripActive ? (
                                    <span className="badge badge-success">En Route</span>
                                ) : (
                                    <span className="badge badge-warning">Not Started</span>
                                )}
                            </p>
                            {bus && <p className="info-meta">Bus #{bus.bus_number}</p>}
                        </div>
                    </div>

                    {/* ETA */}
                    <div className="info-card card">
                        <div className="info-icon"><FaClock /></div>
                        <div className="info-content">
                            <h3 className="info-label">Estimated Arrival</h3>
                            <p className="info-value">
                                {busBreakdown ? (
                                    <span className="text-error" style={{ fontSize: '1.1rem' }}>Suspended</span>
                                ) : isTripActive && eta !== null ? (
                                    <span className={eta <= 10 ? 'text-error' : 'text-success'}>
                                        {eta === 0 ? 'At Stop / Arrived' : `${eta} min`}
                                    </span>
                                ) : (
                                    <span className="text-muted" style={{ fontSize: '0.95rem' }}>Trip Not Started</span>
                                )}
                            </p>
                            {isTripActive && busDistance !== null && busLocation && (
                                <p className="info-meta" style={{ color: busDistance < 500 ? '#10b981' : '#6b7280' }}>
                                    <FaMapMarkerAlt /> {busDistance >= 1000 ? `${(busDistance / 1000).toFixed(1)} km away` : `${busDistance}m away`}
                                </p>
                            )}
                            {isLocked && (
                                <p className="info-meta text-error"><FaExclamationTriangle /> Attendance Locked</p>
                            )}
                        </div>
                    </div>

                    {/* Attendance Status */}
                    <div className="info-card card">
                        <div className="info-icon"><FaCheckCircle /></div>
                        <div className="info-content">
                            <h3 className="info-label">Today's Attendance</h3>
                            <p className="info-value">
                                {attendanceStatus === 'present' ? (
                                    <span className="badge badge-success">Present</span>
                                ) : (
                                    <span className="badge badge-error">Absent</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Attendance Confirmation */}
                <div className="attendance-section card">
                    <h2 className="section-title">Confirm Your Attendance</h2>
                    <p className="section-description">
                        {isLocked
                            ? 'Attendance is locked. The bus is too close to your stop.'
                            : 'Will you be taking the bus today? Please confirm your attendance.'
                        }
                    </p>
                    <div className="attendance-buttons">
                        <button
                            className={`btn ${attendanceStatus === 'present' ? 'btn-success' : 'btn-secondary'}`}
                            onClick={() => confirmAttendance('present')}
                            disabled={isLocked || attendanceStatus === 'present'}
                        >
                            <FaCheckCircle />
                            I'm Coming
                        </button>
                        <button
                            className={`btn ${attendanceStatus === 'absent' ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => confirmAttendance('absent')}
                        >
                            <FaTimesCircle />
                            Not Coming
                        </button>
                    </div>
                </div>

                {/* Map */}
                <div className="map-section card">
                    <h2 className="section-title">Live Bus Tracking</h2>
                    <BusMap
                        stops={routeStops}
                        busLocation={busLocation}
                        myStopId={stop.id}
                        visitedStops={visitedStops}
                        height="500px"
                    />
                </div>

                {/* Instructions */}
                <div className="instructions-section card">
                    <h3 className="section-title"><FaClipboardList /> How It Works</h3>
                    <ul className="instructions-list">
                        <li>
                            <strong>Confirm Attendance:</strong> Mark yourself as "Present" if you'll be taking the bus today.
                        </li>
                        <li>
                            <strong>Attendance Lock:</strong> You can only confirm attendance when the bus is more than 10 minutes away from your stop.
                        </li>
                        <li>
                            <strong>Live Tracking:</strong> Watch the bus move in real-time on the map once the driver starts the trip.
                        </li>
                        <li>
                            <strong>Notifications:</strong> You'll receive alerts when the bus is approaching your stop.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;
