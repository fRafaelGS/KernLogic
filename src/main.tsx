import React, { ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/domains/app/App'
import './index.css'

// Import i18n (must be imported before any component that uses it)
import './i18n'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by error boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffeeee', 
          border: '1px solid #ff5555',
          borderRadius: '8px',
          margin: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ color: '#cc0000' }}>Something went wrong</h1>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Show error details</summary>
            <p style={{ marginTop: '10px' }}>{this.state.error?.toString()}</p>
            <p style={{ marginTop: '10px' }}>Component Stack:</p>
            <pre style={{ backgroundColor: '#f8f8f8', padding: '10px', overflow: 'auto' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
