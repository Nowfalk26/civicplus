import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MapErrorBoundary] Caught map rendering error:', error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[280px] flex flex-col items-center justify-center p-6 bg-surface-container-low text-center rounded-2xl border border-surface-container shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[32px]">map</span>
          </div>
          <h3 className="font-bold text-sm text-on-surface mb-1">
            {this.props.fallbackTitle || 'Map Safe Recovery Mode'}
          </h3>
          <p className="text-xs text-on-surface-variant max-w-sm mb-4 leading-relaxed">
            The map encountered a display or tile issue and was safely recovered to prevent a blank screen.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-md hover:bg-primary-dark active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Retry Map</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
