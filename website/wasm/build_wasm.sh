#!/usr/bin/env bash
# Build IsoCheck C++ core to WebAssembly using Emscripten.
# Run from the IsoCheck project root.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="$SCRIPT_DIR/../public/wasm"

source /home/hp/emsdk/emsdk_env.sh 2>/dev/null

mkdir -p "$OUT_DIR"

SOURCES=(
    "$PROJECT_ROOT/core/src/history.cpp"
    "$PROJECT_ROOT/core/src/version_order.cpp"
    "$PROJECT_ROOT/core/src/graph.cpp"
    "$PROJECT_ROOT/core/src/checker.cpp"
    "$SCRIPT_DIR/bridge.cpp"
)

INCLUDE_DIRS=(
    "-I$PROJECT_ROOT/core/include"
)

# Fetch nlohmann/json header if not already present
JSON_INCLUDE="$SCRIPT_DIR/deps/nlohmann"
if [ ! -f "$JSON_INCLUDE/nlohmann/json.hpp" ]; then
    echo "Fetching nlohmann/json single header..."
    mkdir -p "$JSON_INCLUDE/nlohmann"
    curl -sL https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp \
        -o "$JSON_INCLUDE/nlohmann/json.hpp"
fi
INCLUDE_DIRS+=("-I$JSON_INCLUDE")

echo "Compiling IsoCheck to WebAssembly..."
em++ \
    -std=c++20 \
    -O2 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createIsoCheck" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT=web \
    --bind \
    "${INCLUDE_DIRS[@]}" \
    "${SOURCES[@]}" \
    -o "$OUT_DIR/isocheck.js"

echo "Build complete. Output:"
ls -lh "$OUT_DIR/isocheck.js" "$OUT_DIR/isocheck.wasm"
