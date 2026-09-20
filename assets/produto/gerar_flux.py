#!/usr/bin/env python3
"""Gera as 4 imagens do produto com Cloudflare Workers AI (Flux.1 Schnell).

Precisa de duas variaveis, lidas de ~/.config/uliani/shared.env ou do ambiente:
  CLOUDFLARE_ACCOUNT_ID=...
  CLOUDFLARE_API_TOKEN=...   (token com permissao Workers AI: Read + Write)

Uso:  python3 gerar_flux.py            # gera as 4
      python3 gerar_flux.py hero       # so uma
"""
import base64, json, os, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
ENV = pathlib.Path.home() / '.config/uliani/shared.env'
if ENV.exists():
    for line in ENV.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1); os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
ACC = os.environ.get('CLOUDFLARE_ACCOUNT_ID'); TOK = os.environ.get('CLOUDFLARE_API_TOKEN')
if not ACC or not TOK:
    sys.exit('faltam CLOUDFLARE_ACCOUNT_ID e/ou CLOUDFLARE_API_TOKEN (em ~/.config/uliani/shared.env)')

MODEL = '@cf/black-forest-labs/flux-1-schnell'
URL = f'https://api.cloudflare.com/client/v4/accounts/{ACC}/ai/run/{MODEL}'

STYLE = ('Clean editorial photograph, soft natural light, minimalist composition with generous empty space. '
         'Color palette: deep navy #071A2F, cobalt blue #0066B1, very light blue #E8F1FA, a small mint green accent #0F9D7A. '
         'No people, no faces, no hands. No text, no letters, no numbers, no logos, no dollar signs, no piles of cash. '
         'Calm, competent, clear. ')

PROMPTS = {
    'hero': STYLE + 'Wide top-down slightly angled view of a tidy desk: a plain white sheet of paper folded in thirds, completely blank, no printing at all, a navy pen, a cup of coffee, the corner of a closed laptop. Morning light from the left. Large empty area in the center and right. Light wood desk on a deep navy background.',
    'thumb': STYLE + 'A single folded white pay stub centered on a plain deep navy background. A thin cobalt blue line rises from the paper like a gently ascending chart, ending in a small mint green dot. Product cover composition, centered, soft shadow.',
    'secao-1': STYLE + 'Close-up of a laptop whose screen is heavily blurred and shows only soft colored rectangles and bars, no readable interface. Next to it a CLOSED navy notebook and a pen. Absolutely no writing anywhere. Very light blue background. Someone calmly organizing an important decision.',
    'secao-2': STYLE + 'A light wood table with only two objects: a simple calculator turned off and a blank white notepad. Soft side light. Deep navy background. Honest, no exaggeration, lots of empty space.',
}
# flux-1-schnell no Workers AI: quadrado 1024x1024 por padrao; redimensionamos depois.
want = sys.argv[1:] or list(PROMPTS)
for name in want:
    body = json.dumps({'prompt': PROMPTS[name], 'steps': 8}).encode()
    req = urllib.request.Request(URL, data=body, headers={'Authorization': f'Bearer {TOK}', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    if not data.get('success'):
        print(name, 'ERRO', data.get('errors')); continue
    img = base64.b64decode(data['result']['image'])
    out = HERE / f'{name}.png'; out.write_bytes(img)
    print(f'{name}.png  {len(img)//1024} KB')
