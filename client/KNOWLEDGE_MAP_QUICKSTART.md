# Quick Start: Streaming Knowledge Map

## What's New? 🎉

The streaming interface now includes a **live interactive knowledge map** that visualizes prerequisite concepts as they stream from the backend in real-time!

## How to Use

### 1. Ask a Question
Navigate to the Streaming Chat interface and ask any math-related question:
```
"What are the prerequisites for learning calculus?"
"Explain linear algebra to me"
"How do I learn differential equations?"
```

### 2. Watch the Map Build Live
As the backend streams prerequisite data:
- ✨ **Target concept** appears in the center (blue)
- 📚 **Prerequisites** animate in around the target
- 🎨 **Color coding** shows difficulty (green = beginner, blue = intermediate, orange = advanced)
- 📊 **Progress bar** shows stream completion

### 3. Switch Between Views
Use the tabs to toggle between:
- **Explanation Tab**: Traditional text-based answer with markdown
- **Knowledge Map Tab**: Interactive prerequisite visualization

### 4. Explore Concepts
Click any node to:
- See detailed information
- Understand why it matters
- Access learning resources
- View difficulty level

### 5. Navigate the Graph
- **Pan**: Click and drag the canvas
- **Zoom**: Scroll to zoom in/out
- **Minimap**: Use the minimap for quick navigation
- **Fit View**: Click the fit view button to center all nodes

## Features at a Glance

| Feature | Description |
|---------|-------------|
| 🎯 Real-time Updates | Prerequisites appear as they're discovered |
| 🎨 Color Coding | Visual difficulty levels (beginner/intermediate/advanced) |
| 📊 Live Stats | Progress bar and concept counter |
| 🖱️ Interactive | Click, drag, zoom, explore |
| 📱 Responsive | Works on desktop and mobile |
| 🎭 Animated | Smooth pulse effects for new nodes |
| 🗺️ Minimap | Quick navigation for large graphs |

## Visual Guide

### Node Colors
- 🟢 **Green**: Beginner level
- 🔵 **Blue**: Intermediate level / Target concept
- 🟠 **Orange**: Advanced level

### Node Types
- 🎯 **Target Node**: Large, centered, with "Target" label
- 📚 **Prerequisite Nodes**: Arranged in ellipse, with difficulty labels

### Edge Styles
- Animated edges pulse when first created
- Color matches source node difficulty
- Thicker lines connect to/from target

## Example Questions

Try these to see great knowledge maps:

```
1. "What do I need to know before learning machine learning?"
2. "Prerequisites for quantum mechanics"
3. "What should I learn before studying abstract algebra?"
4. "Explain the path to learning differential geometry"
5. "What concepts lead to understanding topology?"
```

## Tips for Best Experience

### ✅ Do
- Ask specific questions about learning paths
- Use the "Explanation" tab first for context
- Switch to "Knowledge Map" to visualize structure
- Click nodes to learn more about each concept
- Zoom in to see details, zoom out for overview

### ❌ Avoid
- Very simple questions (may have few prerequisites)
- Non-educational queries
- Questions without clear target concepts

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Mouse Drag | Pan the canvas |
| Scroll | Zoom in/out |
| Click Node | Open details panel |
| Esc | Close details panel |

## Mobile Experience

On mobile devices:
- Touch and drag to pan
- Pinch to zoom
- Tap nodes for details
- Swipe tabs to switch views

## Troubleshooting

### Map doesn't appear?
- Check if prerequisites were found (tab will be disabled if none)
- Wait for streaming to complete
- Try a more specific educational question

### Nodes overlapping?
- Use zoom controls
- Drag nodes to rearrange
- Click "Fit View" to reset layout

### Animation too fast/slow?
- Animations are optimized for typical stream speeds
- Pulse effects last 1.5 seconds per node
- Edges animate for 3 seconds when created

## Integration Points

The knowledge map integrates with:
- ✅ Streaming API events (`concepts`, `prerequisites`)
- ✅ Progress tracking (live updates)
- ✅ React Flow library (graph rendering)
- ✅ Material-UI theme (consistent styling)

## What's Next?

Planned enhancements:
- 🔄 Expand prerequisites recursively
- ⭐ Mark concepts as "mastered"
- 📥 Export map as image
- 🔗 Share maps with others
- 📚 Link directly to learning resources
- 🎯 Highlight recommended learning path

## Feedback

Found a bug or have a feature request? The knowledge map is actively being improved based on user feedback!

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-15  
**Status**: ✅ Production Ready
