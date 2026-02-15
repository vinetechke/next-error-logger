import { defineConfig } from 'tsup'

// Server-side entries (no "use client")
const serverEntries = {
    index: 'src/index.ts',
    'adapters/prisma': 'src/adapters/prisma.ts',
    'adapters/drizzle': 'src/adapters/drizzle.ts',
    'adapters/sql': 'src/adapters/sql.ts',
    'auth/next-auth': 'src/auth/next-auth.ts',
    'auth/clerk': 'src/auth/clerk.ts',
    'api/index': 'src/api/index.ts',
    'schemas/drizzle': 'src/schemas/drizzle.ts',
}

// Client-side entries (with "use client")
const clientEntries = {
    'components/index': 'src/components/index.ts',
}

const sharedConfig = {
    format: ['cjs', 'esm'] as ('cjs' | 'esm')[],
    dts: true,
    splitting: false,
    sourcemap: true,
    external: [
        'react',
        'react-dom',
        'next',
        'next-auth',
        '@clerk/nextjs',
        '@prisma/client',
        'drizzle-orm',
    ],
}

export default defineConfig([
    {
        ...sharedConfig,
        entry: serverEntries,
        clean: true,
    },
    {
        ...sharedConfig,
        entry: clientEntries,
        clean: false,
        banner: {
            js: '"use client";',
        },
    },
])
