import { Component, type ReactNode } from 'react';
import { GlassCard } from './GlassCard';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <GlassCard className="m-4 text-center">
          <p className="text-sm font-semibold text-[#ba1a1a] mb-1">Ocorreu um erro inesperado</p>
          <p className="text-xs text-[#464555]/60">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-3 text-xs text-[#493ee5] underline"
          >
            Tentar novamente
          </button>
        </GlassCard>
      );
    }
    return this.props.children;
  }
}
