# 人生玩家 iOS APP - 快速开始

## ✅ 已完成的工作

1. ✅ 安装和配置 Capacitor 依赖
2. ✅ 添加 API 配置函数，支持 Web 和 iOS 环境自动切换
3. ✅ 修复所有 API 调用，使用统一的 `apiUrl()` 函数
4. ✅ 优化移动端样式（安全区域适配、响应式设计）
5. ✅ 创建 Capacitor 配置文件
6. ✅ 创建 iOS 构建指南文档

## 🚀 下一步操作（在 macOS 上执行）

### 1. 安装依赖

```bash
npm install
```

### 2. 构建前端资源

```bash
npm run build
```

### 3. 初始化 iOS 项目

```bash
# 添加 iOS 平台（首次运行）
npm run cap:add:ios

# 同步 Web 资源到 iOS 项目
npm run cap:sync
```

### 4. 在 Xcode 中打开项目

```bash
npm run cap:open:ios
```

### 5. 配置和运行

- 在 Xcode 中选择你的开发团队
- 选择目标设备（模拟器或真机）
- 点击运行按钮（▶️）

## 📝 重要配置

### 后端服务器地址

编辑 `capacitor.config.js`，修改服务器地址：

```javascript
server: {
  // 开发环境：使用 Mac 的局域网 IP（不是 localhost）
  url: 'http://192.168.1.100:4000',  // 替换为你的 Mac IP
  cleartext: true
  
  // 生产环境：使用 HTTPS
  // url: 'https://your-backend-server.com',
  // cleartext: false
}
```

### 查找 Mac IP 地址

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## 📚 详细文档

查看 `IOS_BUILD.md` 获取完整的构建指南和常见问题解答。

## 🔧 项目结构

```
.
├── frontend/
│   └── index.html          # 前端源代码（已适配 iOS）
├── backend/
│   └── server.js           # 后端服务器
├── dist/                   # 构建输出（Capacitor 使用）
├── ios/                    # iOS 项目（运行 cap:add:ios 后生成）
├── capacitor.config.js     # Capacitor 配置
├── package.json            # 项目依赖和脚本
├── IOS_BUILD.md           # 详细构建指南
└── README_IOS.md          # 本文件
```

## 💡 提示

- 每次修改前端代码后，需要运行 `npm run build && npm run cap:sync`
- iOS 设备上不能使用 `localhost`，必须使用 Mac 的局域网 IP
- 首次在真机上运行需要信任开发者证书

## 🎉 完成！

现在你可以在 Xcode 中构建和运行 iOS APP 了！
