@echo off
REM Code Nexus Fresh Desktop launcher.
set CODE_NEXUS_SPOOF_UNLIMITED=1
set CODE_NEXUS_FRESH=1
start "" wscript.exe "%~dp0code-nexus-Fresh-Desktop.vbs" %*
