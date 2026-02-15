# @vinetechke/next-error-logger

> **Beta Release** - This package is under active development. APIs may change before v1.0.0.

Simple error logging for Next.js apps with user context, multiple database adapters, and a built-in dashboard.

[![npm version](https://badge.fury.io/js/%40vinetechke%2Fnext-error-logger.svg)](https://www.npmjs.com/package/@vinetechke/next-error-logger)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **User Context** - Captures user ID, email, and name from your auth provider
- **Multiple Database Adapters** - Works with Prisma, Drizzle, or raw SQL
- **Multiple Auth Adapters** - Supports NextAuth, Clerk, or custom auth
- **Built-in Dashboard** - Ready-to-use LogViewer component
- **Error Boundary** - React error boundary with automatic logging
- **TypeScript First** - Full type safety
- **Request Context** - Auto-captures path, method, IP, and user agent

## Requirements

- Next.js 14 or later
- React 18 or later
- Node.js 18 or later

## Installation

```bash
npm install @vinetechke/next-error-logger
```

```bash
pnpm add @vinetechke/next-error-logger
```

```bash
yarn add @vinetechke/next-error-logger
```

## Quick Start

### 1. Set Up Your Database Schema

#### Prisma

Add to your `schema.prisma`:

```prisma
model ErrorLog {
  id        String   @id @default(cuid())
  level     String
  message   String   @db.Text
  stack     String?  @db.Text
  userId    String?
  userEmail String?
  userName  String?
  path      String?
  method    String?
  userAgent String?
  ip        String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([level])
  @@index([userId])
  @@index([createdAt])
  @@map("error_logs")
}
```

Then run:

```bash
npx prisma db push
```

#### Drizzle

```typescript
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
```

#### Raw SQL

See [schemas/schema.sql](./schemas/schema.sql) for PostgreSQL, MySQL, and SQLite schemas.

### 2. Initialize the Logger

Create `lib/error-logger.ts`:

```typescript
import { initErrorLogger, errorLogger } from '@vinetechke/next-error-logger'
import { createPrismaAdapter } from '@vinetechke/next-error-logger/adapters/prisma'
import { createNextAuthAdapter } from '@vinetechke/next-error-logger/auth/next-auth'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

initErrorLogger({
  adapter: createPrismaAdapter(prisma),
  authAdapter: createNextAuthAdapter(auth),
  retentionDays: 30,
})

export { errorLogger }
```

### 3. Log Errors in Your API Routes

```typescript
import { errorLogger } from '@/lib/error-logger'

export async function POST(request: Request) {
  const log = errorLogger.fromRequest(request)

  try {
    const body = await request.json()
    // ... process order

    await log.info('Order created', { orderId: order.id })
    return Response.json(order)
  } catch (error) {
    await log.error('Failed to create order', error as Error, {
      body: await request.json(),
    })
    return Response.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
```

### 4. Create API Routes for the Dashboard

```typescript
// app/api/admin/logs/route.ts
import { createLogAPIHandlers } from '@vinetechke/next-error-logger/api'
import { auth } from '@/auth'

const { GET, DELETE } = createLogAPIHandlers({
  isAuthorized: async () => {
    const session = await auth()
    return session?.user?.role === 'ADMIN'
  },
})

export { GET, DELETE }
```

```typescript
// app/api/admin/logs/[id]/route.ts
import { createLogDetailAPIHandlers } from '@vinetechke/next-error-logger/api'
import { auth } from '@/auth'

const { GET, DELETE } = createLogDetailAPIHandlers({
  isAuthorized: async () => {
    const session = await auth()
    return session?.user?.role === 'ADMIN'
  },
})

export { GET, DELETE }
```

### 5. Add the Dashboard Page

```tsx
// app/admin/logs/page.tsx
import { LogViewer } from '@vinetechke/next-error-logger/components'

export default function LogsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Error Logs</h1>
      <LogViewer
        apiBasePath="/api/admin/logs"
        pageSize={50}
        showDelete
        autoRefresh={30}
      />
    </div>
  )
}
```

## Database Adapters

### Prisma

```typescript
import { createPrismaAdapter } from '@vinetechke/next-error-logger/adapters/prisma'
import { prisma } from '@/lib/prisma'

const adapter = createPrismaAdapter(prisma)
```

### Drizzle

```typescript
import { createDrizzleAdapter } from '@vinetechke/next-error-logger/adapters/drizzle'
import { db } from '@/lib/db'
import { errorLogs } from '@/lib/schema'
import { eq, and, or, like, lt, gte, lte, desc, asc } from 'drizzle-orm'

const adapter = createDrizzleAdapter({
  db,
  table: errorLogs,
  operators: { eq, and, or, like, lt, gte, lte, desc, asc },
})
```

### Raw SQL

Works with any SQL database:

```typescript
import { createSQLAdapter } from '@vinetechke/next-error-logger/adapters/sql'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const adapter = createSQLAdapter({
  executor: {
    query: async (sql, params) => {
      const result = await pool.query(sql, params)
      return result.rows
    },
    execute: async (sql, params) => {
      const result = await pool.query(sql, params)
      return result.rowCount || 0
    },
  },
  dialect: 'postgres',
})
```

## Auth Adapters

### NextAuth (Auth.js v5)

```typescript
import { createNextAuthAdapter } from '@vinetechke/next-error-logger/auth/next-auth'
import { auth } from '@/auth'

const authAdapter = createNextAuthAdapter(auth)
```

### NextAuth v4

```typescript
import { createNextAuthAdapter } from '@vinetechke/next-error-logger/auth/next-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const authAdapter = createNextAuthAdapter(async () => {
  return getServerSession(authOptions)
})
```

### Clerk

```typescript
import { createClerkAdapter } from '@vinetechke/next-error-logger/auth/clerk'
import { auth, clerkClient } from '@clerk/nextjs/server'

const authAdapter = createClerkAdapter({
  auth,
  fetchUser: async (userId) => {
    return clerkClient.users.getUser(userId)
  },
})
```

### Custom Auth

```typescript
import type { AuthAdapter } from '@vinetechke/next-error-logger'

const customAuthAdapter: AuthAdapter = {
  async getUser() {
    const user = await getMyUser()
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    }
  },
}
```

## API Reference

### errorLogger

```typescript
// Simple logging
await errorLogger.error('Something went wrong', error)
await errorLogger.warn('Deprecated API used')
await errorLogger.info('User completed checkout')
await errorLogger.debug('Debug info')

// With request context (recommended for API routes)
const log = errorLogger.fromRequest(request)
await log.error('API failed', error, { orderId: '123' })

// With explicit user context
await errorLogger.withUser({ id: 'user-123', email: 'user@example.com' })
  .error('User action failed', error)
```

### LogViewer Component

```tsx
<LogViewer
  apiBasePath="/api/admin/logs"
  pageSize={50}
  showDelete={true}
  autoRefresh={30}
  className="my-custom-class"
  theme={{
    errorBg: '#fee2e2',
    errorText: '#dc2626',
    warnBg: '#fef3c7',
    warnText: '#d97706',
  }}
  onLogSelect={(log) => {}}
/>
```

### ErrorBoundary Component

```tsx
import { ErrorBoundary } from '@vinetechke/next-error-logger/components'
import { errorLogger } from '@/lib/error-logger'

<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )}
  onError={async (error, info) => {
    await errorLogger.error('React render error', error, {
      metadata: { componentStack: info.componentStack },
    })
  }}
>
  <MyApp />
</ErrorBoundary>
```

## Configuration Options

```typescript
initErrorLogger({
  adapter: createPrismaAdapter(prisma),
  authAdapter: createNextAuthAdapter(auth),
  retentionDays: 30,
  levels: ['error', 'warn'],
  consoleInDev: true,
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `adapter` | `DatabaseAdapter` | required | Database adapter for storing logs |
| `authAdapter` | `AuthAdapter` | - | Auth adapter for user context |
| `retentionDays` | `number` | `30` | Days to retain logs |
| `levels` | `LogLevel[]` | all | Only capture these levels |
| `consoleInDev` | `boolean` | `true` | Console output in development |

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  ErrorLogEntry,
  LogLevel,
  DatabaseAdapter,
  AuthAdapter,
  ErrorLoggerConfig,
  QueryOptions,
  LogViewerProps,
} from '@vinetechke/next-error-logger'
```

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## Changelog

### 0.1.0-beta.1

- Initial beta release
- Prisma, Drizzle, and raw SQL adapters
- NextAuth and Clerk auth adapters
- LogViewer dashboard component
- ErrorBoundary component

## Contributing

Contributions welcome. Please open an issue to discuss changes before submitting a PR.

## License

MIT License - see [LICENSE](./LICENSE) for details.
