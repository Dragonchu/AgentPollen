# Dual Camera Visual Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        Browser Window (1280x720)                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │                        Header UI                               │ │
│ │  ⚔ AI BATTLE ROYALE    🔴 LIVE    Time: 03:45    Alive: 42    │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─────────┐  ┌─────────────────────────────────────┐  ┌─────────┐ │
│ │         │  │ 📷 Dual Camera                      │  │         │ │
│ │ Side    │  │    (Toggle Button)                  │  │  Right  │ │
│ │ bar     │  └─────────────────────────────────────┘  │  Panel  │ │
│ │         │                                           │         │ │
│ │ Leader  │                                           │  Vote   │ │
│ │ board   │     ┌─────────────────────────────┐     │  Panel  │ │
│ │         │     │                             │     │         │ │
│ │         │     │      MAIN CAMERA VIEW       │     │  Agent  │ │
│ │         │     │   (Full World, Pan/Zoom)    │     │  Stats  │ │
│ │         │     │                             │     │         │ │
│ │         │     │    🟢 Agent A               │     │  Event  │ │
│ │         │     │         🔵 Agent B          │     │  Feed   │ │
│ │         │     │                🔴 Agent C   │     │         │ │
│ │         │     │                             │     │         │ │
│ │         │     │              ┌─────────┐    │     │         │ │
│ │         │     │              │Close-Up │    │     │         │ │
│ │         │     │              ├─────────┤    │     │         │ │
│ │         │     │              │   🟢    │    │     │         │ │
│ │         │     │              │ Agent A │    │     │         │ │
│ │         │     │              │ (2x)    │    │     │         │ │
│ │         │     │              └─────────┘    │     │         │ │
│ │         │     │          PiP CAMERA VIEW    │     │         │ │
│ │         │     └─────────────────────────────┘     │         │ │
│ │         │                                           │         │ │
│ └─────────┘  ┌─────────────────────────────────┐  └─────────┘ │
│              │    AI Thinking Process Panel     │              │
│              └─────────────────────────────────┘              │
└────────────────────────────────────────────────────────────────────┘
```

## How It Works

### Normal Mode (Dual Camera OFF)
```
┌───────────────────────────┐
│   Main Camera (Only)      │
│                           │
│   Covers full viewport    │
│   User controls:          │
│   - Pan (drag/WASD)       │
│   - Zoom (scroll)         │
│                           │
└───────────────────────────┘
```

### Dual Camera Mode (Dual Camera ON)
```
┌───────────────────────────┐
│   Main Camera             │
│                           │
│   Strategic overview      │
│   User-controlled         │
│                           │
│           ┌───────┐       │
│           │ PiP   │       │
│           │ 2x    │       │
│           │ Zoom  │       │
│           └───────┘       │
│        Follows selected   │
│        agent automatically│
└───────────────────────────┘
```

## Component Interactions

```
┌─────────────────┐     Toggle      ┌─────────────────┐
│ CameraControlUI │ ─────────────>  │  CameraManager  │
│  (Button)       │                  │                 │
└─────────────────┘                  │ - Main Camera   │
                                     │ - PiP Camera    │
                                     │ - Border        │
                                     └────────┬────────┘
                                              │
                                              │ Update Target
                                              │
                                     ┌────────▼────────┐
                                     │   GameScene     │
                                     │                 │
                                     │ update() loop:  │
                                     │ - Get selected  │
                                     │   agent         │
                                     │ - Update PiP    │
                                     │   target        │
                                     └─────────────────┘
```

## Camera Hierarchy

```
Phaser Scene
├── cameras.main (Main Camera)
│   ├── Renders: All game objects
│   ├── Zoom: 0.3x - 3.0x (user controlled)
│   └── Position: User-controlled (drag/keyboard)
│
└── cameras[1] (PiP Camera)
    ├── Renders: Same game objects
    ├── Zoom: 2x (fixed)
    ├── Position: Follows selected agent
    └── Viewport: 300x300px at bottom-right
```

## Graphics Rendering Order

```
Layer       Depth    What
────────────────────────────────────────
Game World    0      Agents, items, terrain
Main Camera   1      Main viewport
PiP Camera    2      PiP viewport (300x300)
PiP Border  10000    Green border rectangle
PiP Label   10001    "Close-Up" text
UI Layer    1000+    Buttons, panels, stats
```

## User Interaction Flow

```
Player Action                    System Response
─────────────────────────────────────────────────────
1. Player clicks agent       →  Agent becomes selected
                                 (highlight + detail panel)

2. Player clicks              →  Dual camera mode ON
   "Dual Camera" button          PiP camera created
                                 Border drawn
                                 Button turns green

3. Agent moves               →  GameScene.update() detects
                                 movement, calls
                                 setPipCameraTarget()
                                 PiP camera follows smoothly

4. Player selects            →  PiP camera switches to
   different agent              new agent's position

5. Player clicks             →  Dual camera mode OFF
   "Dual: ON" button            PiP camera destroyed
                                 Border removed
                                 Button returns to gray
```

## Performance Characteristics

### Memory Usage
- Main camera: ~10KB (Phaser camera object)
- PiP camera: ~10KB (Phaser camera object)
- Border graphics: ~2KB (simple rectangle + text)
- **Total overhead: ~22KB**

### Rendering Performance
- Main camera: Renders full viewport
- PiP camera: Renders 300x300 = 90,000 pixels
- PiP is ~7-10% of full HD viewport
- **Performance impact: Minimal (<5% FPS drop)**

### Update Performance
- Target position update: O(1) per frame
- Border redraw: Only on create/resize
- **CPU impact: Negligible**

## Code Flow Example

```typescript
// Frame N: Player has Agent #5 selected, dual camera is ON

GameScene.update(time, delta) {
  const selectedAgent = stateManager.getSelectedAgent();
  // selectedAgent = { id: 5, x: 23, y: 45, ... }
  
  if (cameraManager.isDualCameraEnabled() && selectedAgent) {
    // Get smooth interpolated position
    const displayState = displayStateManager.get(5);
    const targetX = displayState.displayX * 64 + 32; // 1504
    const targetY = displayState.displayY * 64 + 32; // 2912
    
    // Update PiP camera to center on agent
    cameraManager.setPipCameraTarget(targetX, targetY);
    // PiP camera.scrollX = 1504 - 150 = 1354
    // PiP camera.scrollY = 2912 - 150 = 2762
  }
  
  // Phaser automatically renders both cameras
  // Main camera: Shows full world based on user pan/zoom
  // PiP camera: Shows 300x300px centered on (1504, 2912)
}
```

## Future Enhancement Ideas

### Draggable PiP Position
```
┌───────────────────────────┐
│   Main Camera             │
│                           │
│   ┌───────┐               │  ← User can drag to
│   │ PiP   │               │    any corner
│   └───────┘               │
│                           │
└───────────────────────────┘
```

### Multiple PiP Views
```
┌───────────────────────────┐
│   Main Camera             │
│                           │
│   ┌────┐         ┌────┐   │
│   │PiP1│         │PiP2│   │  ← Compare 2 agents
│   └────┘         └────┘   │    simultaneously
│                           │
└───────────────────────────┘
```

### Minimap Mode
```
┌───────────────────────────┐
│   Main Camera (Zoomed)    │
│                           │
│           ┌───────┐       │
│           │Mini   │       │  ← Shows entire map
│           │Map    │       │    with current view
│           │(0.3x) │       │    highlighted
│           └───────┘       │
└───────────────────────────┘
```
