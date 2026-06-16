//! 文件读写命令。绕过浏览器沙箱，解析失败的文本文件也返回（前端按纯文本展示）。

use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileContent {
    pub content: String,
    pub file_name: String,
    pub file_path: String,
    pub parsed_ok: bool,
}

#[tauri::command]
pub async fn read_json_file(path: String) -> Result<FileContent, String> {
    let p = Path::new(&path);
    let content = std::fs::read_to_string(p).map_err(|e| format!("读取失败: {e}"))?;
    let file_name = p
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "untitled".into());
    let parsed_ok = serde_json::from_str::<serde_json::Value>(content.trim()).is_ok();
    Ok(FileContent {
        content,
        file_name,
        file_path: path,
        parsed_ok,
    })
}

#[tauri::command]
pub async fn write_json_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("写入失败: {e}"))
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| format!("打开 Finder 失败: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| format!("打开资源管理器失败: {e}"))?;
    }
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        let dir = p.parent().unwrap_or(p);
        std::process::Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| format!("打开文件管理器失败: {e}"))?;
    }
    let _ = p;
    Ok(())
}
