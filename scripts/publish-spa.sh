#!/usr/bin/env bash
set -euo pipefail

# Ejecutar desde la raíz del repositorio en CloudShell con una sesión IAM temporal.
STACK_NAME="${1:-aqp-solidaria-zta-academic}"
REGION="${AWS_REGION:-us-east-2}"
DOMAIN_PREFIX="${COGNITO_DOMAIN_PREFIX:-aqp-solidaria-zta-2026}"
SITE_ORIGIN="${SPA_ORIGIN:-https://d3if5n1ucewbp.cloudfront.net}"

for tool in aws sam npm; do
  command -v "$tool" >/dev/null || { echo "Falta $tool en PATH" >&2; exit 1; }
done

npm ci
npm run lint
npm run typecheck
npm test
npm run build

# SAM invoca esbuild desde el entorno del shell, no desde npm run. El proyecto lo instala
# localmente con npm ci, así que su ejecutable debe estar disponible en PATH.
export PATH="$PWD/node_modules/.bin:$PATH"

sam build --template-file infra/template.yaml
sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides "StageName=academic" "CognitoDomainPrefix=$DOMAIN_PREFIX" "SpaOrigin=$SITE_ORIGIN"

bucket="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue | [0]" --output text)"
distribution="$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue | [0]" --output text)"
if [[ -z "$bucket" || "$bucket" == None || -z "$distribution" || "$distribution" == None ]]; then
  echo "Faltan las salidas SiteBucketName/CloudFrontDistributionId de la pila" >&2
  exit 1
fi

aws s3 sync dist/frontend/assets "s3://$bucket/assets" --region "$REGION" --delete --cache-control 'public,max-age=31536000,immutable'
aws s3 cp dist/frontend/index.html "s3://$bucket/index.html" --region "$REGION" --content-type 'text/html; charset=utf-8' --cache-control 'no-cache'
aws cloudfront create-invalidation --distribution-id "$distribution" --paths '/*' --output json
echo "SPA publicada en $SITE_ORIGIN"
