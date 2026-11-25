declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    IMAGES: R2Bucket
    PHONE_TOKEN: string
    DESKTOP_TOKEN: string
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
