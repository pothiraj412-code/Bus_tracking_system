/**
 * ETA Calculation Service
 * Computes realistic transit ETA for Coimbatore College Bus routes
 */

function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const dφ = (lat2 - lat1) * Math.PI / 180;
    const dλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate realistic transit ETA
 * @param {number} busLat 
 * @param {number} busLng 
 * @param {number} stopLat 
 * @param {number} stopLng 
 * @param {number} rawSpeedMs - current GPS speed in m/s
 * @param {number} intermediateStopsCount - stops remaining before target
 * @param {number} delayMinutes - driver reported delay
 * @param {boolean} isTripActive - whether trip is actually in progress
 */
function calculateStopETA(busLat, busLng, stopLat, stopLng, rawSpeedMs = 0, intermediateStopsCount = 0, delayMinutes = 0, isTripActive = true) {
    const straightDistM = Math.round(haversineMeters(busLat, busLng, stopLat, stopLng));

    // If within 80 meters, considered at the stop
    if (straightDistM <= 80) {
        return {
            distanceMeters: straightDistM,
            roadDistanceMeters: straightDistM,
            etaMinutes: 0,
            statusText: 'At Stop'
        };
    }

    // If trip has not been started yet by the driver
    if (!isTripActive) {
        return {
            distanceMeters: straightDistM,
            roadDistanceMeters: Math.round(straightDistM * 1.22),
            etaMinutes: null,
            statusText: 'Not Started'
        };
    }

    // Road network factor for Coimbatore: road distance is ~1.22x straight line
    const roadDistM = straightDistM * 1.22;

    // Realistic Coimbatore urban transit cruising speed: 28 km/h
    // If bus is actively driving at road speed (> 15 km/h), blend it
    let effectiveSpeedKmh = 28;
    const currentSpeedKmh = (rawSpeedMs || 0) * 3.6;
    if (currentSpeedKmh > 15) {
        effectiveSpeedKmh = Math.min(Math.max(currentSpeedKmh * 0.4 + 28 * 0.6, 20), 45);
    }

    const effectiveSpeedMs = (effectiveSpeedKmh * 1000) / 3600;

    // Travel time in minutes
    let minutes = (roadDistM / effectiveSpeedMs) / 60;

    // Add 45 seconds (0.75 min) per intermediate stop
    minutes += (intermediateStopsCount || 0) * 0.75;

    // Add driver reported delay if any
    minutes += (delayMinutes || 0);

    const etaMinutes = Math.max(1, Math.round(minutes));

    return {
        distanceMeters: straightDistM,
        roadDistanceMeters: Math.round(roadDistM),
        etaMinutes,
        statusText: `${etaMinutes} min`
    };
}

module.exports = {
    haversineMeters,
    calculateStopETA
};
