import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-slate-200/90 my-6 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800">
            {this.props.fallbackTitle || 'Ocorreu um erro ao carregar esta visualização'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Sua sessão e os dados continuam protegidos. Ocorreu uma inconsistência temporária na exibição deste módulo.
          </p>
          {this.state.error?.message && (
            <div className="mt-3 p-3 bg-slate-100 rounded-xl text-[11px] font-mono text-slate-600 max-w-lg mx-auto overflow-x-auto border border-slate-200 text-left">
              {this.state.error.message}
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-[#401669] hover:bg-[#2d0e4c] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Módulo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
