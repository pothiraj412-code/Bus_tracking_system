package com.psgitech.transport.interfaces;

/**
 * ABSTRACTION (Pillar 4):
 * Contract for incident alerts that can be dispatched to campus fleet & students.
 */
public interface IAlertable {
    String dispatch();
    String getAlertSummary();
    String getSeverityLevel();
}
