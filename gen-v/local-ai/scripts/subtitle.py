import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Subtitle generation scaffolding")
    parser.add_argument("--audio", required=True, help="Path to audio (wav/mp3) or a URL")
    parser.add_argument("--out", default="outputs/subtitles/captions.srt")
    parser.add_argument(
        "--provider",
        default="assemblyai",
        help="Placeholder caption provider (e.g., assemblyai, whisper)",
    )
    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Scaffolding only: replace with your chosen caption provider.
    # Suggested future implementation:
    # - AssemblyAI word timestamps -> convert to SRT
    # - Or local Whisper (faster/cheaper for personal use)
    raise NotImplementedError(
        "subtitle.py is scaffolding. Implement caption timestamps->SRT/VTT here."
    )


if __name__ == "__main__":
    main()

