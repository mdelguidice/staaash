import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations')
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            PHONE_TOKEN: 'phone-token-for-tests-0001',
            DESKTOP_TOKEN: 'desktop-token-for-tests-0002',
            TEST_MIGRATIONS: migrations
          }
        }
      })
    ],
    test: { setupFiles: ['./test/apply-migrations.ts'] }
  }
})
