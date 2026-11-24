package com.psgitech.transport.interfaces;

import java.util.List;

/**
 * ABSTRACTION (Pillar 4):
 * Contract defining route pathfinding and graph optimization algorithms.
 */
public interface IRouteOptimizer {
    List<String> findShortestPath(String sourceStop, String destStop);
    double calculatePathDistance(List<String> path);
}
