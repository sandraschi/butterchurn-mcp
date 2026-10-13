; Kill UI + backend before install/uninstall (backend locks resources/*.exe).
!macro KillButterchurnMcpFleetProcesses
  DetailPrint "Stopping butterchurn-mcp processes..."
  ExecWait 'taskkill /F /IM butterchurn-mcp-backend.exe /T' $0
  ExecWait 'taskkill /F /IM butterchurn-mcp-native.exe /T' $0
  !if "${INSTALLMODE}" == "currentUser"
    nsis_tauri_utils::KillProcessCurrentUser "butterchurn-mcp-backend.exe"
    Pop $0
    nsis_tauri_utils::KillProcessCurrentUser "butterchurn-mcp-native.exe"
    Pop $0
  !else
    nsis_tauri_utils::KillProcess "butterchurn-mcp-backend.exe"
    Pop $0
    nsis_tauri_utils::KillProcess "butterchurn-mcp-native.exe"
    Pop $0
  !endif
  Sleep 2000
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro KillButterchurnMcpFleetProcesses
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro KillButterchurnMcpFleetProcesses
!macroend

!macro NSIS_HOOK_POSTINSTALL
  IfFileExists "$INSTDIR\resources\install-mcp-clients.ps1" 0 mcp_hook_done
    DetailPrint "Optional: register butterchurn-mcp in Cursor / Claude Desktop"
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\install-mcp-clients.ps1" -Interactive'
  mcp_hook_done:
!macroend
