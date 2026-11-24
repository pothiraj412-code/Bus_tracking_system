package com.psgitech.transport.model;

/**
 * INHERITANCE (Pillar 2) & POLYMORPHISM (Pillar 3):
 * Concrete class representing an enrolled PSG iTech student taking college transit.
 * Extends Person and overrides getRoleDescription().
 */
public class Student extends Person {
    private String rollNumber;
    private String department;
    private int academicYear;
    private String boardingStopName;
    private String assignedBusRoute;
    private boolean isAttendingToday;

    public Student(String id, String fullName, String email, String phone,
                   String rollNumber, String department, int academicYear,
                   String boardingStopName, String assignedBusRoute) {
        super(id, fullName, email, phone, "student");
        this.rollNumber = rollNumber;
        this.department = department;
        this.academicYear = academicYear;
        this.boardingStopName = boardingStopName;
        this.assignedBusRoute = assignedBusRoute;
        this.isAttendingToday = true;
    }

    // Encapsulation: getters and setters
    public String getRollNumber() {
        return rollNumber;
    }

    public void setRollNumber(String rollNumber) {
        this.rollNumber = rollNumber;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public int getAcademicYear() {
        return academicYear;
    }

    public void setAcademicYear(int academicYear) {
        if (academicYear < 1 || academicYear > 4) {
            throw new IllegalArgumentException("Academic year must be between 1 and 4 for B.E./B.Tech");
        }
        this.academicYear = academicYear;
    }

    public String getBoardingStopName() {
        return boardingStopName;
    }

    public void setBoardingStopName(String boardingStopName) {
        this.boardingStopName = boardingStopName;
    }

    public String getAssignedBusRoute() {
        return assignedBusRoute;
    }

    public void setAssignedBusRoute(String assignedBusRoute) {
        this.assignedBusRoute = assignedBusRoute;
    }

    public boolean isAttendingToday() {
        return isAttendingToday;
    }

    public void setAttendingToday(boolean attendingToday) {
        isAttendingToday = attendingToday;
    }

    /**
     * POLYMORPHISM (Runtime Method Overriding):
     */
    @Override
    public String getRoleDescription() {
        return String.format("PSG iTech Student | Roll: %s | Dept: %s (Year %d) | Stop: %s | Route: %s",
                rollNumber, department, academicYear, boardingStopName, assignedBusRoute);
    }
}
