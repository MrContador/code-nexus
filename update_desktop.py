#!/usr/bin/env python3
"""
Script to automatically update all desktop package files from olliEcode to Code Nexus.
"""

import os
import re

DESKTOP_DIR = r"C:\Users\Administrator\AppData\Roaming\CindyGlobal\owners\8abfb6a6ce34715bea84\dialogues\2026-11-13\9c57eba3-8502-4772-b6ec-db835736a92c\olliecode\packages\desktop"

replacements = [
    ("olliEcode", "Code Nexus"),
    ("OLLIECODE", "CODE NEXUS"),
    ("olliecode", "code-nexus"),
    ("OlliEcode", "Code Nexus"),
]

special_patterns = [
    (r'olliecode:update-ready', 'code-nexus:update-ready'),
    (r'olliecode:license-manage-open', 'code-nexus:license-manage-open'),
    (r'olliecode:license-status', 'code-nexus:license-status'),
    (r'olliecode:license-full-key', 'code-nexus:license-full-key'),
    (r'olliecode:theme-get', 'code-nexus:theme-get'),
    (r'olliecode:theme-set', 'code-nexus:theme-set'),
    (r'olliecode:backdrop-luminance', 'code-nexus:backdrop-luminance'),
    (r'olliecode:update-status', 'code-nexus:update-status'),
    (r'olliecode:update-install', 'code-nexus:update-install'),
    (r'olliecode:update-confirm', 'code-nexus:update-confirm'),
    (r'olliecode:app-version', 'code-nexus:app-version'),
    (r'olliecode:open-website', 'code-nexus:open-website'),
    (r'olliecode:license-activate', 'code-nexus:license-activate'),
    (r'olliecode:license-buy', 'code-nexus:license-buy'),
    (r'olliecode:license-deactivate', 'code-nexus:license-deactivate'),
    (r'olliecode:license-swap', 'code-nexus:license-swap'),
    (r'olliecode:license-buy-manage', 'code-nexus:license-buy-manage'),
    (r'olliecode:theme-changed', 'code-nexus:theme-changed'),
    (r'OLLIECODE_LICENSE_API', 'CODE_NEXUS_LICENSE_API'),
    (r'OLLIECODE_ALLOW_DEVTOOLS', 'CODE_NEXUS_ALLOW_DEVTOOLS'),
    (r'OLLIECODE_LICENSE_PUBKEY', 'CODE_NEXUS_LICENSE_PUBKEY'),
    (r'OLLIECODE_CACHE_SALT', 'CODE_NEXUS_CACHE_SALT'),
    (r'OLLIECODE_DIRECTIVE_TOKEN', 'CODE_NEXUS_DIRECTIVE_TOKEN'),
    (r'olliecode-splash-done\.flag', 'code-nexus-splash-done.flag'),
    (r'olliecode-update', 'code-nexus-update'),
    (r'olliEcode-Setup-', 'Code-Nexus-Setup-'),
    (r'olliecode-cache-v1', 'code-nexus-cache-v1'),
    (r'\boE\b', 'CN'),
    (r'olliecode-electron', 'code-nexus-electron'),
    (r'from "../../../../app/src/olliecode-themes"', 'from "../../../../app/src/code-nexus-themes"'),
    (r"from '../../../../app/src/olliecode-themes'", "from '../../../../app/src/code-nexus-themes'"),
    (r'from "../../../../app/src/olliecode-clear"', 'from "../../../../app/src/code-nexus-clear"'),
    (r"from '../../../../app/src/olliecode-clear'", "from '../../../../app/src/code-nexus-clear'"),
]

skip_patterns = [
    r'opencode pair',
    r'\bopencode\b',
]

def should_skip_line(line):
    for pattern in skip_patterns:
        if re.search(pattern, line):
            return True
    return False

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    for old, new in replacements:
        content = re.sub(rf'\b{re.escape(old)}\b', new, content)
    
    for pattern, replacement in special_patterns:
        content = re.sub(pattern, replacement, content)
    
    content = re.sub(r'<title data-sm>olliEcode</title>', '<title data-sm>Code Nexus</title>', content)
    content = re.sub(r'<title>olliEcode \u2014 License</title>', '<title>Code Nexus \u2014 License</title>', content)
    content = re.sub(r'// olliEcode: brand check', '// Code Nexus: brand check', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    files_to_process = []
    for root, dirs, files in os.walk(DESKTOP_DIR):
        if 'node_modules' in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx', '.html')):
                files_to_process.append(os.path.join(root, file))
    
    updated = 0
    for filepath in files_to_process:
        if process_file(filepath):
            print(f"Updated: {os.path.relpath(filepath, DESKTOP_DIR)}")
            updated += 1
    
    print(f"\nTotal files updated: {updated}")

if __name__ == "__main__":
    main()