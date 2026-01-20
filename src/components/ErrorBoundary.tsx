import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Props pentru componenta ErrorBoundary.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Componentă de afișat în caz de eroare (opțional) */
  fallback?: ReactNode;
  /** Callback apelat când se produce o eroare */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Text pentru butonul de retry */
  retryButtonText?: string;
  /** Titlu afișat în caz de eroare */
  errorTitle?: string;
}

/**
 * State pentru ErrorBoundary.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Componenta Error Boundary pentru capturarea și gestionarea erorilor React.
 * Previne crash-urile aplicației și afișează un UI prietenos în caz de eroare.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary onError={(error) => console.error(error)}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Logare eroare
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    // Callback pentru logging extern (ex: Sentry, LogRocket)
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/app/dashboard';
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { 
      children, 
      fallback, 
      errorTitle = 'Ceva nu a funcționat corect',
      retryButtonText = 'Încearcă din nou'
    } = this.props;

    if (hasError) {
      // Dacă există un fallback custom, îl folosim
      if (fallback) {
        return fallback;
      }

      // UI default pentru erori
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {errorTitle}
            </h2>
            
            <p className="text-muted-foreground mb-6">
              A apărut o eroare neașteptată. Echipa noastră a fost notificată și lucrăm la rezolvare.
            </p>

            {/* Detalii eroare (doar în development) */}
            {import.meta.env.DEV && error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Detalii tehnice (development)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-48">
                  <p className="text-destructive font-semibold mb-2">{error.name}: {error.message}</p>
                  {errorInfo?.componentStack && (
                    <pre className="text-muted-foreground whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                {retryButtonText}
              </Button>
              
              <Button onClick={this.handleGoHome} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Înapoi la Dashboard
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Dacă problema persistă, vă rugăm să{' '}
              <button 
                onClick={this.handleReload}
                className="text-primary hover:underline"
              >
                reîncărcați pagina
              </button>
              {' '}sau contactați suportul tehnic.
            </p>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * HOC pentru a înfășura o componentă cu ErrorBoundary.
 * Util pentru a adăuga error boundary la componente funcționale.
 * 
 * @param WrappedComponent - Componenta de înfășurat
 * @param errorBoundaryProps - Props pentru ErrorBoundary
 * @returns Componentă înfășurată cu ErrorBoundary
 * 
 * @example
 * ```tsx
 * const SafeMyComponent = withErrorBoundary(MyComponent, {
 *   errorTitle: 'Eroare la încărcarea datelor'
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
