import type { AuthAdapter } from '../types'

/**
 * NextAuth session interface
 */
interface NextAuthSession {
    user?: {
        id?: string
        email?: string | null
        name?: string | null
    } | null
}

/**
 * NextAuth auth function type
 */
type NextAuthFn = () => Promise<NextAuthSession | null>

/**
 * Create a NextAuth authentication adapter
 *
 * Automatically captures user context from NextAuth sessions.
 *
 * @example
 * ```ts
 * // With NextAuth v5 (Auth.js)
 * import { createNextAuthAdapter } from '@vinetechke/next-error-logger/auth/next-auth'
 * import { auth } from '@/auth'  // Your NextAuth config
 *
 * const authAdapter = createNextAuthAdapter(auth)
 *
 * // Initialize logger
 * initErrorLogger({
 *   adapter: createPrismaAdapter(prisma),
 *   authAdapter,
 * })
 * ```
 *
 * @example
 * ```ts
 * // With NextAuth v4
 * import { createNextAuthAdapter } from '@vinetechke/next-error-logger/auth/next-auth'
 * import { getServerSession } from 'next-auth'
 * import { authOptions } from '@/app/api/auth/[...nextauth]/route'
 *
 * const authAdapter = createNextAuthAdapter(async () => {
 *   return getServerSession(authOptions)
 * })
 * ```
 *
 * @param authFn - Your NextAuth auth() function or a wrapper that returns the session
 */
export function createNextAuthAdapter(authFn: NextAuthFn): AuthAdapter {
    return {
        async getUser() {
            try {
                const session = await authFn()

                if (!session?.user?.id) {
                    return null
                }

                return {
                    id: session.user.id,
                    email: session.user.email || undefined,
                    name: session.user.name || undefined,
                }
            } catch {
                // Silently fail - user context is optional
                return null
            }
        },
    }
}
