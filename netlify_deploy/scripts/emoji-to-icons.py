#!/usr/bin/env python3
"""One-time (re-runnable) design pass: replace emoji used as icons with one consistent
line-icon set (Tabler Icons, MIT licence) served from a single sprite: /Resources/icons.svg.

  python3 scripts/emoji-to-icons.py <path-to-tabler-icons/outline>

- An element whose text is ONLY an emoji becomes a green icon  (<svg class="bd-ic bd-ic-solo">).
- A text node that STARTS with an emoji ("📸 Send a photo") keeps its text and gets an inline icon
  that inherits the text colour (so it stays visible on green buttons).
- Star ratings (★), check marks (✓), arrows (→) and the kids' game overlay are left alone.
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLER = sys.argv[1] if len(sys.argv) > 1 else ''

EMO = r'(?:[\U0001F000-\U0001FAFF]|[☀-☄☇-✒✘-➿]|[⭐⭕⬛⬜]|[⏰-⏺⌚⌛])'
SEQ = re.compile(EMO + r'(?:[️‍]|' + EMO + r')*')

FULL = {'🦷💥': 'dental-broken', '🦷🦷': 'dental', '👨‍👩‍👧': 'users'}
FIRST = {
    '🦷': 'dental', '🛡': 'shield-check', '📍': 'map-pin', '📞': 'phone', '🔩': 'tool', '⚡': 'bolt', '💳': 'credit-card',
    '🕐': 'clock', '⏰': 'clock', '⭐': 'star', '🌟': 'star', '🏆': 'trophy', '✨': 'sparkles', '🪩': 'sparkles', '💬': 'message-circle',
    '💊': 'pill', '👑': 'crown', '💧': 'droplet', '🩸': 'droplet', '🎓': 'school', '🔬': 'microscope', '🎉': 'confetti', '😬': 'mood-nervous',
    '👶': 'baby-carriage', '🍼': 'baby-bottle', '🌿': 'leaf', '📐': 'ruler-measure', '🔍': 'search', '😊': 'mood-smile', '😁': 'mood-happy',
    '😌': 'mood-smile-beam', '🚗': 'car', '🏥': 'building-hospital', '👨': 'stethoscope', '👩': 'stethoscope', '🧒': 'mood-kid',
    '🧪': 'flask', '📸': 'camera', '🎮': 'device-gamepad-2', '📋': 'clipboard-list', '📱': 'device-mobile', '🤒': 'thermometer',
    '🌡': 'temperature', '🥵': 'temperature-plus', '😶': 'mood-empty', '🔧': 'tool', '⚙': 'settings', '🦠': 'virus', '🎯': 'target',
    '🗺': 'map', '☕': 'coffee', '🚬': 'smoking', '🚭': 'smoking-no', '💎': 'diamond', '💍': 'diamond', '🧹': 'brush', '📚': 'books',
    '🎁': 'gift', '🖥': 'device-desktop', '💻': 'device-laptop', '🚇': 'train', '🅿': 'parking', '🏛': 'building-bank', '🌐': 'world',
    '🏅': 'medal', '🤫': 'volume-off', '🧠': 'brain', '💪': 'barbell', '🚫': 'ban', '📅': 'calendar', '🗓': 'calendar', '🏗': 'building',
    '🔒': 'lock', '⬜': 'square', '🏠': 'home', '🛂': 'license', '⏸': 'player-pause', '🌙': 'moon', '🫧': 'bubble', '📡': 'antenna',
    '🧬': 'dna', '🚨': 'alert-triangle', '⚠': 'alert-triangle', '🎂': 'cake', '🤰': 'heart-handshake', '💉': 'vaccine', '🍷': 'glass-full',
    '🫐': 'apple', '🍅': 'apple', '🍎': 'apple', '🍬': 'candy', '🥤': 'cup', '🎨': 'palette', '🟡': 'circle', '✅': 'circle-check',
    '💰': 'currency-rupee', '🙅': 'hand-stop', '👀': 'eye', '❤': 'heart', '💚': 'heart', '🏪': 'building-store', '✈': 'plane',
    '🔥': 'flame', '👍': 'thumb-up', '🙂': 'mood-smile', '😃': 'mood-happy', '😄': 'mood-happy', '🤩': 'mood-crazy-happy', '📈': 'trending-up',
    '🧑': 'user', '👤': 'user', '🗣': 'speakerphone', '📧': 'mail', '✉': 'mail', '🌍': 'world', '🌏': 'world', '🏨': 'building-skyscraper',
    '🛏': 'bed', '🍽': 'tools-kitchen-2', '🛍': 'shopping-bag', '🕌': 'building-mosque', '🧳': 'luggage', '💼': 'briefcase', '📄': 'file-text',
    '🔔': 'bell', '🥗': 'salad', '🥦': 'salad', '😰': 'mood-sad', '😢': 'mood-sad', '😇': 'mood-smile-beam', '😅': 'mood-happy', '🍫': 'candy', '🧃': 'cup', '🤔': 'mood-confuzed', '💸': 'currency-rupee', '🖨': 'printer', '🏷': 'tag', '📲': 'device-mobile-message', '⏱': 'stopwatch', '⌛': 'hourglass', '⏳': 'hourglass', '🪥': 'brush', '🧴': 'bottle', '😴': 'zzz', '🤝': 'heart-handshake',
}
FALLBACK = 'circle-check'


def icon_for(seq):
    s = seq.replace('️', '')
    if s in FULL:
        return FULL[s]
    for k, v in FULL.items():
        if s.startswith(k):
            return v
    return FIRST.get(s[0], None)


def protect_segments(html):
    """Return list of (text, editable) chunks. Head, scripts, styles, textareas, the game overlay,
    and the shared header/footer are not edited."""
    spans = []
    for m in re.finditer(r'<head\b.*?</head>|<script\b.*?</script>|<style\b.*?</style>|<textarea\b.*?</textarea>|<!--SITE-HEADER-->.*?<!--/SITE-HEADER-->|<!--SITE-FOOTER-->.*?<!--/SITE-FOOTER-->', html, re.S | re.I):
        spans.append((m.start(), m.end()))
    g = html.find('id="gameOverlay"')
    if g > -1:
        start = html.rfind('<div', 0, g)
        depth, i = 0, start
        for t in re.finditer(r'<(/?)div\b[^>]*>', html[start:]):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                spans.append((start, start + t.end()))
                break
    spans.sort()
    out, pos = [], 0
    for a, b in spans:
        if a < pos:
            a = pos
        if a > pos:
            out.append((html[pos:a], True))
        if b > pos:
            out.append((html[a:b], False))
            pos = b
    out.append((html[pos:], True))
    return out


used, unknown = set(), {}


def svg(name, solo):
    used.add(name)
    cls = 'bd-ic bd-ic-solo' if solo else 'bd-ic'
    return f'<svg class="{cls}" aria-hidden="true"><use href="/Resources/icons.svg#{name}"/></svg>'


def convert(chunk):
    # 1) element text that is only an emoji  ->  solo icon
    def solo(m):
        name = icon_for(m.group(3))
        if not name:
            unknown[m.group(3)] = unknown.get(m.group(3), 0) + 1
            name = FALLBACK
        return f'{m.group(1)}{m.group(2)}{svg(name, True)}{m.group(4)}{m.group(5)}'
    chunk = re.sub(r'(>)(\s*)(' + SEQ.pattern + r')(\s*)(<)', solo, chunk)

    # 2) text node that starts with an emoji followed by words  ->  inline icon + text
    def lead(m):
        name = icon_for(m.group(3))
        if not name:
            unknown[m.group(3)] = unknown.get(m.group(3), 0) + 1
            return m.group(0)
        return f'{m.group(1)}{m.group(2)}{svg(name, False)} '
    chunk = re.sub(r'(>)(\s*)(' + SEQ.pattern + r')[  ]+(?=[^\s<])', lead, chunk)
    return chunk


def main():
    pages = [f for f in glob.glob(os.path.join(ROOT, '*', 'index.html')) + [os.path.join(ROOT, 'index.html')]
             if os.sep + 'admin' + os.sep not in f and os.sep + 'write' + os.sep not in f
             and os.sep + 'cavitywizard' + os.sep not in f and os.sep + 'blog' + os.sep not in f]
    changed = 0
    for f in pages:
        html = open(f, encoding='utf-8').read()
        new = ''.join(convert(t) if ok else t for t, ok in protect_segments(html))
        if new != html:
            open(f, 'w', encoding='utf-8').write(new)
            changed += 1
    # sprite: keep previously used icons too
    sprite_path = os.path.join(ROOT, 'Resources', 'icons.svg')
    if os.path.exists(sprite_path):
        used.update(re.findall(r'<symbol id="([^"]+)"', open(sprite_path, encoding='utf-8').read()))
    if TABLER:
        syms = []
        for name in sorted(used):
            src = open(os.path.join(TABLER, name + '.svg'), encoding='utf-8').read()
            inner = re.search(r'<svg[^>]*>(.*)</svg>', src, re.S).group(1)
            inner = re.sub(r'<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*/>', '', inner).strip()
            inner = re.sub(r'\s+', ' ', inner)
            syms.append(f'<symbol id="{name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{inner}</symbol>')
        open(sprite_path, 'w', encoding='utf-8').write(
            '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n<!-- Tabler Icons (MIT) https://tabler.io/icons -->\n' + '\n'.join(syms) + '\n</svg>\n')
    print(f'pages changed: {changed}; icons in sprite: {len(used)}')
    if unknown:
        print('emoji without a mapping (left as-is or fallback):', unknown)


if __name__ == '__main__':
    main()
