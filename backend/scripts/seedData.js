/**
 * Seed Data Script for PSG iTech (Coimbatore)
 * Populates database with 15 PSG iTech bus routes (i1 to i15) across Coimbatore
 * College Destination: PSG Institute of Technology and Applied Research (PSG iTech), Neelambur, Coimbatore
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'bus_tracker.db');
const db = new Database(dbPath);

console.log('🌱 Seeding database with PSG iTech (Coimbatore) 15 Bus Routes (i1 to i15)...');

db.pragma('foreign_keys = OFF'); // Disable FK checks during seed

// --- Clear old route/stop/bus data to avoid duplication ---
db.prepare('DELETE FROM student_stops').run();
db.prepare('DELETE FROM trips').run();
db.prepare('DELETE FROM buses').run();
db.prepare('DELETE FROM stops').run();
db.prepare('DELETE FROM routes').run();
db.prepare('DELETE FROM users').run();

db.pragma('foreign_keys = ON');

const hashedPassword = bcrypt.hashSync('password123', 10);

// --- Users ---
const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, role, full_name, email, phone)
    VALUES (?, ?, ?, ?, ?, ?)
`);

insertUser.run('admin', hashedPassword, 'admin', 'PSG iTech Transport Admin', 'transport@psgitech.ac.in', '04222233555');

const driverNames = [
    'R. Murugesan (i1)',
    'K. Senthil Kumar (i2)',
    'P. Natarajan (i3)',
    'M. Palanisamy (i4)',
    'S. Arumugam (i5)',
    'V. Thangavel (i6)',
    'G. Ramasamy (i7)',
    'C. Muthusamy (i8)',
    'A. Selvam (i9)',
    'D. Rajendran (i10)',
    'T. Velusamy (i11)',
    'N. Sivakumar (i12)',
    'J. Anandhan (i13)',
    'E. Boopathi (i14)',
    'B. Karthikeyan (i15)'
];

// 15 Drivers (one per route i1 to i15)
for (let i = 1; i <= 15; i++) {
    const fullName = driverNames[i - 1] || `Driver i${i}`;
    insertUser.run(
        `driver${i}`,
        hashedPassword,
        'driver',
        fullName,
        `driver${i}@psgitech.ac.in`,
        `98420${i.toString().padStart(5, '0')}`
    );
}

// 750 Students (15 buses x 50 capacity = 750 students)
for (let i = 1; i <= 750; i++) {
    insertUser.run(
        `student${i}`,
        hashedPassword,
        'student',
        `Student ${i}`,
        `student${i}@student.psgitech.ac.in`,
        `9443${i.toString().padStart(6, '0')}`
    );
}

console.log('✅ Created admin, 15 drivers, and 750 students (50 per bus)');

// PSG iTech Campus Pinpoint: Neelambur, Coimbatore
const PSG_ITECH_CAMPUS = { name: "PSG iTech Campus, Neelambur", lat: 11.0650, lng: 77.1000 };

// --- All 15 PSG iTech Routes (i1 to i15) ---
const routesData = [
    {
        routeId: "i1",
        busNumber: "TN-38-BT-i01",
        name: "Route i1: Kuniamuthur to PSG iTech",
        stops: [
            { stopNo: 1, name: "Kovaipudhur Pirivu",        lat: 10.9520, lng: 76.9450 },
            { stopNo: 2, name: "Kuniamuthur Market",         lat: 10.9630, lng: 76.9530 },
            { stopNo: 3, name: "Athupalam Junction",        lat: 10.9780, lng: 76.9620 },
            { stopNo: 4, name: "Ukkadam Bus Stand",         lat: 10.9880, lng: 76.9610 },
            { stopNo: 5, name: "Chinthamani Bus Stop",      lat: 10.9990, lng: 76.9740 },
            { stopNo: 6, name: "Ramanathapuram Signal",     lat: 10.9985, lng: 76.9890 },
            { stopNo: 7, name: "Singanallur Junction",      lat: 11.0020, lng: 77.0250 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i2",
        busNumber: "TN-38-BT-i02",
        name: "Route i2: Vadavalli to PSG iTech",
        stops: [
            { stopNo: 1, name: "Bharathiar University Gate",lat: 11.0380, lng: 76.8770 },
            { stopNo: 2, name: "Vadavalli Roundana",        lat: 11.0260, lng: 76.9030 },
            { stopNo: 3, name: "P.N. Pudur",                lat: 11.0210, lng: 76.9240 },
            { stopNo: 4, name: "Lawley Road Junction",       lat: 11.0130, lng: 76.9380 },
            { stopNo: 5, name: "RS Puram Post Office",      lat: 11.0080, lng: 76.9490 },
            { stopNo: 6, name: "Gandhipuram Central",       lat: 11.0180, lng: 76.9670 },
            { stopNo: 7, name: "Lakshmi Mills",             lat: 11.0140, lng: 76.9860 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i3",
        busNumber: "TN-38-BT-i03",
        name: "Route i3: Peelamedu Express to PSG iTech",
        stops: [
            { stopNo: 1, name: "Peelamedu Bus Stop",        lat: 11.0270, lng: 77.0030 },
            { stopNo: 2, name: "Fun Republic Mall",         lat: 11.0290, lng: 77.0110 },
            { stopNo: 3, name: "Hope College",              lat: 11.0310, lng: 77.0210 },
            { stopNo: 4, name: "SITRA Airport Junction",    lat: 11.0420, lng: 77.0370 },
            { stopNo: 5, name: "KMCH Hospital",             lat: 11.0490, lng: 77.0490 },
            { stopNo: 6, name: "Goldwins",                  lat: 11.0540, lng: 77.0620 },
            { stopNo: 7, name: "Chinniampalayam",           lat: 11.0590, lng: 77.0780 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i4",
        busNumber: "TN-38-BT-i04",
        name: "Route i4: Karamadai to PSG iTech",
        stops: [
            { stopNo: 1, name: "Karamadai Bus Stand",       lat: 11.2420, lng: 76.9580 },
            { stopNo: 2, name: "Periyanaickenpalayam",      lat: 11.1610, lng: 76.9450 },
            { stopNo: 3, name: "Narasimmanaickenpalayam",   lat: 11.1270, lng: 76.9480 },
            { stopNo: 4, name: "NGGO Colony",               lat: 11.0940, lng: 76.9490 },
            { stopNo: 5, name: "Thudiyalur",                lat: 11.0770, lng: 76.9480 },
            { stopNo: 6, name: "Saravanampatti Checkpost",  lat: 11.0820, lng: 77.0010 },
            { stopNo: 7, name: "Kalapatti Junction",        lat: 11.0720, lng: 77.0420 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i5",
        busNumber: "TN-38-BT-i05",
        name: "Route i5: Tiruppur (via Avinashi) to PSG iTech",
        stops: [
            { stopNo: 1, name: "Tiruppur Kumar Nagar",      lat: 11.1290, lng: 77.3480 },
            { stopNo: 2, name: "Gandhinagar Tiruppur",      lat: 11.1350, lng: 77.3390 },
            { stopNo: 3, name: "Anupparpalayam",            lat: 11.1550, lng: 77.3240 },
            { stopNo: 4, name: "Thirumuruganpoondi",        lat: 11.1690, lng: 77.2980 },
            { stopNo: 5, name: "Avinashi New Bus Stand",    lat: 11.1920, lng: 77.2690 },
            { stopNo: 6, name: "Thekkalur",                 lat: 11.1490, lng: 77.2020 },
            { stopNo: 7, name: "Kaniyur Toll Plaza",        lat: 11.0960, lng: 77.1420 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i6",
        busNumber: "TN-38-BT-i06",
        name: "Route i6: Tiruppur OBS & Palladam to PSG iTech",
        stops: [
            { stopNo: 1, name: "Tiruppur Old Bus Stand",    lat: 11.1070, lng: 77.3440 },
            { stopNo: 2, name: "Veerapandi Pirivu",         lat: 11.0720, lng: 77.3260 },
            { stopNo: 3, name: "Palladam Bus Stand",        lat: 10.9990, lng: 77.2880 },
            { stopNo: 4, name: "Karanampettai",             lat: 11.0280, lng: 77.1950 },
            { stopNo: 5, name: "Sulur Aero Junction",       lat: 11.0260, lng: 77.1280 },
            { stopNo: 6, name: "Ravathur Pirivu",           lat: 11.0420, lng: 77.1120 },
            { stopNo: 7, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i7",
        busNumber: "TN-38-BT-i07",
        name: "Route i7: Pollachi to PSG iTech",
        stops: [
            { stopNo: 1, name: "Pollachi Bus Stand",        lat: 10.6610, lng: 77.0060 },
            { stopNo: 2, name: "Kovilpalayam (Pollachi Rd)",lat: 10.7450, lng: 77.0120 },
            { stopNo: 3, name: "Kinathukadavu",             lat: 10.8210, lng: 77.0210 },
            { stopNo: 4, name: "Othakkalmandapam",          lat: 10.9020, lng: 76.9980 },
            { stopNo: 5, name: "Malumichampatti",           lat: 10.9250, lng: 77.0130 },
            { stopNo: 6, name: "Eachanari Temple",          lat: 10.9410, lng: 76.9790 },
            { stopNo: 7, name: "Ondipudur Flyover",         lat: 11.0020, lng: 77.0510 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i8",
        busNumber: "TN-38-BT-i08",
        name: "Route i8: Ganapathy to PSG iTech",
        stops: [
            { stopNo: 1, name: "Ganapathy Bus Stop",        lat: 11.0340, lng: 76.9780 },
            { stopNo: 2, name: "Athipalayam Pirivu",        lat: 11.0510, lng: 76.9850 },
            { stopNo: 3, name: "Bharathipuram",             lat: 11.0450, lng: 77.0020 },
            { stopNo: 4, name: "Cheran Maanagar",           lat: 11.0490, lng: 77.0210 },
            { stopNo: 5, name: "Vilankurichi Road",         lat: 11.0610, lng: 77.0290 },
            { stopNo: 6, name: "Thanneerpandal",            lat: 11.0380, lng: 77.0160 },
            { stopNo: 7, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i9",
        busNumber: "TN-38-BT-i09",
        name: "Route i9: Annur to PSG iTech",
        stops: [
            { stopNo: 1, name: "Annur Bus Stand",           lat: 11.2330, lng: 77.1330 },
            { stopNo: 2, name: "Kariyampalayam",            lat: 11.1980, lng: 77.1150 },
            { stopNo: 3, name: "Ganesapuram",               lat: 11.1680, lng: 77.0850 },
            { stopNo: 4, name: "Kovilpalayam (Sathy Rd)",   lat: 11.1390, lng: 77.0490 },
            { stopNo: 5, name: "Kurumbapalayam",            lat: 11.1120, lng: 77.0280 },
            { stopNo: 6, name: "Saravanampatti",            lat: 11.0820, lng: 77.0010 },
            { stopNo: 7, name: "Kalapatti",                 lat: 11.0720, lng: 77.0420 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i10",
        busNumber: "TN-38-BT-i10",
        name: "Route i10: Perur to PSG iTech",
        stops: [
            { stopNo: 1, name: "Perur Temple",              lat: 10.9720, lng: 76.9180 },
            { stopNo: 2, name: "Telungupalayam",            lat: 10.9850, lng: 76.9320 },
            { stopNo: 3, name: "Selvapuram",                lat: 10.9910, lng: 76.9450 },
            { stopNo: 4, name: "Town Hall",                 lat: 10.9960, lng: 76.9620 },
            { stopNo: 5, name: "Coimbatore Railway Station",lat: 10.9980, lng: 76.9680 },
            { stopNo: 6, name: "Ramanathapuram",            lat: 10.9985, lng: 76.9890 },
            { stopNo: 7, name: "Singanallur",               lat: 11.0020, lng: 77.0250 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i11",
        busNumber: "TN-38-BT-i11",
        name: "Route i11: Kanuvai & Saibaba Colony to PSG iTech",
        stops: [
            { stopNo: 1, name: "Kanuvai Bus Stand",         lat: 11.0690, lng: 76.9020 },
            { stopNo: 2, name: "TVS Nagar",                 lat: 11.0490, lng: 76.9210 },
            { stopNo: 3, name: "Edayarpalayam",             lat: 11.0380, lng: 76.9290 },
            { stopNo: 4, name: "Saibaba Colony",            lat: 11.0290, lng: 76.9450 },
            { stopNo: 5, name: "100 Feet Road Power House", lat: 11.0210, lng: 76.9580 },
            { stopNo: 6, name: "Gandhipuram",               lat: 11.0180, lng: 76.9670 },
            { stopNo: 7, name: "Nava India",                lat: 11.0190, lng: 76.9940 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i12",
        busNumber: "TN-38-BT-i12",
        name: "Route i12: Gandhipuram & Cross Cut to PSG iTech",
        stops: [
            { stopNo: 1, name: "Gandhipuram Bus Stand",     lat: 11.0180, lng: 76.9670 },
            { stopNo: 2, name: "Cross Cut Road Signal",     lat: 11.0220, lng: 76.9640 },
            { stopNo: 3, name: "Women's Polytechnic",       lat: 11.0170, lng: 76.9800 },
            { stopNo: 4, name: "Lakshmi Mills Junction",    lat: 11.0140, lng: 76.9860 },
            { stopNo: 5, name: "Nava India Signal",         lat: 11.0190, lng: 76.9940 },
            { stopNo: 6, name: "Peelamedu",                 lat: 11.0270, lng: 77.0030 },
            { stopNo: 7, name: "Hope College",              lat: 11.0310, lng: 77.0210 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i13",
        busNumber: "TN-38-BT-i13",
        name: "Route i13: Thudiyalur & Kavundampalayam to PSG iTech",
        stops: [
            { stopNo: 1, name: "Thudiyalur Bus Stand",      lat: 11.0770, lng: 76.9480 },
            { stopNo: 2, name: "GN Mills",                  lat: 11.0610, lng: 76.9490 },
            { stopNo: 3, name: "Kavundampalayam",           lat: 11.0450, lng: 76.9470 },
            { stopNo: 4, name: "Saibaba Koil",              lat: 11.0340, lng: 76.9460 },
            { stopNo: 5, name: "Sivananda Colony",          lat: 11.0280, lng: 76.9580 },
            { stopNo: 6, name: "Ganapathy",                 lat: 11.0340, lng: 76.9780 },
            { stopNo: 7, name: "SITRA Airport Road",        lat: 11.0420, lng: 77.0370 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i14",
        busNumber: "TN-38-BT-i14",
        name: "Route i14: Sundarapuram & Podanur to PSG iTech",
        stops: [
            { stopNo: 1, name: "Sundarapuram Junction",     lat: 10.9490, lng: 76.9720 },
            { stopNo: 2, name: "Podanur Railway Station",   lat: 10.9630, lng: 76.9860 },
            { stopNo: 3, name: "Nanjundapuram",             lat: 10.9780, lng: 76.9980 },
            { stopNo: 4, name: "Ramanathapuram 80 Feet",    lat: 10.9950, lng: 76.9910 },
            { stopNo: 5, name: "Singanallur",               lat: 11.0020, lng: 77.0250 },
            { stopNo: 6, name: "Ondipudur",                 lat: 11.0020, lng: 77.0510 },
            { stopNo: 7, name: "Irugur Pirivu",             lat: 11.0120, lng: 77.0680 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    },
    {
        routeId: "i15",
        busNumber: "TN-38-BT-i15",
        name: "Route i15: Ondipudur & Sulur to PSG iTech",
        stops: [
            { stopNo: 1, name: "Ondipudur Bus Stand",       lat: 11.0020, lng: 77.0510 },
            { stopNo: 2, name: "Irugur Railway Gate",       lat: 11.0210, lng: 77.0720 },
            { stopNo: 3, name: "Chinthamanipudur",          lat: 11.0280, lng: 77.0890 },
            { stopNo: 4, name: "Sulur Police Station",      lat: 11.0260, lng: 77.1280 },
            { stopNo: 5, name: "Kannampalayam",             lat: 11.0380, lng: 77.1080 },
            { stopNo: 6, name: "Ravathur",                  lat: 11.0480, lng: 77.0980 },
            { stopNo: 7, name: "Neelambur Bypass",          lat: 11.0610, lng: 77.0940 },
            { stopNo: 8, name: PSG_ITECH_CAMPUS.name,       lat: PSG_ITECH_CAMPUS.lat, lng: PSG_ITECH_CAMPUS.lng }
        ]
    }
];

// --- Haversine distance ---
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// --- Insert Routes & Stops ---
const insertRoute = db.prepare(`INSERT INTO routes (id, name, description, is_active) VALUES (?, ?, ?, ?)`);
const insertStop  = db.prepare(`INSERT INTO stops (route_id, name, latitude, longitude, sequence_order, distance_from_previous) VALUES (?, ?, ?, ?, ?, ?)`);

routesData.forEach(route => {
    insertRoute.run(route.routeId, route.name, `${route.name} (PSG iTech Fleet)`, 1);
    let prev = null;
    route.stops.forEach(stop => {
        const dist = prev ? haversineDistance(prev.lat, prev.lng, stop.lat, stop.lng) : 0;
        insertStop.run(route.routeId, stop.name, stop.lat, stop.lng, stop.stopNo, dist);
        prev = stop;
    });
});

console.log('✅ Created 15 PSG iTech routes and stops');

// --- Buses (one per route, look up driver ID dynamically) ---
const insertBus = db.prepare(`INSERT INTO buses (bus_number, route_id, driver_id, status, current_lat, current_lng) VALUES (?, ?, ?, ?, ?, ?)`);
const getDriverId = db.prepare(`SELECT id FROM users WHERE username = ?`);
const insertMockTrip = db.prepare(`INSERT INTO trips (bus_id, driver_id, route_id, started_at, status) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'active')`);

routesData.forEach((route, i) => {
    const driver = getDriverId.get(`driver${i + 1}`);
    if (!driver) { console.warn(`⚠️  driver${i + 1} not found, skipping bus for ${route.routeId}`); return; }
    
    // Start bus at its first stop
    const startStop = route.stops[0];
    
    const result = insertBus.run(route.busNumber, route.routeId, driver.id, 'active', startStop.lat, startStop.lng);
    insertMockTrip.run(result.lastInsertRowid, driver.id, route.routeId);
});

console.log('✅ Created 15 buses (i1 to i15) and automatically started mock trips for map presentation');

// --- Assign students to stops ---
const insertStudentStop = db.prepare(`INSERT OR IGNORE INTO student_stops (student_id, stop_id) VALUES (?, ?)`);

// Get stop IDs per route
const getStops = db.prepare(`SELECT id, sequence_order FROM stops WHERE route_id = ? ORDER BY sequence_order`);
// Get user IDs for students
const getStudentId = db.prepare(`SELECT id FROM users WHERE username = ?`);

let studentIdx = 1;
routesData.forEach(route => {
    const stops = getStops.all(route.routeId);
    if (stops.length < 2) return;

    // Assign 2 students per route to the 2nd stop from start
    for (let s = 0; s < 2 && studentIdx <= 30; s++, studentIdx++) {
        const student = getStudentId.get(`student${studentIdx}`);
        const stop = stops[Math.min(1, stops.length - 2)]; // 2nd stop
        if (student && stop) {
            insertStudentStop.run(student.id, stop.id);
            console.log(`📍 Assigned student${studentIdx} to Bus ${route.routeId} (Stop ${stop.sequence_order})`);
        }
    }
});

// Assign remaining students to distributed routes & stops (up to 750)
for (let i = studentIdx; i <= 750; i++) {
    const student = getStudentId.get(`student${i}`);
    const route = routesData[i % routesData.length];
    const stops = getStops.all(route.routeId);
    
    const stopCount = stops.length;
    const stopIndex = stopCount > 1 ? Math.floor(Math.random() * (stopCount - 1)) + 1 : 0;
    const stop = stops[stopIndex];

    if (student && stop) {
        insertStudentStop.run(student.id, stop.id);
    }
}

console.log('✅ Assigned students across PSG iTech stops');

db.close();
console.log('🎉 PSG iTech Coimbatore Database seeding complete!');
