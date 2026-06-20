import argparse
import subprocess
from pathlib import Path


def run(cmd: list[str]):
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main():
    parser = argparse.ArgumentParser(description="FFmpeg assembly: clips + voice + captions -> final MP4")
    parser.add_argument(
        "--clips",
        nargs="+",
        required=True,
        help="Scene clip paths (mp4). Order matters.",
    )
    parser.add_argument("--audio", required=True, help="Voice audio path (mp3/wav)")
    parser.add_argument("--subtitles", required=False, default=None, help="SRT subtitle path")
    parser.add_argument("--out", default="outputs/final/final.mp4")

    # Optional encoding knobs for laptop-friendly output
    parser.add_argument("--crf", type=int, default=28)
    parser.add_argument("--preset", type=str, default="veryfast")
    parser.add_argument("--threads", type=int, default=0)

    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Concatenate clips using concat demuxer (safe for same codecs/params).
    # We'll build a temporary list file next to outputs.
    list_file = out_path.parent / "clips_concat_list.txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for p in args.clips:
            f.write(f"file '{Path(p).as_posix()}'\n")

    filter_parts = []

    if args.subtitles:
        # Burn subtitles into video
        # Note: requires subtitles filter; SRT is widely supported.
        filter_parts.append(f"subtitles='{Path(args.subtitles).as_posix()}':force_style='Fontsize=24'")

    vf = ",".join(filter_parts) if filter_parts else None

    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file),
        "-i",
        str(Path(args.audio)),
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "libx264",
        "-crf",
        str(args.crf),
        "-preset",
        args.preset,
        "-c:a",
        "aac",
        "-shortest",
    ]

    if args.threads and args.threads > 0:
        cmd += ["-threads", str(args.threads)]

    if vf:
        cmd += ["-vf", vf]

    cmd += [str(out_path)]

    run(cmd)
    print(f"Rendered: {out_path}")


if __name__ == "__main__":
    main()

