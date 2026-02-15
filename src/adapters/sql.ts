import type { DatabaseAdapter, ErrorLogEntry, QueryOptions } from '../types'

/**
 * Generic SQL query executor interface
 * Implement this to connect to any SQL database
 */
export interface SQLExecutor {
    /**
     * Execute a parameterized SQL query
     * @param sql - SQL query with placeholders ($1, $2, etc. for Postgres; ?, ?, etc. for MySQL)
     * @param params - Array of parameter values
     * @returns Array of result rows
     */
    query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>

    /**
     * Execute a parameterized SQL query that returns affected row count
     * @param sql - SQL query
     * @param params - Array of parameter values
     * @returns Number of affected rows
     */
    execute(sql: string, params?: unknown[]): Promise<number>
}

/**
 * Configuration for the SQL adapter
 */
export interface SQLAdapterConfig {
    /** Your SQL executor implementation */
    executor: SQLExecutor
    /** Table name (default: 'error_logs') */
    tableName?: string
    /** SQL dialect for placeholder syntax */
    dialect: 'postgres' | 'mysql' | 'sqlite'
}

/**
 * Create a raw SQL database adapter
 *
 * Works with any SQL database - just provide an executor that matches the SQLExecutor interface.
 *
 * Required table schema (PostgreSQL example):
 *
 * ```sql
 * CREATE TABLE error_logs (
 *   id TEXT PRIMARY KEY,
 *   level TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   stack TEXT,
 *   user_id TEXT,
 *   user_email TEXT,
 *   user_name TEXT,
 *   path TEXT,
 *   method TEXT,
 *   user_agent TEXT,
 *   ip TEXT,
 *   metadata JSONB,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_error_logs_level ON error_logs(level);
 * CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);
 * CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
 * ```
 *
 * @example
 * ```ts
 * // With node-postgres (pg)
 * import { createSQLAdapter } from '@vinetechke/next-error-logger/adapters/sql'
 * import { Pool } from 'pg'
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL })
 *
 * const adapter = createSQLAdapter({
 *   executor: {
 *     query: async (sql, params) => {
 *       const result = await pool.query(sql, params)
 *       return result.rows
 *     },
 *     execute: async (sql, params) => {
 *       const result = await pool.query(sql, params)
 *       return result.rowCount || 0
 *     },
 *   },
 *   dialect: 'postgres',
 * })
 * ```
 *
 * @example
 * ```ts
 * // With mysql2
 * import { createSQLAdapter } from '@vinetechke/next-error-logger/adapters/sql'
 * import mysql from 'mysql2/promise'
 *
 * const pool = mysql.createPool({ uri: process.env.DATABASE_URL })
 *
 * const adapter = createSQLAdapter({
 *   executor: {
 *     query: async (sql, params) => {
 *       const [rows] = await pool.query(sql, params)
 *       return rows as unknown[]
 *     },
 *     execute: async (sql, params) => {
 *       const [result] = await pool.query(sql, params)
 *       return (result as { affectedRows: number }).affectedRows
 *     },
 *   },
 *   dialect: 'mysql',
 * })
 * ```
 */
export function createSQLAdapter(config: SQLAdapterConfig): DatabaseAdapter {
    const { executor, tableName = 'error_logs', dialect } = config

    // Placeholder function based on dialect
    const ph = (index: number): string => {
        switch (dialect) {
            case 'postgres':
                return `$${index}`
            case 'mysql':
            case 'sqlite':
                return '?'
        }
    }

    // Convert snake_case DB rows to camelCase
    const toCamelCase = (row: Record<string, unknown>): ErrorLogEntry => ({
        id: row.id as string,
        level: row.level as ErrorLogEntry['level'],
        message: row.message as string,
        stack: row.stack as string | null,
        userId: row.user_id as string | null,
        userEmail: row.user_email as string | null,
        userName: row.user_name as string | null,
        path: row.path as string | null,
        method: row.method as string | null,
        userAgent: row.user_agent as string | null,
        ip: row.ip as string | null,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: new Date(row.created_at as string),
    })

    return {
        async create(entry) {
            const id = crypto.randomUUID()
            const now = new Date().toISOString()

            const sql = `
        INSERT INTO ${tableName} (
          id, level, message, stack, user_id, user_email, user_name,
          path, method, user_agent, ip, metadata, created_at
        ) VALUES (
          ${ph(1)}, ${ph(2)}, ${ph(3)}, ${ph(4)}, ${ph(5)}, ${ph(6)}, ${ph(7)},
          ${ph(8)}, ${ph(9)}, ${ph(10)}, ${ph(11)}, ${ph(12)}, ${ph(13)}
        ) RETURNING *
      `

            const params = [
                id,
                entry.level,
                entry.message,
                entry.stack,
                entry.userId,
                entry.userEmail,
                entry.userName,
                entry.path,
                entry.method,
                entry.userAgent,
                entry.ip,
                entry.metadata ? JSON.stringify(entry.metadata) : null,
                now,
            ]

            // For MySQL/SQLite which don't support RETURNING
            if (dialect !== 'postgres') {
                const insertSql = `
          INSERT INTO ${tableName} (
            id, level, message, stack, user_id, user_email, user_name,
            path, method, user_agent, ip, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
                await executor.execute(insertSql, params)

                const selectSql = `SELECT * FROM ${tableName} WHERE id = ?`
                const rows = await executor.query<Record<string, unknown>>(
                    selectSql,
                    [id],
                )
                return toCamelCase(rows[0])
            }

            const rows = await executor.query<Record<string, unknown>>(
                sql,
                params,
            )
            return toCamelCase(rows[0])
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

            const conditions: string[] = []
            const params: unknown[] = []
            let paramIndex = 1

            if (level) {
                conditions.push(`level = ${ph(paramIndex++)}`)
                params.push(level)
            }

            if (userId) {
                conditions.push(`user_id = ${ph(paramIndex++)}`)
                params.push(userId)
            }

            if (search) {
                const searchPattern = `%${search}%`
                conditions.push(`(
          message ILIKE ${ph(paramIndex++)} OR
          stack ILIKE ${ph(paramIndex++)} OR
          path ILIKE ${ph(paramIndex++)} OR
          user_email ILIKE ${ph(paramIndex++)}
        )`)
                params.push(
                    searchPattern,
                    searchPattern,
                    searchPattern,
                    searchPattern,
                )
            }

            if (startDate) {
                conditions.push(`created_at >= ${ph(paramIndex++)}`)
                params.push(startDate.toISOString())
            }

            if (endDate) {
                conditions.push(`created_at <= ${ph(paramIndex++)}`)
                params.push(endDate.toISOString())
            }

            const whereClause =
                conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
            const orderColumn = orderBy === 'level' ? 'level' : 'created_at'
            const orderDirection = order.toUpperCase()
            const offset = (page - 1) * limit

            const sql = `
        SELECT * FROM ${tableName}
        ${whereClause}
        ORDER BY ${orderColumn} ${orderDirection}
        LIMIT ${limit} OFFSET ${offset}
      `

            const countSql = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`

            const [rows, countResult] = await Promise.all([
                executor.query<Record<string, unknown>>(sql, params),
                executor.query<{ count: string | number }>(countSql, params),
            ])

            return {
                logs: rows.map(toCamelCase),
                total: Number(countResult[0]?.count || 0),
            }
        },

        async findById(id: string) {
            const sql = `SELECT * FROM ${tableName} WHERE id = ${ph(1)}`
            const rows = await executor.query<Record<string, unknown>>(sql, [
                id,
            ])

            if (rows.length === 0) {
                return null
            }

            return toCamelCase(rows[0])
        },

        async delete(id: string) {
            const sql = `DELETE FROM ${tableName} WHERE id = ${ph(1)}`
            await executor.execute(sql, [id])
        },

        async deleteMany(options) {
            const conditions: string[] = []
            const params: unknown[] = []
            let paramIndex = 1

            if (options.before) {
                conditions.push(`created_at < ${ph(paramIndex++)}`)
                params.push(options.before.toISOString())
            }

            if (options.level) {
                conditions.push(`level = ${ph(paramIndex++)}`)
                params.push(options.level)
            }

            if (conditions.length === 0) {
                return 0
            }

            const sql = `DELETE FROM ${tableName} WHERE ${conditions.join(' AND ')}`
            return executor.execute(sql, params)
        },
    }
}
