package com.psgitech.transport.model;

import com.psgitech.transport.interfaces.ITrackable;

/**
 * INHERITANCE (Pillar 2), ABSTRACTION (Pillar 4), & POLYMORPHISM (Pillar 3):
 * Concrete class representing a PSG iTech college bus.
 * Extends Vehicle and implements ITrackable interface.
 * Also demonstrates Compile-Time Polymorphism via Method Overloading for ETA calculations.
 */
public class CollegeBus extends Vehicle implements ITrackable {
    private String busNumber;          // e.g. "Bus 01"
    private String routeId;            // e.g. "i1"
    private String routeName;          // e.g. "Kuniamuthur to PSG iTech"
    private String driverName;
    private double currentLatitude;
    private double currentLongitude;
    private double speedKmh;
    private int delayMinutes;
    private int totalStudentsAssigned;
    private int presentStudentsCount;
    private String currentStopName;

    // Constants for Coimbatore urban transit physics
    public static final double DEFAULT_COIMBATORE_SPEED_KMH = 28.0;
    public static final double ROAD_WINDING_FACTOR = 1.22;

    public CollegeBus(String vehicleId, String registrationNumber, int capacity,
                      String busNumber, String routeId, String routeName, String driverName) {
        super(vehicleId, registrationNumber, capacity);
        this.busNumber = busNumber;
        this.routeId = routeId;
        this.routeName = routeName;
        this.driverName = driverName;
        this.speedKmh = 0.0;
        this.delayMinutes = 0;
        this.totalStudentsAssigned = 0;
        this.presentStudentsCount = 0;
        this.currentStopName = "Depot";
    }

    // ── Interface Implementation (ITrackable) ─────────────────────────────────
    @Override
    public void updateLocation(double latitude, double longitude, double speed) {
        this.currentLatitude = latitude;
        this.currentLongitude = longitude;
        this.speedKmh = Math.max(0.0, speed);
        if (this.speedKmh > 2.0 && getStatus() == VehicleStatus.IDLE) {
            setStatus(VehicleStatus.ON_ROUTE);
        }
    }

    @Override
    public double getLatitude() {
        return currentLatitude;
    }

    @Override
    public double getLongitude() {
        return currentLongitude;
    }

    @Override
    public double getSpeed() {
        return speedKmh;
    }

    @Override
    public String getLocationString() {
        return String.format("%.6f, %.6f (%.1f km/h)", currentLatitude, currentLongitude, speedKmh);
    }

    // ── Abstract Method Implementation (from Vehicle) ─────────────────────────
    @Override
    public String getVehicleCategory() {
        return "Heavy Passenger Vehicle (Campus Fleet Bus)";
    }

    // ── COMPILE-TIME POLYMORPHISM (Method Overloading) ────────────────────────
    /**
     * Method Overload 1: Calculate ETA using distance and default transit speed.
     */
    public int calculateEta(double distanceKm) {
        return calculateEta(distanceKm, DEFAULT_COIMBATORE_SPEED_KMH, this.delayMinutes);
    }

    /**
     * Method Overload 2: Calculate ETA using distance and custom speed.
     */
    public int calculateEta(double distanceKm, double customSpeedKmh) {
        return calculateEta(distanceKm, customSpeedKmh, this.delayMinutes);
    }

    /**
     * Method Overload 3: Full calculation considering winding factor, speed, and reported delays.
     */
    public int calculateEta(double distanceKm, double customSpeedKmh, int extraDelayMinutes) {
        if (distanceKm <= 0.1) return 0;
        double effectiveSpeed = (customSpeedKmh > 12.0) ? customSpeedKmh : DEFAULT_COIMBATORE_SPEED_KMH;
        double roadDistance = distanceKm * ROAD_WINDING_FACTOR;
        double transitTimeMinutes = (roadDistance / effectiveSpeed) * 60.0;
        return (int) Math.round(transitTimeMinutes + extraDelayMinutes);
    }

    // ── Encapsulation: Getters and Setters ────────────────────────────────────
    public String getBusNumber() {
        return busNumber;
    }
    public String getRouteId() {
        return routeId;
    }
    public String getRouteName() {
        return routeName;
    }
    public String getDriverName() {
        return driverName;
    }
    public void setDriverName(String driverName) {
        this.driverName = driverName;
    }
    public int getDelayMinutes() {
        return delayMinutes;
    }
    public void setDelayMinutes(int delayMinutes) {
        this.delayMinutes = Math.max(0, delayMinutes);
        if (this.delayMinutes > 0 && getStatus() != VehicleStatus.BREAKDOWN) {
            setStatus(VehicleStatus.DELAYED);
        }
    }
    public int getTotalStudentsAssigned() {
        return totalStudentsAssigned;
    }
    public void setTotalStudentsAssigned(int total) {
        this.totalStudentsAssigned = total;
    }
    public int getPresentStudentsCount() {
        return presentStudentsCount;
    }
    public void setPresentStudentsCount(int present) {
        this.presentStudentsCount = present;
    }
    public String getCurrentStopName() {
        return currentStopName;
    }
    public void setCurrentStopName(String currentStopName) {
        this.currentStopName = currentStopName;
    }
    @Override
    public String toString() {
        return String.format("%s (%s) - Driver: %s - Status: %s",
                busNumber, routeName, driverName, getStatus());
    }
}
