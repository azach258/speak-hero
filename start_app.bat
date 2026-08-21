@echo off
chcp 65001 >nul
echo 🚀 正在啟動 SpeakHero 口語刻意練習工作台...
start "" http://localhost:8099
"C:\Users\love_\AppData\Local\Programs\Python\Python313\python.exe" server.py
pause
