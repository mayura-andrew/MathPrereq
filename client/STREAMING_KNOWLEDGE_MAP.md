# Streaming Knowledge Map Feature

## Overview

The **Streaming Knowledge Map** is an interactive, real-time visualization component that displays prerequisite concepts as they are received from the streaming API. This provides users with an engaging, live view of how concepts are connected and builds understanding progressively.

## Features

### 🎯 Real-time Visualization
- **Live Node Creation**: Prerequisites appear as animated nodes as they stream in
- **Progressive Building**: Graph builds dynamically, showing connections in real-time
- **Smooth Animations**: Pulse effects, fade-ins, and smooth transitions enhance UX

### 🗺️ Interactive Graph
- **React Flow Integration**: Built on react-flow for smooth pan, zoom, and drag interactions
- **Elliptical Layout**: Prerequisites arranged in an elegant ellipse around the target concept
- **Color-coded Difficulty**: Nodes colored by difficulty level (beginner/green, intermediate/blue, advanced/orange)
- **Smart Positioning**: Automatic layout prevents overlapping and maintains visual clarity

### 📊 Live Statistics
- **Progress Tracking**: Real-time progress bar showing stream completion
- **Concept Counter**: Live count of prerequisites and target concepts
- **Stage Information**: Current processing stage display

### 🎨 Enhanced UX
- **Dual View Tabs**: Switch between Explanation and Knowledge Map views
- **Side Panel Details**: Click any node to see detailed information
- **Minimap Navigation**: Quick overview and navigation for large graphs
- **Background Grid**: Visual reference grid for spatial orientation

## Component Architecture

### StreamingKnowledgeMap.component.tsx

**Key Features:**
- Subscribes to `StreamState` for real-time updates
- Custom `StreamingNode` component with pulse animations
- Automatic layout calculation for optimal visualization
- Side panel for detailed concept information

**Props:**
```typescript
interface StreamingKnowledgeMapProps {
  streamState: StreamState;      // Current streaming state
  targetConcept?: string;         // Main concept being learned
}
```

**State Management:**
- `nodes`: React Flow nodes (visual representation)
- `edges`: React Flow edges (connections between concepts)
- `nodeMap`: Internal map of concept data
- `selectedNode`: Currently selected node for side panel

## Integration

### StreamingAnswerDisplay.tsx

The knowledge map is integrated into the answer display with tabs:

1. **Explanation Tab**: Traditional textual explanation with markdown support
2. **Knowledge Map Tab**: Interactive prerequisite graph

```tsx
<Tabs value={activeTab} onChange={handleTabChange}>
  <Tab icon={<RiArticleLine />} label="Explanation" />
  <Tab icon={<RiNodeTree />} label="Knowledge Map" />
</Tabs>
```

**Tab Activation:**
- Knowledge Map tab is enabled once prerequisites are received
- Automatically disabled if no prerequisites exist

## Data Flow

```
Backend Stream → useStreamingChat Hook → StreamState
                                           ↓
                        StreamingAnswerDisplay Component
                                           ↓
                        StreamingKnowledgeMap Component
                                           ↓
                                   React Flow Nodes/Edges
```

### Stream Events Processed

1. **`concepts`**: Main concepts identified → Target nodes created
2. **`prerequisites`**: Prerequisites discovered → Prerequisite nodes added
3. **`progress`**: Processing updates → Progress bar updated

## Visual Design

### Node Types

**Target Node:**
- Centered position
- Primary blue color
- "Target" chip label
- Larger size with glow effect

**Prerequisite Nodes:**
- Distributed in ellipse pattern
- Color based on difficulty level
- Difficulty chip label
- Pulse animation on creation

### Layout Algorithm

```typescript
// Elliptical distribution around center
const angle = (index / prerequisiteCount) * 2 * Math.PI - Math.PI / 2;
const x = centerX + Math.cos(angle) * radiusX;
const y = centerY + Math.sin(angle) * radiusY;
```

### Edge Styling

- **Animated**: New edges pulse for 3 seconds
- **Color**: Matches source node difficulty color
- **Stroke Width**: Thicker for connections to/from target
- **Type**: Smooth step curves for elegant appearance

## User Interactions

### Node Click
Opens side panel with:
- Concept name and type (Target/Prerequisite)
- Difficulty level
- Description (if available)
- Contextual information
- Action buttons (Learn More, Find Resources)

### Pan & Zoom
- Mouse drag to pan
- Scroll to zoom
- Minimap for quick navigation
- Fit view button in controls

### Controls
- Zoom In/Out buttons
- Fit View button
- Lock/Unlock interaction
- Minimap toggle

## Performance Optimizations

### Memoization
- `useMemo` for computed statistics
- `useCallback` for event handlers
- Prevents unnecessary re-renders

### Animation Timing
- New node flag cleared after 2 seconds
- Pulse animations run once per node
- Smooth 0.3s transitions

### State Updates
- Batched node/edge updates
- Efficient Map-based storage
- Minimal re-renders on stream updates

## Styling & Theming

### Material-UI Integration
- Respects theme colors and spacing
- Dark mode compatible
- Consistent with app design language

### Custom Animations
```typescript
const pulseAnimation = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
`;
```

### Responsive Design
- Adapts to container size
- Mobile-friendly touch interactions
- Scales nodes based on viewport

## Future Enhancements

### Potential Features
1. **Resource Integration**: Show learning resources per concept
2. **Progress Tracking**: Mark concepts as "mastered"
3. **Export**: Save graph as image or PDF
4. **Collaborative**: Share graphs with others
5. **Animations**: More sophisticated node animations
6. **Filters**: Filter by difficulty, type, etc.
7. **Search**: Find specific concepts in large graphs
8. **Expand**: Click to expand prerequisites of prerequisites

### API Enhancements
- Concept relationships strength (confidence scores)
- Estimated learning time per prerequisite
- Recommended learning order
- Related concepts suggestions

## Example Usage

```tsx
import StreamingKnowledgeMap from './components/StreamingKnowledgeMap.component';

function MyComponent() {
  const { streamState } = useStreamingChat();
  
  return (
    <StreamingKnowledgeMap 
      streamState={streamState}
      targetConcept="Calculus"
    />
  );
}
```

## Benefits

### For Students
- **Visual Learning**: See the big picture of concept dependencies
- **Progressive Discovery**: Watch knowledge structure build in real-time
- **Interactive Exploration**: Click and explore concepts at your own pace
- **Clear Prerequisites**: Understand what to learn first

### For Educators
- **Curriculum Planning**: Visualize course structure
- **Gap Identification**: See missing prerequisite knowledge
- **Resource Assignment**: Assign learning materials per concept
- **Progress Monitoring**: Track student mastery visually

## Technical Stack

- **React**: UI framework
- **TypeScript**: Type safety
- **React Flow**: Graph visualization library
- **Material-UI**: Component library
- **Emotion**: CSS-in-JS styling

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- High contrast color schemes
- Screen reader compatible

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

**Created**: 2025-10-15  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
