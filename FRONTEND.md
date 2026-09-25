# Gastei — Escopo e manual de implementação do frontend (v0.1)

Documento de handoff para quem for construir o app. Deriva de [ESPECIFICACAO.md](ESPECIFICACAO.md) (produto e design) e de [BACKEND.md](BACKEND.md) (contrato de API/sync) — em caso de conflito, a especificação manda. Marcações: **[decidido]** confirmado, *[proposta]* sugestão deste documento a confirmar, **[aberto]** decisão pendente listada no fim.

---

## 1. Stack e plataformas

- **App:** Tauri + React. Alvo v1: **Android** (APK direto, sem loja) e **Web** (PWA — ponte para o iPhone do Diogo via Safari/Tailscale, sem conta Apple).
- **Um único código** para as duas plataformas. Tudo específico de sistema (notificação, tarefa em segundo plano, deep link, Keystore) fica atrás de uma **camada de plataforma trocável** — nenhuma chamada direta a API exclusiva do Tauri fora dessa camada, para não travar um eventual app Android nativo (plano B se o cold start do WebView estourar os 5 s) ou o iOS nativo (v2).
- **Painel de admin:** mesmo app, rota própria, com layout de tela larga (ultrawide) — não é um projeto separado.
- **pt-BR apenas.** Sem i18n. Fonte do sistema até ~115% de escala precisa continuar legível.

## 2. Portão de qualidade (o que o frontend precisa garantir sozinho)

Da regra de aborto do produto — metade da meta é puramente cliente:

| Medida | Meta | Onde mora a responsabilidade |
|---|---|---|
| Toque no ícone até a lista utilizável (cold start) | **≤ 5 s** | Frontend: tempo de boot do WebView/Tauri, hidratação do estado local, primeira pintura da lista a partir do armazenamento local — **nunca esperando rede** |
| Mudança do outro aparecendo (com rede e app aberto) | **≤ 10 s** | Compartilhado com o backend (§4 do BACKEND.md), mas o cliente não pode adicionar latência própria (poll preguiçoso, re-render caro) |

Teste de referência: S23+ da Thaty, Tailscale por dados móveis, pior caso (app encerrado). Isso é o critério do **M0**, antes de desenhar qualquer tela além do protótipo mínimo.

## 3. Arquitetura de estado (local-first)

- **Fonte da verdade é local.** Toda leitura de tela vem do armazenamento local (SQLite via Tauri, ou IndexedDB na Web); a rede só alimenta esse armazenamento em segundo plano.
- **Toda escrita é otimista:** o toque atualiza a UI e o armazenamento local na mesma função, gera um `SyncEvent` (id local UUID) e o enfileira. Nunca existe um estado de "salvando…" bloqueando a interação.
- **Fila de sincronização:** persistente (sobrevive a fechar o app), reenvia com backoff quando a rede volta, idempotente por `id` (o servidor já deduplica — ver §4.1 do BACKEND.md).
- **Sessão:** token de acesso curto + refresh de longa duração guardado no armazenamento seguro do aparelho (Keystore no Android; no que a Web oferecer de mais seguro — IndexedDB/local storage sem alternativa nativa, documentar o risco). Renovação silenciosa; um refresh falho nunca desloga no meio de uma tela — cai para leitura offline e tenta de novo.
- **Merge por campo:** ao receber um evento remoto que colide com uma mudança local pendente no mesmo campo, vale o `client_timestamp` mais recente (contrato do backend); campos diferentes do mesmo item sempre coexistem (riscar e mudar quantidade não se pisam).
- **Sem indicador de sincronização** na interface principal — não construir spinner, badge de "sincronizando" ou afins fora do banner de erro (§9).

## 4. Arquitetura de informação e navegação

**Bottom bar fixa:** `Inbox · Casa · [+] · Corporativo · Ajustes`. Some quando o teclado abre (observar o teclado virtual e recolher a barra, não só quando o foco muda de tela).

- **Inbox** (rota padrão / home): lista simples de itens soltos de Casa, sem grupos, ordem de chegada. Item vira sugestão pronta ao montar lista de Casa e some do Inbox nesse momento; se removido da lista, volta.
- **Casa:** lista de listas contínuas (pastas/avulsas). Sem template forte, sem uso de histórico.
- **Corporativo:** uma lista "viva" por vez, layout de duas fases (Montar/Comprar) na mesma tela — ver §6.
- **Ajustes:** navegação em árvore no estilo configurações do sistema (lista de categorias com ícone → tela própria), filtrada por papel (Dono vê mais itens que a Thaty), com busca interna.
- **Botão central "+":** ver comportamento completo em §5.

## 5. O botão "+"

Componente com dois gestos, comportamento muda por contexto:

| Contexto | Toque | Toque longo (~300 ms) |
|---|---|---|
| Inbox / Casa | Abre bottom sheet **Entrada** | Popup **Lista** (dispara vibração curta) |
| Corporativo | — | — (o próprio "+" **muda de forma**: gira e sai da barra, vira FAB que cria Lista extra) |

- **Entrada (bottom sheet):** campo de texto com autocomplete (ver §7) + stepper de quantidade. Confirmar **não fecha** o sheet — ele volta ao campo vazio, focado, pronto para o próximo item. Fecha por arrasto para baixo ou toque fora. Quando o teclado abre, o sheet acompanha o topo dele (não fica coberto).
- **Popup de Lista:** balão ancorado acima do "+", some ao tocar fora. Em Casa pergunta só a pasta de destino.
- **Descoberta do gesto de toque longo:** um balão único (tooltip), sem bloquear a tela, que só some quando ela usa o gesto pela primeira vez e reaparece **uma vez** se ela não usar.
- **Transformação do "+" em Corporativo:** é uma animação de morph (rotação + saída da barra), 120–200 ms, sem quique — ver §11 para as regras gerais de movimento.

## 6. Corporativo: Montar e Comprar

Uma tela, duas fases, alternadas por um controle de troca visível no topo (não são rotas separadas — o estado persiste ao trocar).

### Fase Montar
- Mostra o **catálogo inteiro** (não só o que já tem quantidade), agrupado por **frequência primeiro**: recorrentes no topo sempre visíveis, raros numa seção recolhida por padrão (zerar um item raro não gera alerta).
- **Linha de item, duas linhas de altura:**
  - 1ª linha: ilustração (ou letra inicial estilizada se não houver), nome, stepper `−`/`+`.
  - 2ª linha: esperado, última compra, marcas (ex.: "sobrou da semana passada").
- **Selo de diferença** ("+2"/"−1") ao lado do stepper, só quando `quantity_planned ≠ expected_quantity`, cor **neutra** (nunca vermelho/verde — a cor é reservada para outras coisas na especificação).
- Item só entra na lista de compra com quantidade **≥ 1**.
- **Alerta de recorrente zerado:** se `frequency = recorrente` e `expected_quantity > 0` mas `quantity_planned = 0`, mostrar "esperado 5, esta semana 0" na própria linha (não é modal). Toque no item oferece "Tenho estoque", que silencia **só naquela semana** (não muda o catálogo).
- Densidade: compacta (~48 px de linha) por padrão nesta fase *[proposta, conforme especificação]*.

### Fase Comprar
- Só itens com quantidade ≥ 1, agrupados por **categoria** (cor + ilustração + nome — nunca só a cor), com opção de visão corrida (sem grupos) *[proposta]*.
- Seção **Comprados** no fim da lista, alimentada pelo ato de riscar.
- Linha de uma linha (~52 px) *[proposta]* — mais confortável que Montar.
- **Banner de recorrentes fora da lista:** ao entrar em Comprar com recorrentes zerados, banner não bloqueante ("3 recorrentes fora da lista: leite, arroz, café"), toque leva de volta a Montar, dispensável e não reaparece na mesma compra. Cor de aviso (nunca vermelho — reservado a erro de sync).
- **Riscar um item:** desce para Comprados com uma animação curta (transform/opacity, 120–200 ms); tocar de novo devolve à lista ativa. Se outra pessoa riscar o mesmo item quase ao mesmo tempo, **não reverte silenciosamente** — mostrar quem fez (iniciais).
- **Encerramento:** é automático no backend (último item ativo riscado/excluído, ou timer de 24 h — ver §4.3 do BACKEND.md). O cliente só precisa:
  - Mostrar **snackbar "Desfazer"** de 5–10 s ao detectar o encerramento (local, otimista, antes mesmo de confirmar com o servidor).
  - **Nunca** desenhar um botão "Finalizar" — não existe.
  - Ao reabrir a lista fechada dentro da janela de desfazer, reverter localmente e cancelar o evento de fechamento pendente.

## 7. Autocomplete, itens novos e duplicatas

- Fonte: catálogo local (~200 itens) + itens já criados pela família, rankeados por uso *[proposta]*.
- **Sem correspondência no catálogo:** cria o item na hora com uma **adivinhação de categoria por palavra-chave** (dicionário local, sincronizado do servidor — ver `DictionaryTerm` no BACKEND.md). A Thaty corrige com um toque (chip de categoria), e a correção é enviada como evento que alimenta o dicionário da família.
- **Termos novos** e sua promoção a item de catálogo são tela exclusiva do Dono em Ajustes (não aparecem para a Thaty). Indicador discreto (badge, sem notificação) quando há termos com 3+ usos.
- **Duplicatas no Inbox:** itens de texto igual (normalizado) se agrupam visualmente com selo "2×" e iniciais de quem anotou, **sem apagar nenhum registro** — é uma agregação de exibição, os itens continuam distintos no armazenamento até alguém os consumir na lista.
- **Atribuição:** toda linha pode mostrar iniciais + cor de quem anotou/riscou/alterou por último (cor fixa por pessoa, definida em Ajustes > Conta ou atribuída automaticamente).

## 8. Presença e erro de sincronização

- **Presença (estilo Google Docs):** iniciais coloridas no topo de uma lista aberta, para quem está nela agora (via canal de presença do backend, polling curto — não WebSocket pesado). Realce sutil (~2 s, opacity) no item que o outro está editando. Tudo some sozinho, sem histórico ("visto por último" não existe).
- **Banner de erro de sincronização:** só aparece depois de **2 min sem sincronizar E com mudanças pendentes na fila local** — ambas as condições calculadas no cliente. Vermelho (única situação da UI que usa essa cor), ícone, texto direto, não bloqueia a tela. Aparece **só** dentro de uma lista aberta e em Ajustes (nunca como toast global). Some sozinho ao sincronizar, com confirmação curta em tom neutro; dispensável a qualquer momento; só reaparece se piorar de novo (não fica reaparecendo a cada 2 min enquanto o problema persiste).
- **Notificações in-app** (app em primeiro plano): agrupadas ("3 itens novos"), nunca sobre a própria mudança do usuário atual, toque abre direto o Inbox ou a lista de origem.
- **Notificação local do sistema** (app em segundo plano): só para mudanças no Inbox, gerada pelo poll periódico de 1 h da camada de plataforma — documentar como melhor esforço na própria UI (não prometer entrega em tempo real).

## 9. Sistema visual

Consumir os tokens e ativos já definidos em [logo/](logo/) (ver [logo/README.md](logo/README.md) e o guia de uso publicado) — não redefinir cor ou tipografia aqui.

- **Direção:** Notion/Linear/Arc. Cantos 6–8 px, bordas finas, sombra mínima, densidade alta. **Proibido:** cantos muito arredondados, ripple do Material, Roboto, qualquer estética "Google". Convenções de interação (bottom sheet, snackbar de desfazer, swipe-to-delete) continuam por serem comportamento aprendido, não visual.
- **Cores:** paleta fixa, sem personalização pelo usuário. A paleta de marca (Floresta `#002820`, Verde de ação `#46E57F`, Menta `#DFECE3`, Gelo `#F5F6F8`) é a base do ícone/splash; a paleta de **produto** (fundo, texto, acento de ação, 8–10 cores de categoria) ainda está em aberto — item #1 e #3 da especificação, ver §10 abaixo. Vermelho é reservado exclusivamente ao erro de sincronização.
- **Tipografia [decidido]:** Space Grotesk (títulos, frases de voz, números grandes de quantidade) + Inter (corpo: nomes de item, rótulos, avisos). As duas **embutidas no bundle** (sem carregar de CDN — o app precisa funcionar 100% offline, inclusive no primeiro boot). Algarismos tabulares na Inter para os números de quantidade não "pularem" de largura. Testar acentuação pt-BR (ã, ç, é, õ) nos dois pesos usados.
- **Ilustrações:** SVG próprias por item de catálogo (~53 Corporativo + ~150 Casa comuns), com fallback de **letra inicial estilizada** para item sem ilustração. Cada uma precisa de variante clara/escura. Carregadas do bundle, não da rede.
- **Cor por categoria:** nunca é o único sinal — sempre acompanhada de ilustração/nome. 8 a 10 categorias (lista exata em aberto, §10).
- **Densidade:** compacta e confortável coexistem no mesmo app, adaptadas por fase (Montar compacta, Comprar confortável) e por preferência do aparelho em Ajustes.
- **Movimento:** 120–200 ms, sem easing com quique (`ease-out` linear ou similar, nunca spring elástico). Toda transição de estado é animada (entrar, sair, riscar, expandir, trocar aba/fase) — nada aparece ou some sem transição, mas a animação **nunca atrasa o toque** (otimista primeiro, anima depois). Cascata de entrada limitada aos primeiros ~6 itens de uma lista (o resto entra direto, por performance). Só animar `transform` e `opacity` (evitar layout thrashing). Respeitar a preferência de sistema "remover animações" (Android: `Settings.Global.ANIMATOR_DURATION_SCALE` / prefers-reduced-motion na Web). Sem blur e sem movimento ambiente contínuo (nada de "respirando" em loop).
- **Tátil e som [decidido]:** vibração curta ao riscar; som curto ("tique") no mesmo gesto; som de conclusão ao encerrar uma compra. Sempre respeitando o modo silencioso do sistema. Interruptor de som em Ajustes, ligado por padrão *[proposta]*.
- **Tema:** claro, escuro e automático (segue o sistema). Fundo do tema claro é um verde quase imperceptível (`#F4F8F5`, definido em [logo/README.md](logo/README.md)); fundo do tema escuro é **AMOLED puro** (`#000000`) para economia de bateria em tela OLED — atenção: isso é mais escuro que o Floresta da marca (`#002820`), então o fundo de tela do app **não é** a mesma cor do fundo do ícone/splash, são propositalmente diferentes.

## 10. Voz e tom (camada de conteúdo)

Isso é trabalho de frontend porque os textos vivem no bundle, não no backend:

- **Casa:** calorosa, doméstica, ácida, humor leve.
- **Corporativo:** direta, contida, sem piada.
- Frases curtas (~10 palavras), afirmativas, específicas ao cotidiano deles, nunca zombando da Thaty ou do Diogo diretamente.
- Humor só em momentos de custo baixo (Inbox vazio, compra concluída, primeira vez) — **nunca** em erro, sincronização, exclusão ou desfazer (nesses, tom neutro e direto).
- **Textos rotativos:** implementar como um pequeno array por "momento" (ex.: `inboxVazio: string[]`), escolha aleatória sem repetir a última usada.
- **Textos com dado real:** template com variáveis (dia da semana real, contagem real de itens) — nunca string fixa como "Terça resolvida" hardcoded para todo dia.
- Exemplos aprovados na especificação (§14) servem de calibre de tom, não são as únicas frases a implementar — criar o conjunto completo por momento (Inbox vazio, compra concluída, primeira vez de cada fluxo, etc.) seguindo o mesmo padrão.

## 11. Onboarding e dicas

- Primeira entrada da Thaty: Inbox vazio + Corporativo já com a lista da semana pronta (o template já populado, sem ela precisar montar do zero).
- **Tour curto:** poucos cards, na voz do app, "Pular" visível desde o primeiro card, mostrado uma vez, reabrível em Ajustes.
- Último card do tour: interruptor **"Mostrar dicas"**, ligado por padrão.
- **Dicas contextuais:** balão não bloqueante, cada uma aparece **uma vez** na vida do app, no máximo **uma por sessão** mesmo que várias sejam elegíveis, some com qualquer toque na tela. Sem spotlight/dimming, sem blur.

## 12. Busca

- **Busca local (dentro da lista aberta):** campo com foco na lupa no topo, filtra em tempo real conforme digita.
- **Busca global:** toggle animado "Lista | Tudo" logo abaixo do campo, só visível quando o campo está focado, padrão em "Lista". Se a busca local não encontra nada, o próprio toggle sugere "Buscar em tudo?" (sem ícone de globo — ambíguo).
- **Busca em Ajustes:** escopo fixo às opções visíveis pelo papel do usuário logado (não vaza opção de Dono para a Thaty via busca).

## 13. Ajustes e painel de admin

- **Todos os papéis:** Conta, Aparelho (densidade, tema, som/tátil — preferências por aparelho, não por conta), Família e convites.
- **Só Dono, adicional:** Catálogo (itens, categorias, frequência, esperado, termos novos — telas de CRUD completas), Histórico (lista de compras arquivadas, paginação sem limite), Sincronização (status, ver §8).
- **Painel do Dono — layout responsivo:** em celular é uma sequência de telas; em tela larga (ultrawide) vira layout de três colunas ou tabela + painel lateral de detalhes, com suporte a teclado (navegação, atalhos) e **edição em massa** (selecionar várias linhas, aplicar categoria/frequência em lote). Suporta **colar uma lista de nomes** (textarea multi-linha) para criar vários `CatalogItem` de uma vez — o parsing (um nome por linha, ignorar linhas vazias) é puramente client-side antes de mandar ao endpoint de bulk do backend.
- **Histórico** não aparece em nenhuma tela da Thaty — nem atalho, nem menção.

## 14. Acessibilidade

- Alvos de toque **≥ 44 px** em todo componente interativo (stepper, checkbox de riscar, chips de categoria).
- Cor nunca é o único sinal — todo estado com cor (categoria, alerta, selo) tem também ícone, texto ou forma.
- Contraste adequado nos dois temas, validado com o texto real (não só os tons de marca) — atenção especial ao Gelo sobre Menta e ao verde de ação sobre fundo escuro, que já foram sinalizados como de baixo contraste no material de logo.
- Layout fluido até ~115% de fonte do sistema sem cortar texto ou quebrar o stepper/linha de item.
- Respeitar "remover animações" do SO (ver §9).

## 15. Estados de componente a cobrir (checklist, item em aberto #6 da especificação)

Todo componente de lista/item precisa dos estados abaixo antes de ser considerado pronto — hoje só o estado "com dados" está detalhado na especificação:

- **Vazio:** Inbox vazio, lista de Casa recém-criada, catálogo sem itens (bootstrap antes do Dono configurar).
- **Carregando:** primeira pintura antes da hidratação do armazenamento local terminar (deve ser rapidíssimo, é local) — nunca um spinner de rede, no máximo um esqueleto instantâneo.
- **Erro:** falha ao aplicar uma mudança local (ex.: armazenamento cheio) — raro, mas precisa de um retorno visual não-modal.
- **Offline:** o app funciona idêntico, exceto pelo banner de erro de sync quando aplicável (§8) — não há uma "tela de offline" separada, o princípio é que offline é o modo base.

## 16. Marcos, do ponto de vista do frontend

| Marco | O que o frontend entrega |
|---|---|
| **M0 · Portão** | Boot mínimo (Tauri Android), uma lista só, leitura/escrita local instantânea, fila de sync básica contra o backend do M0. Medir cold start ≤ 5 s no S23+ real. |
| **M1 · Mínimo usável** | Telas de conta/login/convite (QR), Inbox completo, Entrada (bottom sheet + autocomplete básico), lista de Casa com fase Comprar, indicação de offline/erro de sync, tema claro/escuro. |
| **M2 · Rotina corporativa** | Tela Corporativo completa (Montar + Comprar, selos, alertas, banner de recorrentes), riscar com animação e som/vibração, snackbar de desfazer, geração automática da lista seguinte refletida na UI. |
| **M3 · Manutenção** | Painel do Dono completo (celular + desktop largo), tela de termos novos, histórico paginado, tela de status de sincronização. |
| **v2** | Layout de desktop para o app inteiro (hoje só o painel tem isso), iOS nativo, UI de multi-família e convidados externos. |

**Regra de polimento (repetida do produto, porque afeta priorização de sprint do frontend):** o primeiro app mostrado à Thaty é M1+M2. Só três pontos exigem acabamento impecável desde já — **abertura a frio**, **Montar a lista de terça** e **feedback de sincronização** — e riscar itens precisa **nunca falhar**, mesmo com acabamento visual simples, porque é a métrica de sucesso de Casa. Todo o resto (ilustrações finais, textos rotativos completos, animações de detalhe) pode chegar depois desses três.

## 17. Riscos específicos de frontend

- **Cold start do WebView (Tauri)** pode não bater os 5 s — plano B documentado no produto é um app Android nativo; o frontend deve medir isso **antes** de investir em telas além do M0, para não descobrir tarde que precisa trocar de stack.
- **Latência do teclado em WebView** — testar o comportamento da Entrada (bottom sheet subindo com o teclado) cedo, é um dos pontos mais sensíveis a jank em WebView Android.
- **Token expirando no meio do uso** — testar explicitamente o cenário "app aberto por 20+ minutos sem interação, depois volta a usar" antes de dar como resolvido.
- **Áreas seguras do iOS na versão Web** — mesmo sem app nativo ainda, a PWA no Safari do Diogo precisa respeitar notch/home indicator desde o M1, senão a bottom bar fica inutilizável nesse aparelho.

## 18. Itens em aberto que travam decisões de frontend

Da especificação (§23), os que mudam componente ou fluxo de tela — resolver antes ou durante o M1/M2:

1. **Paleta de produto e acento** (fixos) — bloqueia a implementação de tokens de cor além da marca (o guia de logo cobre só a marca, não a UI inteira).
2. **Valor inicial de "desta semana" em Montar** — pré-preenchido com o esperado ou zerado? Muda o estado inicial do stepper de cada linha ao abrir uma lista de Corporativo recém-criada.
3. **Lista das 8–10 categorias**, nomes e cores — bloqueia o componente de chip/selo de categoria e o agrupamento da fase Comprar.
4. **Sons exatos** (arquivos, duração) e o conjunto final de ícones de UI (fora dos já resolvidos em [logo/](logo/)).
5. **Templates múltiplos e duplicação de lista** — se existir mais de um modelo em Corporativo, precisa de um seletor de template na criação; se não, a tela de criação de lista em Corporativo não existe (a lista só nasce sozinha).
6. **Nomes exatos** das pastas, seções e do estado "Comprados" (catálogo de textos definitivo da UI).
