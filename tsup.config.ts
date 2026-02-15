import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/index': 'src/components/index.ts',
    'adapters/prisma': 'src/adapters/prisma.ts',
    'adapters/drizzle': 'src/adapters/drizzle.ts',
    'adapters/sql': 'src/adapters/sql.ts',
    'auth/next-auth': 'src/auth/next-auth.ts',
    'auth/clerk': 'src/auth/clerk.ts',
    'api/index': 'src/api/index.ts',
    'schemas/drizzle': 'src/schemas/drizzle.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next',
    'next-auth',
    '@clerk/nextjs',
    '@prisma/client',
    'drizzle-orm',
  ],
  banner: {
    js: '"use client";',
  },
})
