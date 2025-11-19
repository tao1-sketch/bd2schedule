@echo off
setlocal enabledelayedexpansion

set "TARGET=events"
set "OUTPUT=schedule_dirs.json"

> "%OUTPUT%" echo [
set "first=true"

for /r /d %%d in (*) do (
    if /i "%%~nxd"=="%TARGET%" (
        for %%f in ("%%d\*.json") do (
            set "filename=%%~nxf"
            if "!first!"=="true" (
                >> "%OUTPUT%" echo   "!filename!"
                set "first=false"
            ) else (
                >> "%OUTPUT%" echo , "!filename!"
            )
        )
    )
)

>> "%OUTPUT%" echo ]

echo 완료: "%OUTPUT%" 생성됨
