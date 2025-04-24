import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service here
    console.error("Uncaught error:", error, errorInfo);
  }

  // Function to attempt recovery (e.g., reload)
  private handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined });
    // Depending on the error, you might want to reload the page
    // or try re-mounting the component differently.
    // For simplicity, we just reset state, allowing children to re-render.
    // A full page reload might be safer in many cases:
    // window.location.reload(); 
  };

  public render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div 
            className="flex flex-col items-center justify-center min-h-[400px] p-6 border border-dashed border-danger-300 bg-danger-50 rounded-lg text-center"
            role="alert"
        >
          <AlertTriangle className="h-12 w-12 text-danger-500 mb-4" />
          <h2 className="text-xl font-semibold text-danger-700 mb-2">Something went wrong.</h2>
          <p className="text-danger-600 mb-4">
            {this.props.fallbackMessage || "We encountered an unexpected error. Please try again or contact support if the problem persists."}
          </p>
          {/* Optionally show error details in development */}          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-2 text-xs text-left bg-white p-2 border rounded overflow-auto max-w-full text-danger-700">
              {this.state.error.toString()}
              <br />
              {this.state.error.stack?.substring(0, 500)}...
            </pre>
          )}
          <Button 
            variant="destructive"
            onClick={this.handleTryAgain}
            className="mt-6"
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 