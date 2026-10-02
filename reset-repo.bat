@echo off
cd /d "%~dp0"

if exist ".git" rmdir /s /q ".git"

git init -b main
git add -A
git commit -m "Reset repository history"

git remote add origin https://github.com/Haicaji/haicaji.github.io.git
git push -u origin main --force

pause
