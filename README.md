# 🎮 人生游戏 (Life Game)

一个互动式的人生模拟游戏，让你体验不同的人生选择和结果。

## ✨ 功能特点

- 🎯 互动式人生选择系统
- 📱 支持 Web、iOS 和 Android 多平台
- 🎨 现代化的用户界面
- 💾 本地数据存储
- 🔐 用户认证系统

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/你的用户名/人生游戏.git
   cd 人生游戏
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动后端服务器**
   ```bash
   npm start
   ```
   后端将运行在 `http://localhost:4000`

4. **打开前端页面**

   直接在浏览器中打开 `frontend/index.html` 文件，或使用本地服务器：
   ```bash
   # 方式 A：使用 Python
   cd frontend
   python -m http.server 3000

   # 方式 B：使用 serve
   npx serve frontend -p 3000
   ```
   然后访问 `http://localhost:3000`

## 📱 移动端开发

### Android

1. **构建前端**
   ```bash
   npm run build
   ```

2. **同步到 Android**
   ```bash
   npm run cap:sync
   ```

3. **打开 Android Studio**
   ```bash
   npm run cap:open:android
   ```

详细说明请查看 [Android 构建指南](ANDROID_BUILD.md)

### iOS

1. **构建前端**
   ```bash
   npm run build
   ```

2. **同步到 iOS**
   ```bash
   npm run cap:sync
   ```

3. **打开 Xcode**
   ```bash
   npm run cap:open:ios
   ```

详细说明请查看 [iOS 构建指南](IOS_BUILD.md)

## 🌐 部署到公网

### 部署到 Vercel（推荐，免费）

1. 注册 [Vercel](https://vercel.com) 账号
2. 安装 Vercel CLI：
   ```bash
   npm install -g vercel
   ```
3. 在项目目录运行：
   ```bash
   vercel
   ```
4. 按照提示完成部署

### 部署到 Render（免费后端托管）

1. 注册 [Render](https://render.com) 账号
2. 创建新的 Web Service
3. 连接你的 GitHub 仓库
4. 设置：
   - Build Command: `npm install`
   - Start Command: `npm start`
   - 端口：4000

### 部署到 Railway（免费）

1. 注册 [Railway](https://railway.app) 账号
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway 会自动检测并部署

## 📂 项目结构

```
人生游戏/
├── backend/              # 后端服务器
│   └── server.js        # Express 服务器
├── frontend/            # 前端页面
│   ├── index.html       # 主页面
│   ├── style.css        # 样式文件
│   └── script.js        # 前端逻辑
├── android/             # Android 项目
├── ios/                 # iOS 项目
├── package.json         # 项目配置
├── capacitor.config.js  # Capacitor 配置
└── README.md           # 项目说明
```

## 🛠️ 可用脚本

```bash
npm start              # 启动后端服务器
npm run build          # 构建前端
npm run cap:sync       # 同步到移动平台
npm run cap:open:android  # 打开 Android Studio
npm run cap:open:ios      # 打开 Xcode
```

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，欢迎：
- 提交 Issue
- 发起 Pull Request
- 联系作者

## 🙏 致谢

感谢所有为这个项目做出贡献的人！

---

⭐ 如果这个项目对你有帮助，请给个 Star！
