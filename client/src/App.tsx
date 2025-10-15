import './App.css'
// Option 1: Use the new StreamingChat demo (uncomment to use)
import StreamingDemoPage from './pages/StreamingDemo.page';

// Option 2: Use the existing app (default)
import MathLearningApp from './components';

function App() {
  // Toggle between streaming demo and existing app
  const USE_STREAMING_DEMO = true; // Change to false to use existing app

  return (
    <div style={{ height: '100dvh', margin: 0, padding: 0 }}>
      {USE_STREAMING_DEMO ? <StreamingDemoPage /> : <MathLearningApp />}
    </div>
  );
}

export default App
