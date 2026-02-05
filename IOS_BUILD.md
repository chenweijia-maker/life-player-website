# iOS APP 构建指南

本指南将帮助你将「人生玩家」Web 应用打包成 iOS APP。

## 前置要求

1. **macOS 系统**（iOS 开发必须在 macOS 上进行）
2. **Xcode**（最新版本，从 App Store 安装）
3. **Node.js**（v14+）
4. **CocoaPods**（iOS 依赖管理工具）

## 安装步骤

### 1. 安装依赖

```bash
# 安装项目依赖
npm install

# 安装 CocoaPods（如果还没有安装）
sudo gem install cocoapods
```

### 2. 构建前端资源

```bash
# 构建前端文件到 dist 目录
npm run build
```

### 3. 初始化 Capacitor iOS 项目

```bash
# 添加 iOS 平台
npm run cap:add:ios

# 同步 Web 资源到 iOS 项目
npm run cap:sync
```

### 4. 配置后端服务器地址

编辑 `capacitor.config.js`，修改 `server.url` 为你的实际后端服务器地址：

```javascript
server: {
  // 开发环境：本地开发服务器
  url: 'http://localhost:4000',
  cleartext: true
  
  // 生产环境：改为你的实际服务器地址
  // url: 'https://your-backend-server.com',
  // cleartext: false
}
```

### 5. 在 Xcode 中打开项目

```bash
npm run cap:open:ios
```

这会在 Xcode 中打开 iOS 项目。

## Xcode 配置

### 1. 配置 Bundle Identifier

1. 在 Xcode 中选择项目（左侧导航栏最顶部）
2. 选择 "TARGETS" > "App"
3. 在 "General" 标签页中，修改 "Bundle Identifier" 为你的唯一标识符（例如：`com.yourcompany.lifegame`）

### 2. 配置签名和证书

1. 在 "Signing & Capabilities" 标签页中
2. 选择你的开发团队（需要 Apple Developer 账号）
3. Xcode 会自动管理证书和配置文件

### 3. 配置 Info.plist（如果需要）

如果需要访问网络或其他权限，在 `ios/App/App/Info.plist` 中添加相应的权限说明。

### 4. 配置 App Transport Security（ATS）

如果后端使用 HTTP（非 HTTPS），需要在 `Info.plist` 中添加：

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

或者更安全的方式，只允许特定域名：

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSExceptionDomains</key>
    <dict>
        <key>your-backend-server.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
    </dict>
</dict>
```

## 构建和运行

### 在模拟器中运行

1. 在 Xcode 顶部选择目标设备（如 "iPhone 14 Pro"）
2. 点击运行按钮（▶️）或按 `Cmd + R`

### 在真机上运行

1. 用 USB 连接 iPhone 到 Mac
2. 在 Xcode 中选择你的设备
3. 点击运行按钮
4. 首次运行需要在 iPhone 上信任开发者证书：设置 > 通用 > VPN与设备管理 > 信任开发者

### 构建发布版本

1. 在 Xcode 中选择 "Product" > "Archive"
2. 等待构建完成
3. 在 Organizer 窗口中选择 "Distribute App"
4. 选择分发方式（App Store、Ad Hoc、Enterprise 等）
5. 按照向导完成签名和上传

## 常见问题

### 1. API 请求失败

- 检查 `capacitor.config.js` 中的 `server.url` 配置
- 确保后端服务器可以访问（开发环境可能需要使用 Mac 的 IP 地址而不是 localhost）
- 检查网络权限配置

### 2. 构建错误

- 确保已安装所有依赖：`npm install` 和 `pod install`（在 `ios/App` 目录下）
- 清理构建：在 Xcode 中选择 "Product" > "Clean Build Folder"（`Cmd + Shift + K`）

### 3. 同步问题

如果修改了前端代码，需要重新同步：

```bash
npm run build
npm run cap:sync
```

### 4. 后端服务器地址

在 iOS 设备上，`localhost` 指向设备本身，不是 Mac。需要使用 Mac 的局域网 IP 地址，例如：

```javascript
server: {
  url: 'http://192.168.1.100:4000',  // 替换为你的 Mac IP
  cleartext: true
}
```

查找 Mac IP 地址：
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## 项目结构

```
.
├── frontend/          # 前端源代码
│   └── index.html
├── backend/           # 后端服务器
│   └── server.js
├── dist/              # 构建后的前端文件（Capacitor 使用）
├── ios/               # iOS 项目（由 Capacitor 生成）
│   └── App/
├── capacitor.config.js  # Capacitor 配置
└── package.json
```

## 下一步

- 配置应用图标和启动画面
- 添加原生功能（推送通知、本地存储等）
- 优化性能和用户体验
- 准备 App Store 上架材料

## 参考资源

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [iOS 开发指南](https://developer.apple.com/ios/)
- [Xcode 使用指南](https://developer.apple.com/xcode/)
