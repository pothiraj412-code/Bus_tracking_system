/**
 * Driver Routes
 * Handles driver-specific operations
 */

const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/database.service');
const attendanceLockService = require('../services/attendanceLock.service');
const notificationService = require('../services/notification.service');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const db = getInstance();

/**
 * GET /api/driver/dashboard
 * Get driver dashboard data
 */
router.get('/dashboard', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;

        // Get driver's assigned bus
        const bus = db.queryOne(
            `SELECT b.*, r.name as route_name, r.id as route_id
             FROM buses b
             JOIN routes r ON b.route_id = r.id
             WHERE b.driver_id = ?`,
            [driverId]
        );

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'No bus assigned to this driver'
            });
        }

        // Get active trip
        const activeTrip = db.queryOne(
            `SELECT * FROM trips
             WHERE driver_id = ? AND status = 'active'
             ORDER BY started_at DESC LIMIT 1`,
            [driverId]
        );

        // Get route stops
        const stops = db.query(
            `SELECT id, name, latitude, longitude, sequence_order
             FROM stops WHERE route_id = ? ORDER BY sequence_order`,
            [bus.route_id]
        );

        res.json({
            success: true,
            data: {
                driver: {
                    id: req.user.id,
                    name: req.user.full_name,
                    username: req.user.username
                },
                bus: {
                    id: bus.id,
                    busNumber: bus.bus_number,
                    status: bus.status,
                    routeName: bus.route_name,
                    routeId: bus.route_id,
                    currentLocation: bus.current_lat && bus.current_lng ? {
                        latitude: bus.current_lat,
                        longitude: bus.current_lng
                    } : null
                },
                activeTrip,
                stops
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/driver/trip/start
 * Start a new trip
 */
router.post('/trip/start', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;

        // Get driver's bus
        const bus = db.queryOne(
            'SELECT id, route_id FROM buses WHERE driver_id = ?',
            [driverId]
        );

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'No bus assigned'
            });
        }

        // Check if there's already an active trip
        const activeTrip = db.queryOne(
            `SELECT id FROM trips WHERE driver_id = ? AND status = 'active'`,
            [driverId]
        );

        if (activeTrip) {
            return res.status(400).json({
                success: false,
                message: 'Trip already in progress'
            });
        }

        // Create new trip
        const result = db.execute(
            `INSERT INTO trips (bus_id, driver_id, route_id, started_at, status)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'active')`,
            [bus.id, driverId, bus.route_id]
        );

        // Update bus status
        db.execute(
            `UPDATE buses SET status = 'active' WHERE id = ?`,
            [bus.id]
        );

        // Notify clients that trip has started
        if (notificationService.socketIO) {
            notificationService.socketIO.emit('trip-status', { busId: bus.id, status: 'active' });
        }

        // Log event
        db.execute(
            `INSERT INTO logs (trip_id, event_type, description)
             VALUES (?, 'trip_started', 'Driver started trip')`,
            [result.lastInsertRowid]
        );

        res.json({
            success: true,
            data: {
                tripId: result.lastInsertRowid,
                message: 'Trip started successfully'
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/driver/trip/end
 * End current trip
 */
router.post('/trip/end', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;

        // Get active trip
        const trip = db.queryOne(
            `SELECT t.*, b.id as bus_id FROM trips t
             JOIN buses b ON t.bus_id = b.id
             WHERE t.driver_id = ? AND t.status = 'active'`,
            [driverId]
        );

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: 'No active trip found'
            });
        }

        // End trip
        db.execute(
            `UPDATE trips SET status = 'completed', ended_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [trip.id]
        );

        // Update bus status
        db.execute(
            `UPDATE buses SET status = 'idle', current_lat = NULL, current_lng = NULL
             WHERE id = ?`,
            [trip.bus_id]
        );

        // Notify clients that trip has ended
        if (notificationService.socketIO) {
            notificationService.socketIO.emit('trip-status', { busId: trip.bus_id, status: 'ended' });
        }

        // Log event
        db.execute(
            `INSERT INTO logs (trip_id, event_type, description)
             VALUES (?, 'trip_ended', 'Driver ended trip')`,
            [trip.id]
        );

        res.json({
            success: true,
            message: 'Trip ended successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/driver/breakdown
 * Report bus breakdown (works even if trip wasn't started yet)
 */
router.post('/breakdown', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;
        const { message } = req.body;
        const breakdownMsg = message?.trim() || 'Bus breakdown reported';

        // Get driver's bus
        const bus = db.queryOne(
            `SELECT b.id, b.route_id, b.bus_number FROM buses b WHERE b.driver_id = ?`,
            [driverId]
        );

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'No bus assigned to this driver'
            });
        }

        // Get active trip if one exists
        const trip = db.queryOne(
            `SELECT id FROM trips WHERE driver_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
            [driverId]
        );

        // Update trip if active
        if (trip) {
            db.execute(
                `UPDATE trips SET breakdown_reported = 1, breakdown_message = ? WHERE id = ?`,
                [breakdownMsg, trip.id]
            );
            db.execute(
                `INSERT INTO logs (trip_id, event_type, description) VALUES (?, 'breakdown', ?)`,
                [trip.id, breakdownMsg]
            );
        }

        // Update bus status to breakdown
        db.execute(
            `UPDATE buses SET status = 'breakdown' WHERE id = ?`,
            [bus.id]
        );

        // Instant broadcast to all connected clients
        const io = notificationService.socketIO;
        if (io) {
            io.emit('bus-breakdown', {
                busId: bus.id,
                busNumber: bus.bus_number,
                routeId: bus.route_id,
                message: breakdownMsg,
                timestamp: new Date().toISOString()
            });
        }

        // Notify all students on this route (in-app notifications)
        notificationService.notifyBreakdown(bus.route_id, breakdownMsg);

        res.json({
            success: true,
            message: 'Breakdown reported and students notified'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/driver/breakdown/resolve
 * Resolve breakdown and resume normal service
 */
router.post('/breakdown/resolve', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;
        const bus = db.queryOne(
            `SELECT id, route_id, bus_number FROM buses WHERE driver_id = ?`,
            [driverId]
        );

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'No bus assigned to this driver'
            });
        }

        const trip = db.queryOne(
            `SELECT id FROM trips WHERE driver_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
            [driverId]
        );

        if (trip) {
            db.execute(
                `UPDATE trips SET breakdown_reported = 0, breakdown_message = NULL WHERE id = ?`,
                [trip.id]
            );
            db.execute(
                `INSERT INTO logs (trip_id, event_type, description) VALUES (?, 'breakdown_resolved', 'Breakdown resolved, trip continued')`,
                [trip.id]
            );
        }

        db.execute(
            `UPDATE buses SET status = ? WHERE id = ?`,
            [trip ? 'on_route' : 'idle', bus.id]
        );

        const io = notificationService.socketIO;
        if (io) {
            io.emit('bus-breakdown-resolved', {
                busId: bus.id,
                busNumber: bus.bus_number,
                routeId: bus.route_id,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Breakdown cleared. Normal service resumed.'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/driver/delay
 * Update delay time
 */
router.post('/delay', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;
        const { delayMinutes } = req.body;
        const mins = parseInt(delayMinutes);

        if (isNaN(mins) || mins < 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid delay time'
            });
        }

        // Get driver's bus
        const bus = db.queryOne(
            `SELECT b.id, b.route_id, b.bus_number FROM buses b WHERE b.driver_id = ?`,
            [driverId]
        );

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'No bus assigned to this driver'
            });
        }

        // Get active trip if one exists
        const trip = db.queryOne(
            `SELECT id FROM trips WHERE driver_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
            [driverId]
        );

        if (trip) {
            db.execute(
                `UPDATE trips SET delay_minutes = ? WHERE id = ?`,
                [mins, trip.id]
            );
            db.execute(
                `INSERT INTO logs (trip_id, event_type, description) VALUES (?, 'delay_updated', ?)`,
                [trip.id, `Delay updated to ${mins} minutes`]
            );
        }

        // Instant broadcast to all connected clients
        const io = notificationService.socketIO;
        if (io) {
            io.emit('bus-delay', {
                busId: bus.id,
                busNumber: bus.bus_number,
                routeId: bus.route_id,
                delayMinutes: mins,
                timestamp: new Date().toISOString()
            });
        }

        // Notify students
        notificationService.notifyDelay(bus.route_id, mins);

        res.json({
            success: true,
            message: `Delay of ${mins} minutes updated and students notified`
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/driver/sos
 * HTTP Emergency SOS endpoint (guaranteed delivery even if WebSocket reconnecting)
 */
router.post('/sos', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;
        const { message, location } = req.body;

        const driver = db.queryOne(
            `SELECT u.id, u.full_name as name, b.id as bus_id, b.bus_number, b.route_id, r.name as route_name
             FROM users u
             JOIN buses b ON b.driver_id = u.id
             JOIN routes r ON r.id = b.route_id
             WHERE u.id = ?`,
            [driverId]
        );

        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver or bus not found' });
        }

        const safeLat = location?.latitude ?? 11.0650;
        const safeLng = location?.longitude ?? 77.1000;
        const sosMsg = message || 'Emergency assistance required immediately!';

        const sosData = {
            driverId: driver.id,
            driverName: driver.name || 'Driver',
            busNumber: driver.bus_number,
            routeId: driver.route_id,
            routeName: driver.route_name,
            message: sosMsg,
            latitude: safeLat,
            longitude: safeLng,
            timestamp: new Date().toISOString()
        };

        const io = notificationService.socketIO;
        if (io) {
            io.emit('sos-alert', sosData);
        }

        // Notify students on this route
        const students = db.query(
            `SELECT DISTINCT u.id FROM users u
             JOIN student_stops ss ON ss.student_id = u.id
             JOIN stops s ON s.id = ss.stop_id
             WHERE s.route_id = ? AND u.role = 'student'`,
            [driver.route_id]
        );

        students.forEach(student => {
            notificationService.createNotification(
                student.id,
                'general',
                '🚨 EMERGENCY ALERT',
                `Driver ${sosData.driverName} (${driver.bus_number}) sent SOS: ${sosMsg}`
            );
        });

        // Notify all admins
        const admins = db.query(`SELECT id FROM users WHERE role = 'admin'`);
        admins.forEach(admin => {
            notificationService.createNotification(
                admin.id,
                'general',
                '🚨 DRIVER EMERGENCY SOS',
                `Driver ${sosData.driverName} (${driver.bus_number}, ${driver.route_name}) sent SOS: ${sosMsg}`
            );
        });

        res.json({
            success: true,
            data: sosData,
            message: 'Emergency SOS broadcasted successfully to all users'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/driver/manifest
 * Get student count per stop
 */
router.get('/manifest', authenticate, authorize('driver'), (req, res, next) => {
    try {
        const driverId = req.user.id;

        // Get driver's route
        const bus = db.queryOne(
            'SELECT route_id FROM buses WHERE driver_id = ?',
            [driverId]
        );

        if (!bus) {
            return res.status(404).json({
                success: false,
                message: 'No bus assigned'
            });
        }

        const manifest = attendanceLockService.getStudentCountsPerStop(bus.route_id);

        res.json({
            success: true,
            data: manifest
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
