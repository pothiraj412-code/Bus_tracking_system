package com.psgitech.transport.model;

/**
 * ABSTRACTION (Pillar 4) & ENCAPSULATION (Pillar 1):
 * Abstract base class representing any campus transport user (Student, Driver, Fleet Admin).
 * Demonstrates:
 * 1. Encapsulation: private fields with getters/setters and boundary validation.
 * 2. Abstraction: abstract method getRoleDescription() defining the contract for derived roles.
 */
public abstract class Person {
    private String id;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String role; // student, driver, admin

    public Person(String id, String fullName, String email, String phoneNumber, String role) {
        setId(id);
        setFullName(fullName);
        setEmail(email);
        setPhoneNumber(phoneNumber);
        this.role = (role == null || role.isBlank()) ? "student" : role.toLowerCase();
    }

    // Encapsulated getters & setters with validation
    public String getId() {
        return id;
    }

    public void setId(String id) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Person ID cannot be null or empty");
        }
        this.id = id.trim();
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new IllegalArgumentException("Full name cannot be empty");
        }
        this.fullName = fullName.trim();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = (email != null) ? email.trim() : "";
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = (phoneNumber != null) ? phoneNumber.trim() : "";
    }

    public String getRole() {
        return role;
    }

    /**
     * ABSTRACTION: Subclasses must provide their own role description.
     */
    public abstract String getRoleDescription();

    @Override
    public String toString() {
        return String.format("[%s] %s (%s)", role.toUpperCase(), fullName, id);
    }
}
