# MathPrereq Frontend

A modern React application for interactive mathematics learning with neural network visualization and AI-powered concept exploration.

## 🚀 Features

- **Interactive Chat**: Ask mathematical questions and get AI-powered responses
- **Neural Network Visualization**: Explore concepts through an interactive knowledge map
- **Smart Concept Queries**: Get detailed explanations with educational resources
- **Learning Path Generation**: AI-generated learning sequences with prerequisites
- **Resource Integration**: Curated educational content from YouTube, Khan Academy, etc.
- **Real-time Health Monitoring**: API connectivity and service status

## 🛠️ Tech Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for components
- **Vite** for build tooling
- **ESLint** for code quality
- **REST API** integration with Go backend

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mathprereq/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API settings
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8080/api/v1

# App Settings
VITE_APP_NAME=MathPrereq
VITE_APP_VERSION=1.0.0

# Optional: Enable debug logging
VITE_DEBUG=false
```

### Backend Setup

Ensure your Go backend is running on the configured API URL. The backend should provide:

- `POST /api/v1/query` - General question processing
- `POST /api/v1/concept-query` - Smart concept analysis with caching
- `GET /api/v1/resources/concept/{concept}` - Educational resources
- `GET /api/v1/health` - Health check endpoints

## 🎯 Usage

### Basic Chat Interaction

1. **Ask a question** in the chat input (e.g., "What is the derivative of x²?")
2. **Get AI response** with explanation and learning path
3. **Explore concepts** by clicking on the neural network nodes
4. **View resources** in the right panel for additional learning materials

### Neural Network Map

- **Drag nodes** to reorganize the concept layout
- **Click nodes** to view detailed information
- **Mark concepts as mastered** to track progress
- **View connections** between related mathematical concepts

### Resource Discovery

- **Automatic fetching** of educational resources for selected concepts
- **Quality filtering** with ratings and view counts
- **Platform variety** including YouTube, Khan Academy, Coursera
- **Direct links** to external learning materials

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── Chat.tsx        # Main chat interface
│   ├── VisualRoadmap.tsx # Neural network visualization
│   ├── ConceptMap.tsx  # Concept mapping wrapper
│   ├── Resources.tsx   # Educational resources display
│   ├── HealthCheck.tsx # API health monitoring
│   └── index.tsx       # Main app component
├── services/           # API integration
│   └── api.ts          # API client and utilities
├── types/             # TypeScript type definitions
│   └── api.ts         # API response types
└── main.tsx           # App entry point
```

## 🔌 API Integration

The app integrates with the MathPrereq Go backend through a typed API client:

```typescript
import { mathAPI } from './services/api';

// Process a mathematical question
const response = await mathAPI.processQuery("What is calculus?");

// Get smart concept analysis with caching
const conceptData = await mathAPI.smartConceptQuery("derivatives", {
  includeResources: true,
  maxResources: 10
});

// Fetch educational resources
const resources = await mathAPI.getResourcesForConcept("calculus", {
  limit: 20,
  minQuality: 80
});
```

## 🎨 UI/UX Design

- **Calm Color Palette**: Professional blue and green tones
- **Responsive Layout**: Works on desktop and mobile devices
- **Smooth Animations**: Subtle transitions and loading states
- **Accessibility**: ARIA labels and keyboard navigation
- **Dark/Light Mode**: Automatic theme switching

## 🚀 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Code formatting (integrated with ESLint)

## 📊 Performance

- **Smart Caching**: Backend provides 90% cost reduction through caching
- **Lazy Loading**: Components loaded on demand
- **Optimized Rendering**: Efficient React re-renders
- **API Batching**: Multiple requests optimized

## 🔒 Security

- **Input Validation**: All user inputs validated
- **XSS Protection**: Content Security Policy headers
- **CORS Configuration**: Proper cross-origin handling
- **Request Tracking**: All API calls logged with IDs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the MathPrereq research initiative.

## 🆘 Troubleshooting

### Common Issues

**API Connection Failed**
- Check if backend is running on the configured URL
- Verify CORS settings in backend
- Check network connectivity

**Type Errors**
- Ensure TypeScript types match backend API
- Run `npm run lint` to check for issues
- Update types if API changes

**Build Errors**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify environment variables

## 📞 Support

For questions or issues:
- Check the API documentation
- Review the troubleshooting section
- Create an issue in the repository

---

**Built with ❤️ for mathematical education research**
