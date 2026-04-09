import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center space-y-4">
              <p className="text-4xl">😕</p>
              <h1 className="text-xl font-semibold text-foreground">Algo salió mal</h1>
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message ?? 'Error inesperado'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Recargar
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
