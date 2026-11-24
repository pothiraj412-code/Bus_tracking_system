/**
 * GPS Location REST endpoint (HTTP fallback for unreliable WebSocket on mobile)
 * POST /api/driver/gps  — driver pushes location via HTTP when WS is unavailable
 */

const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/database.service');
const notificationService = require('../services/notification.service');
const { calculateStopETA } = require('../services/eta.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const db = getInstance();

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const dφ = (lat2 - lat1) * Math.PI / 180;
    const dλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcETA(busLat, busLng, stopLat, stopLng, speedKph = 25) {
    const dist = haversineMeters(busLat, busLng, stopLat, stopLng);
    const speedMs = (speedKph * 1000) / 3600;
    return Math.round(dist / speedMs / 60); // minutes
}

// In-memory last-known location (augments SQLite which is on disk)
const busLocationCache = new Map(); // busId -> locationPayload

/**
 * POST /api/driver/gps
 * HTTP fallback: driver phone POSTs location here when WebSocket is down.
 * Also used as the primary channel by the GpsTracker mobile page.
 */
router.post('/gps', authenticate, authorize('driver'), (req, res) => {
    try {
        const driverId = req.user.id;
        const { latitude, longitude, speed, heading, accuracy, timestamp } = req.body;

        if (latitude == null || longitude == null) {
            return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
        }

        // Get driver's bus + active trip
        const bus = db.queryOne(
            `SELECT b.id, b.route_id, b.bus_number FROM buses b WHERE b.driver_id = ?`,
            [driverId]
        );
        if (!bus) return res.status(404).json({ success: false, message: 'No bus assigned to this driver' });

        const trip = db.queryOne(
            `SELECT id FROM trips WHERE driver_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
            [driverId]
        );

        // Update bus coordinates in DB
        db.execute(
            `UPDATE buses SET current_lat = ?, current_lng = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
            [latitude, longitude, bus.id]
        );

        // Log to trip_history if trip active
        if (trip) {
            db.execute(
                `INSERT INTO trip_history (trip_id, latitude, longitude, speed) VALUES (?, ?, ?, ?)`,
                [trip.id, latitude, longitude, speed || 0]
            );
        }

        // Build stops with realistic ETA for every stop on this route
        const stops = db.query(
            `SELECT id, name, latitude, longitude, sequence_order FROM stops
             WHERE route_id = ? ORDER BY sequence_order`,
            [bus.route_id]
        );

        const tripRow = trip ? db.queryOne('SELECT delay_minutes FROM trips WHERE id = ?', [trip.id]) : null;
        const delayMinutes = tripRow ? (tripRow.delay_minutes || 0) : 0;
        const isTripActive = !!trip;

        const stopETAs = stops.map((s, idx) => {
            const etaCalc = calculateStopETA(
                latitude, longitude,
                s.latitude, s.longitude,
                speed || 0,
                idx,
                delayMinutes,
                isTripActive
            );

            return {
                stopId: s.id,
                stopName: s.name,
                distanceMeters: etaCalc.distanceMeters,
                roadDistanceMeters: etaCalc.roadDistanceMeters,
                etaMinutes: etaCalc.etaMinutes,
                statusText: etaCalc.statusText
            };
        });

        const locationPayload = {
            busId: bus.id,
            busNumber: bus.bus_number,
            routeId: bus.route_id,
            latitude,
            longitude,
            speed: speed || 0,
            heading: heading || 0,
            accuracy: accuracy || null,
            timestamp: timestamp || Date.now(),
            tripActive: isTripActive,
            delayMinutes,
            stopETAs
        };

        // Cache it in memory
        busLocationCache.set(bus.id, locationPayload);

        // Broadcast via Socket.IO (use notificationService which holds the io reference)
        const io = notificationService.socketIO;
        if (io) {
            io.emit('receive-location', locationPayload);

            // Per-stop ETA updates to students watching their stop
            stopETAs.forEach(({ stopId, etaMinutes }) => {
                io.emit('eta-update', {
                    busId: bus.id,
                    routeId: bus.route_id,
                    stopId,
                    etaMinutes,
                    busLat: latitude,
                    busLng: longitude
                });
            });
        }

        res.json({ success: true, data: { busId: bus.id, stopETAs } });
    } catch (err) {
        console.error('GPS update error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/driver/gps/status
 * Returns the current location cache for all buses (used by admin/student on initial load)
 */
router.get('/gps/status', authenticate, (req, res) => {
    const locations = Array.from(busLocationCache.values());
    res.json({ success: true, data: locations });
});

module.exports = router;
module.exports.busLocationCache = busLocationCache;
