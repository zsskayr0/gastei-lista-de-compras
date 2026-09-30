# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões seguem
[SemVer](https://semver.org/lang/pt-BR/) enquanto o produto evolui pelos marcos (M0 a M3): `0.<marco>.<ajuste>`.

Como publicar uma versão: atualize este arquivo, `git tag vX.Y.Z`, `git push --tags` e crie o release
com `gh release create vX.Y.Z --notes-file <trecho>`.

## [0.4.1] — 2026-09-29

### Corrigido
- **QR de convite gerado no APK:** apontava para `tauri.localhost` (só existe no aparelho de quem gerou) e o
  celular convidado ficava em tela branca. O link agora usa sempre o endereço do servidor.
- **APK sem conexão:** o servidor passou a responder o preflight de Private Network Access
  (`Access-Control-Allow-Private-Network`), exigido pelo WebView ao falar com IP privado (Tailscale).

## [0.4.0] — 2026-09-29

### Adicionado
- **Botão "+" dinâmico:** o botão central muda de função conforme a tela — Inbox adiciona item direto no
  Inbox; Casa e Corporativo criam uma lista (e, dentro de uma lista, adicionam itens nela). O ícone gira
  até virar "×"; o popup de nova lista sobe e desce com fade. Saíram os "+" de dentro das telas e o
  toque longo.
- **Corporativo com várias listas**, como a Casa: cada compra diferente tem a sua lista (Montar e Comprar
  dentro de cada uma), com renomear e excluir. Nova rota `/corporativo/:listId`.
- **Ícone nas listas** de Casa e Corporativo: escolhido ao criar, trocável no menu da lista, mostrado nos
  cards. Backend: `List.icon` (migration `list_icon_user_avatar`); a lista seguinte gerada no encerramento
  herda o ícone.
- **Foto de perfil** customizável em Ajustes → Conta (reduzida no aparelho, 256 px, guardada no banco).
  Aparece nos avatares de quem riscou item, Inbox e Família. Backend: `POST/DELETE /users/me/avatar`,
  `GET /media/avatar/:id`, `avatarUpdatedAt` na lista de membros.
- **Sugestões na Entrada** vindas do catálogo: com o campo vazio, os mais usados; ao digitar, filtro por
  começo de palavra, com foto/letra e ligação ao item de catálogo (categoria e quantidade esperada).
- **Devolver ao Inbox** (Casa): botão em cada item pendente tira o item da lista e o manda de volta ao
  Inbox (ressuscita o original, se veio de lá), com desfazer.
- **APK Android** (Tauri): o servidor é informado na tela de login (o app instalado não roda no mesmo
  endereço do servidor). Ícone de launcher da marca.

### Alterado
- **Paleta rosa** (pastel no geral, rosa mais forte nos botões e destaques), claro e escuro (AMOLED).

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
