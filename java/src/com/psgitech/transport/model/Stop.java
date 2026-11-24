package com.psgitech.transport.model;

/**
 * ENCAPSULATION (Pillar 1):
 * Represents a geographical stop along a PSG iTech transit route.
 * Coordinates are mapped to real Coimbatore locations.
 */
public class Stop {
    private String id;
    private String routeId;
    private String name;
    private double latitude;
    private double longitude;
    private int sequenceOrder;

    public Stop(String id, String routeId, String name, double latitude, double longitude, int sequenceOrder) {
        this.id = id;
        this.routeId = routeId;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.sequenceOrder = sequenceOrder;
    }

    public String getId() {
        return id;
    }

    public String getRouteId() {
        return routeId;
    }

    public String getName() {
        return name;
    }

    public double getLatitude() {
        return latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public int getSequenceOrder() {
        return sequenceOrder;
    }

    /**
     * Computes straight-line Haversine distance in kilometers to another stop or GPS point.
     */
    public double distanceTo(double targetLat, double targetLng) {
        final double R = 6371.0; // Earth radius in km
        double dLat = Math.toRadians(targetLat - this.latitude);
        double dLng = Math.toRadians(targetLng - this.longitude);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(this.latitude)) * Math.cos(Math.toRadians(targetLat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    @Override
    public String toString() {
        return String.format("#%d %s (%.4f, %.4f)", sequenceOrder, name, latitude, longitude);
    }
}
