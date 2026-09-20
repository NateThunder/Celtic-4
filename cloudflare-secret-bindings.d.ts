export {};

declare global {
  namespace Cloudflare {
    interface Env {
      PRODUCT_SYNC_SECRET: string;
    }
  }

  interface Env {
    PRODUCT_SYNC_SECRET: string;
  }

  namespace NodeJS {
    interface ProcessEnv {
      PRODUCT_SYNC_SECRET: string;
    }
  }
}
