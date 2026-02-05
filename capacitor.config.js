const { CapacitorConfig } = require('@capacitor/cli');

const config = {
  appId: 'com.lifegame.app',
  appName: '人生玩家',
  webDir: 'dist',
  server: {
    // 开发环境：可以指向本地后端服务器
    // 生产环境：改为你的实际后端服务器地址
    url: 'http://192.168.222.1:4000',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true
  },
  android: {
    allowMixedContent: true,
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#667eea',
      showSpinner: false
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#667eea'
    }
  }
};

module.exports = config;
