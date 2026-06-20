import sys, subprocess, json
from pathlib import Path

prefix = Path(sys.argv[1])
text = sys.argv[2]

cmd = [
    'edge-tts',
    '--text',
    text,
    '--write-media',
    str(prefix),
]
print('Running', ' '.join(cmd))
subprocess.run(cmd, check=False)

parent = prefix.parent
print('Listing wav files in', parent)
for p in sorted(parent.glob('*.wav')):
    try:
        print(p.name, p.stat().st_size)
    except Exception:
        print(p.name, '??')

