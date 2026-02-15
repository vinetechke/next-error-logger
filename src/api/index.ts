import { NextRequest, NextResponse } from 'next/server'
import { getConfig, isInitialized } from '../logger'
import type { LogLevel } from '../types'

/**
 * Configuration for API route handlers
 */
export interface APIHandlerConfig {
    /**
     * Function to check if user is authorized to view logs
     * Return true to allow access, false to deny
     *
     * @example
     * ```ts
     * const config = {
     *   isAuthorized: async (request) => {
     *     const session = await auth()
     *     return session?.user?.role === 'admin'
     *   }
     * }
     * ```
     */
    isAuthorized: (request: NextRequest) => Promise<boolean>
}

/**
 * Create API route handlers for the error logger
 *
 * Creates GET, DELETE handlers for listing, fetching, and deleting logs.
 *
 * @example
 * ```ts
 * // app/api/admin/logs/route.ts
 * import { createLogAPIHandlers } from '@vinetechke/next-error-logger/api'
 * import { auth } from '@/auth'
 *
 * const { GET, DELETE } = createLogAPIHandlers({
 *   isAuthorized: async () => {
 *     const session = await auth()
 *     return session?.user?.role === 'ADMIN'
 *   },
 * })
 *
 * export { GET, DELETE }
 * ```
 *
 * @example
 * ```ts
 * // app/api/admin/logs/[id]/route.ts
 * import { createLogDetailAPIHandlers } from '@vinetechke/next-error-logger/api'
 * import { auth } from '@/auth'
 *
 * const { GET, DELETE } = createLogDetailAPIHandlers({
 *   isAuthorized: async () => {
 *     const session = await auth()
 *     return session?.user?.role === 'ADMIN'
 *   },
 * })
 *
 * export { GET, DELETE }
 * ```
 */
export function createLogAPIHandlers(config: APIHandlerConfig) {
    const { isAuthorized } = config

    return {
        /**
         * GET /api/logs - List logs with filtering and pagination
         *
         * Query parameters:
         * - page: Page number (default: 1)
         * - limit: Items per page (default: 50)
         * - level: Filter by level (error, warn, info, debug)
         * - userId: Filter by user ID
         * - search: Search in message, stack, path, userEmail
         * - startDate: Filter logs after this date (ISO string)
         * - endDate: Filter logs before this date (ISO string)
         */
        GET: async (request: NextRequest): Promise<NextResponse> => {
            // Check authorization
            if (!(await isAuthorized(request))) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                )
            }

            // Check if logger is initialized
            if (!isInitialized()) {
                return NextResponse.json(
                    { error: 'Logger not initialized' },
                    { status: 500 },
                )
            }

            const cfg = getConfig()
            const searchParams = request.nextUrl.searchParams

            try {
                const options = {
                    page: parseInt(searchParams.get('page') || '1', 10),
                    limit: Math.min(
                        parseInt(searchParams.get('limit') || '50', 10),
                        100,
                    ),
                    level: searchParams.get('level') as LogLevel | undefined,
                    userId: searchParams.get('userId') || undefined,
                    search: searchParams.get('search') || undefined,
                    startDate: searchParams.get('startDate')
                        ? new Date(searchParams.get('startDate')!)
                        : undefined,
                    endDate: searchParams.get('endDate')
                        ? new Date(searchParams.get('endDate')!)
                        : undefined,
                }

                const result = await cfg.adapter.findMany(options)

                return NextResponse.json(result)
            } catch (error) {
                console.error('[@vinetechke/next-error-logger] API error:', error)
                return NextResponse.json(
                    { error: 'Failed to fetch logs' },
                    { status: 500 },
                )
            }
        },

        /**
         * DELETE /api/logs - Clear logs
         *
         * Body parameters:
         * - before: Delete logs before this date (ISO string)
         * - level: Delete logs with this level only
         */
        DELETE: async (request: NextRequest): Promise<NextResponse> => {
            // Check authorization
            if (!(await isAuthorized(request))) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                )
            }

            // Check if logger is initialized
            if (!isInitialized()) {
                return NextResponse.json(
                    { error: 'Logger not initialized' },
                    { status: 500 },
                )
            }

            const cfg = getConfig()

            try {
                const body = await request.json().catch(() => ({}))

                const count = await cfg.adapter.deleteMany({
                    before: body.before ? new Date(body.before) : undefined,
                    level: body.level as LogLevel | undefined,
                })

                return NextResponse.json({ deleted: count })
            } catch (error) {
                console.error('[@vinetechke/next-error-logger] API error:', error)
                return NextResponse.json(
                    { error: 'Failed to delete logs' },
                    { status: 500 },
                )
            }
        },
    }
}

/**
 * Create API route handlers for individual log entries
 *
 * @example
 * ```ts
 * // app/api/admin/logs/[id]/route.ts
 * import { createLogDetailAPIHandlers } from '@vinetechke/next-error-logger/api'
 *
 * const { GET, DELETE } = createLogDetailAPIHandlers({
 *   isAuthorized: async () => {
 *     const session = await auth()
 *     return session?.user?.role === 'ADMIN'
 *   },
 * })
 *
 * export { GET, DELETE }
 * ```
 */
export function createLogDetailAPIHandlers(config: APIHandlerConfig) {
    const { isAuthorized } = config

    return {
        /**
         * GET /api/logs/[id] - Get a single log entry
         */
        GET: async (
            request: NextRequest,
            { params }: { params: Promise<{ id: string }> },
        ): Promise<NextResponse> => {
            // Check authorization
            if (!(await isAuthorized(request))) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                )
            }

            // Check if logger is initialized
            if (!isInitialized()) {
                return NextResponse.json(
                    { error: 'Logger not initialized' },
                    { status: 500 },
                )
            }

            const cfg = getConfig()
            const { id } = await params

            try {
                const log = await cfg.adapter.findById(id)

                if (!log) {
                    return NextResponse.json(
                        { error: 'Not found' },
                        { status: 404 },
                    )
                }

                return NextResponse.json(log)
            } catch (error) {
                console.error('[@vinetechke/next-error-logger] API error:', error)
                return NextResponse.json(
                    { error: 'Failed to fetch log' },
                    { status: 500 },
                )
            }
        },

        /**
         * DELETE /api/logs/[id] - Delete a single log entry
         */
        DELETE: async (
            request: NextRequest,
            { params }: { params: Promise<{ id: string }> },
        ): Promise<NextResponse> => {
            // Check authorization
            if (!(await isAuthorized(request))) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                )
            }

            // Check if logger is initialized
            if (!isInitialized()) {
                return NextResponse.json(
                    { error: 'Logger not initialized' },
                    { status: 500 },
                )
            }

            const cfg = getConfig()
            const { id } = await params

            try {
                await cfg.adapter.delete(id)
                return NextResponse.json({ success: true })
            } catch (error) {
                console.error('[@vinetechke/next-error-logger] API error:', error)
                return NextResponse.json(
                    { error: 'Failed to delete log' },
                    { status: 500 },
                )
            }
        },
    }
}

/**
 * Get log statistics
 *
 * @example
 * ```ts
 * // app/api/admin/logs/stats/route.ts
 * import { createLogStatsHandler } from '@vinetechke/next-error-logger/api'
 *
 * export const GET = createLogStatsHandler({
 *   isAuthorized: async () => {
 *     const session = await auth()
 *     return session?.user?.role === 'ADMIN'
 *   },
 * })
 * ```
 */
export function createLogStatsHandler(config: APIHandlerConfig) {
    const { isAuthorized } = config

    return async (request: NextRequest): Promise<NextResponse> => {
        // Check authorization
        if (!(await isAuthorized(request))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if logger is initialized
        if (!isInitialized()) {
            return NextResponse.json(
                { error: 'Logger not initialized' },
                { status: 500 },
            )
        }

        const cfg = getConfig()

        try {
            // Get counts for each level
            const [errors, warnings, infos, debugs, total] = await Promise.all([
                cfg.adapter
                    .findMany({ level: 'error', limit: 0 })
                    .then(r => r.total),
                cfg.adapter
                    .findMany({ level: 'warn', limit: 0 })
                    .then(r => r.total),
                cfg.adapter
                    .findMany({ level: 'info', limit: 0 })
                    .then(r => r.total),
                cfg.adapter
                    .findMany({ level: 'debug', limit: 0 })
                    .then(r => r.total),
                cfg.adapter.findMany({ limit: 0 }).then(r => r.total),
            ])

            // Get recent logs (last 24 hours)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const recentResult = await cfg.adapter.findMany({
                startDate: oneDayAgo,
                limit: 0,
            })

            return NextResponse.json({
                total,
                byLevel: {
                    error: errors,
                    warn: warnings,
                    info: infos,
                    debug: debugs,
                },
                last24Hours: recentResult.total,
            })
        } catch (error) {
            console.error('[@vinetechke/next-error-logger] API error:', error)
            return NextResponse.json(
                { error: 'Failed to fetch stats' },
                { status: 500 },
            )
        }
    }
}
