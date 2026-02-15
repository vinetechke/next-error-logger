import { describe, it, expect, vi, beforeEach } from 'vitest'
import { faker } from '@faker-js/faker'
import { createSQLAdapter } from './sql'
import type { LogLevel } from '../types'

// Helper to create realistic mock DB rows (snake_case as returned by SQL)
function createMockDbRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: faker.string.uuid(),
        level: faker.helpers.arrayElement(['error', 'warn', 'info', 'debug']),
        message: faker.lorem.sentence(),
        stack: faker.datatype.boolean() ? faker.lorem.paragraphs(3) : null,
        user_id: faker.datatype.boolean() ? faker.string.uuid() : null,
        user_email: faker.datatype.boolean() ? faker.internet.email() : null,
        user_name: faker.datatype.boolean() ? faker.person.fullName() : null,
        path: faker.internet.url({ appendSlash: false }),
        method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
        user_agent: faker.internet.userAgent(),
        ip: faker.internet.ip(),
        metadata: null,
        created_at: faker.date.recent().toISOString(),
        ...overrides,
    }
}

describe('createSQLAdapter', () => {
    const mockExecutor = {
        query: vi.fn(),
        execute: vi.fn(),
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('create', () => {
        it('should insert a new log entry', async () => {
            const userId = faker.string.uuid()
            const email = faker.internet.email()
            const message = faker.lorem.sentence()

            const mockDbRow = createMockDbRow({
                level: 'error',
                message,
                user_id: userId,
                user_email: email,
            })

            mockExecutor.query.mockResolvedValueOnce([mockDbRow])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            const result = await adapter.create({
                level: 'error',
                message,
                stack: null,
                userId,
                userEmail: email,
                userName: null,
                path: null,
                method: null,
                userAgent: null,
                ip: null,
                metadata: null,
            })

            expect(mockExecutor.query).toHaveBeenCalled()
            expect(result.level).toBe('error')
            expect(result.message).toBe(message)
            expect(result.userId).toBe(userId)
            expect(result.userEmail).toBe(email)
        })

        it('should handle metadata correctly', async () => {
            const metadata = {
                orderId: faker.string.uuid(),
                amount: faker.number.float({ min: 10, max: 1000 }),
            }

            const mockDbRow = createMockDbRow({
                level: 'error',
                metadata: JSON.stringify(metadata),
            })

            mockExecutor.query.mockResolvedValueOnce([mockDbRow])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            await adapter.create({
                level: 'error',
                message: faker.lorem.sentence(),
                stack: null,
                userId: null,
                userEmail: null,
                userName: null,
                path: null,
                method: null,
                userAgent: null,
                ip: null,
                metadata,
            })

            const insertCall = mockExecutor.query.mock.calls[0]
            const params = insertCall[1]
            expect(params).toContain(JSON.stringify(metadata))
        })
    })

    describe('findMany', () => {
        it('should query with pagination', async () => {
            const mockDbRows = [
                createMockDbRow({ level: 'error' }),
                createMockDbRow({ level: 'warn' }),
                createMockDbRow({ level: 'info' }),
            ]
            const totalCount = faker.number.int({ min: 50, max: 200 })

            mockExecutor.query
                .mockResolvedValueOnce(mockDbRows)
                .mockResolvedValueOnce([{ count: totalCount }])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            const result = await adapter.findMany({ page: 1, limit: 10 })

            expect(result.logs).toHaveLength(3)
            expect(result.total).toBe(totalCount)
            expect(result.logs[0]).toHaveProperty('id')
            expect(result.logs[0]).toHaveProperty('createdAt')
        })

        it('should filter by level', async () => {
            const level: LogLevel = 'error'
            mockExecutor.query
                .mockResolvedValueOnce([createMockDbRow({ level })])
                .mockResolvedValueOnce([{ count: 1 }])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            await adapter.findMany({ level })

            const queryCall = mockExecutor.query.mock.calls[0][0]
            expect(queryCall).toContain('level')
        })

        it('should filter by userId', async () => {
            const userId = faker.string.uuid()
            mockExecutor.query
                .mockResolvedValueOnce([createMockDbRow({ user_id: userId })])
                .mockResolvedValueOnce([{ count: 1 }])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            await adapter.findMany({ userId })

            const queryCall = mockExecutor.query.mock.calls[0][0]
            expect(queryCall).toContain('user_id')
        })

        it('should search across multiple fields', async () => {
            const searchTerm = faker.word.sample()
            mockExecutor.query
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ count: 0 }])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            await adapter.findMany({ search: searchTerm })

            const queryCall = mockExecutor.query.mock.calls[0][0]
            expect(queryCall).toContain('ILIKE')
            expect(queryCall).toContain('message')
            expect(queryCall).toContain('stack')
        })
    })

    describe('findById', () => {
        it('should return entry by id', async () => {
            const id = faker.string.uuid()
            const path = `/api/${faker.word.sample()}`
            const mockDbRow = createMockDbRow({ id, path, method: 'GET' })

            mockExecutor.query.mockResolvedValueOnce([mockDbRow])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            const result = await adapter.findById(id)

            expect(result?.id).toBe(id)
            expect(result?.path).toBe(path)
            expect(result?.method).toBe('GET')
        })

        it('should return null when not found', async () => {
            mockExecutor.query.mockResolvedValueOnce([])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            const result = await adapter.findById(faker.string.uuid())

            expect(result).toBeNull()
        })
    })

    describe('delete', () => {
        it('should delete by id', async () => {
            const id = faker.string.uuid()
            mockExecutor.execute.mockResolvedValueOnce(1)

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            await adapter.delete(id)

            expect(mockExecutor.execute).toHaveBeenCalledWith(
                expect.stringContaining('DELETE'),
                [id],
            )
        })
    })

    describe('deleteMany', () => {
        it('should delete entries before date', async () => {
            const deletedCount = faker.number.int({ min: 1, max: 100 })
            mockExecutor.execute.mockResolvedValueOnce(deletedCount)

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            const before = faker.date.past()
            const count = await adapter.deleteMany({ before })

            expect(count).toBe(deletedCount)
            expect(mockExecutor.execute).toHaveBeenCalled()
        })

        it('should delete by level', async () => {
            mockExecutor.execute.mockResolvedValueOnce(5)

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            await adapter.deleteMany({ level: 'debug' })

            const deleteCall = mockExecutor.execute.mock.calls[0][0]
            expect(deleteCall).toContain('level')
        })

        it('should return 0 when no filters provided', async () => {
            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            const count = await adapter.deleteMany({})

            expect(count).toBe(0)
            expect(mockExecutor.execute).not.toHaveBeenCalled()
        })
    })

    describe('dialect support', () => {
        it('should use $1 placeholders for postgres', async () => {
            mockExecutor.query.mockResolvedValueOnce([])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'postgres',
            })

            await adapter.findById(faker.string.uuid())

            const query = mockExecutor.query.mock.calls[0][0]
            expect(query).toContain('$1')
        })

        it('should use ? placeholders for mysql', async () => {
            mockExecutor.query.mockResolvedValueOnce([])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'mysql',
            })

            await adapter.findById(faker.string.uuid())

            const query = mockExecutor.query.mock.calls[0][0]
            expect(query).toContain('?')
        })

        it('should use ? placeholders for sqlite', async () => {
            mockExecutor.query.mockResolvedValueOnce([])

            const adapter = createSQLAdapter({
                executor: mockExecutor,
                dialect: 'sqlite',
            })

            await adapter.findById(faker.string.uuid())

            const query = mockExecutor.query.mock.calls[0][0]
            expect(query).toContain('?')
        })
    })
})
