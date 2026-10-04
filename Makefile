# IsoCheck Makefile — one-command setup, build, test, campaign
# All builds happen on the Linux filesystem inside WSL for correct performance (not /mnt/c).
# Usage: make setup && make test && make campaign

SHELL := /bin/bash

# Linux-native build directory (not NTFS via /mnt/c)
BUILD_DIR := $(HOME)/isocheck-build
SRC_DIR := $(shell pwd)
CHECKER_BIN := $(BUILD_DIR)/cli/isocheck
VENV := $(BUILD_DIR)/venv

.PHONY: setup build test campaign clean lint docker-up docker-down buggy-campaign

# --- setup: bring up Postgres, install Python deps, build C++ ---
setup: docker-up build python-deps
	@echo "=== Setup complete ==="

docker-up:
	docker compose up -d postgres
	@echo "Waiting for Postgres to be healthy..."
	@until docker exec isocheck-postgres-1 pg_isready -U isocheck_app -d isocheck 2>/dev/null; do sleep 1; done
	@echo "Postgres is ready."

docker-down:
	docker compose down -v

# --- build: C++ build on native Linux filesystem ---
build:
	@mkdir -p $(BUILD_DIR)
	cmake -S $(SRC_DIR) -B $(BUILD_DIR) -G Ninja \
		-DCMAKE_BUILD_TYPE=Release \
		-DCMAKE_CXX_STANDARD=20
	cmake --build $(BUILD_DIR) --parallel

# --- python-deps: install pinned Python dependencies ---
python-deps:
	python3 -m venv $(VENV) 2>/dev/null || true
	$(VENV)/bin/pip install -r $(SRC_DIR)/harness/requirements.txt -q

# --- test: run all C++ unit tests ---
test: build
	cd $(BUILD_DIR) && ctest --output-on-failure --parallel $$(nproc)

# --- campaign: run the standard acceptance campaign (correct-append) ---
campaign: build docker-up python-deps
	$(VENV)/bin/python $(SRC_DIR)/harness/run_campaign.py \
		--checker-bin $(CHECKER_BIN) \
		--runs 20 \
		--clients 8 \
		--txns 63 \
		--output-dir $(SRC_DIR)/campaign_results

# --- buggy-campaign: run the buggy-append positive control ---
buggy-campaign: build docker-up python-deps
	$(VENV)/bin/python $(SRC_DIR)/harness/buggy_runner.py \
		--checker-bin $(CHECKER_BIN) \
		--runs 20 \
		--isolation "READ COMMITTED" \
		--output-dir $(SRC_DIR)/buggy_results_rc
	$(VENV)/bin/python $(SRC_DIR)/harness/buggy_runner.py \
		--checker-bin $(CHECKER_BIN) \
		--runs 20 \
		--isolation "SERIALIZABLE" \
		--output-dir $(SRC_DIR)/buggy_results_ser

clean:
	rm -rf $(BUILD_DIR)
	docker compose down -v 2>/dev/null || true
