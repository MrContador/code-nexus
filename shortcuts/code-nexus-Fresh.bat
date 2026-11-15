@echo off
REM Code Nexus Fresh CLI launcher.
set CODE_NEXUS_SPOOF_UNLIMITED=1
set CODE_NEXUS_FRESH=1
"%~dp0..\code-nexus.exe" --standalone %*
