' AutoClip Studio AI - Arka Planda Sessiz Baslatici
' Bu dosya cift tiklandiginda terminal / siyah CMD ekrani acilmadan uygulamayi dogrudan baslatir.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = scriptDir

' 0 = SW_HIDE (Konsol / Terminal penceresini tamamen gizler)
WshShell.Run "cmd.exe /c npm run dev", 0, False
