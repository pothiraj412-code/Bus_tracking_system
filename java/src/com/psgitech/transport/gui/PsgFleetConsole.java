package com.psgitech.transport.gui;

import com.psgitech.transport.model.*;
import com.psgitech.transport.services.*;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.util.List;

/**
 * JAVA SWING DESKTOP CONSOLE:
 * Comprehensive Command Center for PSG iTech Transport Management.
 * Demonstrates GUI Event Handling, Table Models, Custom Cell Renderers,
 * and direct interaction with the OOP Core Engine.
 */
public class PsgFleetConsole extends JFrame {

    private final FleetService fleetService;
    private final RouteDijkstraEngine dijkstraEngine;

    // GUI Components
    private DefaultTableModel fleetTableModel;
    private JTable fleetTable;
    private JTextArea alertLogArea;
    private JComboBox<String> busSelectCombo;
    private JComboBox<String> alertTypeCombo;
    private JTextField alertDetailField;
    private JComboBox<String> sourceStopCombo;
    private JComboBox<String> destStopCombo;
    private JTextArea routeResultArea;
    private JTextArea oopInspectionArea;
    private JLabel totalBusesLabel;
    private JLabel activeTripsLabel;
    private JLabel totalAlertsLabel;

    public PsgFleetConsole() {
        this.fleetService = FleetService.getInstance();
        this.dijkstraEngine = new RouteDijkstraEngine();

        initializeWindow();
        initComponents();
        refreshFleetTable();
    }

    private void initializeWindow() {
        setTitle("PSG iTech - Campus Bus Fleet & Incident Management Console (Java Swing)");
        setSize(1100, 720);
        setMinimumSize(new Dimension(950, 600));
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null); // Center on screen

        // Set modern look and feel if available
        try {
            for (UIManager.LookAndFeelInfo info : UIManager.getInstalledLookAndFeels()) {
                if ("Nimbus".equals(info.getName())) {
                    UIManager.setLookAndFeel(info.getClassName());
                    break;
                }
            }
        } catch (Exception ignored) {}
    }

    private void initComponents() {
        JPanel rootPanel = new JPanel(new BorderLayout(0, 10));
        rootPanel.setBorder(new EmptyBorder(12, 14, 14, 14));
        rootPanel.setBackground(new Color(243, 244, 246));

        // 1. Header Banner
        rootPanel.add(createHeaderPanel(), BorderLayout.NORTH);

        // 2. Central Tabbed Pane
        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.setFont(new Font("Segoe UI", Font.BOLD, 13));

        tabbedPane.addTab("🚌 Fleet Live Monitor", createFleetMonitorPanel());
        tabbedPane.addTab("🚨 Incident & SOS Center", createIncidentCenterPanel());
        tabbedPane.addTab("🗺️ Dijkstra Route Planner", createRoutePlannerPanel());
        tabbedPane.addTab("🎓 OOP 4 Pillars Inspector", createOopInspectorPanel());

        rootPanel.add(tabbedPane, BorderLayout.CENTER);

        // 3. Footer Status Bar
        rootPanel.add(createFooterPanel(), BorderLayout.SOUTH);

        setContentPane(rootPanel);
    }

    private JPanel createHeaderPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(new Color(15, 23, 42)); // Dark slate navy
        panel.setBorder(new EmptyBorder(14, 20, 14, 20));

        JLabel titleLabel = new JLabel("PSG INSTITUTE OF TECHNOLOGY AND APPLIED RESEARCH");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 17));
        titleLabel.setForeground(Color.WHITE);

        JLabel subTitleLabel = new JLabel("Department of Campus Transport & Student Transit · Neelambur, Coimbatore");
        subTitleLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        subTitleLabel.setForeground(new Color(148, 163, 184));

        JPanel textPanel = new JPanel(new GridLayout(2, 1, 0, 3));
        textPanel.setOpaque(false);
        textPanel.add(titleLabel);
        textPanel.add(subTitleLabel);

        // Stat Badges on Right
        JPanel statsPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 5));
        statsPanel.setOpaque(false);

        totalBusesLabel = createBadge("Total Fleet: 15 Buses", new Color(30, 41, 59), Color.WHITE);
        activeTripsLabel = createBadge("Active: 15 On-Route", new Color(6, 95, 70), new Color(167, 243, 208));
        totalAlertsLabel = createBadge("Alerts: 0", new Color(153, 27, 27), new Color(254, 202, 202));

        statsPanel.add(totalBusesLabel);
        statsPanel.add(activeTripsLabel);
        statsPanel.add(totalAlertsLabel);

        panel.add(textPanel, BorderLayout.WEST);
        panel.add(statsPanel, BorderLayout.EAST);
        return panel;
    }

    private JLabel createBadge(String text, Color bg, Color fg) {
        JLabel label = new JLabel(text);
        label.setFont(new Font("Segoe UI", Font.BOLD, 12));
        label.setOpaque(true);
        label.setBackground(bg);
        label.setForeground(fg);
        label.setBorder(new EmptyBorder(5, 12, 5, 12));
        return label;
    }

    // ── TAB 1: FLEET MONITOR ──────────────────────────────────────────────────
    private JPanel createFleetMonitorPanel() {
        JPanel panel = new JPanel(new BorderLayout(0, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(12, 12, 12, 12));

        String[] columns = {"Bus No", "Route Name", "Registration", "Driver", "Current Stop", "Speed", "Status", "Students On Board"};
        fleetTableModel = new DefaultTableModel(columns, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };

        fleetTable = new JTable(fleetTableModel);
        fleetTable.setRowHeight(28);
        fleetTable.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        fleetTable.getTableHeader().setFont(new Font("Segoe UI", Font.BOLD, 12));
        fleetTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        // Custom status color renderer
        fleetTable.getColumnModel().getColumn(6).setCellRenderer(new DefaultTableCellRenderer() {
            @Override
            public Component getTableCellRendererComponent(JTable table, Object value, boolean isSelected, boolean hasFocus, int row, int col) {
                Component c = super.getTableCellRendererComponent(table, value, isSelected, hasFocus, row, col);
                String val = (value != null) ? value.toString() : "";
                setHorizontalAlignment(JLabel.CENTER);
                setFont(getFont().deriveFont(Font.BOLD));
                if ("BREAKDOWN".equalsIgnoreCase(val)) {
                    c.setBackground(new Color(254, 226, 226));
                    c.setForeground(new Color(185, 28, 28));
                } else if ("DELAYED".equalsIgnoreCase(val)) {
                    c.setBackground(new Color(254, 243, 199));
                    c.setForeground(new Color(180, 83, 9));
                } else if ("ON_ROUTE".equalsIgnoreCase(val)) {
                    c.setBackground(new Color(209, 250, 229));
                    c.setForeground(new Color(4, 120, 87));
                } else {
                    c.setBackground(Color.WHITE);
                    c.setForeground(Color.BLACK);
                }
                return c;
            }
        });

        JScrollPane scrollPane = new JScrollPane(fleetTable);
        panel.add(scrollPane, BorderLayout.CENTER);

        // Control Toolbar
        JPanel toolbar = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 5));
        toolbar.setBackground(Color.WHITE);

        JButton refreshBtn = new JButton("🔄 Refresh Fleet");
        refreshBtn.addActionListener(e -> refreshFleetTable());

        JButton simSpeedBtn = new JButton("⚡ Simulate Live GPS Movement");
        simSpeedBtn.addActionListener(e -> simulateGpsUpdates());

        JButton resolveBtn = new JButton("✅ Clear All Breakdowns");
        resolveBtn.addActionListener(e -> resetAllBuses());

        toolbar.add(refreshBtn);
        toolbar.add(simSpeedBtn);
        toolbar.add(resolveBtn);

        panel.add(toolbar, BorderLayout.SOUTH);
        return panel;
    }

    // ── TAB 2: INCIDENT & SOS CENTER ──────────────────────────────────────────
    private JPanel createIncidentCenterPanel() {
        JPanel panel = new JPanel(new BorderLayout(12, 12));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(14, 14, 14, 14));

        // Left Form Panel
        JPanel formPanel = new JPanel(new GridBagLayout());
        formPanel.setBackground(new Color(248, 250, 252));
        formPanel.setBorder(BorderFactory.createTitledBorder("Broadcast New Incident Alert"));
        formPanel.setPreferredSize(new Dimension(380, 0));

        GridBagConstraints gbc = new GridBagConstraints();
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.insets = new Insets(6, 8, 6, 8);
        gbc.gridx = 0; gbc.gridy = 0;

        // Select Bus
        formPanel.add(new JLabel("Target Bus:"), gbc);
        gbc.gridy++;
        busSelectCombo = new JComboBox<>();
        for (CollegeBus b : fleetService.getAllBuses()) {
            busSelectCombo.addItem(b.getBusNumber() + " - " + b.getRouteName());
        }
        formPanel.add(busSelectCombo, gbc);

        // Select Alert Type
        gbc.gridy++;
        formPanel.add(new JLabel("Alert Category:"), gbc);
        gbc.gridy++;
        alertTypeCombo = new JComboBox<>(new String[]{
                "⚠️ Bus Breakdown",
                "🕐 Route Delay",
                "🚨 Emergency SOS"
        });
        formPanel.add(alertTypeCombo, gbc);

        // Detail Input
        gbc.gridy++;
        formPanel.add(new JLabel("Description / Delay Minutes / Emergency Note:"), gbc);
        gbc.gridy++;
        alertDetailField = new JTextField("Engine problem near Singanallur junction");
        formPanel.add(alertDetailField, gbc);

        // Alert Type change listener to update default placeholder
        alertTypeCombo.addActionListener(e -> {
            int idx = alertTypeCombo.getSelectedIndex();
            if (idx == 0) alertDetailField.setText("Engine breakdown near Singanallur signal");
            else if (idx == 1) alertDetailField.setText("15");
            else alertDetailField.setText("Medical emergency on board - immediate campus support required");
        });

        // Submit Button
        gbc.gridy++;
        gbc.insets = new Insets(16, 8, 6, 8);
        JButton dispatchBtn = new JButton("📢 Broadcast Alert (Polymorphic)");
        dispatchBtn.setBackground(new Color(220, 38, 38));
        dispatchBtn.setForeground(Color.BLACK);
        dispatchBtn.setFont(new Font("Segoe UI", Font.BOLD, 13));
        dispatchBtn.addActionListener(this::handleDispatchAlert);
        formPanel.add(dispatchBtn, gbc);

        panel.add(formPanel, BorderLayout.WEST);

        // Right Log Area
        JPanel logPanel = new JPanel(new BorderLayout(0, 6));
        logPanel.setBackground(Color.WHITE);
        logPanel.setBorder(BorderFactory.createTitledBorder("Campus Alert Transmission History (Live Log)"));

        alertLogArea = new JTextArea();
        alertLogArea.setEditable(false);
        alertLogArea.setFont(new Font("Consolas", Font.PLAIN, 12));
        alertLogArea.setBackground(new Color(15, 23, 42));
        alertLogArea.setForeground(new Color(226, 232, 240));
        alertLogArea.setMargin(new Insets(10, 10, 10, 10));
        alertLogArea.setText("=== PSG iTech Fleet Incident Transmission Console Ready ===\n" +
                "Waiting for driver or admin incident reports...\n\n");

        JScrollPane logScroll = new JScrollPane(alertLogArea);
        logPanel.add(logScroll, BorderLayout.CENTER);

        panel.add(logPanel, BorderLayout.CENTER);
        return panel;
    }

    private void handleDispatchAlert(ActionEvent e) {
        String selectedBusItem = (String) busSelectCombo.getSelectedItem();
        if (selectedBusItem == null) return;
        String busNo = selectedBusItem.split(" - ")[0];
        CollegeBus bus = fleetService.getBus(busNo);
        if (bus == null) return;

        int alertTypeIdx = alertTypeCombo.getSelectedIndex();
        String detail = alertDetailField.getText().trim();
        TransitAlert alert;

        String alertId = "ALT-" + System.currentTimeMillis() % 10000;

        if (alertTypeIdx == 0) {
            // Breakdown
            alert = new BreakdownAlert(alertId, bus.getBusNumber(), bus.getRouteName(),
                    detail.isEmpty() ? "Vehicle breakdown reported" : detail,
                    bus.getCurrentStopName(), true);
        } else if (alertTypeIdx == 1) {
            // Delay
            int mins = 15;
            try {
                mins = Integer.parseInt(detail.replaceAll("[^0-9]", ""));
            } catch (Exception ignored) {}
            alert = new DelayAlert(alertId, bus.getBusNumber(), bus.getRouteName(),
                    "Heavy traffic on route", mins);
        } else {
            // Emergency SOS
            alert = new EmergencySosAlert(alertId, bus.getBusNumber(), bus.getRouteName(),
                    detail.isEmpty() ? "Driver Emergency SOS" : detail,
                    bus.getLatitude() > 0 ? bus.getLatitude() : 11.0650,
                    bus.getLongitude() > 0 ? bus.getLongitude() : 77.1000);
            Toolkit.getDefaultToolkit().beep();
        }

        // Process alert polymorphically via FleetService
        String result = fleetService.processAlert(alert);

        // Update Log
        alertLogArea.append("[" + alert.getFormattedTimestamp() + "] " + alert.getSeverityLevel() + "\n");
        alertLogArea.append(">> " + result + "\n\n");
        alertLogArea.setCaretPosition(alertLogArea.getDocument().getLength());

        totalAlertsLabel.setText("Alerts: " + fleetService.getAlertHistory().size());
        refreshFleetTable();

        JOptionPane.showMessageDialog(this,
                result,
                "Alert Dispatched (" + alert.getClass().getSimpleName() + ")",
                alertTypeIdx == 2 ? JOptionPane.ERROR_MESSAGE : JOptionPane.INFORMATION_MESSAGE);
    }

    // ── TAB 3: ROUTE & DIJKSTRA OPTIMIZER ─────────────────────────────────────
    private JPanel createRoutePlannerPanel() {
        JPanel panel = new JPanel(new BorderLayout(12, 12));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(14, 14, 14, 14));

        JPanel topControls = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 10));
        topControls.setBackground(new Color(248, 250, 252));
        topControls.setBorder(BorderFactory.createTitledBorder("Select Origin and Destination Stop (Dijkstra Shortest Path)"));

        List<String> knownStops = dijkstraEngine.getAllKnownStops();
        sourceStopCombo = new JComboBox<>(knownStops.toArray(new String[0]));
        sourceStopCombo.setSelectedItem("Kuniamuthur Market");

        destStopCombo = new JComboBox<>(knownStops.toArray(new String[0]));
        destStopCombo.setSelectedItem("PSG iTech Campus");

        JButton calcBtn = new JButton("🚀 Compute Optimal Route (Dijkstra)");
        calcBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        calcBtn.setBackground(new Color(37, 99, 235));
        calcBtn.setForeground(Color.BLACK);
        calcBtn.addActionListener(e -> calculateShortestPath());

        topControls.add(new JLabel("From:"));
        topControls.add(sourceStopCombo);
        topControls.add(new JLabel("To:"));
        topControls.add(destStopCombo);
        topControls.add(calcBtn);

        panel.add(topControls, BorderLayout.NORTH);

        routeResultArea = new JTextArea();
        routeResultArea.setEditable(false);
        routeResultArea.setFont(new Font("Consolas", Font.PLAIN, 13));
        routeResultArea.setBackground(new Color(248, 250, 252));
        routeResultArea.setMargin(new Insets(12, 14, 12, 14));
        routeResultArea.setText("Click 'Compute Optimal Route' to calculate the shortest path using Dijkstra's algorithm across Coimbatore transit network.");

        JScrollPane scrollPane = new JScrollPane(routeResultArea);
        scrollPane.setBorder(BorderFactory.createTitledBorder("Calculated Optimal Route & ETA Analysis"));
        panel.add(scrollPane, BorderLayout.CENTER);

        return panel;
    }

    private void calculateShortestPath() {
        String src = (String) sourceStopCombo.getSelectedItem();
        String dst = (String) destStopCombo.getSelectedItem();
        if (src == null || dst == null || src.equals(dst)) {
            routeResultArea.setText("Please select two distinct stops.");
            return;
        }

        List<String> path = dijkstraEngine.findShortestPath(src, dst);
        if (path.isEmpty()) {
            routeResultArea.setText("No connected road path found between " + src + " and " + dst);
            return;
        }

        double totalDist = dijkstraEngine.calculatePathDistance(path);
        double roadWindingDist = totalDist * CollegeBus.ROAD_WINDING_FACTOR;
        int etaMinutes = (int) Math.round((roadWindingDist / CollegeBus.DEFAULT_COIMBATORE_SPEED_KMH) * 60.0);

        StringBuilder sb = new StringBuilder();
        sb.append("========================================================================\n");
        sb.append("   DIJKSTRA SHORTEST PATH ROUTE OPTIMIZATION RESULT\n");
        sb.append("========================================================================\n\n");
        sb.append(String.format("Origin Stop      : %s\n", src));
        sb.append(String.format("Destination      : %s\n", dst));
        sb.append(String.format("Direct Distance  : %.2f km\n", totalDist));
        sb.append(String.format("Road Dist (1.22x): %.2f km (accounts for Coimbatore road curvature)\n", roadWindingDist));
        sb.append(String.format("Estimated ETA    : %d minutes (cruising speed: 28 km/h)\n\n", etaMinutes));
        sb.append("OPTIMAL NODE HOP SEQUENCE:\n");

        for (int i = 0; i < path.size(); i++) {
            sb.append(String.format("  [%02d] %s %s\n", i + 1, path.get(i), (i == path.size() - 1) ? "🏁 [DESTINATION ARRIVED]" : "➔"));
        }

        sb.append("\nDSA ALGORITHM DETAILS:\n");
        sb.append("- Graph Representation: Weighted Directed Graph via Adjacency List (Map<String, List<Edge>>)\n");
        sb.append("- Priority Queue: Min-Heap for O((V + E) log V) time complexity\n");
        sb.append("- Application: Used to dynamically reroute buses during road closures or heavy traffic.\n");

        routeResultArea.setText(sb.toString());
    }

    // ── TAB 4: OOP 4 PILLARS INSPECTOR ────────────────────────────────────────
    private JPanel createOopInspectorPanel() {
        JPanel panel = new JPanel(new BorderLayout(12, 12));
        panel.setBackground(Color.WHITE);
        panel.setBorder(new EmptyBorder(14, 14, 14, 14));

        JPanel buttonsPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 8));
        buttonsPanel.setBackground(new Color(248, 250, 252));
        buttonsPanel.setBorder(BorderFactory.createTitledBorder("Execute Live OOP Verification Tests"));

        JButton testAllBtn = new JButton("🌟 Run All 4 OOP Tests");
        testAllBtn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        testAllBtn.setBackground(new Color(16, 185, 129));
        testAllBtn.setForeground(Color.BLACK);
        testAllBtn.addActionListener(e -> runAllOopTests());

        JButton encBtn = new JButton("1. Test Encapsulation");
        encBtn.addActionListener(e -> displayTest(OopDemonstrationService.testEncapsulation()));

        JButton inhBtn = new JButton("2. Test Inheritance");
        inhBtn.addActionListener(e -> displayTest(OopDemonstrationService.testInheritance()));

        JButton polyBtn = new JButton("3. Test Polymorphism");
        polyBtn.addActionListener(e -> displayTest(OopDemonstrationService.testPolymorphism()));

        JButton absBtn = new JButton("4. Test Abstraction");
        absBtn.addActionListener(e -> displayTest(OopDemonstrationService.testAbstraction()));

        buttonsPanel.add(testAllBtn);
        buttonsPanel.add(encBtn);
        buttonsPanel.add(inhBtn);
        buttonsPanel.add(polyBtn);
        buttonsPanel.add(absBtn);

        panel.add(buttonsPanel, BorderLayout.NORTH);

        oopInspectionArea = new JTextArea();
        oopInspectionArea.setEditable(false);
        oopInspectionArea.setFont(new Font("Consolas", Font.PLAIN, 12));
        oopInspectionArea.setBackground(new Color(15, 23, 42));
        oopInspectionArea.setForeground(new Color(226, 232, 240));
        oopInspectionArea.setMargin(new Insets(12, 14, 12, 14));

        // Initial welcome explanation
        runAllOopTests();

        JScrollPane scrollPane = new JScrollPane(oopInspectionArea);
        scrollPane.setBorder(BorderFactory.createTitledBorder("OOP 4 Pillars Execution & Verification Logs"));
        panel.add(scrollPane, BorderLayout.CENTER);

        return panel;
    }

    private void displayTest(OopDemonstrationService.OopTestResult result) {
        StringBuilder sb = new StringBuilder();
        sb.append("========================================================================\n");
        sb.append("   OOP PILLAR VERIFICATION: ").append(result.pillar.toUpperCase()).append("\n");
        sb.append("   Test: ").append(result.title).append(" | Status: ").append(result.passed ? "✅ PASSED" : "❌ FAILED").append("\n");
        sb.append("========================================================================\n\n");
        sb.append("CONCEPT EXPLANATION:\n");
        sb.append(result.explanation).append("\n\n");
        sb.append("LIVE EXECUTION LOG:\n");
        sb.append(result.executionOutput).append("\n");
        oopInspectionArea.setText(sb.toString());
        oopInspectionArea.setCaretPosition(0);
    }

    private void runAllOopTests() {
        StringBuilder sb = new StringBuilder();
        sb.append("=========================================================================================\n");
        sb.append("   PSG iTech CAMPUS TRANSIT SYSTEM - OBJECT ORIENTED PROGRAMMING (OOP) ARCHITECTURE REPORT\n");
        sb.append("=========================================================================================\n\n");

        for (OopDemonstrationService.OopTestResult r : OopDemonstrationService.runAllOopTests()) {
            sb.append("-----------------------------------------------------------------------------------------\n");
            sb.append(String.format("▶ %s : %s [%s]\n", r.pillar, r.title, r.passed ? "PASSED" : "FAILED"));
            sb.append("-----------------------------------------------------------------------------------------\n");
            sb.append("Summary : ").append(r.explanation).append("\n\n");
            sb.append("Output  :\n").append(r.executionOutput).append("\n\n");
        }

        oopInspectionArea.setText(sb.toString());
        oopInspectionArea.setCaretPosition(0);
    }

    // ── DATA SYNC HELPERS ─────────────────────────────────────────────────────
    private void refreshFleetTable() {
        fleetTableModel.setRowCount(0);
        int onRouteCount = 0;
        for (CollegeBus b : fleetService.getAllBuses()) {
            if (b.getStatus() == Vehicle.VehicleStatus.ON_ROUTE) onRouteCount++;
            fleetTableModel.addRow(new Object[]{
                    b.getBusNumber(),
                    b.getRouteName(),
                    b.getRegistrationNumber(),
                    b.getDriverName(),
                    b.getCurrentStopName(),
                    String.format("%.1f km/h", b.getSpeed()),
                    b.getStatus().name(),
                    b.getPresentStudentsCount() + " / " + b.getTotalStudentsAssigned()
            });
        }
        activeTripsLabel.setText("Active: " + onRouteCount + " On-Route");
    }

    private void simulateGpsUpdates() {
        for (CollegeBus b : fleetService.getAllBuses()) {
            if (b.getStatus() != Vehicle.VehicleStatus.BREAKDOWN) {
                double simulatedSpeed = 20.0 + (Math.random() * 25.0);
                b.updateLocation(11.0 + (Math.random() * 0.1), 77.0 + (Math.random() * 0.1), simulatedSpeed);
            }
        }
        refreshFleetTable();
        JOptionPane.showMessageDialog(this, "Simulated live GPS location and speed updates for all active buses.");
    }

    private void resetAllBuses() {
        for (CollegeBus b : fleetService.getAllBuses()) {
            b.setStatus(Vehicle.VehicleStatus.ON_ROUTE);
            b.setDelayMinutes(0);
        }
        refreshFleetTable();
        JOptionPane.showMessageDialog(this, "All bus statuses reset to ON_ROUTE.");
    }

    private JPanel createFooterPanel() {
        JPanel footer = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        footer.setBackground(new Color(243, 244, 246));
        JLabel label = new JLabel("PSG iTech College Bus Tracking & Attendance System · Java Mini Project Edition (JDK 18)");
        label.setFont(new Font("Segoe UI", Font.ITALIC, 11));
        label.setForeground(new Color(100, 116, 139));
        footer.add(label);
        return footer;
    }
}
