@echo off
chcp 65001 >nul
echo ====================================
echo    打开"人生玩家"前端页面
echo ====================================
echo.
echo 正在浏览器中打开前端...
echo.

cd /d "%~dp0"
start "" "frontend\index.html"

echo.
echo 前端页面已在浏览器中打开！
echo.
echo 如果看到"无法连接后端"的提示，
echo 请先运行"启动后端.bat"启动后端服务器。
echo.
pause
