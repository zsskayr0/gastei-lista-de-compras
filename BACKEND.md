# Gastei — Escopo e manual de implementação do backend (v0.1)

Documento de handoff para quem for construir o servidor. Deriva de [ESPECIFICACAO.md](ESPECIFICACAO.md) (produto e design, decisão do Diogo em 2026-09-21) — em caso de conflito, a especificação manda; este documento só traduz para requisitos de backend e preenche o que ela deixa em aberto do lado técnico. Marcações: **[decidido]** confirmado, *[proposta]* sugestão deste documento a confirmar, **[aberto]** decisão pendente listada no fim.

---

## 1. O que o backend precisa garantir

Da promessa do produto (§1–2 da especificação): o app **nunca espera o servidor** para mostrar ou aceitar uma mudança. O backend existe para **sincronizar em segundo plano**, nunca para bloquear a interface. Duas metas medíveis, testadas no S23+ da Thaty via Tailscale por dados móveis, pior caso (cold start):

| Medida | Meta |
|---|---|
| Mudança feita por um chegando ao outro (com rede e app aberto) | **≤ 10 s** |
| Deslogar sozinho no meio do uso | **nunca** (sessão de longa duração) |

Isso implica: fila de sincronização no cliente (fora do escopo do backend, mas o **protocolo** precisa suportar reenvio idempotente), push/poll leve para os outros aparelhos saberem que há algo novo, e tokens de sessão que se renovam sozinhos.

---

## 2. Modelo de dados

### 2.1 Entidades principais

```
User
  id, name, email (único), password_hash, created_at
  device_sessions[] (1:N)

Family
  id, name, owner_user_id, created_at, deleted_at (nullable — exclusão reversível)

FamilyMember   (N:N entre User e Family, join table)
  id, family_id, user_id, role (owner | admin | member), joined_at
  -- "member" existe no schema desde já, mesmo sem uso na v1 (roadmap)

Invite
  id, family_id, created_by_user_id, token (QR/deep link), status (pending | used | canceled | expired)
  created_at, expires_at (created_at + 24h), used_by_user_id (nullable), used_at (nullable)

List
  id, family_id, folder (inbox | casa | corporativo), title
  status (active | archived | deleted)
  phase (montar | comprar)               -- só relevante para corporativo
  purchase_phase_started_at              -- timestamp de entrada em "Comprar", base do timer de 24h
  template_id (nullable, FK Template)    -- corporativo
  created_at, closed_at (nullable), deleted_at (nullable)

ListItem
  id, list_id, catalog_item_id (nullable — item avulso não precisa existir no catálogo)
  name (snapshot do nome no momento; sobrevive se o catálogo mudar depois)
  category_id, quantity_expected (nullable, snapshot do catálogo), quantity_planned, quantity_bought (nullable)
  state (pending | checked | removed)
  is_carryover (bool)                    -- "sobrou da semana passada", só pode ser true uma vez
  added_by_user_id, added_at
  checked_by_user_id (nullable), checked_at (nullable)
  last_modified_by_user_id, last_modified_at, last_modified_field  -- para merge por campo, ver §4
  deleted_at (nullable — swipe com desfazer)

CatalogItem
  id, family_id, name, illustration_id (nullable), category_id
  frequency (recorrente | rara)
  expected_quantity (editável só pelo Dono)
  created_at, updated_at

Category
  id, family_id, name, color, icon
  -- 8 a 10 por família, ver item em aberto #3

Template  (corporativo — "modelo padrão" + variações futuras)
  id, family_id, name, is_default (bool)
  TemplateItem[]: catalog_item_id, default_quantity (nullable)

DictionaryTerm   (autocomplete / adivinhação de categoria)
  id, family_id, term, guessed_category_id, usage_count, was_corrected (bool)
  promoted_to_catalog_item_id (nullable)
  first_seen_at, last_seen_at

ArchivedList / ListHistory
  snapshot por item ao arquivar: name, category, quantity_planned, quantity_bought, checked (bool)
  list_id, closed_at, folder
  -- histórico nunca é resumido: guarda todos os campos que podem virar gráfico depois (§ especificação 6)

SyncEvent (fila de entrada, ver §4)
  id, family_id, list_id, entity_type, entity_id, field, value, actor_user_id, actor_device_id
  client_timestamp, server_timestamp, applied (bool)
```

### 2.2 Relações que a especificação já exige sem migração futura

- **Family separada de User** (N:N via `FamilyMember`) — multi-família é roadmap, mas o schema já suporta um `User` em duas `Family` mesmo que a regra de negócio da v1 bloqueie isso na API (§3.5).
- **Permissão no nível da lista** — `List` já tem `family_id`, mas a autorização deve ser escrita como "usuário tem acesso a esta lista" e não "usuário tem acesso a esta família", para poder restringir por lista quando convidados externos existirem (roadmap).
- **Histórico completo desde o dia 1** — sem isso, gráficos futuros (roadmap) exigiriam migração retroativa impossível.

---

## 3. Autenticação e família

**[decidido]** E-mail + senha. Sem login social, sem SMS.

1. **Cadastro:** só acontece durante o aceite de um convite (QR) ou no primeiro acesso do Dono (bootstrap, sem convite — é quem cria a família).
2. **Login:** e-mail + senha → par de tokens.
   - `access_token`: curto (ex.: 15 min), JWT.
   - `refresh_token`: longa validade (ex.: 90 dias, renovado a cada uso — janela deslizante), guardado no Keystore do aparelho pelo cliente. Renovação **silenciosa**, sem o usuário perceber. Deslogar sozinho no meio do mercado é bug de P0.
3. **Recuperação de senha:** endpoint que envia link de redefinição por e-mail (token de uso único, expira em ~1 h). Sem link mágico como login, sem redefinição por admin.
4. **Convite por QR **[decidido]**:**
   - Dono/Admin gera convite → `Invite` com token aleatório, `expires_at = now + 24h`.
   - QR/deep link abre a tela de cadastro com o `token` pré-preenchido; cadastro **vincula a conta** (nome, e-mail, senha) e o `FamilyMember` na mesma transação.
   - Cancelável enquanto `status = pending`.
   - *[proposta]* Sem verificação de e-mail bloqueante — a conta funciona antes de confirmar o e-mail; a confirmação, se existir, é assíncrona (ver item em aberto #8).
5. **Já pertence a outra família:** ao tentar usar um convite, a API retorna erro específico (`already_in_family`) para o cliente mostrar "Você já participa de uma família. Multi-família chegará em breve." Não é um bloqueio de schema, é regra de aplicação — a v1 rejeita, a v2 relaxa.
6. **Papéis:** `owner` (só o Dono; único que exclui a família, transfere posse, acessa catálogo/histórico/sincronização), `admin` (Thaty; tudo exceto o que é exclusivo do Dono), `member` (existe no enum, sem uso ainda). *[proposta]* Dono e Admin podem gerar/cancelar convites; só o Dono transfere posse.
7. **Exclusão de conteúdo:** listas e itens excluídos ficam com `deleted_at` (soft delete) por um prazo de lixeira **[aberto #8]**, permitindo desfazer sem modal de confirmação em nenhuma camada (nem a API deve exigir confirmação — a reversibilidade é a proteção).

---

## 4. Sincronização e resolução de conflito

Este é o núcleo técnico do produto — releia a "regra de aborto" do §2 da especificação antes de desenhar isso.

### 4.1 Modelo

- **Local-first, fila do lado do cliente.** O cliente aplica a mudança localmente de imediato e a envia como um `SyncEvent` quando houver rede. O backend nunca é sincrono com a UI.
- **Merge por campo, não por registro.** Se a Thaty risca um item (`state`) e o Diogo muda a quantidade (`quantity_planned`) enquanto ambos offline, os dois campos se aplicam — não é "o último ganha o registro inteiro". Dentro do **mesmo campo**, vale o último `client_timestamp` (last-write-wins por campo).
- **Idempotência:** cada `SyncEvent` tem um id gerado no cliente (UUID). Reenviar o mesmo evento (rede caiu no meio do ACK) não duplica nem reaplica.
- **Transporte:** *[proposta]* long-poll ou WebSocket por família (não por lista) para notificar "há eventos novos" + endpoint REST para buscar/enviar o delta. Evitar abrir conexão persistente por lista (custo em bateria no Android, contra o princípio de "sem indicador de sincronização" e sem gasto perceptível).
- **Backend caseiro, sem push externo.** Nada de FCM (§6 e §12 da especificação). O cliente descobre mudanças por poll: quando o app está aberto, poll curto (alguns segundos) na lista aberta; em segundo plano, verificação a cada **1 h** para o Inbox (é a base da notificação local, melhor esforço — nunca gera perda de dado, só atraso no aviso).

### 4.2 Endpoints (esboço REST — nomes provisórios)

```
POST   /auth/login
POST   /auth/refresh
POST   /auth/password-reset/request
POST   /auth/password-reset/confirm

POST   /families                       (bootstrap do Dono)
POST   /invites                        (gerar QR)
DELETE /invites/:id                    (cancelar)
POST   /invites/:token/accept          (cadastro + entrada na família)

GET    /families/:id/lists
POST   /lists
GET    /lists/:id
PATCH  /lists/:id                      (fase, título, arquivar)
DELETE /lists/:id                      (soft delete)

GET    /lists/:id/sync?since=<cursor>  (delta desde o último cursor conhecido)
POST   /lists/:id/sync                 (envia um lote de SyncEvent)

GET    /families/:id/catalog
PATCH  /catalog/:id                    (só Dono)
POST   /catalog/bulk                   (colar lista de nomes — painel do Dono)

GET    /families/:id/dictionary-terms  (termos novos, só Dono)
POST   /dictionary-terms/:id/promote   (vira CatalogItem)

GET    /families/:id/history           (listas arquivadas, paginação, sem limite)

GET    /families/:id/presence          (quem está em qual lista agora — polling curto)
```

### 4.3 Regras de negócio que moram no servidor

Mesmo sendo local-first, algumas regras precisam de uma autoridade única para não divergirem entre os dois aparelhos:

- **Encerramento automático da fase Comprar:** o servidor roda um job periódico que verifica `purchase_phase_started_at` de listas em `phase = comprar`; se passaram 24 h, encerra a lista e dispara o mesmo fluxo de "última entrada riscada/excluída" (grava `última compra` a partir de `quantity_bought`, gera o snapshot de histórico, aplica a regra de sobras). Isso evita que dois clientes calculem o encerramento de formas diferentes.
- **Sobras (carryover):** ao encerrar uma lista de Corporativo, itens com `quantity_planned > 0` e não comprados (ou parcialmente) viram itens `is_carryover = true` na lista nova, com a quantidade que faltou. Em Casa, voltam ao Inbox. **Só uma vez** — se `is_carryover` já era `true` e sobrar de novo, não repete (o item simplesmente não aparece na próxima, conforme a especificação aceita esse risco).
- **Nova lista de Corporativo:** o servidor cria a lista seguinte automaticamente ao encerrar a anterior, a partir do `Template` marcado `is_default`, já na fase `montar`.
- **Última compra:** só é gravada como `quantity_bought` no `CatalogItem`/histórico se pelo menos um item da lista foi riscado (`checked`) — uma lista inteiramente excluída sem nada riscado não deixa rastro em "última compra".

### 4.4 Erro de sincronização (visível ao usuário)

- O cliente decide localmente exibir o banner vermelho (2 min sem sincronizar **e** mudanças pendentes) — o servidor só precisa deixar isso detectável: cada resposta de sync inclui `server_time` para o cliente calcular a defasagem, e o cliente já sabe se tem fila pendente.
- *[proposta]* Endpoint `GET /families/:id/sync-status` para o painel do Dono mostrar última sincronização e pendências por aparelho (item em aberto #12 da especificação, mas o dado precisa existir desde já: registrar `last_synced_at` por `DeviceSession`).

---

## 5. Notificações

Sem push remoto (nada de FCM/APNs). Duas camadas, ambas geradas no cliente a partir do poll, não pelo servidor empurrando algo:

- **App em primeiro plano:** aviso dentro do app (in-app), agrupado ("3 itens novos"), nunca sobre a própria mudança do usuário.
- **App em segundo plano:** verificação periódica a cada 1 h (Android) dispara notificação **local** do sistema, só para mudanças no Inbox. É melhor esforço — documentar isso explicitamente no contrato da API (o endpoint de poll não garante entrega em tempo real, só consistência eventual).
- O toque na notificação abre direto o Inbox ou a lista — isso é roteamento do cliente, mas o payload do poll precisa carregar `list_id` e `folder` suficientes para montar o deep link.

---

## 6. Infraestrutura e operação

- **Servidor caseiro** na máquina do Diogo, junto dos outros apps dele. **Sem portas abertas** — acesso só via **Tailscale** (rede privada).
  - Ambos os celulares precisam de: Tailscale sem restrição de bateria, VPN sempre ativa, expiração de chave desativada, nenhum outro VPN ativo. Isso é configuração de aparelho, não de backend, mas é **pré-requisito de teste do M0** — documentar num checklist de setup.
- **TLS:** dentro do Tailscale já é uma rede criptografada; ainda assim, servir a API com TLS (certificado próprio ou via Tailscale HTTPS) é recomendado para não guardar senha/token em texto claro na rede interna.
- **Banco de dados:** qualquer um relacional (Postgres recomendado) — o volume é doméstico (uma família, dezenas de itens), não há requisito de escala.
- **Backup:** **[aberto #9]** — sem isso definido, uma queda longa da máquina do Diogo apaga o único acervo de histórico e catálogo. Recomendação mínima: dump diário do banco para um segundo disco ou serviço de backup já usado pelos outros apps caseiros dele.
- **Observabilidade mínima:** logs de erro de sincronização e de deslogue inesperado — a especificação já lista isso como métrica em aberto (#12); mesmo sem painel, registrar esses eventos desde o M0 evita perder dado histórico para diagnosticar depois.

---

## 7. O que o backend NÃO faz (fora de escopo confirmado)

Direto da especificação (§20), para não construir por engano:
- Preços e orçamento (o app nunca lida com dinheiro).
- OCR de qualquer papel.
- Login social ou SMS.
- Lembretes por localização.
- Entrada por voz.
- Push remoto (FCM/APNs) — só notificação local.
- Multi-família funcional na v1 (schema permite, API bloqueia).
- Convidados de fora da família (a permissão por lista já existe no modelo, mas não tem UI nem endpoint de convite externo na v1).

---

## 8. Marcos, do ponto de vista do backend

| Marco | O que o backend precisa entregar |
|---|---|
| **M0 · Portão** | Auth mínima (uma conta, sem convite ainda), uma `List` só, endpoint de sync ponta a ponta entre dois aparelhos via Tailscale. Medir abertura ≤ 5 s (majoritariamente cliente) e mudança ≤ 10 s (este é o teste do backend). |
| **M1 · Mínimo usável** | Auth completa (e-mail/senha, convite por QR, recuperação de senha), `Family`/`FamilyMember`, Inbox e listas de Casa com sync e fila offline real (reconexão, idempotência). |
| **M2 · Rotina corporativa** | `Template`, `CatalogItem`, as três quantidades, job de encerramento automático (24 h), regra de sobras, geração automática da lista seguinte. |
| **M3 · Manutenção** | Endpoints do painel do Dono (catálogo em massa, termos novos e promoção, histórico paginado sem limite, status de sincronização). |
| **v2** | Multi-família de verdade, convidados externos, iOS (sem impacto direto no backend além de CORS/host). |

---

## 9. Itens em aberto que travam decisões de backend

Da especificação (§23), os que afetam diretamente o schema ou a API — resolver antes ou durante o M1:

1. **Prazo da lixeira** (soft delete) — define um job de purga definitiva ou não.
2. **Verificação de e-mail:** bloqueante ou assíncrona — muda o fluxo de `POST /invites/:token/accept`.
3. **Quem pode convidar:** só Dono, ou Dono + Admin — muda a autorização de `POST /invites`.
4. **Backup do servidor caseiro** e plano de contingência se a máquina cair por muito tempo.
5. **Valor inicial de "desta semana" em Montar** (pré-preenchido com o esperado ou zerado) — muda o payload de criação da lista de Corporativo (se pré-preenchido, o servidor precisa copiar `expected_quantity` para `quantity_planned` ao gerar a lista a partir do template).
6. **Templates múltiplos:** existe mais de um modelo e duplicação de lista em Corporativo? Muda se `Template` precisa de endpoint de CRUD completo já na v1 ou só um registro fixo.
7. **Métricas de erro:** quais eventos de falha de sincronização e deslogue inesperado logar — definir o schema de log/telemetria mínima.

Os demais itens em aberto da especificação (paleta de cores, categorias, logo, sons — já em andamento em [logo/](logo/)) não afetam o backend.
