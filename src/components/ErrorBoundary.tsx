/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  consoleName?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.consoleName !== this.props.consoleName && this.state.hasError) {
      this.setState({ hasError: false, errorMessage: '' });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Erreur dans {this.props.consoleName ?? 'cette console'}
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-1 max-w-sm">
            Un problème inattendu s'est produit. Rechargez la console ou contactez le support.
          </p>
          {this.state.errorMessage && (
            <p className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 mb-5 max-w-sm truncate">
              {this.state.errorMessage}
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
