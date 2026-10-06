# IsoCheck Progress Tracker

## Phase
Phase 1 evidence remediation and Phase 2 design review. Phase 2 implementation is **on hold** pending the user's explicit approval. No Phase 2 feature implementation was started in this remediation pass.

## Completed In This Remediation
- Fixed G1a candidate matching: use only append micro-ops in a paired `fail` completion; match on key and value; require temporal overlap between the failed transaction and the successful reader.
- Added a clean G1a regression fixture for an unexecuted planned append and a wrong-key read.
- Added converter validation for dense operation indices, paired invokes/completions, valid operation types, and supported micro-op shape. Added four pytest cases.
- Changed the Elle differential runner to use the `read-committed` (PL-2) model matching the current Phase 1 checker and to count an invalid history as agreement only with a mapped corresponding anomaly class.
- Added per-completion SQLSTATE metadata and per-run SQLSTATE aggregation for future correct and buggy campaigns.
- Rebuilt the WSL C++ targets; all 34 C++ tests pass. The 4 focused converter tests pass.
- Confirmed Elle CLI 0.1.11 hangs on minimal valid `:fail` and G1b histories under Java 21; captured thread dumps. See `docs/PHASE_2_REMEDIATION_REPORT.md`.

## Open / Blocked
- Historical campaign SQLSTATE breakdown: the stored histories/summaries contain no SQLSTATE field. Docker Desktop is unavailable, so campaigns cannot be rerun in this environment. Existing fail totals cannot be retroactively split into 40001, 40P01, and other.
- Correct-append READ COMMITTED's 644 fail statuses are consistent with lock/deadlock contention from transactions touching unsorted multiple keys, but this has not been proven from historical SQLSTATE evidence. Do not report them as all 40P01 until a clean rerun confirms it.
- The remaining G1b/incompatible-order findings require the approved Phase 2 rule: exclude keys whose reads do not form one prefix chain and suppress their guessed graph edges. That implementation is not authorized before Phase 2 approval.
- Adya paper section numbers were not verified from the primary PDF in this environment. The report distinguishes verified Elle source mappings from claims whose primary-source section citation remains open.
- Four existing Elle hangs are confirmed in minimal histories for G1a and G1b; two large RC campaign history timeouts remain run-specific unknowns. Elle converter output is now structurally validated.
- Campaign SQLSTATE rerun, Postgres settings/runtime audit beyond the tracked compose configuration, and restoration/reconfirmation of database state require Docker access.

## Decisions Approved By User
- Always compute the full hierarchical verdict; `--level` controls exit code only.
- SCC candidate cap approved: deterministic by edge index, configurable and reported; mark `witness not proven minimal` when capped.
- Incompatible per-key read order means no inferable version order; report incompatible-order and emit no rw/ww edges from a guessed linearization; use the longest consistent chain or exclude the key.
- SimDB must cover a crash mid-transaction and a crash after commit before acknowledgment.
- JSON schema: `schema_version`, justifying operations per edge, `witness_minimal`, and retain the one-line text witness.

These approvals authorize design, not implementation. No Phase 2 code until the user approves after reviewing the A-F resubmission.

## Exact Resume Commands (Windows Workspace + WSL Build)
Build and run C++ tests:
```powershell
wsl -e cmake --build /home/hp/isocheck-build --parallel 4
wsl -e ctest --test-dir /home/hp/isocheck-build --output-on-failure
```

Focused G1a tests:
```powershell
wsl -e /home/hp/isocheck-build/tests/isocheck_tests --gtest_filter='CheckerTest.G1a*'
```

Converter tests:
```powershell
C:/Users/hp/AppData/Local/Microsoft/WindowsApps/python3.12.exe -m pytest tests/test_elle_convert.py -q
```

Elle comparison at the Phase 1 checker level (requires Java 21 and the local jar; checker path below is the existing WSL build):
```powershell
$env:CHECKER_BIN='/home/hp/isocheck-build/cli/isocheck'
C:/Users/hp/AppData/Local/Microsoft/WindowsApps/python3.12.exe tests/elle/run_differential.py
```

Fresh correct campaign (requires Docker Desktop/Compose, active Postgres service, and psycopg dependencies):
```powershell
docker compose up -d postgres
C:/Users/hp/AppData/Local/Microsoft/WindowsApps/python3.12.exe harness/run_campaign.py --checker-bin /home/hp/isocheck-build/cli/isocheck --runs 20 --clients 8 --txns 65 --output-dir campaign_results_clean
```

Fresh buggy READ COMMITTED positive control:
```powershell
C:/Users/hp/AppData/Local/Microsoft/WindowsApps/python3.12.exe harness/buggy_runner.py --checker-bin /home/hp/isocheck-build/cli/isocheck --isolation 'READ COMMITTED' --runs 20 --output-dir buggy_results_rc_clean
```

## Report
See [docs/PHASE_2_REMEDIATION_REPORT.md](docs/PHASE_2_REMEDIATION_REPORT.md) for the A-F evidence and remaining questions. Stop after that review; do not begin Phase 2 coding until the user approves.
