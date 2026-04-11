import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { trackEvent } from '../../utils/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
    trackEvent('render_crash', 'error', error.message);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container" style={{ marginTop: '60px', textAlign: 'center' }}>
          <div className="panel panel-danger">
            <div className="panel-heading">
              <h3 className="panel-title">
                <i className="fa fa-exclamation-triangle"></i> Something went wrong
              </h3>
            </div>
            <div className="panel-body">
              <p>An unexpected error occurred. Please try again.</p>
              {this.state.error && (
                <pre style={{ textAlign: 'left', fontSize: '12px', maxHeight: '150px', overflow: 'auto' }}>
                  {this.state.error.message}
                </pre>
              )}
              <button
                className="btn btn-primary"
                onClick={this.handleReset}
                style={{ marginTop: '10px' }}
              >
                <i className="fa fa-refresh"></i> Try Again
              </button>
              <a
                href="/"
                className="btn btn-default"
                style={{ marginTop: '10px', marginLeft: '10px' }}
              >
                <i className="fa fa-home"></i> Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
