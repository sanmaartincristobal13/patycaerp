@echo off
rem ======================================================
rem  PATYCA ERP - Iniciar el sistema
rem  Doble clic: enciende el servidor y abre el navegador.
rem  Mantener esta ventana abierta mientras se usa el sistema.
rem ======================================================
title PATYCA ERP
cd /d "%~dp0backend"

where node >nul 2>nul
if errorlevel 1 (
    echo No se encontro Node.js. Instalelo desde https://nodejs.org y vuelva a intentar.
    pause
    exit /b 1
)

if not exist ".env" (
    echo Falta el archivo backend\.env con la configuracion. Vea backend\README.md
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Instalando componentes por primera vez...
    call npm install --omit=dev
)

rem Abre el navegador en cuanto el servidor responda (espera hasta 30 segundos).
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 30; $i++) { try { Invoke-WebRequest 'http://localhost:3000/api/salud' -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process 'http://localhost:3000'; exit } catch { Start-Sleep -Seconds 1 } }"

echo.
echo  PATYCA ERP se esta iniciando...
echo  No cierre esta ventana mientras use el sistema.
echo.
node --env-file=.env src/server.js
echo.
pause
