# Android APP 构建指南

本指南将帮助你在 Windows/Linux 上将「人生玩家」Web 应用打包成 Android APP。

## 前置要求

1. **Windows 或 Linux 系统**（不需要 macOS）
2. **Android Studio**（最新版本，从官网下载：https://developer.android.com/studio）
3. **Node.js**（v14+）
4. **Java JDK**（11 或更高版本，Android Studio 通常自带）

## 安装步骤

### 1. 安装 Android Studio

1. 下载并安装 Android Studio：https://developer.android.com/studio
2. 打开 Android Studio，完成初始设置向导
3. 安装 Android SDK（通过 SDK Manager）

### 2. 配置环境变量（Windows）

在系统环境变量中添加：
- `ANDROID_HOME` = `C:\Users\你的用户名\AppData\Local\Android\Sdk`
- 将以下路径添加到 `PATH`：
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\tools`
  - `%ANDROID_HOME%\tools\bin`

### 3. 安装项目依赖

```bash
npm install
```

### 4. 构建前端资源

```bash
npm run build
```

### 5. 初始化 Capacitor Android 项目

```bash
# 添加 Android 平台
npm run cap:add:android

# 同步 Web 资源到 Android 项目
npm run cap:sync
```

### 6. 配置后端服务器地址

编辑 `capacitor.config.js`，修改 `server.url` 为你的实际后端服务器地址：

```javascript
server: {
  // 开发环境：使用电脑的局域网 IP（不是 localhost）
  url: 'http://192.168.1.100:4000',  // 替换为你的电脑 IP
  cleartext: true
  
  // 生产环境：改为你的实际服务器地址
  // url: 'https://your-backend-server.com',
  // cleartext: false
}
```

**查找电脑 IP 地址：**
- Windows: 打开命令提示符，运行 `ipconfig`，查找 IPv4 地址
- Linux/Mac: 运行 `ifconfig | grep "inet " | grep -v 127.0.0.1`

### 7. 在 Android Studio 中打开项目

```bash
npm run cap:open:android
```

这会在 Android Studio 中打开 Android 项目。

## Android Studio 配置

### 1. 配置应用签名（可选，用于发布）

1. 在 Android Studio 中选择 "Build" > "Generate Signed Bundle / APK"
2. 选择 "APK" 或 "Android App Bundle"
3. 创建或选择密钥库文件
4. 填写签名信息

### 2. 配置网络权限

Android 应用默认可以访问网络，但如果后端使用 HTTP（非 HTTPS），需要配置网络安全：

编辑 `android/app/src/main/AndroidManifest.xml`，在 `<application>` 标签内添加：

```xml
<application
    android:usesCleartextTraffic="true"
    ...>
```

或者更安全的方式，创建 `android/app/src/main/res/xml/network_security_config.xml`：

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.1.100</domain>
    </domain-config>
</network-security-config>
```

然后在 `AndroidManifest.xml` 中引用：

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

## 构建和运行

### 在模拟器中运行

1. 在 Android Studio 中点击 "Device Manager"
2. 创建或启动一个 Android 虚拟设备（AVD）
3. 点击运行按钮（▶️）或按 `Shift + F10`

### 在真机上运行

1. 在手机上启用"开发者选项"和"USB 调试"
   - 设置 > 关于手机 > 连续点击"版本号"7次
   - 返回设置 > 开发者选项 > 启用"USB 调试"
2. 用 USB 连接手机到电脑
3. 在 Android Studio 中选择你的设备
4. 点击运行按钮

### 构建 APK（用于安装到其他设备）

1. 在 Android Studio 中选择 "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
2. 等待构建完成
3. APK 文件位置：`android/app/build/outputs/apk/debug/app-debug.apk`
4. 将 APK 传输到 Android 手机并安装

## 常见问题

### 1. API 请求失败

- 检查 `capacitor.config.js` 中的 `server.url` 配置
- 确保后端服务器可以访问（使用电脑的局域网 IP，不是 localhost）
- 检查网络权限配置

### 2. 构建错误

- 确保已安装 Android SDK（通过 Android Studio 的 SDK Manager）
- 确保环境变量配置正确
- 清理构建：在 Android Studio 中选择 "Build" > "Clean Project"

### 3. 同步问题

如果修改了前端代码，需要重新同步：

```bash
npm run build
npm run cap:sync
```

### 4. 后端服务器地址

在 Android 设备上，`localhost` 指向设备本身，不是电脑。需要使用电脑的局域网 IP 地址。

### 5. Gradle 构建失败

如果遇到 Gradle 相关错误：
- 确保网络连接正常（Gradle 需要下载依赖）
- 在 Android Studio 中选择 "File" > "Invalidate Caches / Restart"
- 检查 `android/gradle/wrapper/gradle-wrapper.properties` 中的 Gradle 版本

## 项目结构

```
.
├── frontend/          # 前端源代码
│   └── index.html
├── backend/           # 后端服务器
│   └── server.js
├── dist/              # 构建后的前端文件（Capacitor 使用）
├── android/           # Android 项目（由 Capacitor 生成）
│   └── app/
├── capacitor.config.js  # Capacitor 配置
└── package.json
```

## 下一步

- 配置应用图标和启动画面
- 添加原生功能（推送通知、本地存储等）
- 优化性能和用户体验
- 准备 Google Play 上架材料

## 参考资源

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Android 开发指南](https://developer.android.com/)
- [Android Studio 使用指南](https://developer.android.com/studio/intro)
