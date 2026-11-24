package com.psgitech.transport.model;

import com.psgitech.transport.interfaces.IAlertable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * ABSTRACTION (Pillar 4) & INHERITANCE (Pillar 2):
 * Abstract base class for all campus transit incidents.
 * Implements IAlertable contract and serves as the polymorphic base for all incident types.
 */
public abstract class TransitAlert implements IAlertable {
    private String alertId;
    private String busNumber;
    private String routeName;
    private String message;
    private LocalDateTime timestamp;

    public TransitAlert(String alertId, String busNumber, String routeName, String message) {
        this.alertId = alertId;
        this.busNumber = busNumber;
        this.routeName = routeName;
        this.message = (message != null && !message.isBlank()) ? message : "General Alert";
        this.timestamp = LocalDateTime.now();
    }

    public String getAlertId() {
        return alertId;
    }

    public String getBusNumber() {
        return busNumber;
    }

    public String getRouteName() {
        return routeName;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public String getFormattedTimestamp() {
        return timestamp.format(DateTimeFormatter.ofPattern("HH:mm:ss"));
    }

    @Override
    public String getAlertSummary() {
        return String.format("[%s] %s on %s: %s (%s)",
                getSeverityLevel(), busNumber, routeName, message, getFormattedTimestamp());
    }

    /**
     * POLYMORPHISM (Runtime Method Overriding):
     * Each specific alert must implement its own unique dispatch logic.
     */
    @Override
    public abstract String dispatch();
}
