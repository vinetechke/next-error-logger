import type { DatabaseAdapter, ErrorLogEntry, QueryOptions } from '../types'

/**
 * Prisma ErrorLog model delegate interface
 * Uses generic function types to be compatible with any Prisma client version
 */
interface ErrorLogDelegate {
    create(args: unknown): Promise<unknown>
    findMany(args: unknown): Promise<unknown[]>
    findUnique(args: unknown): Promise<unknown | null>
    delete(args: unknown): Promise<unknown>
    deleteMany(args: unknown): Promise<{ count: number }>
    count(args: unknown): Promise<number>
}

/**
 * Prisma client interface - compatible with any @prisma/client version
 */
interface PrismaClientLike {
    errorLog: ErrorLogDelegate
}

/**
 * Create a Prisma database adapter
 *
 * Requires an ErrorLog model in your Prisma schema:
 *
 * ```prisma
 * model ErrorLog {
 *   id        String   @id @default(cuid())
 *   level     String
 *   message   String   @db.Text
 *   stack     String?  @db.Text
 *   userId    String?
 *   userEmail String?
 *   userName  String?
 *   path      String?
 *   method    String?
 *   userAgent String?
 *   ip        String?
 *   metadata  Json?
 *   createdAt DateTime @default(now())
 *
 *   @@index([level])
 *   @@index([userId])
 *   @@index([createdAt])
 * }
 * ```
 *
 * @example
 * ```ts
 * import { createPrismaAdapter } from '@vinetechke/next-error-logger/adapters/prisma'
 * import { prisma } from '@/lib/prisma'
 *
 * const adapter = createPrismaAdapter(prisma)
 * ```
 */
export function createPrismaAdapter(prisma: PrismaClientLike): DatabaseAdapter {
    return {
        async create(entry) {
            const result = await prisma.errorLog.create({
                data: {
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
                    metadata: entry.metadata
                        ? JSON.parse(JSON.stringify(entry.metadata))
                        : null,
                },
            })
            return result as ErrorLogEntry
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

            // Build where clause
            const where: Record<string, unknown> = {}

            if (level) {
                where.level = level
            }

            if (userId) {
                where.userId = userId
            }

            if (search) {
                where.OR = [
                    { message: { contains: search, mode: 'insensitive' } },
                    { stack: { contains: search, mode: 'insensitive' } },
                    { path: { contains: search, mode: 'insensitive' } },
                    { userEmail: { contains: search, mode: 'insensitive' } },
                ]
            }

            if (startDate || endDate) {
                where.createdAt = {}
                if (startDate) {
                    ;(where.createdAt as Record<string, unknown>).gte =
                        startDate
                }
                if (endDate) {
                    ;(where.createdAt as Record<string, unknown>).lte = endDate
                }
            }

            const [logs, total] = await Promise.all([
                prisma.errorLog.findMany({
                    where,
                    orderBy: { [orderBy]: order },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.errorLog.count({ where }),
            ])

            return { logs: logs as ErrorLogEntry[], total }
        },

        async findById(id: string) {
            const result = await prisma.errorLog.findUnique({ where: { id } })
            return result as ErrorLogEntry | null
        },

        async delete(id: string) {
            await prisma.errorLog.delete({ where: { id } })
        },

        async deleteMany(options) {
            const where: Record<string, unknown> = {}

            if (options.before) {
                where.createdAt = { lt: options.before }
            }

            if (options.level) {
                where.level = options.level
            }

            const result = await prisma.errorLog.deleteMany({ where })
            return result.count
        },
    }
}
