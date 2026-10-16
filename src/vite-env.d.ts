/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_FAILOVER_BASE_URL: string
  readonly VITE_FEATURE_DOWNLOADS: string
  readonly VITE_FEATURE_PUSH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
