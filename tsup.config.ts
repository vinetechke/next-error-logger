import { defineConfig } from 'tsup'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

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
    async onSuccess() {
        // Add "use client" directive to component files only
        const files = ['dist/components/index.js', 'dist/components/index.cjs']
        for (const file of files) {
            const filePath = join(process.cwd(), file)
            try {
                const content = readFileSync(filePath, 'utf-8')
                if (!content.startsWith('"use client"')) {
                    writeFileSync(filePath, `"use client";\n${content}`)
                }
            } catch {
                // File might not exist yet
            }
        }
    },
})
