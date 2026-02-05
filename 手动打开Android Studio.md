# 手动打开 Android Studio 项目

## 问题

`npm run cap:open:android` 命令无法自动打开 Android Studio，因为系统找不到 Android Studio 的安装路径。

## 解决方案

### 方式一：手动打开项目（推荐，最简单）

1. **打开 Android Studio**

2. **选择 "Open an Existing Project"**
   - 如果 Android Studio 已经打开，选择 "File" > "Open"

3. **选择项目目录**
   - 导航到项目目录：`C:\Users\陈伟佳\Desktop\人生游戏`
   - **重要：选择 `android` 文件夹**（不是项目根目录）
   - 完整路径：`C:\Users\陈伟佳\Desktop\人生游戏\android`

4. **点击 "OK"**

5. **等待 Gradle 同步**
   - Android Studio 会自动开始同步 Gradle
   - 底部状态栏会显示 "Gradle sync in progress..."
   - 首次同步可能需要几分钟，请耐心等待

### 方式二：配置环境变量（可选，用于自动打开）

如果你想以后使用 `npm run cap:open:android` 命令自动打开，可以配置环境变量：

#### Windows 10/11：

1. **查找 Android Studio 安装路径**
   
   常见路径：
   - `C:\Program Files\Android\Android Studio\bin\studio64.exe`
   - `C:\Users\你的用户名\AppData\Local\Programs\Android Studio\bin\studio64.exe`

2. **设置环境变量**
   
   **方法 A：通过系统设置**
   - 右键点击"此电脑" > "属性"
   - 点击"高级系统设置"
   - 点击"环境变量"
   - 在"用户变量"中点击"新建"
   - 变量名：`CAPACITOR_ANDROID_STUDIO_PATH`
   - 变量值：Android Studio 的完整路径（如：`C:\Program Files\Android\Android Studio\bin\studio64.exe`）
   - 点击"确定"保存

   **方法 B：通过 PowerShell（临时）**
   ```powershell
   $env:CAPACITOR_ANDROID_STUDIO_PATH = "C:\Program Files\Android\Android Studio\bin\studio64.exe"
   ```

   **方法 B：通过 PowerShell（永久）**
   ```powershell
   [System.Environment]::SetEnvironmentVariable('CAPACITOR_ANDROID_STUDIO_PATH', 'C:\Program Files\Android\Android Studio\bin\studio64.exe', 'User')
   ```

3. **重新打开终端**
   - 关闭当前终端
   - 重新打开终端
   - 再次执行 `npm run cap:open:android`

## 📍 项目路径

**Android 项目位置：**
```
C:\Users\陈伟佳\Desktop\人生游戏\android
```

在 Android Studio 中打开时，**必须选择 `android` 文件夹**，而不是项目根目录。

## ✅ 验证项目是否正确打开

打开项目后，你应该能看到：
- 左侧项目树中有 `app` 文件夹
- 有 `build.gradle` 文件
- 底部开始 Gradle 同步

## 🚀 接下来的步骤

1. **等待 Gradle 同步完成**
   - 首次同步可能需要几分钟
   - 如果遇到网络问题，可能需要配置代理

2. **创建/选择 Android 设备**
   - 点击右侧 "Device Manager"
   - 创建模拟器或连接真机

3. **运行应用**
   - 选择设备
   - 点击运行按钮（▶️）

## 🆘 如果遇到问题

### Gradle 同步失败？

1. **检查网络连接**
   - Gradle 需要下载依赖，确保网络畅通

2. **配置代理（如果需要）**
   - File > Settings > Appearance & Behavior > System Settings > HTTP Proxy

3. **清理并重新同步**
   - File > Invalidate Caches / Restart
   - 选择 "Invalidate and Restart"

### 找不到 android 文件夹？

确保已经执行过：
```bash
npm run cap:add:android
npm run cap:sync
```

如果 `android` 文件夹不存在，执行上述命令创建它。

## 📝 快速参考

**手动打开项目：**
1. 打开 Android Studio
2. File > Open
3. 选择 `android` 文件夹
4. 等待 Gradle 同步

**项目路径：**
```
C:\Users\陈伟佳\Desktop\人生游戏\android
```
