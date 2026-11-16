import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// `npm run icons` 로 public/icon.svg에서 PWA용 PNG 아이콘을 생성한다. (아이콘을 바꿀 때만 실행)
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#8fd3f4' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#8fd3f4' } },
  },
  images: ['public/icon.svg'],
});
