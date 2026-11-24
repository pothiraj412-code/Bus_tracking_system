package com.psgitech.transport.model;

/**
 * ABSTRACTION (Pillar 4) & ENCAPSULATION (Pillar 1):
 * Abstract base class for campus fleet vehicles.
 */
public abstract class Vehicle {
    private String vehicleId;
    private String registrationNumber;
    private int seatingCapacity;
    private VehicleStatus status;

    public enum VehicleStatus {
        IDLE,
        ON_ROUTE,
        DELAYED,
        BREAKDOWN,
        MAINTENANCE
    }

    public Vehicle(String vehicleId, String registrationNumber, int seatingCapacity) {
        this.vehicleId = vehicleId;
        this.registrationNumber = registrationNumber;
        setSeatingCapacity(seatingCapacity);
        this.status = VehicleStatus.IDLE;
    }

    public String getVehicleId() {
        return vehicleId;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public int getSeatingCapacity() {
        return seatingCapacity;
    }

    public void setSeatingCapacity(int seatingCapacity) {
        if (seatingCapacity <= 0) {
            throw new IllegalArgumentException("Seating capacity must be positive");
        }
        this.seatingCapacity = seatingCapacity;
    }

    public VehicleStatus getStatus() {
        return status;
    }

    public void setStatus(VehicleStatus status) {
        this.status = status;
    }

    /**
     * ABSTRACTION: Subclasses define their specific transit category.
     */
    public abstract String getVehicleCategory();
}
