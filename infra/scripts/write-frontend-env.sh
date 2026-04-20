#!/usr/bin/env bash
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_ENV_FILE="${INFRA_DIR}/../frontend/.env"

cd "${INFRA_DIR}"

API_URL="$(terraform output -raw api_invoke_url)"
USER_POOL_ID="$(terraform output -raw cognito_user_pool_id)"
APP_CLIENT_ID="$(terraform output -raw cognito_user_pool_client_id)"

cat > "${FRONTEND_ENV_FILE}" <<EOF
REACT_APP_API_URL=${API_URL}
REACT_APP_USER_POOL_ID=${USER_POOL_ID}
REACT_APP_APP_CLIENT_ID=${APP_CLIENT_ID}
EOF

echo "Wrote ${FRONTEND_ENV_FILE}"