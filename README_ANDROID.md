# 人生玩家 Android APP - 快速开始

## ✅ 已完成的工作

1. ✅ 添加 Android 平台支持
2. ✅ 配置 Capacitor Android 依赖
3. ✅ 添加 Android 构建脚本
4. ✅ 创建 Android 构建指南文档

## 🚀 快速开始（Windows/Linux）

### 1. 安装 Android Studio

下载并安装：https://developer.android.com/studio

### 2. 配置环境变量（Windows）

添加到系统环境变量：
- `ANDROID_HOME` = `C:\Users\你的用户名\AppData\Local\Android\Sdk`
- `PATH` 中添加：`%ANDROID_HOME%\platform-tools`

### 3. 安装项目依赖

```bash
npm install
```

### 4. 构建前端资源

```bash
npm run build
```

### 5. 初始化 Android 项目

```bash
# 添加 Android 平台（首次运行）
npm run cap:add:android

# 同步 Web 资源到 Android 项目
npm run cap:sync
```

### 6. 在 Android Studio 中打开

```bash
npm run cap:open:android
```

### 7. 配置后端服务器地址

编辑 `capacitor.config.js`，修改服务器地址为你的电脑 IP：

```javascript
server: {
  // 使用电脑的局域网 IP（不是 localhost）
  url: 'http://192.168.1.100:4000',  // 替换为你的电脑 IP
  cleartext: true
}
```

**查找电脑 IP：**
- Windows: `ipconfig`（查找 IPv4 地址）
- Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`

### 8. 运行应用

- 在 Android Studio 中选择模拟器或连接的设备
- 点击运行按钮（▶️）

## 📝 重要提示

### 后端服务器地址

1. **启动后端服务器**（在项目目录）：
   ```bash
   npm start
   ```

2. **查找电脑 IP 地址**：
   - Windows: 打开命令提示符，运行 `ipconfig`
   - 查找 "IPv4 地址"，例如：`192.168.1.100`

3. **修改配置**：
   编辑 `capacitor.config.js`，将 `server.url` 改为你的 IP

### 构建 APK 安装包

1. 在 Android Studio 中选择 "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
2. APK 位置：`android/app/build/outputs/apk/debug/app-debug.apk`
3. 将 APK 传输到手机并安装

## 🔧 项目结构

```
.
├── frontend/
│   └── index.html          # 前端源代码（已适配移动端）
├── backend/
│   └── server.js           # 后端服务器
├── dist/                   # 构建输出（Capacitor 使用）
├── android/                # Android 项目（运行 cap:add:android 后生成）
├── capacitor.config.js     # Capacitor 配置
├── package.json            # 项目依赖和脚本
├── ANDROID_BUILD.md       # 详细构建指南
└── README_ANDROID.md      # 本文件
```

## 💡 提示

- 每次修改前端代码后，需要运行 `npm run build && npm run cap:sync`
- Android 设备上不能使用 `localhost`，必须使用电脑的局域网 IP
- 首次运行需要启动后端服务器：`npm start`

## 📚 详细文档

查看 `ANDROID_BUILD.md` 获取完整的构建指南和常见问题解答。

## 🎉 完成！

现在你可以在 Android Studio 中构建和运行 Android APP 了！
