/**
 * Example Drizzle schema for the error_logs table
 *
 * Copy this to your project and adjust as needed.
 *
 * @example
 * ```ts
 * // lib/schema.ts
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
 */

// PostgreSQL schema (using drizzle-orm/pg-core)
export const postgresSchema = `
import { pgTable, text, timestamp, json, index } from 'drizzle-orm/pg-core'

export const errorLogs = pgTable('error_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  level: text('level').notNull(),
  message: text('message').notNull(),
  stack: text('stack'),
  userId: text('user_id'),
  userEmail: text('user_email'),
  userName: text('user_name'),
  path: text('path'),
  method: text('method'),
  userAgent: text('user_agent'),
  ip: text('ip'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  levelIdx: index('error_logs_level_idx').on(table.level),
  userIdIdx: index('error_logs_user_id_idx').on(table.userId),
  createdAtIdx: index('error_logs_created_at_idx').on(table.createdAt),
}))
`

// MySQL schema (using drizzle-orm/mysql-core)
export const mysqlSchema = `
import { mysqlTable, text, varchar, timestamp, json, index } from 'drizzle-orm/mysql-core'

export const errorLogs = mysqlTable('error_logs', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  level: varchar('level', { length: 10 }).notNull(),
  message: text('message').notNull(),
  stack: text('stack'),
  userId: varchar('user_id', { length: 255 }),
  userEmail: varchar('user_email', { length: 255 }),
  userName: varchar('user_name', { length: 255 }),
  path: varchar('path', { length: 500 }),
  method: varchar('method', { length: 10 }),
  userAgent: text('user_agent'),
  ip: varchar('ip', { length: 45 }),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  levelIdx: index('error_logs_level_idx').on(table.level),
  userIdIdx: index('error_logs_user_id_idx').on(table.userId),
  createdAtIdx: index('error_logs_created_at_idx').on(table.createdAt),
}))
`

// SQLite schema (using drizzle-orm/sqlite-core)
export const sqliteSchema = `
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const errorLogs = sqliteTable('error_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  level: text('level').notNull(),
  message: text('message').notNull(),
  stack: text('stack'),
  userId: text('user_id'),
  userEmail: text('user_email'),
  userName: text('user_name'),
  path: text('path'),
  method: text('method'),
  userAgent: text('user_agent'),
  ip: text('ip'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
`
