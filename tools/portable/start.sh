#!/usr/bin/env bash
# Fight For Peace - portable start script (Linux; start.command on macOS is the same file).
# Uses runtime/node if present, else Node.js 24+ on this computer, else downloads a portable
# Node.js into runtime/ once (SHA-256 checked). Then starts the local game server.
set -euo pipefail
cd "$(dirname "$0")"

node_ok() {
  command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 24 ]
}

if [ -x runtime/node/bin/node ]; then
  NODE=runtime/node/bin/node
elif node_ok; then
  NODE=node
else
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) echo "Unsupported system: $(uname -s). Install Node.js 24 from https://nodejs.org"; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) echo "Unsupported CPU: $(uname -m). Install Node.js 24 from https://nodejs.org"; exit 1 ;;
  esac
  line=$(grep "\"$os-$arch\"" runtime.json)
  field() { echo "$line" | sed -E "s/.*\"$1\": *\"([^\"]+)\".*/\1/"; }
  url=$(field url)
  sum=$(field sha256)
  dir=$(field dir)
  echo "Node.js 24 or newer was not found. Downloading a portable copy (about 30 MB, only the first time)..."
  mkdir -p runtime
  archive="runtime/$(basename "$url")"
  if command -v curl >/dev/null 2>&1; then curl -fL -o "$archive" "$url"; else wget -O "$archive" "$url"; fi
  if command -v sha256sum >/dev/null 2>&1; then got=$(sha256sum "$archive" | cut -d' ' -f1)
  else got=$(shasum -a 256 "$archive" | cut -d' ' -f1); fi
  if [ "$got" != "$sum" ]; then
    rm -f "$archive"
    echo "Checksum mismatch for $url"; exit 1
  fi
  rm -rf "runtime/$dir" runtime/node
  tar -xf "$archive" -C runtime
  mv "runtime/$dir" runtime/node
  rm -f "$archive"
  NODE=runtime/node/bin/node
fi

exec "$NODE" server/server.mjs "$@"
