package com.psgitech.transport.model;

/**
 * INHERITANCE (Pillar 2) & POLYMORPHISM (Pillar 3):
 * Concrete alert for critical safety, accident, or medical emergencies.
 */
public class EmergencySosAlert extends TransitAlert {
    private double emergencyLatitude;
    private double emergencyLongitude;

    public EmergencySosAlert(String alertId, String busNumber, String routeName,
                             String message, double latitude, double longitude) {
        super(alertId, busNumber, routeName, message);
        this.emergencyLatitude = latitude;
        this.emergencyLongitude = longitude;
    }

    public double getEmergencyLatitude() {
        return emergencyLatitude;
    }

    public double getEmergencyLongitude() {
        return emergencyLongitude;
    }

    @Override
    public String getSeverityLevel() {
        return "CRITICAL (EMERGENCY SOS)";
    }

    /**
     * POLYMORPHIC OVERRIDE:
     * Critical SOS handling: alerts campus security, transport manager, and police/ambulance.
     */
    @Override
    public String dispatch() {
        return String.format("🚨 CRITICAL EMERGENCY SOS: %s triggered distress beacon! GPS: (%.6f, %.6f). " +
                        "Description: '%s'. Campus security dispatched. Emergency sirens initiated.",
                getBusNumber(), emergencyLatitude, emergencyLongitude, getMessage());
    }
}
