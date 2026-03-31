!include "MUI2.nsh"

Name "Modrinth Modifier"
OutFile "..\dist\installer\ModrinthModifier-setup.exe"
InstallDir "$LOCALAPPDATA\Modrinth Modifier"
InstallDirRegKey HKCU "Software\Modrinth Modifier" "InstallDir"
RequestExecutionLevel user

Icon "..\assets\icon.ico"
UninstallIcon "..\assets\icon.ico"

!define MUI_ABORTWARNING
!define MUI_ICON "..\assets\icon.ico"
!define MUI_UNICON "..\assets\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP_NOSTRETCH
!define MUI_FINISHPAGE_RUN "$INSTDIR\Modrinth Modifier.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Modrinth Modifier"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "..\dist\Modrinth Modifier-win32-x64\*.*"

  ; Desktop shortcut
  CreateShortcut "$DESKTOP\Modrinth Modifier.lnk" "$INSTDIR\Modrinth Modifier.exe" "" "$INSTDIR\Modrinth Modifier.exe"

  ; Start menu
  CreateDirectory "$SMPROGRAMS\Modrinth Modifier"
  CreateShortcut "$SMPROGRAMS\Modrinth Modifier\Modrinth Modifier.lnk" "$INSTDIR\Modrinth Modifier.exe"
  CreateShortcut "$SMPROGRAMS\Modrinth Modifier\Uninstall.lnk" "$INSTDIR\Uninstall.exe"

  ; Registry for Add/Remove Programs
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "DisplayName" "Modrinth Modifier"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "DisplayIcon" "$INSTDIR\Modrinth Modifier.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "Publisher" "Modrinth Modifier"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "DisplayVersion" "1.0.4-beta"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier" "NoRepair" 1

  WriteRegStr HKCU "Software\Modrinth Modifier" "InstallDir" "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Relaunch app automatically after silent update
  IfSilent 0 +2
  Exec "$INSTDIR\Modrinth Modifier.exe"
SectionEnd

Section "Uninstall"
  RMDir /r "$INSTDIR"
  Delete "$DESKTOP\Modrinth Modifier.lnk"
  RMDir /r "$SMPROGRAMS\Modrinth Modifier"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ModrinthModifier"
  DeleteRegKey HKCU "Software\Modrinth Modifier"
SectionEnd
