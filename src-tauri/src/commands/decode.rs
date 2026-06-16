//! String → JSON 多层解码流水线。
//! 自动检测每一层的形态（JSON unescape / URL decode / Base64 / Unicode），
//! 逐层"剥洋葱"直到得到合法 JSON 或无法继续。上限 8 层防死循环。

use base64::Engine;
use serde::Serialize;

const MAX_STEPS: u32 = 8;

#[derive(Serialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DecodeKind {
    JsonUnescape,
    UrlDecode,
    Base64,
    Unicode,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecodeStep {
    pub index: u32,
    pub kind: DecodeKind,
    pub input: String,
    pub output: String,
    pub success: bool,
    pub is_json: bool,
    pub note: Option<String>,
}

/// 是否为合法 JSON（对象或数组才算"到底"，标量串不算）。
fn is_json_value(s: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(s.trim()).is_ok()
}

fn looks_like_structured_json(s: &str) -> bool {
    let t = s.trim();
    (t.starts_with('{') && t.ends_with('}')) || (t.starts_with('[') && t.ends_with(']'))
}

/// JSON 字符串 unescape：把含 \" \\ \n \uXXXX 的串当作 JSON 字符串字面量解析。
fn try_json_unescape(s: &str) -> Option<String> {
    let t = s.trim();
    // 已经被引号包裹的字符串字面量
    if t.starts_with('"') && t.ends_with('"') && t.len() >= 2 {
        if let Ok(serde_json::Value::String(inner)) = serde_json::from_str::<serde_json::Value>(t) {
            return Some(inner);
        }
    }
    // 裸的转义串：补引号再解析
    if t.contains("\\\"") || t.contains("\\\\") || t.contains("\\n") || t.contains("\\t") {
        let wrapped = format!("\"{}\"", t);
        if let Ok(serde_json::Value::String(inner)) =
            serde_json::from_str::<serde_json::Value>(&wrapped)
        {
            return Some(inner);
        }
    }
    None
}

/// URL decode（百分号编码）。
fn try_url_decode(s: &str) -> Option<String> {
    let t = s.trim();
    if !t.contains('%') {
        return None;
    }
    match urlencoding::decode(t) {
        Ok(decoded) => {
            let out = decoded.into_owned();
            if out != t {
                Some(out)
            } else {
                None
            }
        }
        Err(_) => None,
    }
}

/// Base64 decode → 尝试 UTF-8。要求字符集纯净且长度合理。
fn try_base64(s: &str) -> Option<String> {
    let t = s.trim();
    if t.len() < 8 || t.len() % 4 != 0 {
        return None;
    }
    let valid = t
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=');
    if !valid {
        return None;
    }
    let bytes = base64::engine::general_purpose::STANDARD.decode(t).ok()?;
    let (decoded, _, had_errors) = encoding_rs::UTF_8.decode(&bytes);
    if had_errors {
        return None;
    }
    let out = decoded.into_owned();
    // 解出来得是可见文本，避免把普通词误判为 base64
    if out.chars().all(|c| !c.is_control() || c.is_whitespace()) && out != t {
        Some(out)
    } else {
        None
    }
}

/// Unicode \uXXXX unescape（不依赖外层引号）。
fn try_unicode(s: &str) -> Option<String> {
    if !s.contains("\\u") {
        return None;
    }
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    let mut changed = false;
    while let Some(c) = chars.next() {
        if c == '\\' && chars.peek() == Some(&'u') {
            chars.next(); // consume 'u'
            let hex: String = (0..4).filter_map(|_| chars.next()).collect();
            if hex.len() == 4 {
                if let Ok(code) = u32::from_str_radix(&hex, 16) {
                    if let Some(ch) = char::from_u32(code) {
                        out.push(ch);
                        changed = true;
                        continue;
                    }
                }
            }
            // 还原（解析失败）
            out.push('\\');
            out.push('u');
            out.push_str(&hex);
        } else {
            out.push(c);
        }
    }
    if changed {
        Some(out)
    } else {
        None
    }
}

/// 对当前字符串尝试一层解码，返回 (kind, output)。
fn decode_once(s: &str) -> Option<(DecodeKind, String)> {
    if let Some(o) = try_json_unescape(s) {
        return Some((DecodeKind::JsonUnescape, o));
    }
    if let Some(o) = try_url_decode(s) {
        return Some((DecodeKind::UrlDecode, o));
    }
    if let Some(o) = try_base64(s) {
        return Some((DecodeKind::Base64, o));
    }
    if let Some(o) = try_unicode(s) {
        return Some((DecodeKind::Unicode, o));
    }
    None
}

#[tauri::command]
pub fn decode_string(input: String) -> Vec<DecodeStep> {
    let mut steps: Vec<DecodeStep> = Vec::new();
    let mut current = input;
    let mut index = 0u32;

    // 已经是结构化 JSON，无需解码
    if looks_like_structured_json(&current) && is_json_value(&current) {
        return steps;
    }

    while index < MAX_STEPS {
        match decode_once(&current) {
            Some((kind, output)) => {
                let is_json = looks_like_structured_json(&output) && is_json_value(&output);
                steps.push(DecodeStep {
                    index,
                    kind,
                    input: current.clone(),
                    output: output.clone(),
                    success: true,
                    is_json,
                    note: None,
                });
                current = output;
                index += 1;
                if is_json {
                    break; // 到底了
                }
            }
            None => {
                // 无法继续解码
                if steps.is_empty() {
                    steps.push(DecodeStep {
                        index,
                        kind: DecodeKind::JsonUnescape,
                        input: current.clone(),
                        output: current.clone(),
                        success: false,
                        is_json: is_json_value(&current),
                        note: Some("未检测到可解码的编码层".into()),
                    });
                }
                break;
            }
        }
    }

    if index >= MAX_STEPS {
        if let Some(last) = steps.last_mut() {
            last.note = Some(format!("已达最大解码层数 {}，停止", MAX_STEPS));
        }
    }

    steps
}
