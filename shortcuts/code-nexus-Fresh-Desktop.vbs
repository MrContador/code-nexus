' Code Nexus Fresh Desktop launcher.
Option Explicit
Dim shell, scriptFullName, scriptDir, appRoot, electronExe, desktopPkg, splashScript, splashCmd
Set shell = CreateObject("WScript.Shell")
scriptFullName = WScript.ScriptFullName
scriptDir = Left(scriptFullName, InStrRev(scriptFullName, "\"))
appRoot = Left(scriptDir, Len(scriptDir) - Len("shortcuts\"))
electronExe = appRoot & "electron\electron.exe"
desktopPkg = appRoot & "desktop-pkg"
splashScript = appRoot & "scripts\splash.ps1"

shell.Environment("PROCESS")("CODE_NEXUS_SPOOF_UNLIMITED") = "1"
shell.Environment("PROCESS")("CODE_NEXUS_FRESH") = "1"

If CreateObject("Scripting.FileSystemObject").FileExists(splashScript) Then
    splashCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & splashScript & """"
    shell.Run splashCmd, 0, False
End If

shell.Run """" & electronExe & """ """ & desktopPkg & """", 1, False
