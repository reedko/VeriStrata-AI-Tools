#!/bin/bash
set -euo pipefail

project=/tmp/vsat-ai-tools-integration
dbroot=$(mktemp -d /tmp/vsat-mariadb.XXXXXX)
dbport=3307
apiport=8792
server_pid=""
db_pid=""

cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  if [[ -n "$db_pid" ]]; then kill "$db_pid" 2>/dev/null || true; wait "$db_pid" 2>/dev/null || true; fi
  rm -f /tmp/vsat-key-*.txt /tmp/vsat-response.json
  rm -rf "$project" "$dbroot"
}
trap cleanup EXIT

mkdir -p "$project"
echo STAGE ephemeral_database
chown -R mysql:mysql "$dbroot"
mariadb-install-db --datadir="$dbroot/data" --auth-root-authentication-method=normal --skip-test-db --user=mysql >/dev/null 2>&1
mariadbd --datadir="$dbroot/data" --socket="$dbroot/mysql.sock" --pid-file="$dbroot/mysql.pid" --log-error="$dbroot/mysql.log" --port="$dbport" --bind-address=127.0.0.1 --user=mysql >/dev/null 2>&1 &
db_pid=$!
for _ in $(seq 1 60); do mariadb-admin --protocol=tcp -h127.0.0.1 -P$dbport -uroot ping >/dev/null 2>&1 && break; sleep 0.25; done
mariadb-admin --protocol=tcp -h127.0.0.1 -P$dbport -uroot ping >/dev/null
mariadb --protocol=tcp -h127.0.0.1 -P$dbport -uroot -e 'CREATE DATABASE veristrata_ai_tools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'

cd "$project"
echo STAGE install_and_build
if ! npm ci --no-audit --no-fund >/tmp/vsat-install.log 2>&1; then tail -40 /tmp/vsat-install.log; exit 1; fi
if ! npm run build >/tmp/vsat-build.log 2>&1; then tail -60 /tmp/vsat-build.log; exit 1; fi
export NODE_ENV=production AI_TOOLS_AUTH_MODE=required TOOLS_LAB_PORT=$apiport
export AI_TOOLS_DB_HOST=127.0.0.1 AI_TOOLS_DB_PORT=$dbport AI_TOOLS_DB_USER=root AI_TOOLS_DB_PASSWORD='' AI_TOOLS_DB_NAME=veristrata_ai_tools
npm run db:migrate >/dev/null
echo STAGE key_issuance

issue() { npm run keys -w @veristrata-ai-tools/tools-lab -- create "$1" "${@:2}"; }
issue "Client A" --scopes=assessments:read,diagnostics:read --rpm=10 --monthly=20 --investigations=2 --concurrent=1 >/tmp/vsat-key-a.txt
issue "Client B" --scopes=assessments:read,diagnostics:read --rpm=10 --monthly=20 --investigations=2 --concurrent=1 >/tmp/vsat-key-b.txt
issue "Scope Test" --scopes=evaluations:run --rpm=10 --monthly=20 >/tmp/vsat-key-scope.txt
issue "Rate Test" --scopes=diagnostics:read --rpm=1 --monthly=20 >/tmp/vsat-key-rate.txt
issue "Quota Test" --scopes=tools:execute --rpm=10 --monthly=20 --investigations=1 >/tmp/vsat-key-quota.txt
issue "Expired Test" --scopes=diagnostics:read --expires-days=-1 >/tmp/vsat-key-expired.txt
issue "Revoked Test" --scopes=diagnostics:read >/tmp/vsat-key-revoked.txt

raw() { grep '^ait_' "$1"; }
kid() { sed -n 's/^key_id=\([^ ]*\).*/\1/p' "$1"; }
key_a=$(raw /tmp/vsat-key-a.txt); id_a=$(kid /tmp/vsat-key-a.txt)
key_b=$(raw /tmp/vsat-key-b.txt); id_b=$(kid /tmp/vsat-key-b.txt)
key_scope=$(raw /tmp/vsat-key-scope.txt)
key_rate=$(raw /tmp/vsat-key-rate.txt)
key_quota=$(raw /tmp/vsat-key-quota.txt)
key_expired=$(raw /tmp/vsat-key-expired.txt)
key_revoked=$(raw /tmp/vsat-key-revoked.txt); id_revoked=$(kid /tmp/vsat-key-revoked.txt)

mariadb --protocol=tcp -h127.0.0.1 -P$dbport -uroot veristrata_ai_tools <<SQL
INSERT INTO ai_tool_assessments (assessment_id, tool_name, partner_topic_id, state, methodology_version, request_json, result_json) VALUES
('00000000-0000-0000-0000-00000000000a','document_screen','topic-a','completed','test','{}','{}'),
('00000000-0000-0000-0000-00000000000b','document_screen','topic-b','completed','test','{}','{}');
INSERT INTO ai_tool_assessment_access (assessment_id,key_id) VALUES
('00000000-0000-0000-0000-00000000000a','$id_a'),
('00000000-0000-0000-0000-00000000000b','$id_b');
SQL

npm run start -w @veristrata-ai-tools/tools-lab >/tmp/vsat-server.log 2>&1 & server_pid=$!
for _ in $(seq 1 60); do curl -fsS http://127.0.0.1:$apiport/api/health >/dev/null 2>&1 && break; sleep 0.25; done

code() { curl -sS -o /tmp/vsat-response.json -w '%{http_code}' "$@"; }
assert_code() { [[ "$1" = "$2" ]] || { echo "FAIL expected $2 got $1"; exit 1; }; }

assert_code "$(code -H "Authorization: Bearer $key_scope" http://127.0.0.1:$apiport/api/diagnostics)" 403
echo STAGE api_acceptance
assert_code "$(code -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $key_scope" -d '{"documents":[{"document_id":"a","text":"A sufficiently long repeated source passage for testing."},{"document_id":"b","text":"A sufficiently long repeated source passage for testing."}]}' http://127.0.0.1:$apiport/api/evaluations/corpus-preflight)" 200
echo PASS scope_restrictions

assert_code "$(code -H "Authorization: Bearer $key_rate" http://127.0.0.1:$apiport/api/diagnostics)" 200
assert_code "$(code -H "Authorization: Bearer $key_rate" http://127.0.0.1:$apiport/api/diagnostics)" 429
echo PASS per_minute_rate_limit

assert_code "$(code -H "Authorization: Bearer $key_expired" http://127.0.0.1:$apiport/api/diagnostics)" 401
npm run keys -w @veristrata-ai-tools/tools-lab -- revoke "$id_revoked" >/dev/null
assert_code "$(code -H "Authorization: Bearer $key_revoked" http://127.0.0.1:$apiport/api/diagnostics)" 401
echo PASS expiration_and_revocation

assert_code "$(code -H "Authorization: Bearer $key_a" http://127.0.0.1:$apiport/api/assessments/recent)" 200
grep -q 'topic-a' /tmp/vsat-response.json && ! grep -q 'topic-b' /tmp/vsat-response.json
assert_code "$(code -H "Authorization: Bearer $key_b" http://127.0.0.1:$apiport/api/assessments/recent)" 200
grep -q 'topic-b' /tmp/vsat-response.json && ! grep -q 'topic-a' /tmp/vsat-response.json
echo PASS two_client_isolation

tool_payload='{"focus":"What evidence supports this harmless demonstration claim?","text":"A harmless short source passage for the bounded demonstration.","wait_seconds":0}'
assert_code "$(code -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $key_quota" -d "$tool_payload" http://127.0.0.1:$apiport/api/tools/document_screen/execute)" 503
assert_code "$(code -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $key_quota" -d "$tool_payload" http://127.0.0.1:$apiport/api/tools/document_screen/execute)" 429
echo PASS investigation_quota

sleep 0.5
usage_count=$(mariadb --batch --skip-column-names --protocol=tcp -h127.0.0.1 -P$dbport -uroot veristrata_ai_tools -e 'SELECT COUNT(*) FROM ai_tool_usage_events')
[[ "$usage_count" -ge 7 ]]
echo PASS usage_audit

kill "$server_pid"; wait "$server_pid" 2>/dev/null || true; server_pid=""
npm run start -w @veristrata-ai-tools/tools-lab >/tmp/vsat-server.log 2>&1 & server_pid=$!
for _ in $(seq 1 60); do curl -fsS http://127.0.0.1:$apiport/api/health >/dev/null 2>&1 && break; sleep 0.25; done
assert_code "$(code -H "Authorization: Bearer $key_a" http://127.0.0.1:$apiport/api/diagnostics)" 200
echo PASS key_persistence_after_restart

echo ALL_ACCESS_KEY_INTEGRATION_TESTS_PASSED
