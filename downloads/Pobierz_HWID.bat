@echo off
chcp 65001 >nul
title Sprawdzacz HWID - VectorMc
echo ===================================================
echo           SPRAWDZACZ KODU HWID VECTORMC
echo ===================================================
echo.
echo Pobieranie unikalnego identyfikatora sprzetowego...

for /f "tokens=*" %%a in ('powershell -NoProfile -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"') do set HWID=%%a

if "%HWID%"=="" (
    for /f "skip=1 tokens=*" %%a in ('wmic csproduct get uuid 2^>nul') do (
        if not "%%a"=="" if "%HWID%"=="" set HWID=%%a
    )
)

set HWID=%HWID: =%
set /p "=%HWID%"<nul | clip

echo.
echo ===================================================
echo   TWOJ KOD HWID: %HWID%
echo ===================================================
echo.
echo [SUKCES] Kod zostal automatycznie SKOPIOWANY do Twojego schowka!
echo Wroc na strone sklepu i wklej go w pole HWID (Ctrl + V).
echo.
echo Nacisnij dowolny klawisz, aby zamknac...
pause >nul
