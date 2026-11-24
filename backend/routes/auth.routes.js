/**
 * Authentication Routes
 * Handles login, logout, user info, and registration
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth.middleware');
const { getInstance } = require('../services/database.service');

const ADMIN_SECRET_CODE = 'PSGITECH2026';
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        console.log("Login body:", req.body);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const result = await authService.login(username, password);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        if (error.message === 'User not found' || error.message === 'Invalid password') {
            return res.status(401).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
});

/**
 * POST /api/auth/register
 * Register a new user (student, driver, or admin)
 */
router.post('/register', async (req, res) => {
    const db = getInstance();
    try {
        const { role } = req.body;

        if (!role || !['student', 'driver', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role specified.' });
        }

        // ── STUDENT ──────────────────────────────────────────────────────────
        if (role === 'student') {
            const { full_name, roll_no, dept, year, phone, bus_route_id, stop_id, password, confirm_password } = req.body;

            if (!full_name || !roll_no || !dept || !year || !phone || !bus_route_id || !stop_id || !password) {
                return res.status(400).json({ success: false, message: 'All student fields are required.' });
            }
            if (password !== confirm_password) {
                return res.status(400).json({ success: false, message: 'Passwords do not match.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
            }

            const username = roll_no.toLowerCase().replace(/\s+/g, '');
            const email = `${username}@student.psgitech.ac.in`;

            const existing = db.queryOne('SELECT id FROM users WHERE username = ?', [username]);
            if (existing) {
                return res.status(409).json({ success: false, message: `Roll number ${roll_no} is already registered.` });
            }

            // Validate stop belongs to this route
            const stopExists = db.queryOne('SELECT id FROM stops WHERE id = ? AND route_id = ?', [stop_id, bus_route_id]);
            if (!stopExists) {
                return res.status(400).json({ success: false, message: 'Invalid stop selected for this route.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = db.execute(
                `INSERT INTO users (username, password, role, full_name, email, phone, roll_no, dept, year)
                 VALUES (?, ?, 'student', ?, ?, ?, ?, ?, ?)`,
                [username, hashedPassword, full_name, email, phone, roll_no, dept, year]
            );

            const userId = result.lastInsertRowid;

            // Link student to their chosen stop
            db.execute(
                'INSERT INTO student_stops (student_id, stop_id) VALUES (?, ?)',
                [userId, stop_id]
            );

            const user = db.queryOne('SELECT id, username, role, full_name, email, phone, roll_no, dept, year FROM users WHERE id = ?', [userId]);
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            return res.status(201).json({ success: true, data: { user, token } });
        }

        // ── DRIVER ───────────────────────────────────────────────────────────
        if (role === 'driver') {
            const { full_name, employee_id, phone, license_no, assigned_bus_id, password, confirm_password } = req.body;

            if (!full_name || !employee_id || !phone || !license_no || !assigned_bus_id || !password) {
                return res.status(400).json({ success: false, message: 'All driver fields are required.' });
            }
            if (password !== confirm_password) {
                return res.status(400).json({ success: false, message: 'Passwords do not match.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
            }

            const username = `emp_${employee_id.toLowerCase().replace(/\s+/g, '')}`;
            const email = `${username}@driver.psgitech.ac.in`;

            const existing = db.queryOne('SELECT id FROM users WHERE username = ?', [username]);
            if (existing) {
                return res.status(409).json({ success: false, message: `Employee ID ${employee_id} is already registered.` });
            }

            // Validate bus exists
            const busExists = db.queryOne('SELECT id FROM buses WHERE id = ?', [assigned_bus_id]);
            if (!busExists) {
                return res.status(400).json({ success: false, message: 'Invalid bus selected.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = db.execute(
                `INSERT INTO users (username, password, role, full_name, email, phone, employee_id, license_no)
                 VALUES (?, ?, 'driver', ?, ?, ?, ?, ?)`,
                [username, hashedPassword, full_name, email, phone, employee_id, license_no]
            );

            const userId = result.lastInsertRowid;

            // Assign driver to bus
            db.execute('UPDATE buses SET driver_id = ? WHERE id = ?', [userId, assigned_bus_id]);

            const user = db.queryOne('SELECT id, username, role, full_name, email, phone, employee_id, license_no FROM users WHERE id = ?', [userId]);
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            return res.status(201).json({ success: true, data: { user, token } });
        }

        // ── ADMIN ─────────────────────────────────────────────────────────────
        if (role === 'admin') {
            const { full_name, email, phone, admin_code, password, confirm_password } = req.body;

            if (!full_name || !email || !phone || !admin_code || !password) {
                return res.status(400).json({ success: false, message: 'All admin fields are required.' });
            }
            if (admin_code !== ADMIN_SECRET_CODE) {
                return res.status(403).json({ success: false, message: 'Invalid admin authorization code.' });
            }
            if (password !== confirm_password) {
                return res.status(400).json({ success: false, message: 'Passwords do not match.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
            }

            const emailPrefix = email.split('@')[0].toLowerCase().replace(/\s+/g, '');
            const username = `admin_${emailPrefix}`;

            const existing = db.queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
            if (existing) {
                return res.status(409).json({ success: false, message: 'An admin with this email already exists.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = db.execute(
                `INSERT INTO users (username, password, role, full_name, email, phone)
                 VALUES (?, ?, 'admin', ?, ?, ?)`,
                [username, hashedPassword, full_name, email, phone]
            );

            const userId = result.lastInsertRowid;
            const user = db.queryOne('SELECT id, username, role, full_name, email, phone FROM users WHERE id = ?', [userId]);
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            return res.status(201).json({ success: true, data: { user, token } });
        }

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});

/**
 * POST /api/auth/logout
 * User logout (client-side token removal)
 */
router.post('/logout', authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
