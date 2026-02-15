import type {
    ErrorLoggerConfig,
    LogLevel,
    ErrorLogEntry,
    RequestContext,
    LogResult,
} from './types'

let config: ErrorLoggerConfig | null = null

/**
 * Initialize the error logger with your configuration
 * Must be called before using errorLogger
 *
 * @example
 * ```ts
 * import { initErrorLogger } from '@vinetechke/next-error-logger'
 * import { createPrismaAdapter } from '@vinetechke/next-error-logger/adapters/prisma'
 * import { createNextAuthAdapter } from '@vinetechke/next-error-logger/auth/next-auth'
 * import { prisma } from '@/lib/prisma'
 * import { auth } from '@/auth'
 *
 * initErrorLogger({
 *   adapter: createPrismaAdapter(prisma),
 *   authAdapter: createNextAuthAdapter(auth),
 *   retentionDays: 30,
 * })
 * ```
 */
export function initErrorLogger(cfg: ErrorLoggerConfig): void {
    config = {
        consoleInDev: true,
        retentionDays: 30,
        ...cfg,
    }
}

/**
 * Get the current logger configuration
 * @throws Error if logger is not initialized
 */
export function getConfig(): ErrorLoggerConfig {
    if (!config) {
        throw new Error(
            '[@vinetechke/next-error-logger] Logger not initialized. Call initErrorLogger() first.',
        )
    }
    return config
}

/**
 * Check if logger is initialized
 */
export function isInitialized(): boolean {
    return config !== null
}

/**
 * Internal logging function
 */
async function log(
    level: LogLevel,
    message: string,
    error?: Error | null,
    context?: RequestContext,
): Promise<LogResult> {
    try {
        const cfg = getConfig()

        // Check if this level should be captured
        if (cfg.levels && !cfg.levels.includes(level)) {
            return { success: true }
        }

        // Console output in development
        if (cfg.consoleInDev && process.env.NODE_ENV === 'development') {
            const consoleMethod =
                level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
            console[consoleMethod](
                `[${level.toUpperCase()}]`,
                message,
                error || '',
                context || '',
            )
        }

        // Get user context if auth adapter is provided
        let user: { id: string; email?: string; name?: string } | null = null
        if (cfg.authAdapter) {
            try {
                user = await cfg.authAdapter.getUser()
            } catch {
                // Silently ignore auth errors - user context is optional
            }
        }

        // Create the log entry
        const entry = await cfg.adapter.create({
            level,
            message,
            stack: error?.stack || null,
            userId: user?.id || null,
            userEmail: user?.email || null,
            userName: user?.name || null,
            path: context?.path || null,
            method: context?.method || null,
            userAgent: context?.userAgent || null,
            ip: context?.ip || null,
            metadata: context?.metadata || null,
        })

        return { success: true, entry }
    } catch (err) {
        // Don't throw on logging failures - just return error result
        console.error('[@vinetechke/next-error-logger] Failed to log:', err)
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        }
    }
}

/**
 * Extract request context from a Next.js Request object
 */
function extractRequestContext(request: Request): RequestContext {
    const url = new URL(request.url)
    return {
        path: url.pathname,
        method: request.method,
        userAgent: request.headers.get('user-agent') || undefined,
        ip:
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            undefined,
    }
}

/**
 * Main error logger instance
 *
 * @example
 * ```ts
 * // Simple logging
 * await errorLogger.error('Something went wrong', error)
 * await errorLogger.warn('Deprecated API used')
 * await errorLogger.info('User completed checkout')
 *
 * // With request context (in API routes)
 * const log = errorLogger.fromRequest(request)
 * await log.error('API failed', error, { orderId: '123' })
 * ```
 */
export const errorLogger = {
    /**
     * Log an error with optional Error object and context
     */
    error: (
        message: string,
        error?: Error,
        context?: RequestContext,
    ): Promise<LogResult> => log('error', message, error, context),

    /**
     * Log a warning with optional Error object and context
     */
    warn: (
        message: string,
        error?: Error,
        context?: RequestContext,
    ): Promise<LogResult> => log('warn', message, error, context),

    /**
     * Log an info message with optional context
     */
    info: (message: string, context?: RequestContext): Promise<LogResult> =>
        log('info', message, null, context),

    /**
     * Log a debug message with optional context
     */
    debug: (message: string, context?: RequestContext): Promise<LogResult> =>
        log('debug', message, null, context),

    /**
     * Create a logger instance bound to a specific request
     * Automatically extracts path, method, user agent, and IP
     *
     * @example
     * ```ts
     * export async function POST(request: Request) {
     *   const log = errorLogger.fromRequest(request)
     *
     *   try {
     *     // ... your code
     *   } catch (error) {
     *     await log.error('Failed to process', error as Error, { orderId: '123' })
     *     return new Response('Error', { status: 500 })
     *   }
     * }
     * ```
     */
    fromRequest: (request: Request) => {
        const baseContext = extractRequestContext(request)

        return {
            error: (
                message: string,
                error?: Error,
                metadata?: Record<string, unknown>,
            ): Promise<LogResult> =>
                log('error', message, error, { ...baseContext, metadata }),

            warn: (
                message: string,
                metadata?: Record<string, unknown>,
            ): Promise<LogResult> =>
                log('warn', message, null, { ...baseContext, metadata }),

            info: (
                message: string,
                metadata?: Record<string, unknown>,
            ): Promise<LogResult> =>
                log('info', message, null, { ...baseContext, metadata }),

            debug: (
                message: string,
                metadata?: Record<string, unknown>,
            ): Promise<LogResult> =>
                log('debug', message, null, { ...baseContext, metadata }),
        }
    },

    /**
     * Log with explicit user context (when auth adapter is not available)
     *
     * @example
     * ```ts
     * await errorLogger.withUser({ id: 'user-123', email: 'user@example.com' })
     *   .error('User action failed', error)
     * ```
     */
    withUser: (user: { id: string; email?: string; name?: string }) => {
        return {
            error: async (
                message: string,
                error?: Error,
                context?: RequestContext,
            ): Promise<LogResult> => {
                const cfg = getConfig()
                try {
                    const entry = await cfg.adapter.create({
                        level: 'error',
                        message,
                        stack: error?.stack || null,
                        userId: user.id,
                        userEmail: user.email || null,
                        userName: user.name || null,
                        path: context?.path || null,
                        method: context?.method || null,
                        userAgent: context?.userAgent || null,
                        ip: context?.ip || null,
                        metadata: context?.metadata || null,
                    })
                    return { success: true, entry }
                } catch (err) {
                    return {
                        success: false,
                        error:
                            err instanceof Error
                                ? err.message
                                : 'Unknown error',
                    }
                }
            },

            warn: async (
                message: string,
                context?: RequestContext,
            ): Promise<LogResult> => {
                const cfg = getConfig()
                try {
                    const entry = await cfg.adapter.create({
                        level: 'warn',
                        message,
                        stack: null,
                        userId: user.id,
                        userEmail: user.email || null,
                        userName: user.name || null,
                        path: context?.path || null,
                        method: context?.method || null,
                        userAgent: context?.userAgent || null,
                        ip: context?.ip || null,
                        metadata: context?.metadata || null,
                    })
                    return { success: true, entry }
                } catch (err) {
                    return {
                        success: false,
                        error:
                            err instanceof Error
                                ? err.message
                                : 'Unknown error',
                    }
                }
            },

            info: async (
                message: string,
                context?: RequestContext,
            ): Promise<LogResult> => {
                const cfg = getConfig()
                try {
                    const entry = await cfg.adapter.create({
                        level: 'info',
                        message,
                        stack: null,
                        userId: user.id,
                        userEmail: user.email || null,
                        userName: user.name || null,
                        path: context?.path || null,
                        method: context?.method || null,
                        userAgent: context?.userAgent || null,
                        ip: context?.ip || null,
                        metadata: context?.metadata || null,
                    })
                    return { success: true, entry }
                } catch (err) {
                    return {
                        success: false,
                        error:
                            err instanceof Error
                                ? err.message
                                : 'Unknown error',
                    }
                }
            },
        }
    },
}
