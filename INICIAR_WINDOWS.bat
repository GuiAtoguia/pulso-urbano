@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale o Node.js LTS e tente novamente.
  echo https://nodejs.org/
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4173"
echo Iniciando Pulso Urbano na porta 4173. Para parar, feche esta janela.
node server.mjs
pause
