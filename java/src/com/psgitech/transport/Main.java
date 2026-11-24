package com.psgitech.transport;

import com.psgitech.transport.gui.PsgFleetConsole;
import com.psgitech.transport.services.JavaTransitHttpServer;
import javax.swing.SwingUtilities;
import java.awt.GraphicsEnvironment;

/**
 * APPLICATION ENTRY POINT:
 * PSG iTech Campus Bus Fleet & Incident Management Console.
 * Java Mini Project - OOP, Dijkstra Routing & Built-in HTTP Service (Java 18).
 */
public class Main {
    public static void main(String[] args) {
        System.out.println("=================================================================");
        System.out.println("   PSG iTech Campus Transport Fleet & Incident Command Station   ");
        System.out.println("   Java Mini Project - Object-Oriented Programming (Java 18)     ");
        System.out.println("=================================================================");

        // 1. Launch Java Built-in HTTP Server on Port 8080
        try {
            JavaTransitHttpServer httpServer = new JavaTransitHttpServer(8080);
            httpServer.start();
            System.out.println(">> Java Web Microservice available at: http://localhost:8080");
        } catch (Exception e) {
            System.err.println("Note: HTTP server initialization: " + e.getMessage());
        }

        // 2. Launch Java Swing Desktop GUI on the Event Dispatch Thread (EDT)
        if (!GraphicsEnvironment.isHeadless()) {
            SwingUtilities.invokeLater(() -> {
                try {
                    PsgFleetConsole console = new PsgFleetConsole();
                    console.setVisible(true);
                    System.out.println(">> Java Swing GUI loaded successfully.");
                } catch (Exception e) {
                    System.err.println("Note on Java Swing GUI: " + e.getMessage());
                }
            });
        } else {
            System.out.println(">> Running in Headless environment. Java HTTP Server active on http://localhost:8080");
        }
    }
}
