package com.psgitech.transport.services;

import com.psgitech.transport.model.CollegeBus;
import com.psgitech.transport.services.OopDemonstrationService.OopTestResult;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * JAVA BUILT-IN HTTP MICROSERVICE:
 * Uses standard JDK com.sun.net.httpserver.HttpServer on port 8080.
 * Serves an interactive Java Web Dashboard & REST API on http://localhost:8080
 * without needing any external frameworks, Tomcat, or Maven!
 */
public class JavaTransitHttpServer {

    private final int port;
    private HttpServer server;
    private final FleetService fleetService;
    private final RouteDijkstraEngine dijkstraEngine;

    public JavaTransitHttpServer(int port) {
        this.port = port;
        this.fleetService = FleetService.getInstance();
        this.dijkstraEngine = new RouteDijkstraEngine();
    }

    public void start() {
        try {
            server = HttpServer.create(new InetSocketAddress(port), 0);

            // Context 1: Web Dashboard Home
            server.createContext("/", new DashboardHandler());

            // Context 2: REST API - OOP 4 Pillars Tests
            server.createContext("/api/oop", new OopApiHandler());

            // Context 3: REST API - Dijkstra Shortest Path
            server.createContext("/api/dijkstra", new DijkstraApiHandler());

            // Context 4: REST API - Fleet status
            server.createContext("/api/fleet", new FleetApiHandler());

            server.setExecutor(null); // default executor
            server.start();
            System.out.println("🌐 Java HTTP Server running at http://localhost:" + port);
        } catch (IOException e) {
            System.err.println("⚠️ Could not start Java HTTP server on port " + port + ": " + e.getMessage());
        }
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    private class DashboardHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StringBuilder html = new StringBuilder();
            html.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n");
            html.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
            html.append("<title>PSG iTech - Java Core Transport Engine</title>\n");
            html.append("<style>\n");
            html.append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }\n");
            html.append(".container { max-width: 1000px; margin: 0 auto; }\n");
            html.append(".header { background: #1e293b; padding: 24px; border-radius: 12px; border-left: 6px solid #3b82f6; margin-bottom: 24px; }\n");
            html.append("h1 { margin: 0 0 8px 0; font-size: 24px; color: #60a5fa; }\n");
            html.append("p { margin: 4px 0; color: #94a3b8; }\n");
            html.append(".badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; background: #065f46; color: #6ee7b7; margin-right: 8px; }\n");
            html.append(".card { background: #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 20px; border: 1px solid #334155; }\n");
            html.append("table { width: 100%; border-collapse: collapse; margin-top: 12px; }\n");
            html.append("th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #334155; font-size: 13px; }\n");
            html.append("th { color: #94a3b8; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }\n");
            html.append(".tag-ok { color: #34d399; font-weight: bold; }\n");
            html.append(".btn { background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block; margin-top: 12px; }\n");
            html.append(".btn:hover { background: #1d4ed8; }\n");
            html.append("pre { background: #090d16; padding: 14px; border-radius: 8px; color: #e2e8f0; font-size: 12px; overflow-x: auto; }\n");
            html.append("</style>\n</head>\n<body>\n<div class=\"container\">\n");

            html.append("<div class=\"header\">\n");
            html.append("  <span class=\"badge\">JAVA 18 ENGINE</span> <span class=\"badge\" style=\"background:#312e81; color:#c7d2fe;\">MICROSERVICE ACTIVE</span>\n");
            html.append("  <h1>PSG iTech Campus Transport Core Java Service</h1>\n");
            html.append("  <p>PSG Institute of Technology and Applied Research · Department of Campus Transit</p>\n");
            html.append("  <p style=\"font-size: 13px; color: #cbd5e1; margin-top: 10px;\">This page is served directly by the <strong>Java 18 HttpServer</strong> microservice demonstrating Object-Oriented Architecture & Graph Routing.</p>\n");
            html.append("  <div style=\"margin-top: 14px;\">\n");
            html.append("    <a href=\"http://localhost:5000\" class=\"btn\" target=\"_blank\">🌐 Open Main Web Tracker (Port 5000)</a>\n");
            html.append("    <a href=\"/api/oop\" class=\"btn\" style=\"background:#059669; margin-left:8px;\" target=\"_blank\">🎓 View OOP Tests JSON</a>\n");
            html.append("  </div>\n");
            html.append("</div>\n");

            // Card 1: 4 Pillars of OOP
            html.append("<div class=\"card\">\n");
            html.append("  <h2 style=\"margin-top:0; color:#38bdf8; font-size:18px;\">🎓 The 4 Pillars of OOP Architecture</h2>\n");
            html.append("  <p>Live execution results of the 4 Pillars of Object-Oriented Programming:</p>\n");
            html.append("  <pre>\n");
            for (OopTestResult r : OopDemonstrationService.runAllOopTests()) {
                html.append(String.format("▶ %s: %s [%s]\n", r.pillar, r.title, r.passed ? "PASSED ✅" : "FAILED ❌"));
                html.append("  Summary: ").append(r.explanation).append("\n\n");
            }
            html.append("  </pre>\n");
            html.append("</div>\n");

            // Card 2: Fleet Status
            html.append("<div class=\"card\">\n");
            html.append("  <h2 style=\"margin-top:0; color:#38bdf8; font-size:18px;\">🚌 Active College Bus Fleet (15 Routes)</h2>\n");
            html.append("  <table>\n");
            html.append("    <thead><tr><th>Bus</th><th>Route Name</th><th>Driver</th><th>Current Stop</th><th>Status</th></tr></thead>\n");
            html.append("    <tbody>\n");
            for (CollegeBus b : fleetService.getAllBuses()) {
                html.append(String.format("      <tr><td><strong>%s</strong></td><td>%s</td><td>%s</td><td>%s</td><td class=\"tag-ok\">%s</td></tr>\n",
                        b.getBusNumber(), b.getRouteName(), b.getDriverName(), b.getCurrentStopName(), b.getStatus()));
            }
            html.append("    </tbody>\n  </table>\n</div>\n");

            html.append("</div>\n</body>\n</html>");

            byte[] bytes = html.toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    private static class OopApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            List<OopTestResult> tests = OopDemonstrationService.runAllOopTests();
            StringBuilder json = new StringBuilder("[\n");
            for (int i = 0; i < tests.size(); i++) {
                OopTestResult t = tests.get(i);
                json.append("  {\n");
                json.append("    \"pillar\": \"").append(escapeJson(t.pillar)).append("\",\n");
                json.append("    \"title\": \"").append(escapeJson(t.title)).append("\",\n");
                json.append("    \"passed\": ").append(t.passed).append(",\n");
                json.append("    \"explanation\": \"").append(escapeJson(t.explanation)).append("\"\n");
                json.append("  }").append(i < tests.size() - 1 ? "," : "").append("\n");
            }
            json.append("]");

            byte[] bytes = json.toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    private class DijkstraApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String query = exchange.getRequestURI().getQuery();
            String from = "Kuniamuthur Market";
            String to = "PSG iTech Campus";

            if (query != null) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2) {
                        if (pair[0].equalsIgnoreCase("from")) from = java.net.URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                        if (pair[0].equalsIgnoreCase("to")) to = java.net.URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                    }
                }
            }

            List<String> path = dijkstraEngine.findShortestPath(from, to);
            double dist = dijkstraEngine.calculatePathDistance(path);

            StringBuilder json = new StringBuilder("{\n");
            json.append("  \"origin\": \"").append(escapeJson(from)).append("\",\n");
            json.append("  \"destination\": \"").append(escapeJson(to)).append("\",\n");
            json.append("  \"distanceKm\": ").append(dist).append(",\n");
            json.append("  \"path\": [");
            for (int i = 0; i < path.size(); i++) {
                json.append("\"").append(escapeJson(path.get(i))).append("\"").append(i < path.size() - 1 ? ", " : "");
            }
            json.append("]\n}");

            byte[] bytes = json.toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    private class FleetApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            StringBuilder json = new StringBuilder("[\n");
            int i = 0;
            int total = fleetService.getAllBuses().size();
            for (CollegeBus b : fleetService.getAllBuses()) {
                json.append("  {\n");
                json.append("    \"busNumber\": \"").append(escapeJson(b.getBusNumber())).append("\",\n");
                json.append("    \"routeName\": \"").append(escapeJson(b.getRouteName())).append("\",\n");
                json.append("    \"driverName\": \"").append(escapeJson(b.getDriverName())).append("\",\n");
                json.append("    \"currentStop\": \"").append(escapeJson(b.getCurrentStopName())).append("\",\n");
                json.append("    \"speed\": ").append(b.getSpeed()).append(",\n");
                json.append("    \"status\": \"").append(b.getStatus().name()).append("\"\n");
                json.append("  }").append(++i < total ? "," : "").append("\n");
            }
            json.append("]");

            byte[] bytes = json.toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
