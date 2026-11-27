import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',
  testMatch:'**/*.e2e.ts',
  timeout:45_000,
  workers:1,
  use:{baseURL:'http://localhost:4173',trace:'retain-on-failure'},
  webServer:{
    command:'npm run build && npm run preview -- --host localhost --port 4173 --strictPort',
    url:'http://localhost:4173',
    timeout:90_000,
    env:{
      VITE_SUPABASE_URL:'https://novastudioe2e.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY:'novastudio-e2e',
    },
  },
  projects:[
    {name:'Chromium',use:{...devices['Desktop Chrome'],launchOptions:{
      args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],
    }}},
    {name:'iPhone WebKit',use:{...devices['iPhone 14']}},
  ],
});
