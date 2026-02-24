@echo off
chcp 65001 >nul
:: 评论分析一键运行脚本 (Windows)
:: 使用方法: run_analysis.bat [csv文件名]

:: 获取脚本所在目录
set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: 检查参数
if "%~1"=="" (
    :: 自动查找最新的评论数据文件
    for /f "delims=" %%i in ('dir /b /o-d output\crawler\评论数据_*.csv 2^>nul') do (
        set "LATEST_FILE=output\crawler\%%i"
        goto :found
    )
    
    echo ❌ 未找到评论数据文件
    echo 请确保已从插件导出数据到 output\crawler\ 目录
    echo.
    echo 用法:
    echo   run_analysis.bat                    自动分析最新文件
    echo   run_analysis.bat 评论数据_xxx.csv    分析指定文件
    exit /b 1
)

:found
if "%~1"=="" (
    echo 📝 自动找到最新文件: %LATEST_FILE%
    set "CSV_FILE=%LATEST_FILE%"
) else (
    set "CSV_FILE=%~1"
    :: 如果路径不包含 \，自动添加 output\crawler\ 前缀
    echo %CSV_FILE% | findstr "\" >nul
    if errorlevel 1 (
        set "CSV_FILE=output\crawler\%CSV_FILE%"
    )
)

:: 检查文件是否存在
if not exist "%CSV_FILE%" (
    echo ❌ 文件不存在: %CSV_FILE%
    exit /b 1
)

echo.
echo ========================================
echo   🚀 开始分析评论数据
echo ========================================
echo.
echo 📁 文件: %CSV_FILE%
echo.

:: 运行分析
python analyze_reviews.py "%CSV_FILE%"

echo.
echo ========================================
echo   ✅ 分析完成！
echo ========================================
echo.
echo 📂 报告位置: output\reports\
echo.
pause
