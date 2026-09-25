# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem
[SemVer](https://semver.org/lang/pt-BR/) enquanto o produto evolui pelos marcos (M0 a M3): `0.<marco>.<ajuste>`.

Como publicar uma versão: atualize este arquivo, `git tag vX.Y.Z`, `git push --tags` e crie o release
com `gh release create vX.Y.Z --notes-file <trecho>`.

## [0.3.1] — 2026-09-25

### Adicionado
- **Foto por item de catálogo:** enviada no editor do item, reduzida no aparelho (WebP, até 512 px) e
  guardada no banco (entra no backup). Aparece na lista do catálogo e no Montar; sem foto (ou offline sem
  cache) cai na letra inicial colorida. Cache offline no service worker.
  - Backend: `POST/DELETE /catalog/:id/image` (máx. 2 MB) e `GET /media/catalog/:id` (migration `catalog_images`).
  - Recomendação: subir imagens com fundo branco (a miniatura tem fundo branco fixo e `object-contain`).

### Corrigido
- **Login caindo toda hora:** o refresh token era rotacionado a cada renovação; renovações concorrentes
  (ou resposta perdida) invalidavam a sessão. Agora o refresh token não rota e a validade padrão subiu de
  90 para 365 dias (renovada a cada uso).

## [0.3.0] — 2026-09-25 · M3 Manutenção

Primeiro release publicado. Consolida M0 a M2 (auth, família, Inbox, Casa, Corporativo, sync, encerramento
automático) e entrega o painel do Dono do M3.

### Adicionado
- **Painel do Dono** (Ajustes, só para o papel Dono):
  - **Catálogo:** busca, edição do item, edição em lote por pressão longa (categoria e frequência),
    "Colar lista" (um nome por linha), exclusão de item, quantidade esperada editável direto na linha
    (Enter pula para a próxima).
  - **Termos novos:** promoção de termos digitados em itens avulsos para o catálogo.
  - **Categorias:** criar, renomear, trocar cor e ícone (84 ícones), excluir com reatribuição dos itens.
  - **Histórico:** compras encerradas, paginado sem limite.
  - **Sincronização:** estado deste aparelho e último sync de cada aparelho da família.
- **Seletores próprios** de categoria (grade colorida) e frequência, no lugar do menu nativo do sistema.
- **Montar:** o número de diferença (`+2`/`-1`) é clicável e ajusta para o esperado; quantidade editável
  digitando; observação por item; V de "tenho estoque" em itens zerados.
- **Snackbar de desfazer agrupado:** remoções seguidas viram um aviso só com contador ("3 itens removidos").
- Backend: `POST/PATCH/DELETE` de categorias, `DELETE /catalog/:id`, campo sincronizável `note` (migration).

### Corrigido
- Exclusão de item não chegava aos outros aparelhos (o poll só gravava no armazenamento local e o refresh
  mantinha itens que o servidor já não listava).
- Poll de sincronização também no Inbox; intervalo de 4 s para 1,5 s, pausado com o app em segundo plano.
- Sheets rolam quando o conteúdo passa da tela; arrastar para fechar só pela barrinha do topo.

### Conhecido / pendente
- Foto por item de catálogo e layout largo do catálogo no desktop (próxima versão).
- Categoria de item existente não pode ser removida (só trocada) — limitação do backend.
