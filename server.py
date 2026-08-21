#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
SpeakHero - Local Development, AI Proxy & Obsidian Sync Server
Serves static PWA files on port 8099, provides POST /api/sync-obsidian and POST /api/ai-evaluate endpoints.
"""

import http.server
import socketserver
import json
import os
import sys
import urllib.request
import urllib.error

# Ensure UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

PORT = 8099
APP_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT_ROOT = os.path.abspath(os.path.join(APP_DIR, "..", "..")) # C:\Users\love_\OneDrive\04_筆記與知識庫\00_my_obsidian
DAILY_REVIEW_DIR = os.path.join(VAULT_ROOT, "06_每日複盤")
TG_SCRIPT = os.path.join(VAULT_ROOT, "01_Projects", "10_Antigravity_Workspace", "AI_Tools", "send_tg.py")

def get_gemini_api_key():
    """Retrieve Gemini API Key from environment or .env files."""
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key.strip()
    
    # 1. Check meta/.env in 10_Antigravity_Workspace
    meta_env = os.path.join(VAULT_ROOT, "01_Projects", "10_Antigravity_Workspace", "meta", ".env")
    if os.path.exists(meta_env):
        try:
            with open(meta_env, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass
            
    # 2. Check local .env
    local_env = os.path.join(APP_DIR, ".env")
    if os.path.exists(local_env):
        try:
            with open(local_env, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass
            
    return None

def call_gemini(payload, api_key, model="gemini-2.5-flash"):
    """Call Google Gemini Generative Language API directly."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        resp_data = response.read().decode('utf-8')
        return json.loads(resp_data)

class SpeakHeroHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        # 1. AI Multimodal Evaluation Proxy
        if self.path == '/api/ai-evaluate':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                req_json = json.loads(post_data.decode('utf-8'))
                task_type = req_json.get('taskType')
                payload = req_json.get('payload')

                api_key = get_gemini_api_key()
                if not api_key:
                    raise ValueError("伺服器環境變數中未配置 GEMINI_API_KEY")

                gemini_resp = call_gemini(payload, api_key)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(gemini_resp, ensure_ascii=False).encode('utf-8'))
                print(f"🤖 [AI Proxy] Successfully evaluated {task_type} via Gemini 2.5 Flash")

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                resp = {"success": False, "error": str(e)}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                print(f"❌ [AI Proxy Error] {e}")

        # 2. Obsidian Daily Review Sync
        elif self.path == '/api/sync-obsidian':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                date_str = data.get('date') # e.g. 2026-08-17
                markdown_content = data.get('content', '')

                if not date_str:
                    raise ValueError("Missing date parameter")

                os.makedirs(DAILY_REVIEW_DIR, exist_ok=True)
                target_file = os.path.join(DAILY_REVIEW_DIR, f"{date_str}.md")

                # If file exists, read and append or update section
                if os.path.exists(target_file):
                    with open(target_file, 'r', encoding='utf-8') as f:
                        existing_text = f.read()

                    section_header = "## 🎙️ 今日 15 分鐘口語表達刻意練習 (SpeakHero 戰報)"
                    if section_header in existing_text:
                        # Replace previous section
                        parts = existing_text.split(section_header)
                        # Keep everything before section, add new content
                        updated_text = parts[0].rstrip() + "\n" + markdown_content
                    else:
                        updated_text = existing_text.rstrip() + "\n\n" + markdown_content

                    with open(target_file, 'w', encoding='utf-8') as f:
                        f.write(updated_text)
                else:
                    # Create new daily review file
                    initial_content = f"""---
title: "{date_str} 每日複盤"
date: {date_str}
category: 每日複盤
tags:
  - 每日複盤
  - 口語表達
---

# 📅 {date_str} 每日複盤與刻意練習
{markdown_content}
"""
                    with open(target_file, 'w', encoding='utf-8') as f:
                        f.write(initial_content)

                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                resp = {
                    "success": True,
                    "message": f"已成功寫入 06_每日複盤/{date_str}.md！",
                    "path": target_file
                }
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                print(f"✅ [Sync] Successfully synced SpeakHero log to {target_file}")

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                resp = {"success": False, "error": str(e)}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                print(f"❌ [Sync Error] {e}")
        else:
            self.send_error(404, "Not Found")

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SpeakHeroHandler) as httpd:
        api_key = get_gemini_api_key()
        print(f"🚀 SpeakHero Server running at http://localhost:{PORT}")
        print(f"📁 Serving: {APP_DIR}")
        print(f"🧠 Obsidian Sync Target: {DAILY_REVIEW_DIR}")
        print(f"🤖 Gemini Backend Auth: {'✅ 已成功綁定環境變數' if api_key else '⚠️ 未找到 GEMINI_API_KEY (將自動走本地擬真)'}")
        httpd.serve_forever()

if __name__ == '__main__':
    run()
