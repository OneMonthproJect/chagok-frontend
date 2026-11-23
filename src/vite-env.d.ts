/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEV_PROXY_TARGET?: string
  /** 'true'이면 개발 서버(npm run dev)에서만 Mock 응답을 쓴다. 운영 빌드에서는 무시 (CONVENTIONS 7장 Mock) */
  readonly VITE_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
