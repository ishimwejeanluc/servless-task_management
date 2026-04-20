import React from 'react';

/**
 * Production-grade React Error Boundary Layer
 * 
 * Purpose: Catch JavaScript errors anywhere in their child component tree,
 * log those errors, and display a fallback UI instead of crashing the whole React tree.
 * 
 * Why:
 * 1. An uncaught error in a deeply nested component shouldn't break the navigation bar or layout.
 * 2. Allows us to integrate with Sentry or Datadog seamlessly.
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // Track whether there's an error and what it is
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service like Sentry here
    console.error("Uncaught error in React Tree:", error, errorInfo);
    
    // e.g. Sentry.captureException(error, { extra: errorInfo });
    this.setState({ errorInfo });
  }

  handleReset = () => {
    // Attempt to recover by resetting state
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4d4f' }}>
          <h2>Something went wrong.</h2>
          <p>We're sorry, an unexpected error occurred while rendering this component.</p>
          <details style={{ whiteSpace: 'pre-wrap', margintop: '1rem', color: '#666', textAlign: 'left' }}>
            <summary>Click for error details</summary>
            {this.state.error?.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
          <button 
             onClick={this.handleReset}
             style={{ marginTop: '2rem', padding: '10px 20px', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    // Normally, just render children
    return this.props.children; 
  }
}

export default ErrorBoundary;
