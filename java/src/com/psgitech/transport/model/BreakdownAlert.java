package com.psgitech.transport.model;

/**
 * INHERITANCE (Pillar 2) & POLYMORPHISM (Pillar 3):
 * Concrete alert for bus mechanical or technical failures.
 */
public class BreakdownAlert extends TransitAlert {
    private String breakdownLocation;
    private boolean requiresReplacementBus;

    public BreakdownAlert(String alertId, String busNumber, String routeName,
                          String message, String breakdownLocation, boolean requiresReplacementBus) {
        super(alertId, busNumber, routeName, message);
        this.breakdownLocation = breakdownLocation;
        this.requiresReplacementBus = requiresReplacementBus;
    }

    public String getBreakdownLocation() {
        return breakdownLocation;
    }

    public boolean isRequiresReplacementBus() {
        return requiresReplacementBus;
    }

    @Override
    public String getSeverityLevel() {
        return "HIGH (BREAKDOWN)";
    }

    /**
     * POLYMORPHIC OVERRIDE:
     * Specific breakdown handling: marks bus as disabled and alerts backup fleet.
     */
    @Override
    public String dispatch() {
        return String.format("⚠️ BREAKDOWN DISPATCHED: %s stalled near '%s'. Reason: %s. " +
                        "Backup bus dispatch request: %s. All %s students notified to remain calm.",
                getBusNumber(), breakdownLocation, getMessage(),
                requiresReplacementBus ? "APPROVED" : "STANDBY", getRouteName());
    }
}
