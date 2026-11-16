import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// 정적 호스팅 하위 경로(예: GitHub Pages의 /word-quest/)에 배포할 때는 BASE_PATH 환경변수로 지정한다.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // 'prompt': 새 버전은 대기 상태로 받아 두고, 진행 중인 미션이 없을 때만 적용한다 (src/pwa.ts).
      registerType: 'prompt',
      injectRegister: false,
      // public/ 파일은 아래 globPatterns로 모두 프리캐시되므로 중복 등록하지 않는다.
      includeManifestIcons: false,
      manifest: {
        name: '워드 퀘스트 - 매일 10개, 단어 모험',
        short_name: '워드 퀘스트',
        description: '매일 10개의 영단어를 RPG 모험처럼 외우는 앱',
        lang: 'ko',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fffaf0',
        theme_color: '#8fd3f4',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 셸 + 단어 JSON(번들에 포함됨)을 모두 프리캐시해 오프라인에서도 미션을 끝낼 수 있게 한다.
        // (manifest.webmanifest는 플러그인이 자동으로 추가한다)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
