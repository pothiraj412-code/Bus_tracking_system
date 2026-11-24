package com.psgitech.transport.services;

import com.psgitech.transport.model.*;
import java.util.*;

/**
 * FLEET SERVICE:
 * Manages the PSG iTech 15 bus fleet data model in-memory.
 * Initializes real Coimbatore routes, driver roster, and student passenger manifests.
 */
public class FleetService {
    private static FleetService instance;

    private final Map<String, CollegeBus> buses;
    private final Map<String, Driver> drivers;
    private final List<Student> students;
    private final List<TransitAlert> alertHistory;

    private FleetService() {
        this.buses = new LinkedHashMap<>();
        this.drivers = new LinkedHashMap<>();
        this.students = new ArrayList<>();
        this.alertHistory = new ArrayList<>();
        initializePsgFleet();
    }

    public static synchronized FleetService getInstance() {
        if (instance == null) {
            instance = new FleetService();
        }
        return instance;
    }

    private void initializePsgFleet() {
        // PSG iTech 15 Routes (Each route capacity = 50 students, 15 x 50 = 750 students)
        String[][] routeData = {
                {"i1",  "Bus 01", "TN 38 BX 1001", "Kuniamuthur to PSG iTech",    "R. Murugan",       "Kuniamuthur Market", "50"},
                {"i2",  "Bus 02", "TN 38 BX 1002", "Sundarapuram to PSG iTech",   "K. Selvaraj",      "Sundarapuram",       "50"},
                {"i3",  "Bus 03", "TN 38 BX 1003", "Gandhipuram to PSG iTech",    "M. Palanisamy",    "Gandhipuram",        "50"},
                {"i4",  "Bus 04", "TN 38 BX 1004", "Singanallur to PSG iTech",    "S. Arumugam",      "Singanallur",        "50"},
                {"i5",  "Bus 05", "TN 38 BX 1005", "Saravanampatti to PSG iTech", "P. Kumar",         "Saravanampatti",     "50"},
                {"i6",  "Bus 06", "TN 38 BX 1006", "Ukkadam to PSG iTech",        "A. Natarajan",     "Ukkadam Bus Stand",  "50"},
                {"i7",  "Bus 07", "TN 38 BX 1007", "Vadavalli to PSG iTech",      "V. Balasubramani", "Vadavalli",          "50"},
                {"i8",  "Bus 08", "TN 38 BX 1008", "Thudiyalur to PSG iTech",     "T. Chandran",      "Thudiyalur",         "50"},
                {"i9",  "Bus 09", "TN 38 BX 1009", "Podanur to PSG iTech",        "G. Senthil",       "Podanur Junction",   "50"},
                {"i10", "Bus 10", "TN 38 BX 1010", "Sulur to PSG iTech",          "D. Rajendran",     "Sulur Air Force Base","50"},
                {"i11", "Bus 11", "TN 38 BX 1011", "Perianaickenpalayam",         "N. Velusamy",      "Periyanaickenpalayam","50"},
                {"i12", "Bus 12", "TN 38 BX 1012", "RS Puram to PSG iTech",       "C. Manickam",      "RS Puram",           "50"},
                {"i13", "Bus 13", "TN 38 BX 1013", "Ganapathy to PSG iTech",      "R. Jayakumar",     "Ganapathy",          "50"},
                {"i14", "Bus 14", "TN 38 BX 1014", "Ondipudur to PSG iTech",      "K. Govindaraj",    "Ondipudur",          "50"},
                {"i15", "Bus 15", "TN 38 BX 1015", "Hope College to PSG iTech",   "E. Muthusamy",     "Hope College",       "50"}
        };

        for (int i = 0; i < routeData.length; i++) {
            String routeId = routeData[i][0];
            String busNo = routeData[i][1];
            String regNo = routeData[i][2];
            String routeName = routeData[i][3];
            String driverName = routeData[i][4];
            String startStop = routeData[i][5];
            int cap = Integer.parseInt(routeData[i][6]);

            // Create Bus (50 seats)
            CollegeBus bus = new CollegeBus("VEH-" + (100 + i), regNo, cap, busNo, routeId, routeName, driverName);
            bus.setCurrentStopName(startStop);
            bus.setTotalStudentsAssigned(50);
            bus.setPresentStudentsCount(45);
            buses.put(busNo, bus);

            // Create Driver
            Driver driver = new Driver("DRV-" + (100 + i), driverName,
                    driverName.toLowerCase().replace(" ", "").replace(".", "") + "@psgitech.ac.in",
                    "9842" + (100000 + i * 2314), "DL-TN38-" + (2015000 + i), 10 + (i % 8), busNo);
            drivers.put(busNo, driver);
        }

        // Add initial sample students
        students.add(new Student("STU-001", "Kavitha S.", "715521104001@psgitech.ac.in", "9443123456", "715521104001", "CSE", 3, "Kuniamuthur Market", "Route i1"));
        students.add(new Student("STU-002", "Praveen Kumar M.", "715521104018@psgitech.ac.in", "9443654321", "715521104018", "ECE", 3, "Sundarapuram", "Route i2"));
        students.add(new Student("STU-003", "Aishwarya R.", "715522106005@psgitech.ac.in", "9842112233", "715522106005", "Mech", 2, "Gandhipuram", "Route i3"));
        students.add(new Student("STU-004", "Dinesh B.", "715523105012@psgitech.ac.in", "9842998877", "715523105012", "Civil", 1, "Singanallur", "Route i4"));
    }

    public Collection<CollegeBus> getAllBuses() {
        return buses.values();
    }

    public CollegeBus getBus(String busNumber) {
        return buses.get(busNumber);
    }

    public List<Student> getStudents() {
        return students;
    }

    public List<TransitAlert> getAlertHistory() {
        return alertHistory;
    }

    /**
     * POLYMORPHIC ALERT LOGGING:
     * Accepts any subclass of TransitAlert (BreakdownAlert, DelayAlert, EmergencySosAlert)
     * and dispatches it polymorphically.
     */
    public synchronized String processAlert(TransitAlert alert) {
        alertHistory.add(0, alert); // add latest first
        CollegeBus bus = buses.get(alert.getBusNumber());

        if (alert instanceof BreakdownAlert) {
            if (bus != null) {
                bus.setStatus(Vehicle.VehicleStatus.BREAKDOWN);
                bus.updateLocation(bus.getLatitude(), bus.getLongitude(), 0.0);
            }
        } else if (alert instanceof DelayAlert) {
            DelayAlert da = (DelayAlert) alert;
            if (bus != null) {
                bus.setDelayMinutes(da.getDelayMinutes());
            }
        } else if (alert instanceof EmergencySosAlert) {
            EmergencySosAlert ea = (EmergencySosAlert) alert;
            if (bus != null) {
                bus.setStatus(Vehicle.VehicleStatus.BREAKDOWN);
                bus.updateLocation(ea.getEmergencyLatitude(), ea.getEmergencyLongitude(), 0.0);
            }
        }

        // Dynamic Method Dispatch at runtime!
        return alert.dispatch();
    }
}
