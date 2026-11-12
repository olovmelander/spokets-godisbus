"""Levels the game's voice clips to one loudness (the voice method's last step; scripts/record-voices.mjs records).

Measures each clip's integrated loudness (EBU R128, with pyloudnorm) and turns it to TARGET LUFS, keeping its peaks
under PEAK. There is no ffmpeg on Olov's computer, and Windows blocks the Python uv downloads, so run it with the
installed Python:

    uv run --python (Get-Command python).Source --with soundfile --with pyloudnorm --with numpy python -I scripts/level-voices.py [--measure] [keys...]

With no keys it levels every clip named in scripts/voices-takes.json (the ones just recorded). --measure only prints.
"""
import json
import os
import sys

import numpy as np
import pyloudnorm
import soundfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = os.path.join(ROOT, 'public', 'audio', 'voices')
TARGET = -18.7
PEAK = 0.89  # about -1 dBFS


def loudness(path):
    data, rate = soundfile.read(path, always_2d=False)
    if data.ndim > 1:
        data = data.mean(axis=1)
    meter = pyloudnorm.Meter(rate, block_size=0.2)
    return data, rate, meter.integrated_loudness(data)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    measure = '--measure' in sys.argv
    if args:
        keys = args
    else:
        with open(os.path.join(ROOT, 'scripts', 'voices-takes.json'), encoding='utf-8') as f:
            keys = sorted(json.load(f).keys())
    done = []
    for key in keys:
        path = os.path.join(VOICES, key + '.mp3')
        if not os.path.exists(path):
            print('missing', key)
            continue
        data, rate, lufs = loudness(path)
        if measure:
            print(f'{key:28s} {lufs:6.1f} LUFS  peak {np.abs(data).max():.2f}')
            continue
        if not np.isfinite(lufs):
            print('silent?', key)
            continue
        gain = 10 ** ((TARGET - lufs) / 20)
        peak = np.abs(data).max() * gain
        if peak > PEAK:
            gain *= PEAK / peak
        out = (data * gain).astype(np.float32)
        soundfile.write(path, out, rate, format='MP3', compression_level=0.25)
        after = loudness(path)[2]
        done.append(after)
        print(f'{key:28s} {lufs:6.1f} -> {after:6.1f} LUFS')
    if done:
        print(f'levelled {len(done)}; median {float(np.median(done)):.1f} LUFS')


if __name__ == '__main__':
    main()
