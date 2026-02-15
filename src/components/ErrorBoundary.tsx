'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
    /** Child components to wrap */
    children: ReactNode
    /** Custom fallback UI to show when an error occurs */
    fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
    /** Callback when an error is caught */
    onError?: (error: Error, errorInfo: ErrorInfo) => void
    /** Whether to log errors to the console (default: true in development) */
    logToConsole?: boolean
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * ErrorBoundary component - Catches and logs React errors
 *
 * Use this to wrap your application or specific components to catch
 * unhandled errors and log them via the error logger.
 *
 * @example
 * ```tsx
 * // Basic usage
 * import { ErrorBoundary } from '@vinetech/next-error-logger/components'
 *
 * export default function Layout({ children }) {
 *   return (
 *     <ErrorBoundary>
 *       {children}
 *     </ErrorBoundary>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <h2>Something went wrong!</h2>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 *   onError={(error, info) => {
 *     // Custom error handling
 *     console.error('Caught error:', error)
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 *
 * @example
 * ```tsx
 * // With error logger integration
 * import { ErrorBoundary } from '@vinetech/next-error-logger/components'
 * import { errorLogger } from '@/lib/error-logger'
 *
 * <ErrorBoundary
 *   onError={async (error, info) => {
 *     await errorLogger.error('React render error', error, {
 *       metadata: { componentStack: info.componentStack },
 *     })
 *   }}
 * >
 *   {children}
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        const {
            onError,
            logToConsole = process.env.NODE_ENV === 'development',
        } = this.props

        // Log to console in development
        if (logToConsole) {
            console.error('ErrorBoundary caught an error:', error)
            console.error('Component stack:', errorInfo.componentStack)
        }

        // Call custom error handler
        onError?.(error, errorInfo)
    }

    reset = (): void => {
        this.setState({ hasError: false, error: null })
    }

    render(): ReactNode {
        const { hasError, error } = this.state
        const { children, fallback } = this.props

        if (hasError && error) {
            // Custom fallback
            if (typeof fallback === 'function') {
                return fallback(error, this.reset)
            }

            if (fallback) {
                return fallback
            }

            // Default fallback
            return (
                <div
                    style={{
                        padding: '2rem',
                        textAlign: 'center',
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: '#dc2626',
                            marginBottom: '1rem',
                        }}
                    >
                        Something went wrong
                    </h2>
                    <p
                        style={{
                            color: '#6b7280',
                            marginBottom: '1rem',
                        }}
                    >
                        An unexpected error occurred. Please try again.
                    </p>
                    <details
                        style={{
                            marginBottom: '1rem',
                            textAlign: 'left',
                            maxWidth: '600px',
                            margin: '0 auto 1rem',
                        }}
                    >
                        <summary
                            style={{
                                cursor: 'pointer',
                                color: '#3b82f6',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Error details
                        </summary>
                        <pre
                            style={{
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                backgroundColor: '#f3f4f6',
                                padding: '1rem',
                                borderRadius: '0.5rem',
                                overflow: 'auto',
                                textAlign: 'left',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}
                        >
                            {error.message}
                            {'\n\n'}
                            {error.stack}
                        </pre>
                    </details>
                    <button
                        onClick={this.reset}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '1rem',
                        }}
                    >
                        Try again
                    </button>
                </div>
            )
        }

        return children
    }
}

/**
 * Hook-based error boundary wrapper for functional components
 *
 * @example
 * ```tsx
 * import { withErrorBoundary } from '@vinetech/next-error-logger/components'
 *
 * function MyComponent() {
 *   // Component that might throw
 * }
 *
 * export default withErrorBoundary(MyComponent, {
 *   fallback: <div>Error loading component</div>,
 * })
 * ```
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>,
) {
    const WrappedComponent = (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    )

    WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

    return WrappedComponent
}
