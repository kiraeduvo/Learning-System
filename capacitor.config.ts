import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kiraeduvo.learningsystem',
  appName: '学习乐园',
  webDir: 'dist',
  backgroundColor: '#FFF6E5',
  android: {
    backgroundColor: '#FFF6E5',
  },
  plugins: {
    SystemBars: {
      // 全屏：隐藏状态栏和导航栏，孩子比较不会乱按（从边缘滑一下就会出现）
      hidden: true,
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
