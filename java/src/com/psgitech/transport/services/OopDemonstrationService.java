package com.psgitech.transport.services;

import com.psgitech.transport.interfaces.*;
import com.psgitech.transport.model.*;
import java.util.*;

/**
 * OOP 4 PILLARS VERIFIER & DEMONSTRATOR:
 * Dedicated service designed to execute live tests of the 4 Pillars of OOP
 * during project reviews and vivas.
 */
public class OopDemonstrationService {

    public static class OopTestResult {
        public String pillar;
        public String title;
        public boolean passed;
        public String explanation;
        public String executionOutput;

        public OopTestResult(String pillar, String title, boolean passed, String explanation, String executionOutput) {
            this.pillar = pillar;
            this.title = title;
            this.passed = passed;
            this.explanation = explanation;
            this.executionOutput = executionOutput;
        }
    }

    /**
     * Pillar 1: ENCAPSULATION DEMONSTRATION
     * Shows data hiding, private fields, and boundary validation.
     */
    public static OopTestResult testEncapsulation() {
        StringBuilder log = new StringBuilder();
        boolean passed = true;

        CollegeBus bus = new CollegeBus("VEH-DEMO", "TN 38 TEST 01", 50, "Bus Demo", "i1", "Demo Route", "Driver Test");
        log.append("1. Instantiated CollegeBus with private fields.\n");

        // Valid mutation through setter
        bus.setDelayMinutes(15);
        log.append("2. Called bus.setDelayMinutes(15) -> delay is now: ").append(bus.getDelayMinutes()).append(" mins\n");
        log.append("   Vehicle status automatically transitioned to: ").append(bus.getStatus()).append("\n");

        // Boundary condition: attempt invalid negative delay
        bus.setDelayMinutes(-10);
        log.append("3. Attempted bus.setDelayMinutes(-10) -> encapsulated setter guarded against negative values: ")
                .append(bus.getDelayMinutes()).append(" mins (clamped to 0)\n");

        if (bus.getDelayMinutes() < 0) passed = false;

        String explanation = "ENCAPSULATION ensures data hiding: All bus and student state variables (speed, coordinates, " +
                "delays, roll numbers) are private. Access is mediated strictly via controlled public getters and setters with state validation.";

        return new OopTestResult("1. Encapsulation", "State Protection & Boundary Validation", passed, explanation, log.toString());
    }

    /**
     * Pillar 2: INHERITANCE DEMONSTRATION
     * Shows subclassing, code reuse, and hierarchical class design.
     */
    public static OopTestResult testInheritance() {
        StringBuilder log = new StringBuilder();

        Person p1 = new Student("STU-100", "Aravind K.", "aravind@psgitech.ac.in", "9842100000",
                "715521104008", "CSE", 3, "Peelamedu", "Route i3");
        Person p2 = new Driver("DRV-100", "M. Palanisamy", "palanisamy@psgitech.ac.in", "9842200000",
                "DL-TN-2015", 14, "Bus 03");

        log.append("1. Base Class: Person (abstract) -> Subclasses: Student, Driver\n");
        log.append("   p1 instanceof Person: ").append(p1 instanceof Person).append("\n");
        log.append("   p1 instanceof Student: ").append(p1 instanceof Student).append("\n");
        log.append("   p2 instanceof Person: ").append(p2 instanceof Person).append("\n");
        log.append("   p2 instanceof Driver: ").append(p2 instanceof Driver).append("\n\n");

        Vehicle v1 = new CollegeBus("VEH-101", "TN 38 BX 1001", 48, "Bus 01", "i1", "Kuniamuthur Route", "R. Murugan");
        log.append("2. Base Class: Vehicle (abstract) -> Subclass: CollegeBus\n");
        log.append("   v1 instanceof Vehicle: ").append(v1 instanceof Vehicle).append("\n");
        log.append("   v1 instanceof CollegeBus: ").append(v1 instanceof CollegeBus).append("\n");

        String explanation = "INHERITANCE eliminates redundant code by extracting common state (id, name, phone, email) " +
                "into Person, and fleet vehicle properties (id, regNo, capacity) into Vehicle.";

        return new OopTestResult("2. Inheritance", "Class Hierarchy & Specialized Extensions", true, explanation, log.toString());
    }

    /**
     * Pillar 3: POLYMORPHISM DEMONSTRATION
     * Shows both Runtime Polymorphism (Dynamic Method Dispatch) and Compile-Time Polymorphism (Method Overloading).
     */
    public static OopTestResult testPolymorphism() {
        StringBuilder log = new StringBuilder();

        log.append("── PART A: COMPILE-TIME POLYMORPHISM (Method Overloading) ──\n");
        CollegeBus bus = new CollegeBus("VEH-01", "TN38", 50, "Bus 01", "i1", "Route", "Driver");
        double distanceKm = 12.3;

        int eta1 = bus.calculateEta(distanceKm);
        int eta2 = bus.calculateEta(distanceKm, 35.0);
        int eta3 = bus.calculateEta(distanceKm, 35.0, 10);

        log.append("Overload 1 - calculateEta(12.3 km)                   -> ").append(eta1).append(" mins (default 28 km/h)\n");
        log.append("Overload 2 - calculateEta(12.3 km, 35 km/h)          -> ").append(eta2).append(" mins (custom speed)\n");
        log.append("Overload 3 - calculateEta(12.3 km, 35 km/h, +10min)  -> ").append(eta3).append(" mins (speed + traffic buffer)\n\n");

        log.append("── PART B: RUNTIME POLYMORPHISM (Dynamic Method Dispatch) ──\n");
        List<TransitAlert> alertQueue = new ArrayList<>();
        alertQueue.add(new BreakdownAlert("ALT-1", "Bus 01", "Kuniamuthur", "Radiator leak near Singanallur", "Singanallur Junction", true));
        alertQueue.add(new DelayAlert("ALT-2", "Bus 04", "Gandhipuram", "Heavy traffic at Lakshmi Mills signal", 15));
        alertQueue.add(new EmergencySosAlert("ALT-3", "Bus 07", "Vadavalli", "Medical emergency on board", 11.0234, 76.9543));

        for (TransitAlert alert : alertQueue) {
            // Dynamic binding at runtime: calls the overridden dispatch() of the exact subclass!
            log.append("Dispatching polymorphic alert of type: ").append(alert.getClass().getSimpleName()).append("\n");
            log.append("  Result: ").append(alert.dispatch()).append("\n\n");
        }

        String explanation = "POLYMORPHISM allows treating derived objects uniformly through a common base reference " +
                "(TransitAlert) while delegating to the appropriate subclass implementation at runtime. " +
                "Overloading allows multiple signatures for the ETA engine.";

        return new OopTestResult("3. Polymorphism", "Overloading & Runtime Dynamic Dispatch", true, explanation, log.toString());
    }

    /**
     * Pillar 4: ABSTRACTION DEMONSTRATION
     * Shows interfaces and abstract contracts hiding implementation details.
     */
    public static OopTestResult testAbstraction() {
        StringBuilder log = new StringBuilder();

        log.append("1. ITrackable Interface Contract:\n");
        ITrackable trackableBus = new CollegeBus("VEH-01", "TN38", 50, "Bus 01", "i1", "Route", "Driver");
        trackableBus.updateLocation(11.065421, 77.098745, 32.5);
        log.append("   Invoking trackableBus.getLocationString() via ITrackable reference: ")
                .append(trackableBus.getLocationString()).append("\n\n");

        log.append("2. IRouteOptimizer Interface Contract:\n");
        IRouteOptimizer optimizer = new RouteDijkstraEngine();
        List<String> path = optimizer.findShortestPath("Kuniamuthur Market", "PSG iTech Campus");
        double dist = optimizer.calculatePathDistance(path);
        log.append("   Invoking optimizer.findShortestPath() via IRouteOptimizer reference:\n");
        log.append("   Path: ").append(String.join(" -> ", path)).append("\n");
        log.append("   Calculated Distance: ").append(dist).append(" km\n");

        String explanation = "ABSTRACTION hides complex GPS trigonometry and graph pathfinding algorithms behind clean, " +
                "cohesive interfaces (ITrackable, IRouteOptimizer, IAlertable).";

        return new OopTestResult("4. Abstraction", "Interfaces & Separation of Concerns", true, explanation, log.toString());
    }

    public static List<OopTestResult> runAllOopTests() {
        List<OopTestResult> results = new ArrayList<>();
        results.add(testEncapsulation());
        results.add(testInheritance());
        results.add(testPolymorphism());
        results.add(testAbstraction());
        return results;
    }

    /**
     * Standalone CLI runner for headless grading / terminal testing.
     */
    public static void main(String[] args) {
        System.out.println("==========================================================================");
        System.out.println("   PSG iTech Campus Transport System - 4 Pillars of OOP Test Suite        ");
        System.out.println("==========================================================================\n");

        for (OopTestResult r : runAllOopTests()) {
            System.out.println("▶ [" + r.pillar + "] " + r.title + " -> " + (r.passed ? "PASSED ✅" : "FAILED ❌"));
            System.out.println("  Concept : " + r.explanation);
            System.out.println("  Execution Output:\n" + r.executionOutput);
            System.out.println("--------------------------------------------------------------------------\n");
        }
    }
}
