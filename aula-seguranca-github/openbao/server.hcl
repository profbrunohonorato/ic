ui = true
api_addr = "https://bao.lab:8200"
disable_mlock = false

# Instância única de laboratório: persistência, sem alta disponibilidade.
storage "file" {
  path = "/openbao/file"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/openbao/tls/server.crt"
  tls_key_file  = "/openbao/tls/server.key"
  tls_min_version = "tls12"
}
