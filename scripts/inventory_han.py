"""Inventory every Han character actually emitted by the game src tree
(ignoring CSS/JS comments). Reads both literal chars and CSS Unicode
escape sequences like content: '\\5E02' (= 市)."""
import os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

han = set()
for root, dirs, files in os.walk('src'):
    if 'node_modules' in root:
        continue
    for f in files:
        if not (f.endswith('.css') or f.endswith('.jsx') or f.endswith('.js')):
            continue
        path = os.path.join(root, f)
        try:
            src = open(path, encoding='utf-8').read()
        except Exception:
            continue
        # Strip JS block comments + line comments + CSS /* */ blocks
        no_comments = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        no_comments = re.sub(r'^\s*//.*$', '', no_comments, flags=re.M)
        for ch in re.findall(r'[一-鿿]', no_comments):
            han.add(ch)
        # CSS content: "\5E02" style escapes
        for m in re.findall(r'content\s*:\s*[\"\']\\([0-9A-Fa-f]{4,5})[\"\']', src):
            try:
                han.add(chr(int(m, 16)))
            except ValueError:
                pass

chars = sorted(han)
print(f'Total unique Han chars in src: {len(chars)}')
print(''.join(chars))
