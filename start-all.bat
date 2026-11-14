@echo off
cd /d "C:\Users\Surface\Documents\Default Project\hap-workforce-360"
start "HAP Server" cmd /k "node server/index.js"
timeout /t 3 /nobreak >nul
start "HAP Tunnel" cmd /k "node tunnel-fixed.js"
