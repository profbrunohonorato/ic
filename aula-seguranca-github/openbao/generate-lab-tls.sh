#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
tls_dir=.local/tls
if [[ -e "$tls_dir" ]]; then
  echo "A pasta .local/tls já existe; reutilize os certificados ou planeje sua rotação." >&2
  exit 1
fi
mkdir -p "$tls_dir"
openssl req -x509 -newkey rsa:3072 -nodes -sha256 -days 30 \
  -keyout "$tls_dir/ca.key" -out "$tls_dir/ca.crt" \
  -subj '/CN=IC OpenBao Lab CA' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign'
openssl req -new -newkey rsa:3072 -nodes -sha256 \
  -keyout "$tls_dir/server.key" -out "$tls_dir/server.csr" \
  -subj '/CN=bao.lab'
cat > "$tls_dir/server.ext" <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:bao.lab,DNS:localhost,IP:127.0.0.1
EOF
openssl x509 -req -sha256 -days 30 \
  -in "$tls_dir/server.csr" -CA "$tls_dir/ca.crt" -CAkey "$tls_dir/ca.key" \
  -CAcreateserial -extfile "$tls_dir/server.ext" -out "$tls_dir/server.crt"
openssl verify -CAfile "$tls_dir/ca.crt" "$tls_dir/server.crt"
echo "TLS de laboratório criado. Distribua somente ca.crt ao runner; guarde ca.key offline."
