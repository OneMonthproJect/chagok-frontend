#!/usr/bin/env bash
# PR에서 새로 들어오는 비밀값·민감 파일을 막는다 (세 레포 공통 — 세 레포의 이 파일을 같게 유지).
# 사용: bash .github/scripts/secret-scan.sh <base-sha> <head-sha>
# 자동으로 찾을 수 있는 대표적인 형태만 본다. 여기서 통과해도 "비밀값 없음"이 보장되지는 않는다.
set -uo pipefail
BASE="$1"; HEAD="$2"; fail=0

files=$(git diff --name-only --diff-filter=AM "$BASE...$HEAD")

# 1) 올리면 안 되는 파일
while IFS= read -r f; do
  [ -z "$f" ] && continue
  name=$(basename "$f")
  case "$name" in
    .env.example) ;;
    .env|.env.*|*.pem|*.key|*.p12|*.pfx|*.jks|id_rsa|id_rsa.*|id_ed25519|id_ed25519.*)
      echo "::error file=$f::비밀값이 담길 수 있는 파일입니다. 커밋에서 빼고 .gitignore를 확인하세요."; fail=1 ;;
  esac
done <<< "$files"

# 2) 추가된 줄에 들어간 비밀값 형태
patterns='-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|xox[abprs]-[A-Za-z0-9-]{10,}'
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ "$f" = ".github/scripts/secret-scan.sh" ] && continue
  hits=$(git diff -U0 "$BASE...$HEAD" -- "$f" | grep -E '^\+[^+]' | grep -Ec -- "$patterns" || true)
  if [ "${hits:-0}" -gt 0 ]; then
    echo "::error file=$f::비밀키·토큰 형태의 값이 추가되었습니다 ($hits줄). 값을 지우고, 이미 push했다면 그 키를 폐기하세요."; fail=1
  fi
done <<< "$files"

# 3) 설정 파일에 비밀번호·키를 값으로 직접 적음 (환경변수 ${...}만 허용)
while IFS= read -r f; do
  case "$f" in
    *application*.yml|*application*.yaml|*application*.properties) ;;
    *) continue ;;
  esac
  bad=$(git diff -U0 "$BASE...$HEAD" -- "$f" | grep -E '^\+[^+]' \
        | grep -Ei '(password|secret|api[-_]?key|private[-_]?key)[a-z_-]*\s*[:=]\s*[^[:space:]]' \
        | grep -Ev '[:=]\s*["'"'"']?\$\{' || true)
  if [ -n "$bad" ]; then
    echo "::error file=$f::비밀번호·키를 설정 파일에 직접 적었습니다. \${환경변수}로 바꾸세요."; fail=1
  fi
done <<< "$files"

[ $fail -eq 0 ] && echo "비밀값 검사 통과 (자동 검사 가능한 형태 기준)"
exit $fail
