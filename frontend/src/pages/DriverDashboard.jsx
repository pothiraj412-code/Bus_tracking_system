/**
 * DriverDashboard.jsx — PSG iTech Bus Tracker
 * Phone-as-GPS: uses navigator.geolocation (browser GPS) to track the bus.
 * Sends location via Socket.IO (primary) + HTTP POST fallback.
 * Designed to work on mobile Chrome/Safari.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import websocketService from '../services/websocket.service';
import BusMap from '../components/BusMap';
import ThemeToggle from '../components/ThemeToggle';
import {
    FaBus, FaMapMarkerAlt, FaSatellite, FaPlay, FaStop,
    FaBell, FaExclamationTriangle, FaClock, FaUsers,
    FaWifi, FaTimesCircle, FaSignal, FaLock, FaLockOpen,
    FaCheckCircle
} from 'react-icons/fa';
import './DriverDashboard.css';

// ── Haversine distance (meters) ──────────────────────────────────────────────
function haversineM(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const dφ = (lat2 - lat1) * Math.PI / 180, dλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GPS_INTERVAL_MOVING    = 4000;   // 4 s when moving
const GPS_INTERVAL_STATIONARY = 20000; // 20 s when stationary
const STATIONARY_SPEED_MS    = 0.5;    // m/s (~1.8 km/h) threshold

function DriverDashboard() {
    const { user, logout } = useAuth();

    // ── Dashboard data ───────────────────────────────────────────────────────
    const [dashData, setDashData] = useState(null);
    const [manifest, setManifest] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Trip state ───────────────────────────────────────────────────────────
    const [tripActive, setTripActive] = useState(false);
    const [tripStarting, setTripStarting] = useState(false);
    const [tripEnding, setTripEnding] = useState(false);

    // ── GPS state ────────────────────────────────────────────────────────────
    const [gpsTracking, setGpsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    const [gpsSpeed, setGpsSpeed] = useState(0);    // km/h
    const [gpsSending, setGpsSending] = useState(false);
    const [gpsError, setGpsError] = useState(null);
    const [lastSentAt, setLastSentAt] = useState(null);
    const [sendCount, setSendCount] = useState(0);

    // ── Connectivity ─────────────────────────────────────────────────────────
    const [wsConnected, setWsConnected] = useState(false);

    // ── Alerts & Confirmation Feedback ───────────────────────────────────────
    const [delayMinutes, setDelayMinutes] = useState('');
    const [breakdownMsg, setBreakdownMsg] = useState('');
    const [sosMsg, setSosMsg] = useState('');
    const [alertSent, setAlertSent] = useState('');
    const [breakdownStatus, setBreakdownStatus] = useState(null);
    const [delayStatus, setDelayStatus] = useState(null);
    const [sosStatus, setSosStatus] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);

    // ── Wake lock ────────────────────────────────────────────────────────────
    const [wakeLockOn, setWakeLockOn] = useState(false);
    const wakeLockRef = useRef(null);

    // ── Refs ─────────────────────────────────────────────────────────────────
    const watchIdRef        = useRef(null);
    const intervalRef       = useRef(null);
    const lastPositionRef   = useRef(null);
    const isStationaryRef   = useRef(true);
    const tripActiveRef     = useRef(false); // shadow for WS callbacks

    // ── Wake Lock ────────────────────────────────────────────────────────────
    const acquireWakeLock = async () => {
        if (!('wakeLock' in navigator)) return;
        try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            setWakeLockOn(true);
            wakeLockRef.current.addEventListener('release', () => setWakeLockOn(false));
        } catch (_) {}
    };
    const releaseWakeLock = () => {
        wakeLockRef.current?.release();
        wakeLockRef.current = null;
        setWakeLockOn(false);
    };

    // ── Fetch dashboard ──────────────────────────────────────────────────────
    useEffect(() => {
        fetchDashboard();
        setupWS();
        return () => {
            stopTracking();
            websocketService.disconnect();
            releaseWakeLock();
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, []);

    const fetchDashboard = async () => {
        try {
            const r = await axios.get('/api/driver/dashboard');
            const d = r.data.data;
            setDashData(d);
            const active = d.activeTrip?.status === 'active';
            setTripActive(active);
            tripActiveRef.current = active;
            if (d.bus?.status === 'breakdown' || d.activeTrip?.breakdown_reported) {
                setBreakdownStatus({
                    active: true,
                    message: d.activeTrip?.breakdown_message || 'Vehicle Breakdown Reported',
                    timestamp: 'Active'
                });
            }
            if (d.activeTrip?.delay_minutes > 0) {
                setDelayStatus({
                    minutes: d.activeTrip.delay_minutes,
                    timestamp: 'Active'
                });
            }
            if (d.activeTrip) fetchManifest();
        } catch (e) {
            console.error('Dashboard fetch failed:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchManifest = async () => {
        try {
            const r = await axios.get('/api/driver/manifest');
            setManifest(r.data.data || []);
        } catch (_) {}
    };

    // ── WebSocket ────────────────────────────────────────────────────────────
    const setupWS = () => {
        const token = localStorage.getItem('token');
        websocketService.connect(token);
        websocketService.onConnect(() => setWsConnected(true));
        websocketService.onDisconnect(() => setWsConnected(false));
    };

    // ── GPS: send one location update ────────────────────────────────────────
    const sendLocation = useCallback(async (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        const loc = { latitude, longitude, speed: speed || 0, heading: heading || 0, accuracy };

        setCurrentLocation(loc);
        setGpsAccuracy(accuracy ? Math.round(accuracy) : null);
        setGpsSpeed(speed ? Math.round(speed * 3.6) : 0);
        lastPositionRef.current = { ...loc, timestamp: Date.now() };

        // Determine stationary
        isStationaryRef.current = (speed || 0) < STATIONARY_SPEED_MS;

        // ── Send via Socket.IO (primary) ──────────────────────────────────
        setGpsSending(true);
        if (websocketService.isConnected()) {
            websocketService.sendLocation(latitude, longitude, speed || 0, heading || 0, accuracy);
        }

        // ── HTTP fallback (always send – guarantees DB persistence) ──────
        try {
            await axios.post('/api/driver/gps', {
                latitude,
                longitude,
                speed: speed || 0,
                heading: heading || 0,
                accuracy,
                timestamp: Date.now()
            });
            setLastSentAt(new Date());
            setSendCount(c => c + 1);
            setGpsError(null);
        } catch (err) {
            console.warn('HTTP GPS fallback failed:', err.message);
        } finally {
            setGpsSending(false);
        }
    }, []);

    // ── GPS: start tracking ───────────────────────────────────────────────────
    const startTracking = async () => {
        if (!navigator.geolocation) {
            setGpsError('GPS not available on this device/browser');
            return;
        }

        setGpsError(null);
        setGpsTracking(true);
        await acquireWakeLock();

        // watchPosition fires on every GPS update
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                sendLocation(pos);
                // Adjust polling interval based on movement
                const interval = isStationaryRef.current ? GPS_INTERVAL_STATIONARY : GPS_INTERVAL_MOVING;
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                    navigator.geolocation.getCurrentPosition(sendLocation, () => {}, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                }, interval);
            },
            (err) => {
                setGpsError(`GPS Error: ${err.message}`);
                setGpsTracking(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
                distanceFilter: 5 // fire only when moved 5m (Chrome supports this)
            }
        );
    };

    // ── GPS: stop tracking ───────────────────────────────────────────────────
    const stopTracking = () => {
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setGpsTracking(false);
        releaseWakeLock();
    };

    // ── Trip controls ────────────────────────────────────────────────────────
    const startTrip = async () => {
        setTripStarting(true);
        try {
            await axios.post('/api/driver/trip/start');
            setTripActive(true);
            tripActiveRef.current = true;
            await startTracking();
            fetchManifest();
            showFeedback('success', '✅ Trip Started Successfully', 'Live GPS tracking initiated. Students can now see real-time route progress.');
        } catch (e) {
            showFeedback('error', '❌ Trip Start Failed', e.response?.data?.message || 'Failed to start trip');
        } finally {
            setTripStarting(false);
        }
    };

    const endTrip = async () => {
        if (!window.confirm('End the trip? GPS tracking will stop.')) return;
        setTripEnding(true);
        try {
            stopTracking();
            await axios.post('/api/driver/trip/end');
            setTripActive(false);
            tripActiveRef.current = false;
            setCurrentLocation(null);
            setManifest([]);
            showFeedback('info', '🏁 Trip Ended', 'Trip finished. GPS tracking turned off.');
        } catch (e) {
            showFeedback('error', '❌ Trip End Failed', e.response?.data?.message || 'Failed to end trip');
        } finally {
            setTripEnding(false);
        }
    };

    // ── Alerts & Driver Feedback ──────────────────────────────────────────────
    const showFeedback = (type, title, message) => {
        if ('vibrate' in navigator) {
            try {
                if (type === 'danger' || type === 'sos') {
                    navigator.vibrate([250, 100, 250, 100, 400]);
                } else {
                    navigator.vibrate([120, 60, 120]);
                }
            } catch (_) {}
        }
        setToast({ type, title, message, id: Date.now() });
        setAlertSent(`${title} - ${message}`);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setToast(null);
            setAlertSent('');
        }, 7000);
    };

    const showAlert = (msg) => {
        showFeedback(msg.startsWith('❌') ? 'error' : msg.startsWith('🚨') ? 'danger' : 'success', 'Notice', msg);
    };

    const reportBreakdown = async () => {
        if (!breakdownMsg.trim()) {
            showFeedback('error', 'Input Required', 'Please enter a brief description of the breakdown before reporting.');
            return;
        }
        const msg = breakdownMsg.trim();
        try {
            await axios.post('/api/driver/breakdown', { message: msg });
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setBreakdownStatus({
                active: true,
                message: msg,
                timestamp: timeStr
            });
            setBreakdownMsg('');
            showFeedback(
                'danger',
                '⚠️ Breakdown Alert Broadcasted!',
                'Notification sent to all route students and campus fleet command. Trip status set to Breakdown.'
            );
        } catch (e) {
            showFeedback('error', 'Failed to Report Breakdown', e.response?.data?.message || 'Failed to report breakdown');
        }
    };

    const resolveBreakdown = async () => {
        try {
            await axios.post('/api/driver/breakdown/resolve');
            setBreakdownStatus(null);
            showFeedback(
                'success',
                '✅ Breakdown Cleared!',
                'Normal bus status resumed. Students and admins have been updated.'
            );
        } catch (e) {
            showFeedback('error', 'Failed to Clear Breakdown', e.response?.data?.message || 'Failed to clear breakdown');
        }
    };

    const sendDelay = async () => {
        const mins = parseInt(delayMinutes);
        if (!mins || mins < 1) {
            showFeedback('error', 'Invalid Minutes', 'Please enter a valid delay in minutes (minimum 1 minute).');
            return;
        }
        try {
            await axios.post('/api/driver/delay', { delayMinutes: mins });
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setDelayStatus({
                minutes: mins,
                timestamp: timeStr
            });
            setDelayMinutes('');
            showFeedback(
                'warning',
                '🕐 Delay Notification Broadcasted!',
                `Delay of +${mins} min applied. All student ETAs extended and notified on their screens.`
            );
        } catch (e) {
            showFeedback('error', 'Failed to Send Delay', e.response?.data?.message || 'Failed to send delay');
        }
    };

    const sendSOS = async () => {
        const msg = sosMsg?.trim() || 'Driver Emergency SOS';
        try {
            if (websocketService.isConnected()) {
                websocketService.sendSOS(msg, currentLocation || { latitude: 11.0650, longitude: 77.1000 });
            }
            await axios.post('/api/driver/sos', {
                message: msg,
                location: currentLocation || { latitude: 11.0650, longitude: 77.1000 }
            });
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setSosStatus({
                active: true,
                message: msg,
                timestamp: timeStr
            });
            setSosMsg('');
            showFeedback(
                'danger',
                '🚨 EMERGENCY SOS TRANSMITTED!',
                'Distress alarm and live GPS sent with high priority to campus security and students!'
            );
        } catch (e) {
            console.error('SOS error:', e);
            showFeedback('error', 'Failed to Broadcast SOS', e.response?.data?.message || 'Failed to broadcast SOS');
        }
    };

    // ── Render helpers ───────────────────────────────────────────────────────
    const bus = dashData?.bus;
    const stops = dashData?.stops || [];
    const accuracyColor = gpsAccuracy == null ? '#6b7280' : gpsAccuracy < 15 ? '#10b981' : gpsAccuracy < 40 ? '#f59e0b' : '#ef4444';
    const accuracyLabel = gpsAccuracy == null ? '—' : gpsAccuracy < 15 ? 'Excellent' : gpsAccuracy < 40 ? 'Good' : 'Poor';

    if (loading) return (
        <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
                <FaBus style={{ fontSize: 40, marginBottom: 12 }} />
                <p>Loading Driver Console…</p>
            </div>
        </div>
    );

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-brand">
                    <FaBus className="header-icon" />
                    <div>
                        <h1 className="header-title">PSG iTech Driver Console</h1>
                        <p className="header-subtitle">{user?.full_name} · {bus?.busNumber || '—'} · {bus?.routeName || '—'}</p>
                    </div>
                </div>
                <div className="header-actions">
                    <span className={`ws-badge ${wsConnected ? 'ws-on' : 'ws-off'}`}>
                        {wsConnected ? <FaWifi /> : <FaTimesCircle />}
                        {wsConnected ? 'Live' : 'Offline'}
                    </span>
                    <ThemeToggle />
                    <button className="btn btn-secondary" onClick={logout}>Logout</button>
                </div>
            </header>

            <div className="dashboard-content">

                {/* Alert Banner */}
                {alertSent && (
                    <div className="alert-banner" style={{ background: alertSent.startsWith('❌') ? '#fee2e2' : '#d1fae5', borderColor: alertSent.startsWith('❌') ? '#fca5a5' : '#6ee7b7' }}>
                        {alertSent}
                    </div>
                )}

                {/* ── GPS Status Card ── */}
                <div className="card gps-status-card">
                    <div className="gps-header">
                        <div className="gps-title">
                            <FaSatellite className={gpsTracking ? 'gps-icon-active' : 'gps-icon'} />
                            <span>Phone GPS Tracking</span>
                        </div>
                        <div className="gps-controls">
                            {!gpsTracking ? (
                                <button className="btn btn-success" onClick={tripActive ? startTracking : startTrip} disabled={tripStarting}>
                                    <FaPlay /> {tripStarting ? 'Starting…' : tripActive ? 'Resume GPS' : 'Start Trip & GPS'}
                                </button>
                            ) : (
                                <>
                                    {tripActive && (
                                        <button className="btn btn-danger" onClick={endTrip} disabled={tripEnding}>
                                            <FaStop /> {tripEnding ? 'Ending…' : 'End Trip'}
                                        </button>
                                    )}
                                    <button className="btn btn-warning" onClick={stopTracking}>
                                        Pause GPS
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {gpsError && <p className="gps-error"><FaExclamationTriangle /> {gpsError}</p>}

                    <div className="gps-stats">
                        <div className="gps-stat">
                            <span className="stat-label">Status</span>
                            <span className="stat-value" style={{ color: gpsTracking ? '#10b981' : '#6b7280' }}>
                                {gpsTracking ? (gpsSending ? '📡 Sending…' : '✅ Tracking') : '⏸ Stopped'}
                            </span>
                        </div>
                        <div className="gps-stat">
                            <span className="stat-label">Accuracy</span>
                            <span className="stat-value" style={{ color: accuracyColor }}>
                                {gpsAccuracy != null ? `±${gpsAccuracy}m (${accuracyLabel})` : '—'}
                            </span>
                        </div>
                        <div className="gps-stat">
                            <span className="stat-label">Speed</span>
                            <span className="stat-value">{gpsSpeed > 0 ? `${gpsSpeed} km/h` : 'Stationary'}</span>
                        </div>
                        <div className="gps-stat">
                            <span className="stat-label">Updates sent</span>
                            <span className="stat-value">{sendCount}</span>
                        </div>
                        {currentLocation && (
                            <>
                                <div className="gps-stat">
                                    <span className="stat-label">Lat</span>
                                    <span className="stat-value mono">{currentLocation.latitude.toFixed(6)}</span>
                                </div>
                                <div className="gps-stat">
                                    <span className="stat-label">Lng</span>
                                    <span className="stat-value mono">{currentLocation.longitude.toFixed(6)}</span>
                                </div>
                            </>
                        )}
                        <div className="gps-stat">
                            <span className="stat-label">Wake Lock</span>
                            <span className="stat-value">{wakeLockOn ? <><FaLock /> On</> : <><FaLockOpen /> Off</>}</span>
                        </div>
                        {lastSentAt && (
                            <div className="gps-stat">
                                <span className="stat-label">Last sent</span>
                                <span className="stat-value">{lastSentAt.toLocaleTimeString()}</span>
                            </div>
                        )}
                    </div>

                    {!gpsTracking && !tripActive && (
                        <p className="gps-hint">
                            📱 <strong>Tip:</strong> Open this page on the driver's phone browser. Tap "Start Trip & GPS" to begin live tracking. Keep the screen on.
                        </p>
                    )}
                </div>

                {/* ── Map ── */}
                <div className="card map-section">
                    <h2 className="section-title"><FaMapMarkerAlt /> Route Map</h2>
                    <BusMap
                        stops={stops}
                        busLocation={currentLocation}
                        height="420px"
                    />
                </div>

                {/* ── Student Manifest ── */}
                {tripActive && manifest.length > 0 && (
                    <div className="card manifest-section">
                        <h2 className="section-title"><FaUsers /> Student Manifest</h2>
                        <div className="manifest-table">
                            <div className="table-header">
                                <div className="table-cell">Stop</div>
                                <div className="table-cell">Present</div>
                                <div className="table-cell">Absent</div>
                                <div className="table-cell">Total</div>
                            </div>
                            {manifest.map(stop => (
                                <div key={stop.stop_id} className="table-row">
                                    <div className="table-cell"><strong>{stop.stop_name}</strong></div>
                                    <div className="table-cell"><span className="badge badge-success">{stop.present_count}</span></div>
                                    <div className="table-cell"><span className="badge badge-error">{stop.absent_count}</span></div>
                                    <div className="table-cell"><strong>{stop.total_students}</strong></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Driver Alerts Section (Always accessible) ── */}
                <div className="alerts-grid">
                    {/* Breakdown */}
                    <div className="alert-card card">
                        <h3 className="section-title"><FaExclamationTriangle style={{ color: '#ef4444' }} /> Report Breakdown</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Immediately notifies all route students & admins that the bus is stopped or under repair.
                        </p>
                        <textarea
                            className="form-input"
                            placeholder="Describe the issue (e.g. Engine breakdown near Singanallur, tyre puncture)…"
                            value={breakdownMsg}
                            onChange={e => setBreakdownMsg(e.target.value)}
                            rows={3}
                        />
                        <button className="btn btn-danger" style={{ width: '100%', marginTop: '8px' }} onClick={reportBreakdown}>
                            ⚠️ Report Breakdown Now
                        </button>

                        {/* In-place breakdown confirmation */}
                        {breakdownStatus?.active && (
                            <div style={{
                                marginTop: '12px',
                                padding: '12px 14px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1.5px solid #ef4444',
                                borderRadius: '8px',
                                color: '#f87171'
                            }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                                    <FaExclamationTriangle /> Breakdown Alert Sent & Active ({breakdownStatus.timestamp})
                                </div>
                                <p style={{ margin: '4px 0 8px 0', fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                                    Notified: <em>"{breakdownStatus.message}"</em>
                                </p>
                                <button
                                    className="btn btn-secondary"
                                    style={{ width: '100%', fontSize: '0.82rem', padding: '6px 12px' }}
                                    onClick={resolveBreakdown}
                                >
                                    <FaCheckCircle style={{ color: '#10b981', marginRight: '6px' }} /> Mark Resolved & Resume Service
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Delay */}
                    <div className="alert-card card">
                        <h3 className="section-title"><FaClock style={{ color: '#f59e0b' }} /> Update Route Delay</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Adds extra buffer to student ETAs and notifies of heavy traffic or route blocks.
                        </p>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="Delay in minutes (e.g. 15)"
                            value={delayMinutes}
                            min={1}
                            onChange={e => setDelayMinutes(e.target.value)}
                        />
                        <button className="btn btn-warning" style={{ width: '100%', marginTop: '8px' }} onClick={sendDelay}>
                            🕐 Notify Students of Delay
                        </button>

                        {/* In-place delay confirmation */}
                        {delayStatus && (
                            <div style={{
                                marginTop: '12px',
                                padding: '12px 14px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1.5px solid #f59e0b',
                                borderRadius: '8px',
                                color: '#fbbf24'
                            }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                                    <FaCheckCircle /> Delay Active: +{delayStatus.minutes} min ({delayStatus.timestamp})
                                </div>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                                    All student arrival ETAs on this route have been automatically extended by +{delayStatus.minutes} minutes.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* SOS */}
                    <div className="alert-card card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid #ef4444' }}>
                        <h3 className="section-title" style={{ color: '#ef4444' }}>🚨 Emergency SOS Broadcast</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Trigger in case of an accident or medical emergency. Instantly alerts all students, drivers, and campus fleet admins.
                        </p>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Emergency description (optional, e.g. Medical emergency on board, need support)…"
                            value={sosMsg}
                            onChange={e => setSosMsg(e.target.value)}
                        />
                        <button className="btn btn-danger" style={{ marginTop: '10px', width: '100%', fontWeight: '700', padding: '12px', fontSize: '1rem' }} onClick={sendSOS}>
                            🚨 SEND EMERGENCY SOS NOW
                        </button>

                        {/* In-place SOS confirmation */}
                        {sosStatus?.active && (
                            <div style={{
                                marginTop: '14px',
                                padding: '14px 16px',
                                background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
                                border: '2px solid #ef4444',
                                borderRadius: '8px',
                                color: '#ffffff',
                                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                            }}>
                                <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fecaca' }}>
                                    🚨 EMERGENCY SOS BROADCAST ACTIVE ({sosStatus.timestamp})
                                </div>
                                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#fef2f2' }}>
                                    Distress signal: <strong>"{sosStatus.message}"</strong>. Campus security and students have been alerted with your coordinates.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Confirmation Toast for Mobile & PC */}
                {toast && (
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 99999,
                        maxWidth: '92vw',
                        width: '440px',
                        background: toast.type === 'error' ? '#991b1b' : toast.type === 'warning' ? '#b45309' : toast.type === 'danger' ? '#7f1d1d' : '#065f46',
                        color: '#ffffff',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        border: '1.5px solid rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                                {toast.title}
                            </div>
                            <div style={{ fontSize: '0.82rem', marginTop: '3px', opacity: 0.95 }}>
                                {toast.message}
                            </div>
                        </div>
                        <button
                            onClick={() => setToast(null)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: '1.2rem',
                                cursor: 'pointer',
                                padding: '4px 8px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DriverDashboard;
