@echo off
chcp 65001 >nul
echo ====================================
echo    启动"人生玩家"后端服务器
echo ====================================
echo.
echo 正在启动后端服务器...
echo 后端将运行在: http://localhost:4000
echo.
echo 注意：请保持此窗口打开！
echo 关闭此窗口会停止后端服务器。
echo.
echo ====================================
echo.

cd /d "%~dp0"
node backend/server.js

pause
