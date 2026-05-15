@echo off
echo ========================================
echo    Adding auth_info folder to GitHub
echo ========================================
echo.

cd /d "C:\Users\kwame\Downloads\railway-bot"

echo Adding auth_info folder...
git add auth_info/

echo.
echo Committing...
git commit -m "add auth_info"

echo.
echo Uploading to GitHub...
echo (It may ask for your GitHub username and password)
echo NOTE: When typing your password, nothing will show - that is normal!
echo.
git push

echo.
echo ========================================
if %errorlevel%==0 (
    echo  SUCCESS! auth_info is now on GitHub!
    echo  Go to: https://github.com/kwamzi/expodata-45
) else (
    echo  Something went wrong. Screenshot this window
    echo  and send it here for help.
)
echo ========================================
pause
