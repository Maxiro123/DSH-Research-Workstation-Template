@echo off
chcp 65001 >nul
rem mem wrapper: persistent memory graph CLI.
node "%~dp0mem.js" %*
