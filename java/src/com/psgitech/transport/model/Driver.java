package com.psgitech.transport.model;

/**
 * INHERITANCE (Pillar 2) & POLYMORPHISM (Pillar 3):
 * Concrete class representing a PSG iTech bus driver.
 * Extends Person and overrides getRoleDescription().
 */
public class Driver extends Person {
    private String licenseNumber;
    private int experienceYears;
    private String assignedBusNumber;
    private boolean onDuty;

    public Driver(String id, String fullName, String email, String phone,
                  String licenseNumber, int experienceYears, String assignedBusNumber) {
        super(id, fullName, email, phone, "driver");
        this.licenseNumber = licenseNumber;
        this.experienceYears = experienceYears;
        this.assignedBusNumber = assignedBusNumber;
        this.onDuty = false;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public int getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(int experienceYears) {
        this.experienceYears = Math.max(0, experienceYears);
    }

    public String getAssignedBusNumber() {
        return assignedBusNumber;
    }

    public void setAssignedBusNumber(String assignedBusNumber) {
        this.assignedBusNumber = assignedBusNumber;
    }

    public boolean isOnDuty() {
        return onDuty;
    }

    public void setOnDuty(boolean onDuty) {
        this.onDuty = onDuty;
    }

    /**
     * POLYMORPHISM (Runtime Method Overriding):
     */
    @Override
    public String getRoleDescription() {
        return String.format("PSG iTech Campus Driver | License: %s | Experience: %d yrs | Bus Assigned: %s | Status: %s",
                licenseNumber, experienceYears, assignedBusNumber, onDuty ? "ON DUTY" : "OFF DUTY");
    }
}
