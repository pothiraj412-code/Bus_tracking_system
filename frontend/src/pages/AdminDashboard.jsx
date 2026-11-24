/**
 * Admin Dashboard Component
 * Monitor all buses, view logs, and analytics
 */

import { useState, useEffect, useRef } from 'react';
import { FaUserTie, FaBus, FaGraduationCap, FaCar, FaMap, FaTrafficLight, FaCheckCircle, FaClipboardList, FaChartBar, FaExclamationTriangle, FaClock, FaLock, FaRegFileAlt, FaHourglassHalf, FaPlayCircle, FaFlagCheckered, FaMapMarkerAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import AdminMap from '../components/AdminMap';
import websocketService from '../services/websocket.service';
import ThemeToggle from '../components/ThemeToggle';
import './AdminDashboard.css';

function AdminDashboard() {
    const { user, logout } = useAuth();
    // Get token directly to ensure it's available for requests
    const token = localStorage.getItem('token');
    // OR const { token } = useAuth(); if exposed. useAuth returns { token } 
    // Let's use localStorage to be safe or update useAuth destructuring.

    const [stats, setStats] = useState(null);
    const [buses, setBuses] = useState([]);
    const [logs, setLogs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [activeAlerts, setActiveAlerts] = useState([]);

    // Buffer WebSocket location updates that arrive before the initial API
    // response has populated the `buses` state.  After the API call resolves
    // we apply the buffer so nothing is lost due to the race condition.
    const locationBufferRef = useRef(new Map()); // busId -> { current_lat, current_lng, last_updated }

    // Notification sound ref (optional)
    const audioRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();
        connectWebSocket();

        // Fallback: Refresh data every 30 seconds
        const interval = setInterval(fetchDashboardData, 30000);

        return () => {
            clearInterval(interval);
            websocketService.disconnect();
        };
    }, []);

    const connectWebSocket = () => {
        const token = localStorage.getItem('token');
        websocketService.connect(token);

        // Listen for all bus locations
        websocketService.onLocationUpdate((data) => {
            // Always persist the latest position in the buffer so it can be
            // applied when (or after) the API data is loaded.
            locationBufferRef.current.set(data.busId, {
                current_lat: data.latitude,
                current_lng: data.longitude,
                last_updated: data.timestamp
            });

            setBuses(currentBuses => {
                return currentBuses.map(bus => {
                    if (bus.id === data.busId) {
                        return {
                            ...bus,
                            current_lat: data.latitude,
                            current_lng: data.longitude,
                            last_updated: data.timestamp
                        };
                    }
                    return bus;
                });
            });
        });

        // Play subtle synthesizer chime for alerts
        const playChime = () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
            } catch (_) {}
        };

        // Listen for emergency SOS broadcast
        websocketService.onSOSReceived((data) => {
            console.log('🚨 SOS received in AdminDashboard:', data);
            playChime();
            setActiveAlerts(prev => [{
                id: Date.now(),
                type: 'emergency',
                title: '🚨 EMERGENCY SOS ALERT',
                message: `Bus #${data.busNumber || 'Fleet'} (${data.driverName || 'Driver'}): ${data.message || 'Emergency assistance required'}`,
                location: data.latitude ? `${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}` : null,
                timestamp: data.timestamp || new Date().toISOString()
            }, ...prev]);

            setLogs(prev => [{
                id: Date.now(),
                event_type: 'emergency',
                description: `EMERGENCY SOS: ${data.message} (${data.busNumber})`,
                created_at: new Date().toISOString()
            }, ...prev]);
        });

        // Listen for Bus Breakdown broadcast
        websocketService.onBreakdown((data) => {
            console.log('⚠️ Breakdown received in AdminDashboard:', data);
            setActiveAlerts(prev => [{
                id: Date.now(),
                type: 'breakdown',
                title: '⚠️ BUS BREAKDOWN',
                message: `Bus #${data.busNumber || data.busId} reported breakdown: ${data.message}`,
                timestamp: data.timestamp || new Date().toISOString()
            }, ...prev]);
            fetchDashboardData();
        });

        // Listen for Route Delay broadcast
        websocketService.onDelay((data) => {
            console.log('🕐 Delay received in AdminDashboard:', data);
            setActiveAlerts(prev => [{
                id: Date.now(),
                type: 'delay',
                title: '🕐 ROUTE DELAY',
                message: `Bus #${data.busNumber || data.busId} reported ${data.delayMinutes} min delay.`,
                timestamp: data.timestamp || new Date().toISOString()
            }, ...prev]);
        });

        // Listen for new logs/alerts
        websocketService.onNotification((notification) => {
            // Add to logs immediately
            const newLog = {
                id: Date.now(), // Temporary ID
                event_type: notification.type || 'alert',
                description: notification.message,
                created_at: new Date().toISOString()
            };

            setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 50));

            // Optionally refresh stats if it's a major event
            if (notification.type === 'breakdown' || notification.type === 'trip_start') {
                fetchDashboardData();
            }
        });
    };

    const fetchDashboardData = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const [statsRes, busesRes, logsRes, analyticsRes, alertsRes] = await Promise.all([
                axios.get('/api/admin/dashboard', config),
                axios.get('/api/admin/buses', config),
                axios.get('/api/admin/logs?limit=50', config),
                axios.get('/api/admin/analytics', config),
                axios.get('/api/admin/alerts', config).catch(() => ({ data: { data: [] } }))
            ]);

            if (alertsRes?.data?.data && Array.isArray(alertsRes.data.data)) {
                setActiveAlerts(alertsRes.data.data);
            }

            setStats(statsRes.data.data);

            // Merge any real-time locations buffered from WebSocket into the
            // API data so the map shows up-to-date positions even when the
            // WebSocket update arrives before the HTTP response does.
            const busesFromApi = busesRes.data.data.map(bus => {
                const buffered = locationBufferRef.current.get(bus.id);
                if (buffered) {
                    return {
                        ...bus,
                        current_lat: buffered.current_lat,
                        current_lng: buffered.current_lng,
                        last_updated: buffered.last_updated
                    };
                }
                return bus;
            });

            // Remove buffer entries for buses that are no longer active to
            // prevent the buffer from growing indefinitely.
            const activeBusIds = new Set(busesFromApi.filter(b => b.status === 'active').map(b => b.id));
            locationBufferRef.current.forEach((_, id) => {
                if (!activeBusIds.has(id)) locationBufferRef.current.delete(id);
            });

            setBuses(busesFromApi);

            setLogs(logsRes.data.data);
            setAnalytics(analyticsRes.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setLoading(false);
        }
    };

    const getBusStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return <span className="badge badge-success">Active</span>;
            case 'breakdown':
                return <span className="badge badge-error">Breakdown</span>;
            case 'maintenance':
                return <span className="badge badge-warning">Maintenance</span>;
            default:
                return <span className="badge badge-info">Idle</span>;
        }
    };

    const getEventIcon = (eventType) => {
        switch (eventType) {
            case 'trip_started': return <FaPlayCircle />;
            case 'trip_ended': return <FaFlagCheckered />;
            case 'breakdown': return <FaExclamationTriangle />;
            case 'delay_updated': return <FaClock />;
            case 'bus_arrival': return <FaMapMarkerAlt />;
            case 'attendance_locked': return <FaLock />;
            default: return <FaRegFileAlt />;
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spin"><FaHourglassHalf /></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="dashboard-error">
                <h2><FaExclamationTriangle /> Failed to load data</h2>
                <button className="btn btn-primary" onClick={fetchDashboardData}>Retry</button>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <h1 className="dashboard-title">
                            <span className="title-icon"><FaUserTie /></span>
                            PSG iTech Fleet Command Center
                        </h1>
                        <p className="dashboard-subtitle">Fleet Tracking & Transit Operations • Neelambur, Coimbatore</p>
                    </div>
                    <div className="header-right">
                        <ThemeToggle />
                        <button className="btn btn-secondary" onClick={logout}>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="dashboard-content">
                {/* ── Active Fleet Emergency & Service Alerts ── */}
                {activeAlerts && activeAlerts.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        {activeAlerts.map(alert => (
                            <div
                                key={alert.id || alert.timestamp}
                                style={{
                                    background: alert.type === 'emergency' || alert.title?.includes('EMERGENCY') ? '#7f1d1d' : alert.type === 'breakdown' || alert.title?.includes('BREAKDOWN') ? '#450a0a' : '#451a03',
                                    border: `2px solid ${alert.type === 'emergency' || alert.title?.includes('EMERGENCY') ? '#ef4444' : alert.type === 'breakdown' || alert.title?.includes('BREAKDOWN') ? '#f87171' : '#f59e0b'}`,
                                    color: '#fff',
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
                                    animation: alert.type === 'emergency' || alert.title?.includes('EMERGENCY') ? 'pulse 1.5s infinite' : 'none'
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: '1.4rem', marginRight: '10px' }}>
                                        {alert.type === 'emergency' || alert.title?.includes('EMERGENCY') ? '🚨' : alert.type === 'breakdown' || alert.title?.includes('BREAKDOWN') ? '⚠️' : '🕐'}
                                    </span>
                                    <strong style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}>{alert.title || 'FLEET ALERT'}:</strong>{' '}
                                    <span style={{ fontSize: '1rem', marginLeft: '6px' }}>{alert.message}</span>
                                    {alert.location && <span style={{ marginLeft: '12px', fontSize: '0.85rem', opacity: 0.85 }}>(GPS: {alert.location})</span>}
                                    <span style={{ marginLeft: '14px', fontSize: '0.8rem', opacity: 0.7 }}>
                                        {new Date(alert.created_at || alert.timestamp || Date.now()).toLocaleTimeString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setActiveAlerts(prev => prev.filter(a => a.id !== alert.id))}
                                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    ✕ Dismiss
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card card">
                        <div className="stat-icon"><FaBus /></div>
                        <div className="stat-content">
                            <h3 className="stat-label">Total Buses</h3>
                            <p className="stat-value">{stats.totalBuses}</p>
                            <p className="stat-meta">
                                <span className="text-success">{stats.activeBuses} active</span>
                            </p>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon"><FaGraduationCap /></div>
                        <div className="stat-content">
                            <h3 className="stat-label">Total Students</h3>
                            <p className="stat-value">{stats.totalStudents}</p>
                            <p className="stat-meta">Registered users</p>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon"><FaCar /></div>
                        <div className="stat-content">
                            <h3 className="stat-label">Total Drivers</h3>
                            <p className="stat-value">{stats.totalDrivers}</p>
                            <p className="stat-meta">Active drivers</p>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon"><FaMap /></div>
                        <div className="stat-content">
                            <h3 className="stat-label">Active Routes</h3>
                            <p className="stat-value">{stats.totalRoutes}</p>
                            <p className="stat-meta">Operational routes</p>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon"><FaTrafficLight /></div>
                        <div className="stat-content">
                            <h3 className="stat-label">Active Trips</h3>
                            <p className="stat-value">{stats.activeTrips}</p>
                            <p className="stat-meta">Currently running</p>
                        </div>
                    </div>

                    <div className="stat-card card">
                        <div className="stat-icon"><FaCheckCircle /></div>
                        <div className="stat-content">
                            <h3 className="stat-label">Today's Attendance</h3>
                            <p className="stat-value">
                                {analytics?.attendance?.present_count || 0}
                            </p>
                            <p className="stat-meta">
                                of {analytics?.attendance?.total_records || 0} students
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs-container card">
                    <div className="tabs-header">
                        <button
                            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            <FaBus /> Buses
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                            onClick={() => setActiveTab('logs')}
                        >
                            <FaClipboardList /> Logs
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <FaChartBar /> Analytics
                        </button>
                    </div>

                    <div className="tabs-content">
                        {/* Buses Tab */}
                        {activeTab === 'overview' && (
                            <div className="buses-table">
                                <h2 className="section-title">Live Fleet Monitor</h2>
                                <AdminMap buses={buses} height="400px" />

                                <h2 className="section-title" style={{ marginTop: '2rem' }}>Fleet Status</h2>
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Bus Number</th>
                                                <th>Route</th>
                                                <th>Driver</th>
                                                <th>Status</th>
                                                <th>Trip Status</th>
                                                <th>Last Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {buses.map((bus) => (
                                                <tr key={bus.id}>
                                                    <td><strong>{bus.bus_number}</strong></td>
                                                    <td>{bus.route_name}</td>
                                                    <td>{bus.driver_name || 'Not Assigned'}</td>
                                                    <td>{getBusStatusBadge(bus.status)}</td>
                                                    <td>
                                                        {bus.active_trip_id ? (
                                                            <span className="badge badge-success">In Trip</span>
                                                        ) : (
                                                            <span className="badge badge-info">Idle</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {bus.last_updated
                                                            ? new Date(bus.last_updated).toLocaleString()
                                                            : 'N/A'
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Logs Tab */}
                        {activeTab === 'logs' && (
                            <div className="logs-section">
                                <h2 className="section-title">System Logs</h2>
                                <div className="logs-list">
                                    {logs.map((log) => (
                                        <div key={log.id} className="log-item">
                                            <div className="log-icon">{getEventIcon(log.event_type)}</div>
                                            <div className="log-content">
                                                <h4 className="log-title">{log.event_type.replace(/_/g, ' ').toUpperCase()}</h4>
                                                <p className="log-description">{log.description}</p>
                                                <div className="log-meta">
                                                    {log.bus_number && <span>Bus: {log.bus_number}</span>}
                                                    {log.driver_name && <span>Driver: {log.driver_name}</span>}
                                                    <span>{new Date(log.created_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && (
                            <div className="analytics-section">
                                <h2 className="section-title">Analytics & Insights</h2>

                                {/* Attendance Stats */}
                                <div className="analytics-card card-glass">
                                    <h3 className="analytics-title"><FaChartBar /> Attendance Overview</h3>
                                    <div className="analytics-grid">
                                        <div className="analytics-item">
                                            <span className="analytics-label">Present</span>
                                            <span className="analytics-value text-success">
                                                {analytics?.attendance?.present_count || 0}
                                            </span>
                                        </div>
                                        <div className="analytics-item">
                                            <span className="analytics-label">Absent</span>
                                            <span className="analytics-value text-error">
                                                {analytics?.attendance?.absent_count || 0}
                                            </span>
                                        </div>
                                        <div className="analytics-item">
                                            <span className="analytics-label">Total</span>
                                            <span className="analytics-value">
                                                {analytics?.attendance?.total_records || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Route Distribution */}
                                <div className="analytics-card card-glass">
                                    <h3 className="analytics-title"><FaMap /> Route Distribution</h3>
                                    <div className="route-list">
                                        {analytics?.routeDistribution?.map((route, index) => (
                                            <div key={index} className="route-item">
                                                <span className="route-name">{route.route_name}</span>
                                                <span className="route-count badge badge-info">
                                                    {route.student_count} students
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Trip Statistics */}
                                <div className="analytics-card card-glass">
                                    <h3 className="analytics-title"><FaTrafficLight /> Recent Trip Statistics</h3>
                                    <div className="trips-table">
                                        {analytics?.trips?.map((trip, index) => (
                                            <div key={index} className="trip-row">
                                                <span className="trip-date">{trip.date}</span>
                                                <span className="trip-stat">
                                                    {trip.trip_count} trips
                                                </span>
                                                <span className="trip-stat">
                                                    Avg delay: {trip.avg_delay?.toFixed(1) || 0} min
                                                </span>
                                                {trip.breakdown_count > 0 && (
                                                    <span className="trip-stat text-error">
                                                        {trip.breakdown_count} breakdowns
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
