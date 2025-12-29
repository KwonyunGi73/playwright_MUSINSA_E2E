import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  // 💻 [순차 실행] 렉 방지를 위해 하나씩 실행
  fullyParallel: false, 
  workers: 1, 

  timeout: 60 * 1000, 
  expect: {
    timeout: 5000,
  },

  use: {
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // PC 화면 크기로 고정 (반응형 이슈 방지)
    viewport: { width: 1920, height: 1080 },
  },

  /* 🌍 [브라우저 전략: 선택과 집중]
     점유율 90% 이상을 차지하는 메이저 엔진(Chromium, WebKit) 2개만 테스트합니다.
     Firefox는 점유율 대비 불안정성이 높아 제외했습니다. (전략적 선택)
  */
  projects: [
    // 1. Desktop Chrome (Chromium 엔진) - 압도적 점유율 1위
    {
      name: 'Desktop Chrome',
      use: { browserName: 'chromium' },
    },

    // 2. Desktop Safari (WebKit 엔진) - 맥/아이폰 유저 대응 (구매력 높음)
    {
      name: 'Desktop Safari',
      use: { browserName: 'webkit' },
    },
  ],
});