@echo off
REM Script to append NODE_ENV=production to the copied cli.mjs file
REM This ensures the CLI runs in production mode when distributed

set PACKAGE_DIR=package
set CLI_FILE=%PACKAGE_DIR%\cli.mjs

REM Check if the package directory and cli.mjs exist
if not exist "%PACKAGE_DIR%" (
    echo Error: Package directory '%PACKAGE_DIR%' not found
    exit /b 1
)

if not exist "%CLI_FILE%" (
    echo Error: CLI file '%CLI_FILE%' not found
    exit /b 1
)

echo Appending NODE_ENV=production to %CLI_FILE%...

REM Create a temporary file with the NODE_ENV line
echo process.env.NODE_ENV = "production"; > temp_env.txt
echo. >> temp_env.txt

REM Create a new cli.mjs with the environment variable inserted
REM Find the last import line and insert our line after it
powershell -Command "(Get-Content '%CLI_FILE%') | ForEach-Object { $_; if ($_ -match '^import ') { $lastImport = $true } elseif ($lastImport -and $_ -notmatch '^import ') { Get-Content 'temp_env.txt'; $lastImport = $false } } | Set-Content '%CLI_FILE%'"

REM Clean up temporary file
del temp_env.txt

echo Successfully appended NODE_ENV=production to %CLI_FILE%
