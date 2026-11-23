mod commands;

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{Emitter, Manager};

/// Frontend listens for this, then calls `take_pending_opens`.
/// Payload is empty on purpose: paths stay in the queue so a listener that
/// registers after a cold-start event still sees them.
const OPEN_FILES_EVENT: &str = "xjson://open-files";

/// Extensions registered in tauri.conf.json, plus plain text.
const OPEN_EXTENSIONS: &[&str] = &[
    "json", "jsonc", "json5", "cfg", "conf", "config", "lock", "txt",
];

struct PendingOpens(Mutex<Vec<String>>);

fn enqueue_opens(app: &tauri::AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }
    {
        let state = app.state::<PendingOpens>();
        let mut queue = state.0.lock().unwrap_or_else(|err| err.into_inner());
        for path in paths {
            if !queue.iter().any(|existing| existing == &path) {
                queue.push(path);
            }
        }
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_focus();
        let _ = window.emit(OPEN_FILES_EVENT, ());
    }
}

fn same_file(a: &Path, b: &Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(left), Ok(right)) => left == right,
        _ => a == b,
    }
}

/// Turn one CLI argument into a readable file path.
/// Flags and anything that is not an associated file are ignored so `tauri dev`
/// arguments do not open random paths.
fn file_arg_path(arg: &str) -> Option<PathBuf> {
    let trimmed = arg.trim().trim_matches(|c| c == '"' || c == '\'');
    if trimmed.is_empty() || trimmed.starts_with('-') {
        return None;
    }
    let path = if trimmed.starts_with("file:") {
        tauri::Url::parse(trimmed).ok()?.to_file_path().ok()?
    } else {
        PathBuf::from(trimmed)
    };
    if !path.is_file() {
        return None;
    }
    let ext = path.extension().and_then(|ext| ext.to_str())?;
    if !OPEN_EXTENSIONS
        .iter()
        .any(|candidate| ext.eq_ignore_ascii_case(candidate))
    {
        return None;
    }
    Some(path)
}

/// `args` is a full argv, including the executable path.
fn collect_open_paths<I, S>(args: I) -> Vec<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let exe = std::env::current_exe().ok();
    let mut paths = Vec::new();
    for arg in args {
        let Some(path) = file_arg_path(arg.as_ref()) else {
            continue;
        };
        if exe.as_ref().is_some_and(|exe| same_file(&path, exe)) {
            continue;
        }
        let text = path.to_string_lossy().into_owned();
        if !paths.contains(&text) {
            paths.push(text);
        }
    }
    paths
}

#[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
fn paths_from_opened_urls(urls: Vec<tauri::Url>) -> Vec<String> {
    urls.into_iter()
        .filter_map(|url| url.to_file_path().ok())
        .filter(|path| path.is_file())
        .map(|path| path.to_string_lossy().into_owned())
        .collect()
}

#[tauri::command]
fn take_pending_opens(state: tauri::State<'_, PendingOpens>) -> Vec<String> {
    let mut queue = state.0.lock().unwrap_or_else(|err| err.into_inner());
    std::mem::take(&mut *queue)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be the first plugin so a second process exits before other plugins run.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            enqueue_opens(app, collect_open_paths(argv));
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PendingOpens(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            take_pending_opens,
            commands::decode::decode_string,
            commands::file::read_json_file,
            commands::file::write_json_file,
            commands::file::reveal_in_finder,
        ])
        .setup(|app| {
            // Cold start (Windows / Linux, and macOS when the path is also in argv).
            enqueue_opens(app.handle(), collect_open_paths(std::env::args()));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building XJSON")
        .run(|app, event| {
            // macOS / mobile deliver "Open With" and dock drops here, including
            // when the app is already running. Windows and Linux use argv above.
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            if let tauri::RunEvent::Opened { urls } = event {
                enqueue_opens(app, paths_from_opened_urls(urls));
            }
            #[cfg(not(any(target_os = "macos", target_os = "ios", target_os = "android")))]
            {
                let _ = (app, event);
            }
        });
}

#[cfg(test)]
mod tests {
    use super::collect_open_paths;

    #[test]
    fn collect_open_paths_keeps_only_associated_files() {
        let dir = std::env::temp_dir().join(format!("xjson-open-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let file = dir.join("sample.json");
        std::fs::write(&file, b"{\"ok\":true}").unwrap();
        let other = dir.join("notes.md");
        std::fs::write(&other, b"hi").unwrap();

        let file_url = tauri::Url::from_file_path(&file).unwrap().to_string();
        let got = collect_open_paths([
            "XJSON.exe",
            "--dev",
            "-f",
            "missing.json",
            other.to_str().unwrap(),
            file.to_str().unwrap(),
            file_url.as_str(),
        ]);

        assert_eq!(got, vec![file.to_string_lossy().to_string()]);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
