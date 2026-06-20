import argparse
import os


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        default="THUDM/CogVideoX-2B",
        help="Hugging Face model id",
    )
    parser.add_argument(
        "--cache-dir",
        default=None,
        help="Optional cache directory (otherwise uses default HF cache)",
    )
    args = parser.parse_args()

    # Import inside main so smoke test can fail fast if dependencies are missing.
    from diffusers import CogVideoXPipeline

    cache_kwargs = {}
    if args.cache_dir:
        cache_kwargs["cache_dir"] = args.cache_dir

    print(f"Downloading model: {args.model}")
    print(f"Cache kwargs: {cache_kwargs or '{}'}")

    # This triggers model snapshot download into HF cache.
    pipe = CogVideoXPipeline.from_pretrained(args.model, **cache_kwargs)

    # Ensure components are loaded.
    _ = pipe.to("cpu")

    print("Download complete.")


if __name__ == "__main__":
    main()

