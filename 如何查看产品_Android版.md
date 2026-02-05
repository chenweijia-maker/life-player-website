# 如何查看「人生玩家」产品 - Android 版

## 📱 Android APP 方式（推荐，无需 macOS）

### 前置要求：
- Windows 或 Linux 电脑
- Android Studio（免费下载）
- Android 手机或模拟器

### 步骤：

#### 1. 安装 Android Studio

1. 下载：https://developer.android.com/studio
2. 安装并完成初始设置
3. 安装 Android SDK（通过 SDK Manager）

#### 2. 配置环境变量（Windows）

添加到系统环境变量：
- `ANDROID_HOME` = `C:\Users\你的用户名\AppData\Local\Android\Sdk`
- `PATH` 中添加：`%ANDROID_HOME%\platform-tools`

#### 3. 安装项目依赖

```bash
npm install
```

#### 4. 构建前端资源

```bash
npm run build
```

#### 5. 初始化 Android 项目

```bash
# 添加 Android 平台（首次运行）
npm run cap:add:android

# 同步 Web 资源
npm run cap:sync
```

#### 6. 启动后端服务器

**重要：必须先启动后端服务器！**

```bash
npm start
```

后端会在 `http://localhost:4000` 运行

#### 7. 配置后端服务器地址

编辑 `capacitor.config.js`，修改为你的电脑 IP：

```javascript
server: {
  url: 'http://192.168.1.100:4000',  // 替换为你的电脑 IP
  cleartext: true
}
```

**查找电脑 IP：**
- Windows: 打开命令提示符，运行 `ipconfig`，查找 IPv4 地址
- Linux: 运行 `ifconfig | grep "inet " | grep -v 127.0.0.1`

#### 8. 在 Android Studio 中打开

```bash
npm run cap:open:android
```

#### 9. 运行应用

- **在模拟器中运行**：
  - 在 Android Studio 中创建/启动虚拟设备
  - 点击运行按钮（▶️）

- **在真机上运行**：
  - 启用手机"开发者选项"和"USB 调试"
  - USB 连接手机到电脑
  - 在 Android Studio 中选择设备
  - 点击运行按钮

#### 10. 构建 APK 安装包（可选）

如果想直接安装到手机：

1. 在 Android Studio 中选择 "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
2. 等待构建完成
3. APK 位置：`android/app/build/outputs/apk/debug/app-debug.apk`
4. 将 APK 传输到手机并安装

---

## 🔧 常见问题

### Q: 找不到 ANDROID_HOME？
**A:** 
- 检查 Android Studio 是否已安装
- 确认 SDK 路径：通常在 `C:\Users\你的用户名\AppData\Local\Android\Sdk`
- 添加到系统环境变量

### Q: API 请求失败？
**A:** 
- 确保后端服务器正在运行：`npm start`
- 检查 `capacitor.config.js` 中的 IP 地址是否正确
- 确保手机和电脑在同一网络

### Q: 构建失败？
**A:**
- 确保 Android Studio 和 SDK 已正确安装
- 检查网络连接（Gradle 需要下载依赖）
- 在 Android Studio 中选择 "File" > "Invalidate Caches / Restart"

### Q: 如何查找电脑 IP？
**A:**
- **Windows**: 打开命令提示符，运行 `ipconfig`，查找 "IPv4 地址"
- **Linux**: 运行 `ifconfig | grep "inet " | grep -v 127.0.0.1`

---

## 📋 快速检查清单

- [ ] 安装 Android Studio
- [ ] 配置环境变量（Windows）
- [ ] 运行 `npm install`
- [ ] 运行 `npm run build`
- [ ] 运行 `npm run cap:add:android`
- [ ] 运行 `npm run cap:sync`
- [ ] 启动后端：`npm start`
- [ ] 修改 `capacitor.config.js` 中的服务器 IP
- [ ] 在 Android Studio 中打开项目
- [ ] 运行应用

---

## 🎯 推荐流程

1. **首次使用**：
   - 按照上述步骤完成 Android 项目初始化
   - 在模拟器中测试运行

2. **日常使用**：
   - 启动后端：`npm start`
   - 在 Android Studio 中运行应用
   - 修改代码后：`npm run build && npm run cap:sync`

3. **分享给他人**：
   - 构建 APK 安装包
   - 将 APK 文件分享给其他人安装

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Android Studio 的 "Build" 标签页的错误信息
2. 检查后端终端输出的日志
3. 参考 `ANDROID_BUILD.md` 获取详细说明
