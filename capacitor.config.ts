import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ac8593d5a3e94ab184a1934b5a06cc67',
  appName: 'PetSwap',
  webDir: 'dist',
  server: {
    url: 'https://ac8593d5-a3e9-4ab1-84a1-934b5a06cc67.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    scheme: 'petswap',
  },
};

export default config;
