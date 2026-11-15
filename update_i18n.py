#!/usr/bin/env python3
"""
Script to automatically update all i18n translation files from olliEcode to Code Nexus.
"""

import os
import re

# Translation files directory
I18N_DIR = r"C:\Users\Administrator\AppData\Roaming\CindyGlobal\owners\8abfb6a6ce34715bea84\dialogues\2026-11-13\9c57eba3-8502-4772-b6ec-db835736a92c\olliecode\packages\app\src\runtime\i18n"

# Replacements for olliEcode variations
replacements = [
    # Common patterns in English (will be used as reference for other languages)
    ("olliEcode", "Code Nexus"),
    ("OLLIECODE", "CODE NEXUS"),
    ("olliecode", "code-nexus"),  # lowercase version often used in URLs, API routes, etc.
    ("OlliEcode", "Code Nexus"),  # capitalized
    ("ollieCode", "Code Nexus"),
    ("olliECode", "Code Nexus"),
]

# Special cases that should NOT be replaced:
# - "opencode pair" - this is a CLI command, should stay as is
# - "opencode" - the underlying CLI tool name, should stay as is

def process_file(filepath):
    """Process a single translation file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Apply replacements
    for old, new in replacements:
        # Use word boundaries to avoid partial matches
        # But be careful with case variations
        content = re.sub(rf'\b{re.escape(old)}\b', new, content)
    
    # Also handle specific patterns that might not have word boundaries
    # For URLs and API routes like /_olliecode/
    content = re.sub(r'/_olliecode/', '/_code-nexus/', content)
    content = re.sub(r'olliecode:', 'code-nexus:', content)
    
    # Handle "olliecode" in version strings like "olliecode V2" -> "Code Nexus V2"
    content = re.sub(r'olliecode V2', 'Code Nexus V2', content)
    content = re.sub(r'olliecode V', 'Code Nexus V', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    # Get all .ts files in the i18n directory
    ts_files = [f for f in os.listdir(I18N_DIR) if f.endswith('.ts') and not f.endswith('.test.ts')]
    
    updated = 0
    for filename in ts_files:
        filepath = os.path.join(I18N_DIR, filename)
        if process_file(filepath):
            print(f"Updated: {filename}")
            updated += 1
        else:
            print(f"No changes: {filename}")
    
    print(f"\nTotal files updated: {updated}")

if __name__ == "__main__":
    main()