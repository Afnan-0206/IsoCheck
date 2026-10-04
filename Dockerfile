# IsoCheck C++ build environment
# gcc:14 provides g++-14 with full C++20 support
FROM gcc:14 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake=3.28.* \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY core/ core/
COPY cli/ cli/
COPY tests/ tests/
COPY CMakeLists.txt .

RUN cmake -B build -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_STANDARD=20 \
    && cmake --build build --parallel

# --- Test stage ---
FROM builder AS test
RUN cd build && ctest --output-on-failure --parallel $(nproc)

# --- Runtime stage (slim) ---
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /src/build/cli/isocheck /usr/local/bin/isocheck
ENTRYPOINT ["isocheck"]
