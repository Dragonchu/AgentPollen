# Dual Camera System Documentation

## Overview

The dual camera system allows players to view the game from two perspectives simultaneously:
1. **Main Camera**: Shows the full game world with pan/zoom controls
2. **PiP (Picture-in-Picture) Camera**: Shows a zoomed-in view of the selected agent in the bottom-right corner

## Architecture

### Components

- **CameraManager**: Manages both main and PiP cameras
  - Main camera: Full world view with user controls
  - PiP camera: 300x300px viewport, 2x zoom, follows selected agent
  - Border graphics and label for visual distinction

- **CameraControlUI**: UI component with toggle button
  - Located in top-left area of the game viewport
  - Shows "Dual Camera" when off, "Dual: ON" when enabled
  - Green highlight when dual camera is active

- **GameScene**: Integrates dual camera functionality
  - Updates PiP camera target to follow selected agent each frame
  - Passes display state for smooth agent tracking

## Features

### 1. Toggle Dual Camera Mode

**How to Enable:**
- Click the "Dual Camera" button in the top-left area
- Button turns green and text changes to "Dual: ON"
- PiP camera appears in bottom-right corner

**How to Disable:**
- Click the "Dual: ON" button again
- PiP camera disappears

### 2. Automatic Agent Following

When dual camera mode is enabled:
- PiP camera automatically follows the selected agent
- Camera smoothly tracks agent movement using display state interpolation
- If no agent is selected, PiP camera remains at last position

**Behavior:**
```
1. Player clicks on an agent → Agent becomes selected
2. Dual camera is ON → PiP camera moves to agent position
3. Agent moves → PiP camera follows in real-time
4. Player selects different agent → PiP camera switches to new agent
```

### 3. Independent Zoom Levels

- Main camera: User-controlled zoom (0.3x - 3.0x)
- PiP camera: Fixed 2x zoom for close-up view
- Both cameras render the same game objects independently

### 4. Visual Indicators

**PiP Camera Border:**
- Green border (4px, #00ff00) around viewport
- "Close-Up" label in top-left corner
- Border is drawn by main camera to stay fixed on screen
- Border and label do not move with world pan/zoom

**Camera Control Button:**
- Gray background when disabled (#333333)
- Green background when enabled (#00aa00)
- Hover effect increases opacity
- Camera icon for visual identification

## API Reference

### CameraManager Methods

#### `setDualCameraEnabled(enabled: boolean): void`
Enable or disable dual camera mode.

```typescript
// Enable dual camera
cameraManager.setDualCameraEnabled(true);

// Disable dual camera
cameraManager.setDualCameraEnabled(false);
```

#### `isDualCameraEnabled(): boolean`
Check if dual camera mode is currently enabled.

```typescript
if (cameraManager.isDualCameraEnabled()) {
  console.log("Dual camera is active");
}
```

#### `setPipCameraTarget(worldX: number, worldY: number): void`
Set the target position for the PiP camera in world coordinates.

```typescript
// Move PiP camera to specific position
const agentX = agent.x * CELL_SIZE + CELL_SIZE / 2;
const agentY = agent.y * CELL_SIZE + CELL_SIZE / 2;
cameraManager.setPipCameraTarget(agentX, agentY);
```

#### `setPipCameraZoom(zoom: number): void`
Set the zoom level for the PiP camera (1-4x).

```typescript
// Set PiP camera to 3x zoom
cameraManager.setPipCameraZoom(3);
```

#### `getPipCamera(): Phaser.Cameras.Scene2D.Camera | null`
Get the PiP camera object (for debugging/testing).

```typescript
const pipCamera = cameraManager.getPipCamera();
if (pipCamera) {
  console.log("PiP zoom:", pipCamera.zoom);
}
```

## Integration Example

### GameScene Integration

```typescript
export class GameScene extends Phaser.Scene {
  private cameraManager!: CameraManager;
  private stateManager!: GameStateManager;

  create(): void {
    // Initialize camera manager
    this.cameraManager = new CameraManager(this, this.cameras.main);
    
    // Enable dual camera by default (optional)
    // this.cameraManager.setDualCameraEnabled(true);
  }

  update(time: number, delta: number): void {
    const selectedAgent = this.stateManager.getSelectedAgent();

    // Update PiP camera to follow selected agent
    if (this.cameraManager.isDualCameraEnabled() && selectedAgent && selectedAgent.alive) {
      const displayState = this.displayStateManager.getDisplayStates().get(selectedAgent.id);
      const targetX = displayState 
        ? displayState.displayX * CELL_SIZE + CELL_SIZE / 2 
        : selectedAgent.x * CELL_SIZE + CELL_SIZE / 2;
      const targetY = displayState 
        ? displayState.displayY * CELL_SIZE + CELL_SIZE / 2 
        : selectedAgent.y * CELL_SIZE + CELL_SIZE / 2;
      
      this.cameraManager.setPipCameraTarget(targetX, targetY);
    }
  }
}
```

### UIManager Integration

```typescript
export class UIManager {
  create(): void {
    // ... other UI components

    // Camera Control
    const cameraControlUI = new CameraControlUI(
      this.scene,
      x,
      y,
      width,
      height,
      this.cameraManager
    );
    cameraControlUI.create();
    this.uiComponents.set("cameraControl", cameraControlUI);
  }
}
```

## Technical Details

### PiP Camera Configuration

```typescript
{
  width: 300,          // Viewport width in pixels
  height: 300,         // Viewport height in pixels
  zoom: 2,             // 2x magnification
  padding: 20,         // Distance from screen edges
  position: "bottom-right"  // Default position
}
```

### Camera Rendering Order

1. Main camera renders the full world (depth 0)
2. PiP camera renders to its viewport (depth 1)
3. Border graphics render on top (depth 10000)
4. Border label text renders on top (depth 10001)

### Performance Considerations

- PiP camera viewport is relatively small (300x300), minimal performance impact
- Border is redrawn only when PiP camera is created or window resizes
- Agent following uses interpolated display state, no per-pixel calculations

## Configuration Options

To customize PiP camera, modify these private properties in `CameraManager.ts`:

```typescript
private pipCameraWidth: number = 300;      // Change viewport width
private pipCameraHeight: number = 300;     // Change viewport height
private pipCameraPadding: number = 20;     // Change edge padding
```

To change default PiP camera zoom, modify in `createPipCamera()`:

```typescript
this.pipCamera.setZoom(2); // Change from 2x to desired zoom
```

## Known Limitations

1. PiP camera position is fixed to bottom-right corner
   - Future: Could add draggable positioning
2. PiP camera only follows selected agent
   - Future: Could add option to lock to specific position
3. Single PiP camera supported
   - Future: Could support multiple PiP views

## Troubleshooting

### PiP camera not appearing
- Check if dual camera is enabled: `cameraManager.isDualCameraEnabled()`
- Verify agent is selected: `stateManager.getSelectedAgent()`

### Border not visible
- Check border graphics depth (should be 10000+)
- Verify main camera is not ignoring border graphics

### PiP camera not following agent
- Ensure `setPipCameraTarget()` is called in `update()` loop
- Check agent alive state
- Verify display state exists for agent

## Future Enhancements

1. **Draggable PiP Position**: Allow users to drag PiP camera to different corners
2. **Multiple PiP Views**: Support 2-4 simultaneous PiP cameras
3. **Minimap Mode**: Option to show entire map in PiP instead of zoom
4. **PiP Zoom Control**: UI slider to adjust PiP camera zoom level
5. **Lock PiP Position**: Toggle to lock PiP camera to specific world position
6. **Comparison View**: Split-screen mode for side-by-side agent comparison

## Update Log

### v1.0.0 (2026-02-16)
- ✅ Implemented dual camera system
- ✅ PiP camera with 2x zoom
- ✅ Automatic agent following
- ✅ Toggle button UI
- ✅ Border and label graphics
- ✅ Integration with GameScene
