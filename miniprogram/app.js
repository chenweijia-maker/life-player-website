App({
  globalData: {
    // 与 H5 一致：支持本地存储覆盖 api_base_url
    // 默认值主要用于开发者工具本地联调；真机请配置为 HTTPS 域名并加入「request 合法域名」
    defaultApiBaseUrl: "http://localhost:4000",
  },

  onLaunch() {
    // 这里不做强制跳转，交给各页面自行做登录态检查（更灵活）
  },
});

