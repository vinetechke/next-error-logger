import type { DatabaseAdapter, ErrorLogEntry, QueryOptions } from '../types'

/**
 * Drizzle table interface
 * Using flexible typing to support various Drizzle table definitions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleTable = any

/**
 * Drizzle database interface
 * Using flexible typing to support various Drizzle dialects and query patterns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any

/**
 * Configuration for the Drizzle adapter
 */
export interface DrizzleAdapterConfig {
    /** Your Drizzle database instance */
    db: DrizzleDB
    /** Your ErrorLog table definition */
    table: DrizzleTable
    /** Drizzle operators (eq, and, or, like, lt, desc, etc.) */
    operators: {
        eq: (column: unknown, value: unknown) => unknown
        and: (...conditions: unknown[]) => unknown
        or: (...conditions: unknown[]) => unknown
        like: (column: unknown, value: string) => unknown
        lt: (column: unknown, value: unknown) => unknown
        gte: (column: unknown, value: unknown) => unknown
        lte: (column: unknown, value: unknown) => unknown
        desc: (column: unknown) => unknown
        asc: (column: unknown) => unknown
    }
}

/**
 * Create a Drizzle database adapter
 *
 * Requires an errorLogs table in your Drizzle schema:
 *
 * ```ts
 * // schema.ts
 * import { pgTable, text, timestamp, json } from 'drizzle-orm/pg-core'
 *
 * export const errorLogs = pgTable('error_logs', {
 *   id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
 *   level: text('level').notNull(),
 *   message: text('message').notNull(),
 *   stack: text('stack'),
 *   userId: text('user_id'),
 *   userEmail: text('user_email'),
 *   userName: text('user_name'),
 *   path: text('path'),
 *   method: text('method'),
 *   userAgent: text('user_agent'),
 *   ip: text('ip'),
 *   metadata: json('metadata'),
 *   createdAt: timestamp('created_at').defaultNow().notNull(),
 * })
 * ```
 *
 * @example
 * ```ts
 * import { createDrizzleAdapter } from '@vinetech/next-error-logger/adapters/drizzle'
 * import { db } from '@/lib/db'
 * import { errorLogs } from '@/lib/schema'
 * import { eq, and, or, like, lt, gte, lte, desc, asc } from 'drizzle-orm'
 *
 * const adapter = createDrizzleAdapter({
 *   db,
 *   table: errorLogs,
 *   operators: { eq, and, or, like, lt, gte, lte, desc, asc },
 * })
 * ```
 */
export function createDrizzleAdapter(
    config: DrizzleAdapterConfig,
): DatabaseAdapter {
    const { db, table, operators } = config
    const { eq, and, or, like, lt, gte, lte, desc, asc } = operators

    return {
        async create(entry) {
            const id = crypto.randomUUID()
            const result = await db
                .insert(table)
                .values({
                    id,
                    level: entry.level,
                    message: entry.message,
                    stack: entry.stack,
                    userId: entry.userId,
                    userEmail: entry.userEmail,
                    userName: entry.userName,
                    path: entry.path,
                    method: entry.method,
                    userAgent: entry.userAgent,
                    ip: entry.ip,
                    metadata: entry.metadata,
                })
                .returning()

            return result[0] as ErrorLogEntry
        },

        async findMany(options: QueryOptions) {
            const {
                page = 1,
                limit = 50,
                level,
                userId,
                search,
                startDate,
                endDate,
                orderBy = 'createdAt',
                order = 'desc',
            } = options

            // Build conditions array
            const conditions: unknown[] = []

            if (level) {
                conditions.push(eq(table.level, level))
            }

            if (userId) {
                conditions.push(eq(table.userId, userId))
            }

            if (search) {
                conditions.push(
                    or(
                        like(table.message, `%${search}%`),
                        like(table.stack, `%${search}%`),
                        like(table.path, `%${search}%`),
                        like(table.userEmail, `%${search}%`),
                    ),
                )
            }

            if (startDate) {
                conditions.push(gte(table.createdAt, startDate))
            }

            if (endDate) {
                conditions.push(lte(table.createdAt, endDate))
            }

            const whereCondition =
                conditions.length > 0 ? and(...conditions) : undefined
            const orderFn = order === 'desc' ? desc : asc
            const orderColumn =
                orderBy === 'level' ? table.level : table.createdAt

            let query = db.select().from(table)

            if (whereCondition) {
                query = query.where(whereCondition) as typeof query
            }

            const logs = await query
                .orderBy(orderFn(orderColumn))
                .limit(limit)
                .offset((page - 1) * limit)

            const total = await db.$count(table, whereCondition)

            return { logs: logs as ErrorLogEntry[], total }
        },

        async findById(id: string) {
            const results = await db
                .select()
                .from(table)
                .where(eq(table.id, id))
                .limit(1)
                .offset(0)

            return (results[0] as ErrorLogEntry) || null
        },

        async delete(id: string) {
            await db.delete(table).where(eq(table.id, id))
        },

        async deleteMany(options) {
            const conditions: unknown[] = []

            if (options.before) {
                conditions.push(lt(table.createdAt, options.before))
            }

            if (options.level) {
                conditions.push(eq(table.level, options.level))
            }

            const whereCondition =
                conditions.length > 0 ? and(...conditions) : undefined

            if (!whereCondition) {
                return 0
            }

            const result = await db.delete(table).where(whereCondition)
            return result.rowCount || 0
        },
    }
}
