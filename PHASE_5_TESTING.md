# Phase 5: Testing & Optimization Guide

## Architecture Summary

```
Phaser Scene
├─ GameStateManager (state + events)
├─ NetworkManager (Socket.IO + server communication)
├─ UIManager (6 UI components)
│  ├─ HeaderUI (status bar)
│  ├─ SidebarUI (agent list)
│  ├─ VotePanelUI (voting interface)
│  ├─ AgentStatsUI (selected agent details)
│  ├─ EventFeedUI (event log)
│  └─ AIThinkingUI (AI thinking history)
├─ AgentDisplayStateManager (smooth animation)
├─ GameSceneRenderer (visual connections)
└─ Sprite/Graphics objects (rendered agents, items, obstacles)
```

## Functional Testing Checklist

### 1. Network & Connection
- [ ] Server connects on game load
- [ ] Socket connects to NEXT_PUBLIC_SERVER_URL
- [ ] Connection status reflected in UI
- [ ] Handles reconnection on disconnect
- [ ] Clears stale data on disconnect

### 2. Game State Synchronization
- [ ] Full sync (`sync:full`) creates initial state
- [ ] World state updates (`sync:world`) apply correctly
- [ ] Agent updates (`sync:agents`) merge incrementally
- [ ] Events (`sync:events`) appear in EventFeed
- [ ] Vote state (`vote:state`) updates VotePanel
- [ ] Thinking history (`thinking:history`) populates AIThinkingUI

### 3. Agent Selection & Inspection
- [ ] Clicking agent in SidebarUI selects it
- [ ] Selected agent highlighted in Sidebar (cyan border)
- [ ] AgentStatsUI shows correct stats for selected agent
- [ ] AIThinkingUI displays thinking history for selected agent
- [ ] Deselecting clears detail views

### 4. Voting System
- [ ] Vote panel displays countdown timer
- [ ] Progress bar shows remaining time (60s base)
- [ ] 3 preset vote cards (Attack, Defend, Heal) functional
- [ ] Vote counts update in real-time
- [ ] Custom action input field works
- [ ] Voting without selection shows error/no-op
- [ ] Vote statistics display correctly

### 5. Event Display
- [ ] Events appear in EventFeed newest-first
- [ ] Event emoji icons match GameEventType
- [ ] Event messages display correctly
- [ ] Scrolling works (mouse wheel)
- [ ] Limited to max 50 events
- [ ] New events appear at top

### 6. AI Thinking Display
- [ ] Status indicator shows agent state (🟢 Active / 🔴 Eliminated)
- [ ] Breathing animation on status indicator
- [ ] Thinking history displays newest-first
- [ ] Relative timestamps display ("just now", "5s ago", etc.)
- [ ] Timestamps refresh every 5 seconds
- [ ] Latest decision highlighted (cyan border)
- [ ] Scrolling works (mouse wheel)
- [ ] Limited to max 20 items

### 7. Animations & Visual Effects
- [ ] HeaderUI: LIVE indicator breathing animation (2s cycle)
- [ ] Progress bars animate smoothly on value changes
- [ ] Agent sprites animate (walk, attack, idle)
- [ ] Zone boundary visualized
- [ ] Connections drawn between allied agents
- [ ] Alliance highlights render correctly

### 8. Responsive Layout
- [ ] UI adapts to window resize
- [ ] Components don't overlap at different resolutions
- [ ] Scrollable containers clip content properly
- [ ] Touch events work (pointer input)
- [ ] Mobile viewport (if supported)

### 9. Performance
- [ ] 60 FPS maintained during normal gameplay
- [ ] No frame drops when new events arrive
- [ ] Smooth scrolling in large lists (50+ items)
- [ ] Memory usage stable over time
- [ ] No memory leaks on scene transitions

### 10. Data Validation
- [ ] Negative health clamped to 0
- [ ] Shield value calculated correctly (defense * 5)
- [ ] Health bar color updates: green (>60%) → orange (>30%) → red (≤30%)
- [ ] Kill count displays correctly
- [ ] Alliance/enemy lists don't contain self
- [ ] Agent names display without truncation

## Optimization Checklist

### Already Implemented
- [x] EventFeedUI: Skip rebuild if event count unchanged
- [x] AIThinkingUI: Skip rebuild if history length unchanged
- [x] AIThinkingUI: Optimize timestamp refresh (text update only)
- [x] SidebarUI: Skip rebuild if agent count unchanged
- [x] ScrollableContainer: Cache bounds rectangle

### Potential Future Optimizations
- [ ] Object pooling for frequently created/destroyed UI elements
- [ ] BitmapText for high-frequency text updates (status displays)
- [ ] Sprite sheet caching for agent animations
- [ ] Reduce draw calls by combining graphics where possible
- [ ] Virtual scrolling for very large lists (100+ items)
- [ ] Lazy load thinking history (pagination)

## Debug Tips

### Enable Debug Mode
```typescript
// In GameScene.create() or GameCanvas.tsx
const config = {
  // ... existing config
  debug: true,
  render: {
    pixelArt: true
  }
}
```

### Check State Manager
```javascript
// In browser console
const scene = game.scene.scenes[0];
const state = scene.getStateManager().getState();
console.log('Agents:', state.agents.size);
console.log('Events:', state.events.length);
console.log('Selected:', state.selectedAgent?.name);
```

### Monitor Network Events
```javascript
const nm = scene.getNetworkManager();
nm.getSocket().onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

## Performance Profiling

### Using Chrome DevTools
1. Open DevTools → Performance tab
2. Record gameplay for 30 seconds
3. Look for:
   - Frame rate (target: 60 FPS)
   - Long tasks (>16ms frames)
   - Memory growth over time

### Metrics to Track
- Average frame time
- Memory usage (MB)
- GC pauses (ms)
- Network latency (ping)
- Component update frequency

## Known Limitations

1. **Event Limit**: EventFeedUI limited to 50 events (older removed)
2. **Thinking History Limit**: AIThinkingUI limited to 20 items
3. **Timestamp Refresh**: Only updates every 5 seconds (not real-time)
4. **DOMElement**: VotePanelUI custom input uses DOMElement (may have focus issues)

## Testing Environment Setup

### Prerequisites
- Node.js 18+
- Phaser 3.88.0
- Socket.IO client/server
- Modern browser (Chrome/Firefox)

### Development Server
```bash
cd packages/web
npm run dev
```

### Build & Production Test
```bash
npm run build
npm run start
```

### Test with Mock Server
Create a test server that sends mock Socket.IO events for testing without full backend.

## Sign-Off Checklist

- [ ] All functional tests pass
- [ ] Frame rate stable at 60 FPS
- [ ] Memory usage stable (<500MB)
- [ ] No console errors
- [ ] No memory leaks detected
- [ ] UI responsive across resolutions
- [ ] Network handles disconnect/reconnect
- [ ] All animations smooth
- [ ] Text readable at all zoom levels
- [ ] Mobile viewport tested (if applicable)
