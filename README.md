# Gastei — Lista de Compras

Backend local-first para o app de lista de compras da família (Diogo + Thaty), rodando via Docker no servidor caseiro. Segue [BACKEND.md](BACKEND.md), derivado de [ESPECIFICACAO.md](ESPECIFICACAO.md).

## Subir o backend

1. Copie o arquivo de ambiente e ajuste os segredos:

   ```bash
   cp .env.example .env
   ```

   Edite `.env` e troque `POSTGRES_PASSWORD` e `JWT_ACCESS_SECRET` (gere um com `openssl rand -hex 32`).

2. Suba a stack:

   ```bash
   docker compose up -d --build
   ```

   Isso builda a imagem da API, sobe o Postgres, aplica as migrações do Prisma automaticamente (`docker-entrypoint.sh`) e inicia o servidor.

3. A API fica disponível em `http://<host>:3283/api` — a porta segue o mesmo padrão do Immich (`2283:2283`): o número da porta do host é o mesmo do container, configurável via `GASTEI_PORT` no `.env`.

   Verifique que subiu:

   ```bash
   curl http://localhost:3283/api/health
   ```

4. Acesso externo: **sem portas abertas na internet** — o app deve se conectar via **Tailscale** (rede privada), apontando para o IP/hostname Tailscale da máquina na porta 3283 (BACKEND.md §6).

## Primeiro acesso (bootstrap do Dono)

Não existe seed de usuário — o primeiro acesso cria a família e a conta do Dono na mesma chamada:

```bash
curl -X POST http://localhost:3283/api/families \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Diogo",
    "email": "diogo@example.com",
    "password": "senha-forte",
    "familyName": "Roque",
    "deviceName": "pixel-diogo"
  }'
```

A resposta traz `accessToken` (15 min) e `refreshToken` (90 dias, renovado a cada uso). Use o `accessToken` no header `Authorization: Bearer <token>` nas demais chamadas.

Para convidar a Thaty: `POST /api/invites` (com o Dono autenticado) gera um QR/deep link com `token`, válido por 24h; o cadastro dela acontece em `POST /api/invites/:token/accept`.

## Estrutura

```
backend/
  prisma/schema.prisma   # modelo de dados (§2 do BACKEND.md)
  src/
    auth/                # login, refresh silencioso, convites, reset de senha
    families/             # status de sync e presença
    invites/
    lists/                 # CRUD de listas + regra de encerramento (§4.3)
    sync/                  # fila de SyncEvent, merge por campo (§4.1)
    catalog/               # catálogo da família, só editável pelo Dono
    dictionary-terms/      # autocomplete/adivinhação de categoria
    history/               # listas arquivadas, paginado
    jobs/                  # cron de encerramento automático da fase Comprar (24h)
docker-compose.yml
```

## Decisões técnicas

- **NestJS + TypeScript + PostgreSQL (Prisma).** Volume é doméstico — Postgres é overkill de robustez, não de complexidade operacional.
- **Sync local-first (§4):** o cliente aplica mudanças localmente e envia `SyncEvent`s (idempotentes por UUID) via `POST /lists/:id/sync`; outros aparelhos buscam o delta via `GET /lists/:id/sync?since=<cursor>`. Merge é **por campo**, last-write-wins por `client_timestamp` — não por registro inteiro.
- **Autenticação:** e-mail/senha, `access_token` JWT de 15 min, `refresh_token` de 90 dias com janela deslizante (renovado a cada uso, rotacionado a cada refresh). Nunca desloga sozinho em uso normal — é bug de P0 se acontecer.
- **Regras que só o servidor decide** (§4.3): encerramento automático da fase "Comprar" após 24h (job a cada 5 min), sobras (carryover, só uma vez), geração automática da próxima lista de Corporativo a partir do template padrão.
- **Sem push remoto.** O cliente descobre mudanças fazendo poll — o servidor só expõe o delta e o `server_time` para o cliente decidir se está desatualizado.

## Itens em aberto (BACKEND.md §9)

Implementados com a opção mais conservadora, para revisar depois:
- **Prazo da lixeira:** soft delete sem job de purga ainda (nada é apagado definitivamente).
- **Verificação de e-mail:** não bloqueante (nem implementada) — convite ativa a conta na hora.
- **Quem convida:** Dono e Admin (Thaty), ambos podem gerar/cancelar convites.
- **Valor inicial de "desta semana" em Montar:** zerado (não pré-preenchido a partir do catálogo) ao gerar a lista seguinte de Corporativo.
- **Templates múltiplos:** só um template padrão por família por enquanto (schema já suporta mais).
- **Backup:** ainda não automatizado — recomenda-se configurar dump diário do volume `gastei-postgres-data` para um segundo disco (ver §6 do BACKEND.md).
