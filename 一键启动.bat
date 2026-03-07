@echo off
chcp 65001 >nul
echo ====================================
echo    "人生玩家" 一键启动
echo ====================================
echo.
echo [1/2] 正在启动后端服务器...
echo.

cd /d "%~dp0"

:: 在新窗口中启动后端
start "人生玩家-后端服务器" cmd /k "echo 后端服务器运行在: http://localhost:4000 && echo. && echo 请保持此窗口打开！ && echo. && node backend/server.js"

:: 等待2秒让后端启动
timeout /t 2 /nobreak >nul

echo [2/2] 正在打开前端页面...
echo.

:: 打开前端
start "" "frontend\index.html"

echo.
echo ====================================
echo    启动完成！
echo ====================================
echo.
echo 后端服务器: 已在新窗口中运行
echo 前端页面: 已在浏览器中打开
echo.
echo 请保持后端服务器窗口打开！
echo 关闭后端窗口会导致网页无法使用。
echo.
pause
