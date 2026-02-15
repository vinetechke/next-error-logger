import type { AuthAdapter } from '../types'

/**
 * Clerk user interface (simplified)
 */
interface ClerkUser {
    id: string
    emailAddresses?: Array<{ emailAddress: string }>
    firstName?: string | null
    lastName?: string | null
}

/**
 * Clerk auth function type
 */
type ClerkAuthFn = () => Promise<{ userId: string | null }>

/**
 * Clerk user fetcher type
 */
type ClerkUserFn = (userId: string) => Promise<ClerkUser | null>

/**
 * Configuration for the Clerk adapter
 */
export interface ClerkAdapterConfig {
    /**
     * Clerk's auth() function from @clerk/nextjs/server
     */
    auth: ClerkAuthFn
    /**
     * Optional: Function to fetch full user details
     * If not provided, only userId will be captured
     *
     * @example
     * ```ts
     * import { clerkClient } from '@clerk/nextjs/server'
     *
     * const fetchUser = async (userId: string) => {
     *   return clerkClient.users.getUser(userId)
     * }
     * ```
     */
    fetchUser?: ClerkUserFn
}

/**
 * Create a Clerk authentication adapter
 *
 * Automatically captures user context from Clerk sessions.
 *
 * @example
 * ```ts
 * // Basic usage (userId only)
 * import { createClerkAdapter } from '@vinetech/next-error-logger/auth/clerk'
 * import { auth } from '@clerk/nextjs/server'
 *
 * const authAdapter = createClerkAdapter({ auth })
 * ```
 *
 * @example
 * ```ts
 * // With full user details
 * import { createClerkAdapter } from '@vinetech/next-error-logger/auth/clerk'
 * import { auth, clerkClient } from '@clerk/nextjs/server'
 *
 * const authAdapter = createClerkAdapter({
 *   auth,
 *   fetchUser: async (userId) => {
 *     return clerkClient.users.getUser(userId)
 *   },
 * })
 *
 * // Initialize logger
 * initErrorLogger({
 *   adapter: createPrismaAdapter(prisma),
 *   authAdapter,
 * })
 * ```
 */
export function createClerkAdapter(config: ClerkAdapterConfig): AuthAdapter {
    const { auth, fetchUser } = config

    return {
        async getUser() {
            try {
                const { userId } = await auth()

                if (!userId) {
                    return null
                }

                // If no fetchUser function provided, return just the ID
                if (!fetchUser) {
                    return { id: userId }
                }

                // Fetch full user details
                const user = await fetchUser(userId)

                if (!user) {
                    return { id: userId }
                }

                const email = user.emailAddresses?.[0]?.emailAddress
                const name =
                    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                    undefined

                return {
                    id: user.id,
                    email,
                    name,
                }
            } catch {
                // Silently fail - user context is optional
                return null
            }
        },
    }
}
