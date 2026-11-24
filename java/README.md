# PSG iTech Campus Transport Fleet Management Console
## Java Mini Project — Object-Oriented Programming (OOP) & Java Swing

### 📌 Project Overview
This Java application serves as the **Desktop Transport Fleet Command Station** for **PSG Institute of Technology and Applied Research (PSG iTech), Neelambur, Coimbatore**. It provides real-time monitoring of the 15 college bus routes, incident dispatch (Breakdowns, Route Delays, and Emergency SOS), Dijkstra's shortest-path algorithm for route calculation, and an interactive **OOP 4 Pillars Inspector**.

---

### 🚀 How to Run the Java Project

#### Method 1: One-Click Batch Script (Recommended for Windows)
1. Open the `java/` folder.
2. Double-click **`run.bat`** (or open a terminal and run `.\run.bat`).
3. The Java Swing Desktop GUI window will launch immediately!

#### Method 2: Manual Terminal Commands (Java 18+)
```powershell
# Navigate to the java folder
cd java

# Compile all source files into the bin folder
javac -encoding UTF-8 -d bin -sourcepath src src/com/psgitech/transport/Main.java

# Run the Java Swing Desktop Application
java -cp bin com.psgitech.transport.Main
```

#### Headless CLI Verification (Terminal Mode)
To run just the 4 Pillars of OOP test suite directly in your console (without GUI):
```powershell
java -cp bin com.psgitech.transport.services.OopDemonstrationService
```

---

### 🏛️ The 4 Pillars of OOP — Architecture & Viva Defense

During your viva or project presentation, you can explain and demonstrate each pillar using the specific classes:

| OOP Pillar | Relevant Files | How It Is Implemented | What to Show the Examiner |
| :--- | :--- | :--- | :--- |
| **1. Encapsulation** | `CollegeBus.java`, `Student.java`, `Person.java` | All internal state variables (`currentLatitude`, `speedKmh`, `delayMinutes`, `rollNumber`) are strictly `private`. State mutation is governed by public getters and setters with validation (e.g. `setDelayMinutes()` rejects negative numbers and automatically updates status to `DELAYED`). | Show `CollegeBus.java` lines 20–50 and run the Encapsulation test in Tab 4. |
| **2. Inheritance** | `Person.java` $\rightarrow$ `Student.java`, `Driver.java`<br>`Vehicle.java` $\rightarrow$ `CollegeBus.java`<br>`TransitAlert.java` $\rightarrow$ `BreakdownAlert.java`, `DelayAlert.java`, `EmergencySosAlert.java` | Common personal attributes (id, name, email, phone) are abstracted into `Person`. Common fleet attributes (vehicleId, registration, capacity) are in `Vehicle`. Derived classes inherit common logic and add specialized state. | Show how `Student` and `Driver` extend `Person`, eliminating duplicated code. |
| **3. Polymorphism** | • **Method Overriding (Runtime):** `TransitAlert` subclasses (`dispatch()`)<br>• **Method Overloading (Compile-Time):** `CollegeBus.java` (`calculateEta()`) | • **Runtime Polymorphism:** A collection `List<TransitAlert>` dispatches alerts dynamically at runtime based on the actual subclass (`BreakdownAlert`, `DelayAlert`, `EmergencySosAlert`).<br>• **Compile-Time Polymorphism:** `calculateEta(dist)`, `calculateEta(dist, speed)`, and `calculateEta(dist, speed, delay)` provide multiple call signatures. | In Tab 2, dispatch an alert and show how the specific `dispatch()` logic executes depending on the alert chosen. |
| **4. Abstraction** | `ITrackable.java`, `IAlertable.java`, `IRouteOptimizer.java`, `Vehicle.java`, `Person.java` | Essential interfaces define behavioral contracts without exposing implementation details. The UI layer calls `IRouteOptimizer.findShortestPath()` without knowing how Dijkstra's graph relaxation works internally. | Show `ITrackable.java` and `IRouteOptimizer.java` in the `interfaces/` directory. |

---

### 🗺️ Data Structures & Algorithms (Dijkstra's Shortest Path)
- **Class:** `RouteDijkstraEngine.java`
- **Graph Representation:** Weighted Directed Graph using an Adjacency List (`Map<String, List<Edge>>`).
- **Algorithm:** Dijkstra’s shortest path algorithm with a `PriorityQueue` (Min-Heap) for $O((V + E) \log V)$ performance.
- **PSG iTech Real Network:** Accurately connects Kuniamuthur, Ukkadam, Gandhipuram, Peelamedu, Hope College, Singanallur, Ondipudur, Irugur, and Neelambur Campus with real Coimbatore road distances.

---

### 💻 Java Swing GUI Features
1. **Fleet Live Monitor (`JTable`):** Displays all 15 PSG iTech routes (Bus 01 to 15), status badges, driver details, and passenger counts.
2. **Incident & SOS Center:** Interactive form allowing transport managers to dispatch breakdowns, delays, or emergency SOS alerts with real-time log tracking.
3. **Dijkstra Route Planner:** Select origin and destination stops across Coimbatore to compute the shortest road path, road distance, and transit time.
4. **OOP 4 Pillars Inspector:** Interactive test console to execute live test runners for Encapsulation, Inheritance, Polymorphism, and Abstraction.
