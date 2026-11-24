package com.psgitech.transport.interfaces;

/**
 * ABSTRACTION (Pillar 4):
 * Contract for any entity capable of transmitting or receiving GPS coordinates
 * across the PSG iTech campus transport network.
 */
public interface ITrackable {
    void updateLocation(double latitude, double longitude, double speed);
    double getLatitude();
    double getLongitude();
    double getSpeed();
    String getLocationString();
}
