/**
 * Public Routes (no auth required)
 * Used by the signup form to fetch bus routes and stops
 */

const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/database.service');

const db = getInstance();

/**
 * GET /api/public/routes
 * Returns all bus routes with their bus numbers
 */
router.get('/routes', (req, res) => {
    try {
        const routes = db.query(`
            SELECT r.id, r.name, r.description, b.id as bus_id, b.bus_number
            FROM routes r
            LEFT JOIN buses b ON b.route_id = r.id
            ORDER BY r.id
        `);
        res.json({ success: true, data: routes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/public/routes/:routeId/stops
 * Returns stops for a given route (sorted by sequence_order)
 */
router.get('/routes/:routeId/stops', (req, res) => {
    try {
        const { routeId } = req.params;
        const stops = db.query(
            `SELECT id, name, sequence_order, latitude, longitude
             FROM stops
             WHERE route_id = ?
             ORDER BY sequence_order ASC`,
            [routeId]
        );
        res.json({ success: true, data: stops });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/public/buses
 * Returns all buses (for driver signup dropdown)
 */
router.get('/buses', (req, res) => {
    try {
        const buses = db.query(`
            SELECT b.id, b.bus_number, b.route_id, r.name as route_name,
                   CASE WHEN b.driver_id IS NULL THEN 1 ELSE 0 END as available
            FROM buses b
            LEFT JOIN routes r ON r.id = b.route_id
            ORDER BY b.route_id
        `);
        res.json({ success: true, data: buses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

