import { describe, it, expect, beforeEach, vi } from 'vitest'
import { faker } from '@faker-js/faker'
import type { DatabaseAdapter, ErrorLogEntry } from './types'

// Helper to create realistic mock entries
function createMockEntry(
    overrides: Partial<ErrorLogEntry> = {},
): ErrorLogEntry {
    return {
        id: faker.string.uuid(),
        level: 'error',
        message: faker.lorem.sentence(),
        stack: faker.lorem.paragraphs(2),
        userId: faker.string.uuid(),
        userEmail: faker.internet.email(),
        userName: faker.person.fullName(),
        path: `/api/${faker.word.sample()}`,
        method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
        userAgent: faker.internet.userAgent(),
        ip: faker.internet.ip(),
        metadata: null,
        createdAt: faker.date.recent(),
        ...overrides,
    }
}

// Mock database adapter factory
function createMockAdapter(
    mockEntry?: ErrorLogEntry,
): DatabaseAdapter & { create: ReturnType<typeof vi.fn> } {
    const entry = mockEntry || createMockEntry()

    return {
        create: vi.fn().mockResolvedValue(entry),
        findMany: vi.fn().mockResolvedValue({ logs: [entry], total: 1 }),
        findById: vi.fn().mockResolvedValue(entry),
        delete: vi.fn().mockResolvedValue(undefined),
        deleteMany: vi.fn().mockResolvedValue(1),
    }
}

describe('initErrorLogger', () => {
    beforeEach(() => {
        vi.resetModules()
    })

    it('should initialize with adapter', async () => {
        const { initErrorLogger, isInitialized } = await import('./logger')
        const adapter = createMockAdapter()

        initErrorLogger({ adapter })

        expect(isInitialized()).toBe(true)
    })

    it('should set default values', async () => {
        const { initErrorLogger, getConfig } = await import('./logger')
        const adapter = createMockAdapter()

        initErrorLogger({ adapter })

        const config = getConfig()
        expect(config.consoleInDev).toBe(true)
        expect(config.retentionDays).toBe(30)
    })

    it('should allow custom retention days', async () => {
        const { initErrorLogger, getConfig } = await import('./logger')
        const adapter = createMockAdapter()
        const customRetention = faker.number.int({ min: 7, max: 90 })

        initErrorLogger({ adapter, retentionDays: customRetention })

        const config = getConfig()
        expect(config.retentionDays).toBe(customRetention)
    })
})

describe('getConfig', () => {
    it('should throw if not initialized', async () => {
        vi.resetModules()
        const { getConfig } = await import('./logger')

        expect(() => getConfig()).toThrow(
            '[@vinetechke/next-error-logger] Logger not initialized',
        )
    })
})

describe('errorLogger', () => {
    let adapter: ReturnType<typeof createMockAdapter>

    beforeEach(async () => {
        vi.resetModules()
        adapter = createMockAdapter()
        const { initErrorLogger } = await import('./logger')
        initErrorLogger({ adapter })
    })

    it('should log error messages', async () => {
        const { errorLogger } = await import('./logger')
        const message = faker.lorem.sentence()

        const result = await errorLogger.error(message)

        expect(result.success).toBe(true)
        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'error',
                message,
            }),
        )
    })

    it('should log warning messages', async () => {
        const { errorLogger } = await import('./logger')
        const message = faker.lorem.sentence()

        const result = await errorLogger.warn(message)

        expect(result.success).toBe(true)
        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'warn',
                message,
            }),
        )
    })

    it('should log info messages', async () => {
        const { errorLogger } = await import('./logger')
        const message = faker.lorem.sentence()

        const result = await errorLogger.info(message)

        expect(result.success).toBe(true)
        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'info',
                message,
            }),
        )
    })

    it('should log debug messages', async () => {
        const { errorLogger } = await import('./logger')
        const message = faker.lorem.sentence()

        const result = await errorLogger.debug(message)

        expect(result.success).toBe(true)
        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                level: 'debug',
                message,
            }),
        )
    })

    it('should include stack trace from Error object', async () => {
        const { errorLogger } = await import('./logger')
        const errorMessage = faker.lorem.sentence()
        const error = new Error(errorMessage)

        await errorLogger.error('Something went wrong', error)

        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                stack: expect.stringContaining(errorMessage),
            }),
        )
    })

    it('should handle errors gracefully', async () => {
        vi.resetModules()
        const failingAdapter = createMockAdapter()
        const dbError = faker.lorem.sentence()
        failingAdapter.create = vi.fn().mockRejectedValue(new Error(dbError))

        const { initErrorLogger, errorLogger } = await import('./logger')
        initErrorLogger({ adapter: failingAdapter })

        const result = await errorLogger.error(faker.lorem.sentence())

        expect(result.success).toBe(false)
        expect(result.error).toBe(dbError)
    })
})

describe('errorLogger.fromRequest', () => {
    let adapter: ReturnType<typeof createMockAdapter>

    beforeEach(async () => {
        vi.resetModules()
        adapter = createMockAdapter()
        const { initErrorLogger } = await import('./logger')
        initErrorLogger({ adapter })
    })

    it('should extract request context', async () => {
        const { errorLogger } = await import('./logger')

        const path = `/api/${faker.word.sample()}`
        const userAgent = faker.internet.userAgent()
        const ip = faker.internet.ip()

        const mockRequest = new Request(`https://example.com${path}`, {
            method: 'POST',
            headers: {
                'user-agent': userAgent,
                'x-forwarded-for': ip,
            },
        })

        const log = errorLogger.fromRequest(mockRequest)
        await log.error(faker.lorem.sentence())

        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                path,
                method: 'POST',
                userAgent,
                ip,
            }),
        )
    })

    it('should handle x-real-ip header', async () => {
        const { errorLogger } = await import('./logger')
        const ip = faker.internet.ip()

        const mockRequest = new Request('https://example.com/test', {
            headers: {
                'x-real-ip': ip,
            },
        })

        const log = errorLogger.fromRequest(mockRequest)
        await log.info(faker.lorem.sentence())

        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                ip,
            }),
        )
    })

    it('should include metadata', async () => {
        const { errorLogger } = await import('./logger')

        const mockRequest = new Request('https://example.com/orders')
        const log = errorLogger.fromRequest(mockRequest)

        const orderId = faker.string.uuid()
        await log.error(faker.lorem.sentence(), undefined, { orderId })

        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                metadata: { orderId },
            }),
        )
    })
})

describe('errorLogger.withUser', () => {
    let adapter: ReturnType<typeof createMockAdapter>

    beforeEach(async () => {
        vi.resetModules()
        adapter = createMockAdapter()
        const { initErrorLogger } = await import('./logger')
        initErrorLogger({ adapter })
    })

    it('should log with explicit user context', async () => {
        const { errorLogger } = await import('./logger')

        const user = {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            name: faker.person.fullName(),
        }

        await errorLogger.withUser(user).error(faker.lorem.sentence())

        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
            }),
        )
    })
})

describe('level filtering', () => {
    it('should skip logs when level is filtered out', async () => {
        vi.resetModules()
        const adapter = createMockAdapter()
        const { initErrorLogger, errorLogger } = await import('./logger')

        initErrorLogger({
            adapter,
            levels: ['error', 'warn'],
        })

        await errorLogger.info(faker.lorem.sentence())

        expect(adapter.create).not.toHaveBeenCalled()
    })

    it('should log when level is allowed', async () => {
        vi.resetModules()
        const adapter = createMockAdapter()
        const { initErrorLogger, errorLogger } = await import('./logger')

        initErrorLogger({
            adapter,
            levels: ['error', 'warn'],
        })

        await errorLogger.error(faker.lorem.sentence())

        expect(adapter.create).toHaveBeenCalled()
    })
})

describe('auth adapter integration', () => {
    it('should capture user from auth adapter', async () => {
        vi.resetModules()
        const adapter = createMockAdapter()
        const authUser = {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            name: faker.person.fullName(),
        }
        const authAdapter = {
            getUser: vi.fn().mockResolvedValue(authUser),
        }

        const { initErrorLogger, errorLogger } = await import('./logger')
        initErrorLogger({ adapter, authAdapter })

        await errorLogger.error(faker.lorem.sentence())

        expect(authAdapter.getUser).toHaveBeenCalled()
        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: authUser.id,
                userEmail: authUser.email,
                userName: authUser.name,
            }),
        )
    })

    it('should handle auth adapter errors gracefully', async () => {
        vi.resetModules()
        const adapter = createMockAdapter()
        const authAdapter = {
            getUser: vi.fn().mockRejectedValue(new Error('Auth failed')),
        }

        const { initErrorLogger, errorLogger } = await import('./logger')
        initErrorLogger({ adapter, authAdapter })

        const result = await errorLogger.error(faker.lorem.sentence())

        expect(result.success).toBe(true)
        expect(adapter.create).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: null,
                userEmail: null,
                userName: null,
            }),
        )
    })
})
