path "secret/data/ci/laboratorio" {
  capabilities = ["read"]
}

# Permite encerrar a própria sessão, sem administrar outros tokens.
path "auth/token/revoke-self" {
  capabilities = ["update"]
}
