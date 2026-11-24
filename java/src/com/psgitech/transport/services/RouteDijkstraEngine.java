package com.psgitech.transport.services;

import com.psgitech.transport.interfaces.IRouteOptimizer;
import java.util.*;

/**
 * DATA STRUCTURES & ALGORITHMS (DSA) + ABSTRACTION:
 * Implements Dijkstra's Shortest Path Algorithm across Coimbatore transit nodes
 * to reach PSG iTech Campus (Neelambur).
 */
public class RouteDijkstraEngine implements IRouteOptimizer {

    public static class Edge {
        String targetNode;
        double weightKm;

        public Edge(String targetNode, double weightKm) {
            this.targetNode = targetNode;
            this.weightKm = weightKm;
        }
    }

    private static class NodeDistance implements Comparable<NodeDistance> {
        String node;
        double distance;

        public NodeDistance(String node, double distance) {
            this.node = node;
            this.distance = distance;
        }

        @Override
        public int compareTo(NodeDistance o) {
            return Double.compare(this.distance, o.distance);
        }
    }

    private final Map<String, List<Edge>> adjacencyList;

    public RouteDijkstraEngine() {
        this.adjacencyList = new HashMap<>();
        buildCoimbatoreTransitGraph();
    }

    private void addBiDirectionalEdge(String u, String v, double distKm) {
        adjacencyList.computeIfAbsent(u, k -> new ArrayList<>()).add(new Edge(v, distKm));
        adjacencyList.computeIfAbsent(v, k -> new ArrayList<>()).add(new Edge(u, distKm));
    }

    /**
     * Models realistic road connections between key Coimbatore transit hubs and PSG iTech Neelambur.
     */
    private void buildCoimbatoreTransitGraph() {
        // Southwest: Kuniamuthur / Sundarapuram / Ukkadam
        addBiDirectionalEdge("Kuniamuthur Market", "Sundarapuram", 3.2);
        addBiDirectionalEdge("Sundarapuram", "Kurichi", 2.1);
        addBiDirectionalEdge("Kuniamuthur Market", "Ukkadam Bus Stand", 5.4);
        addBiDirectionalEdge("Kurichi", "Podanur Junction", 4.0);
        addBiDirectionalEdge("Ukkadam Bus Stand", "Town Hall", 1.8);

        // Central: Town Hall / Gandhipuram / Railway Station
        addBiDirectionalEdge("Town Hall", "Coimbatore Junction", 1.2);
        addBiDirectionalEdge("Coimbatore Junction", "Gandhipuram", 3.1);
        addBiDirectionalEdge("Town Hall", "Gandhipuram", 3.8);

        // Eastbound Arterial (Avinashi Road) towards PSG iTech Neelambur
        addBiDirectionalEdge("Gandhipuram", "Lakshmi Mills", 2.2);
        addBiDirectionalEdge("Lakshmi Mills", "Nava India", 1.6);
        addBiDirectionalEdge("Nava India", "Peelamedu", 2.1);
        addBiDirectionalEdge("Peelamedu", "PSG Tech (Peelamedu)", 1.0);
        addBiDirectionalEdge("PSG Tech (Peelamedu)", "Hope College", 1.8);
        addBiDirectionalEdge("Hope College", "Coimbatore Medical College (CMC)", 1.4);
        addBiDirectionalEdge("Coimbatore Medical College (CMC)", "Coimbatore Airport Junction", 2.2);
        addBiDirectionalEdge("Coimbatore Airport Junction", "Chitra", 1.5);
        addBiDirectionalEdge("Chitra", "Neelambur Bypass", 3.8);
        addBiDirectionalEdge("Neelambur Bypass", "PSG iTech Campus", 1.2);

        // Trichy Road Line: Ukkadam -> Singanallur -> Ondipudur -> Irugur -> PSG iTech
        addBiDirectionalEdge("Ukkadam Bus Stand", "Ramanathapuram", 4.5);
        addBiDirectionalEdge("Ramanathapuram", "Singanallur", 3.2);
        addBiDirectionalEdge("Singanallur", "Ondipudur", 2.8);
        addBiDirectionalEdge("Ondipudur", "Irugur Junction", 3.1);
        addBiDirectionalEdge("Irugur Junction", "Sulur Air Force Base", 4.8);
        addBiDirectionalEdge("Irugur Junction", "Neelambur Bypass", 4.1);

        // Cross-connectors
        addBiDirectionalEdge("Singanallur", "Hope College", 3.5);
        addBiDirectionalEdge("Podanur Junction", "Singanallur", 4.2);

        // North: Saravanampatti / Thudiyalur
        addBiDirectionalEdge("Gandhipuram", "Ganapathy", 2.6);
        addBiDirectionalEdge("Ganapathy", "Saravanampatti", 4.5);
        addBiDirectionalEdge("Saravanampatti", "CHIL SEZ IT Park", 2.2);
        addBiDirectionalEdge("Saravanampatti", "Hope College", 6.8);
        addBiDirectionalEdge("Thudiyalur", "Ganapathy", 5.2);
        addBiDirectionalEdge("Periyanaickenpalayam", "Thudiyalur", 7.0);

        // West: Vadavalli / RS Puram
        addBiDirectionalEdge("Vadavalli", "Lawley Road (TNAU)", 4.0);
        addBiDirectionalEdge("Lawley Road (TNAU)", "RS Puram", 2.1);
        addBiDirectionalEdge("RS Puram", "Gandhipuram", 3.2);
    }

    public List<String> getAllKnownStops() {
        List<String> list = new ArrayList<>(adjacencyList.keySet());
        Collections.sort(list);
        return list;
    }

    @Override
    public List<String> findShortestPath(String sourceStop, String destStop) {
        if (!adjacencyList.containsKey(sourceStop) || !adjacencyList.containsKey(destStop)) {
            return Collections.emptyList();
        }

        Map<String, Double> distances = new HashMap<>();
        Map<String, String> previous = new HashMap<>();
        PriorityQueue<NodeDistance> pq = new PriorityQueue<>();

        for (String node : adjacencyList.keySet()) {
            distances.put(node, Double.POSITIVE_INFINITY);
        }

        distances.put(sourceStop, 0.0);
        pq.add(new NodeDistance(sourceStop, 0.0));

        while (!pq.isEmpty()) {
            NodeDistance current = pq.poll();
            String u = current.node;

            if (u.equals(destStop)) break;
            if (current.distance > distances.get(u)) continue;

            List<Edge> neighbors = adjacencyList.getOrDefault(u, Collections.emptyList());
            for (Edge edge : neighbors) {
                double newDist = distances.get(u) + edge.weightKm;
                if (newDist < distances.get(edge.targetNode)) {
                    distances.put(edge.targetNode, newDist);
                    previous.put(edge.targetNode, u);
                    pq.add(new NodeDistance(edge.targetNode, newDist));
                }
            }
        }

        // Reconstruct path
        LinkedList<String> path = new LinkedList<>();
        String curr = destStop;
        while (curr != null) {
            path.addFirst(curr);
            curr = previous.get(curr);
        }

        if (path.isEmpty() || !path.getFirst().equals(sourceStop)) {
            return Collections.emptyList();
        }
        return path;
    }

    @Override
    public double calculatePathDistance(List<String> path) {
        if (path == null || path.size() < 2) return 0.0;
        double total = 0.0;
        for (int i = 0; i < path.size() - 1; i++) {
            String u = path.get(i);
            String v = path.get(i + 1);
            boolean found = false;
            for (Edge e : adjacencyList.getOrDefault(u, Collections.emptyList())) {
                if (e.targetNode.equals(v)) {
                    total += e.weightKm;
                    found = true;
                    break;
                }
            }
            if (!found) total += 2.0; // fallback default
        }
        return Math.round(total * 100.0) / 100.0;
    }
}
