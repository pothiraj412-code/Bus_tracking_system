package com.psgitech.transport.model;

/**
 * INHERITANCE (Pillar 2) & POLYMORPHISM (Pillar 3):
 * Concrete alert for traffic jams or road delays.
 */
public class DelayAlert extends TransitAlert {
    private int delayMinutes;

    public DelayAlert(String alertId, String busNumber, String routeName, String message, int delayMinutes) {
        super(alertId, busNumber, routeName, message);
        this.delayMinutes = Math.max(1, delayMinutes);
    }

    public int getDelayMinutes() {
        return delayMinutes;
    }

    @Override
    public String getSeverityLevel() {
        return "MEDIUM (DELAY)";
    }

    /**
     * POLYMORPHIC OVERRIDE:
     * Specific delay handling: adjusts student ETAs along the route.
     */
    @Override
    public String dispatch() {
        return String.format("🕐 DELAY BROADCAST: %s is delayed by +%d mins due to '%s'. " +
                        "All downstream stop ETAs extended by %d mins.",
                getBusNumber(), delayMinutes, getMessage(), delayMinutes);
    }
}
