#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
SpeakHero - Local Development & Obsidian Sync Server
Serves static PWA files on port 8099 and provides POST /api/sync-obsidian endpoint.
"""

import http.server
import socketserver
import json
import os
import sys

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

class SpeakHeroHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def do_POST(self):
        if self.path == '/api/sync-obsidian':
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
                self.end_headers()
                resp = {"success": False, "error": str(e)}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                print(f"❌ [Sync Error] {e}")
        else:
            self.send_error(404, "Not Found")

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SpeakHeroHandler) as httpd:
        print(f"🚀 SpeakHero Server running at http://localhost:{PORT}")
        print(f"📁 Serving: {APP_DIR}")
        print(f"🧠 Obsidian Sync Target: {DAILY_REVIEW_DIR}")
        httpd.serve_forever()

if __name__ == '__main__':
    run()
