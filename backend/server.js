/**
 * Main Server File
 * Integrates Express, Socket.IO, and all services
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { calculateStopETA } = require('./services/eta.service');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

// Services
const { getInstance } = require('./services/database.service');
const attendanceLockService = require('./services/attendanceLock.service');
const notificationService = require('./services/notification.service');
const authService = require('./services/auth.service');
const stopVerificationService = require('./services/stopVerification.service');
const cacheService = require('./services/cache.service');

// Middleware
const errorHandler = require('./middleware/error.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const driverRoutes = require('./routes/driver.routes');
const adminRoutes = require('./routes/admin.routes');
const setupRoutes = require('./routes/setup.routes');
const publicRoutes = require('./routes/public.routes');
const gpsRoutes = require('./routes/gps.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
    cors: {
        origin: "*", // Allow all origins for development (mobile/IP access)
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors({
    origin: true, // Reflect request origin
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes (MUST come before static file serving)
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/driver', gpsRoutes); // GPS HTTP fallback (merged under /api/driver)

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Serve index.html for all non-API routes (React Router)
// This MUST be after API routes to avoid catching API requests
app.get('*', (req, res, next) => {
    // Skip if it's an API request
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

// Set Socket.IO for notification service
notificationService.setSocketIO(io);

// Database instance
const db = getInstance();

// Store active connections
const activeConnections = new Map(); // socketId -> { userId, role, busId }

/**
 * Socket.IO Connection Handler
 */
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    /**
     * Authenticate socket connection
     */
    socket.on('authenticate', async (data) => {
        try {
            const { token } = data;

            if (!token) {
                socket.emit('auth-error', { message: 'No token provided' });
                return;
            }

            const user = authService.verifyToken(token);

            // Store connection info
            activeConnections.set(socket.id, {
                userId: user.id,
                role: user.role,
                socketId: socket.id
            });

            // Join user-specific room for notifications
            socket.join(`user-${user.id}`);

            socket.emit('authenticated', {
                userId: user.id,
                role: user.role
            });

            console.log(`✅ User authenticated: ${user.username} (${user.role})`);

            // If student or admin, immediately push last known locations for instant map load
            if (user.role === 'student' || user.role === 'admin') {
                const locations = await cacheService.getAllBusLocations();
                locations.forEach(loc => {
                    socket.emit('receive-location', loc);
                });
            }
        } catch (error) {
            socket.emit('auth-error', { message: 'Invalid token' });
        }
    });

    /**
     * Driver sends GPS location
     */
    socket.on('send-location', async (data) => {
        try {
            const connection = activeConnections.get(socket.id);
            if (!connection || connection.role !== 'driver') return;

            const { latitude, longitude, speed, heading, accuracy, timestamp } = data;

            // Get driver's bus and active trip
            const bus = db.queryOne(
                `SELECT b.id, b.route_id, b.bus_number,
                        (SELECT id FROM trips WHERE bus_id=b.id AND status='active' ORDER BY started_at DESC LIMIT 1) as trip_id
                 FROM buses b WHERE b.driver_id = ?`,
                [connection.userId]
            );

            if (!bus) return;

            // Update live location in DB
            db.execute(
                `UPDATE buses SET current_lat = ?, current_lng = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
                [latitude, longitude, bus.id]
            );

            // Log to history if trip is active
            if (bus.trip_id) {
                db.execute(
                    `INSERT INTO trip_history (trip_id, latitude, longitude, speed) VALUES (?, ?, ?, ?)`,
                    [bus.trip_id, latitude, longitude, speed || 0]
                );
            }

            // Compute realistic per-stop ETA using transit speed (28 km/h)
            const stops = db.query(
                `SELECT id, name, latitude, longitude, sequence_order FROM stops
                 WHERE route_id = ? ORDER BY sequence_order`,
                [bus.route_id]
            );

            // Fetch any reported delay on this trip
            const tripRow = bus.trip_id ? db.queryOne('SELECT delay_minutes FROM trips WHERE id = ?', [bus.trip_id]) : null;
            const delayMinutes = tripRow ? (tripRow.delay_minutes || 0) : 0;
            const isTripActive = !!bus.trip_id;

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

            const payload = {
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

            // Cache location
            cacheService.setBusLocation(bus.id, payload);

            // Broadcast location to all connected clients
            io.emit('receive-location', payload);

            // Broadcast per-stop ETA updates
            stopETAs.forEach(({ stopId, etaMinutes, distanceMeters, statusText }) => {
                io.emit('eta-update', {
                    busId: bus.id,
                    routeId: bus.route_id,
                    stopId,
                    etaMinutes,
                    distanceMeters,
                    statusText,
                    tripActive: isTripActive,
                    busLat: latitude,
                    busLng: longitude
                });
            });

            // Update attendance locks via service
            if (bus.trip_id) {
                attendanceLockService.updateAttendanceLocks(bus.trip_id, bus.route_id, { lat: latitude, lng: longitude });
            }

        } catch (error) {
            console.error('Error processing location:', error);
        }
    });

    /**
     * Join a specific room (for targeted broadcasts)
     */
    socket.on('join-room', (data) => {
        const { room } = data;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    /**
     * Leave a room
     */
    socket.on('leave-room', (data) => {
        const { room } = data;
        socket.leave(room);
        console.log(`Socket ${socket.id} left room: ${room}`);
    });

    /**
     * Heartbeat ping/pong to keep connection alive
     */
    socket.on('ping', () => {
        socket.emit('pong');
    });

    /**
     * Handle batch location upload (offline/throttled GPS points)
     */
    socket.on('send-location-batch', async (data) => {
        try {
            const connection = activeConnections.get(socket.id);
            if (!connection || connection.role !== 'driver') return;

            const { points } = data;
            if (!Array.isArray(points) || points.length === 0) return;

            const bus = db.queryOne(
                `SELECT b.id, b.route_id, t.id as trip_id FROM buses b 
                 LEFT JOIN trips t ON b.id = t.bus_id AND t.status = 'active'
                 WHERE b.driver_id = ?`,
                [connection.userId]
            );

            if (!bus || !bus.trip_id) return;

            console.log(`📦 Batch Processing: ${points.length} points from Driver ${connection.userId}`);

            // Use transaction for efficient batch history insertion
            db.transaction(() => {
                for (const point of points) {
                    db.execute(
                        `INSERT INTO trip_history (trip_id, latitude, longitude, speed, timestamp) VALUES (?, ?, ?, ?, ?)`,
                        [bus.trip_id, point.latitude, point.longitude, point.speed || 0, new Date(point.timestamp).toISOString()]
                    );
                }
            });

            // Update live location with the MOST RECENT point in the batch
            const latest = points[points.length - 1];
            db.execute(
                `UPDATE buses SET current_lat = ?, current_lng = ?, last_updated = ? WHERE id = ?`,
                [latest.latitude, latest.longitude, new Date(latest.timestamp).toISOString(), bus.id]
            );

            // Broadcast the latest state for live tracking
            const stopsStatus = attendanceLockService.updateAttendanceLocks(bus.trip_id, bus.route_id, { lat: latest.latitude, lng: latest.longitude });
            
            const payload = { 
                busId: bus.id, 
                latitude: latest.latitude, 
                longitude: latest.longitude, 
                speed: latest.speed || 0,
                timestamp: new Date(latest.timestamp).toISOString() 
            };

            // Store in Redis Cache
            cacheService.setBusLocation(bus.id, payload);
            
            io.emit('receive-location', payload);
            io.emit('eta-update', { busId: bus.id, routeId: bus.route_id, stops: stopsStatus });

        } catch (error) {
            console.error('Error processing batch location:', error);
        }
    });

    /**
     * Handle Emergency SOS
     */
    socket.on('emergency-sos', async (data) => {
        try {
            const connection = activeConnections.get(socket.id);

            if (!connection || connection.role !== 'driver') {
                return;
            }

            const { message, location, timestamp } = data;

            console.log(`🚨 EMERGENCY SOS from driver ${connection.userId}: ${message}`);

            // Get driver info
            const driver = db.queryOne(
                `SELECT u.id, u.full_name as name, b.bus_number, b.route_id, r.name as route_name
                 FROM users u
                 JOIN buses b ON b.driver_id = u.id
                 JOIN routes r ON r.id = b.route_id
                 WHERE u.id = ?`,
                [connection.userId]
            );

            if (!driver) {
                console.warn(`SOS received but no bus assigned for driver ${connection.userId}`);
                return;
            }

            const safeLat = location?.latitude ?? 11.0650;
            const safeLng = location?.longitude ?? 77.1000;

            // Create SOS notification in database
            const sosData = {
                driverId: driver.id,
                driverName: driver.name || 'Driver',
                busNumber: driver.bus_number,
                routeId: driver.route_id,
                routeName: driver.route_name,
                message: message || 'Emergency assistance required immediately!',
                latitude: safeLat,
                longitude: safeLng,
                timestamp: new Date(timestamp || Date.now()).toISOString()
            };

            // Broadcast SOS to ALL connected clients (students, drivers, admins)
            io.emit('sos-alert', sosData);

            // Send notifications to all students on this route
            const students = db.query(
                `SELECT DISTINCT u.id
                 FROM users u
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
                    `Driver ${sosData.driverName} (${driver.bus_number}) has sent an emergency SOS: ${sosData.message}`
                );
            });

            // Notify all admins
            const admins = db.query(
                `SELECT id FROM users WHERE role = 'admin'`
            );

            admins.forEach(admin => {
                notificationService.createNotification(
                    admin.id,
                    'general',
                    '🚨 DRIVER EMERGENCY SOS',
                    `Driver ${sosData.driverName} (${driver.bus_number}, ${driver.route_name}) sent SOS: ${sosData.message}. Location: ${safeLat}, ${safeLng}`
                );
            });

            console.log(`✅ SOS broadcasted to all users successfully`);

        } catch (error) {
            console.error('Error processing SOS:', error);
        }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
        const connection = activeConnections.get(socket.id);

        if (connection) {
            console.log(`👋 User disconnected: ${connection.userId} (${connection.role})`);
            activeConnections.delete(socket.id);
        } else {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        }

        io.emit('user-disconnected', socket.id);
    });
});

// Start HTTP server
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5443;

// Generate or load SSL certificate for HTTPS (required for GPS on mobile)
let httpsServer = null;
try {
    const sslDir = path.join(__dirname, 'ssl');
    const keyPath = path.join(sslDir, 'key.pem');
    const certPath = path.join(sslDir, 'cert.pem');

    // Get local IP addresses for the cert's Subject Alternative Names
    const networkInterfaces = os.networkInterfaces();
    const localIPs = ['127.0.0.1'];
    Object.values(networkInterfaces).forEach(iface => {
        if (iface) iface.forEach(addr => {
            if (addr.family === 'IPv4' && !addr.internal) localIPs.push(addr.address);
        });
    });

    if (!fs.existsSync(sslDir)) {
        fs.mkdirSync(sslDir, { recursive: true });
    }

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        console.log('🔒 Generating standard OpenSSL certificate for HTTPS...');
        const sanList = ['DNS:localhost', ...localIPs.map(ip => `IP:${ip}`)].join(',');
        execSync(
            `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -keyout "${keyPath}" -out "${certPath}" -days 3650 -subj "/CN=localhost" -addext "subjectAltName=${sanList}"`,
            { stdio: 'pipe' }
        );
    }

    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    // Create HTTPS server sharing the Express app
    httpsServer = https.createServer({ key, cert }, app);

    // Attach Socket.IO to HTTPS server
    io.attach(httpsServer);

    httpsServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️  HTTPS port ${HTTPS_PORT} in use — skipping HTTPS server`);
        } else {
            console.error('HTTPS server error:', err.message);
        }
    });

    httpsServer.listen(HTTPS_PORT, () => {
        const wifiIPs = localIPs.filter(ip => ip !== '127.0.0.1');
        console.log(`   🔒 HTTPS → https://localhost:${HTTPS_PORT}`);
        if (wifiIPs.length > 0) {
            console.log(`   📱 Driver Phone GPS URL:`);
            wifiIPs.forEach(ip => {
                console.log(`      https://${ip}:${HTTPS_PORT}/driver`);
            });
            console.log(`   ⚠️  On phone: tap "Advanced" → "Proceed" to bypass the cert warning`);
        }
        console.log('   ========================================\n');
    });

} catch (err) {
    console.warn('⚠️  Could not start HTTPS server:', err.message);
}

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Run this to fix it: Get-Process -Name "node" | Stop-Process -Force`);
        console.error(`   Then restart the server.\n`);
        process.exit(1);
    } else {
        throw err;
    }
});

server.listen(PORT, () => {
    console.log('\n🚀 ========================================');
    console.log(`   PSG iTech Bus Tracker Backend`);
    console.log('   ========================================');
    console.log(`   🌐 HTTP  → http://localhost:${PORT}  (PC browser)`);
    console.log(`   📡 WebSocket enabled on both HTTP + HTTPS`);
    console.log(`   🗄️  Database connected`);
    console.log(`   🔐 JWT authentication enabled`);

    // Initialize Redis
    cacheService.connect();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    db.close();
    server.close(() => {
        httpsServer?.close();
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
