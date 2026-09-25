# Gastei — Especificação de produto e design (v0.1)

Resultado da entrevista de discovery de 2026-09-21. Este documento registra **decisões tomadas**, **propostas ainda não confirmadas** (marcadas como *[proposta]*) e **itens em aberto**. Quando uma decisão contradiz outra, vale a mais recente, e a substituição está anotada.

Legenda: **[decidido]** confirmado pelo Diogo · *[proposta]* sugerido pelo design e aceito de forma implícita, precisa de confirmação · **[aberto]** ainda sem decisão.

---

## 1. Visão

**Gastei** é um app de lista de compras para uma família (Diogo e Thaty), feito quase exclusivamente para a Thaty. O nome é uma dedicatória: era o apelido que ela deu a um projeto financeiro anterior do Diogo, hoje absorvido pelo app de notas Ecos. Não há relação com dinheiro, e o app nunca mostra preços.

**Origem:** frustração com o Bring!, que demora ~1 min para criar uma lista, ~30 s para compartilhar e ~2 min para abrir uma lista compartilhada (≈3m30s de espera), mesmo com Wi-Fi 6 em casa, e cujo menu de compartilhar às vezes falha, obrigando a mandar a lista como texto no WhatsApp. A causa provável é arquitetura (o app espera o servidor antes de mostrar algo), não rede.

**Promessa do produto:** instantâneo, confiável e completo. Sem esperar a rede, sem falha ao compartilhar, com a sensação de "missão cumprida" que o Bring não dá.

**Não será publicado.** É um app privado, instalado por APK. Isso remove exigências de loja, ASO e internacionalização.

## 2. Portão de qualidade (regra de aborto)

Se o Gastei for **mais lento ou mais estressante que o Bring**, o projeto não se justifica.

| Medida | Meta |
|---|---|
| Abertura a frio (toque no ícone até a lista utilizável) | **≤ 5 s** |
| Mudança feita por um chegando ao outro (com rede e app aberto) | **≤ 10 s** |

Regras de teste: medir no **S23+ da Thaty**, com **Tailscale por dados móveis**, no **pior caso** (cold start, app encerrado). O **primeiro marco técnico (M0)** é um protótipo mínimo para medir isso antes de desenhar o resto.

## 3. Princípios

1. **Local-first.** A interface nunca espera o servidor. A lista nasce no aparelho e a sincronização acontece em segundo plano.
2. **Sem servidor, continua sendo um bom app de notas.** O offline é o modo base.
3. **Automatizar o que der**, sem esconder o que importa. Mas sem "mágica" que tira o controle dela (categoria e esperado ficam manuais).
4. **"Preguiça de usuário"** é um requisito. Nada de modal de confirmação, botão de "finalizar" obrigatório ou manutenção para a Thaty. Usar desfazer em vez de perguntar.
5. **Categoria é estrutural, quantidade é semanal.** Um evento pontual muda a quantidade, nunca a categoria.
6. **A Thaty consome, o Diogo mantém.** Tudo que é manutenção (catálogo, esperado, histórico) é do Dono e não aparece para ela.

## 4. Usuários e papéis

- **Thaty** — usuária principal. Usa mais o app que o Diogo. Lê o Inbox, monta a lista corporativa toda semana e risca itens no mercado.
- **Diogo** — Dono. Faz a configuração inicial, mantém o catálogo e vê histórico e gráficos. É quem mais **escreve** no Inbox ("amor, anota que a manteiga acabou"). Troca para iPhone em ~4 a 5 meses.

**Papéis [decidido]:** *Dono* (Diogo, primeiro acesso), *Admin* (Thaty, segundo acesso) e *Membro* (futuro). Todos têm poder total sobre listas, incluindo excluir. O Dono é o único que exclui a família, transfere a posse e acessa o painel de catálogo. *[proposta]* Dono e Admin geram e cancelam convites.

**Exclusão:** reversível por desfazer e lixeira, sem modal *[proposta]* (prazo da lixeira **[aberto]**).

## 5. Plataformas e distribuição

- **Android (v1):** Tauri + React. Aparelhos: Galaxy S23 Ultra (Diogo) e S23+ (Thaty), One UI. Instalação por **APK direto**, atualizações manuais.
- **Web (v1, secundária):** mesmo código. É a **ponte para o iPhone do Diogo** até a v2 (Safari, adicionada à tela inicial, via Tailscale), sem conta Apple paga. Precisa funcionar offline (service worker + armazenamento local) e respeitar áreas seguras do iOS.
- **Painel de admin em desktop:** o painel de catálogo tem layout de tela larga (foco em monitor **ultrawide**, tabela editável, painel lateral de detalhes, edição em massa e teclado). O app inteiro em layout de desktop fica para a v2.
- **iOS nativo:** v2. Custo: conta Apple paga (~R$ 600/ano); a decisão depende de o Diogo migrar todos os outros apps para iOS. Sem conta paga, apps instalados por fora expiram em 7 dias.
- **Camada de plataforma:** tudo específico de sistema (notificações, tarefa em segundo plano, deep link) fica atrás de uma camada trocável. Nenhuma API exclusiva do Tauri no núcleo.

## 6. Arquitetura

- **Backend caseiro** na máquina do Diogo (onde rodam os outros apps). Acesso externo por **Tailscale** (sem portas abertas).
  - Requisitos de setup nos dois celulares: Tailscale **sem restrição de bateria**, **VPN sempre ativa**, **expiração de chave desativada**, e nenhum outro VPN ativo em paralelo.
- **Local-first com fila de sincronização.** Mudanças ficam numa fila e sincronizam quando houver conexão.
- **Sessão persistente:** login uma vez só. Token de longa validade com renovação silenciosa, guardado no armazenamento seguro do aparelho (Keystore). Deslogar sozinho no meio do mercado é requisito de teste.
- **Conflitos:** mesclagem **por campo**. Riscar e mudar quantidade coexistem. No mesmo campo, vale a última alteração.
- **Modelo de dados:** *família* é entidade separada da *conta* (relação N:N) para a multi-família não exigir migração. Permissão preparada **no nível da lista** (para convidados de fora, roadmap).
- **Histórico:** cada lista arquivada guarda, por item, quantidade planejada, quantidade comprada (só o que foi riscado), data e categoria. Isso permite gráficos futuros sem migração.
- **Notificações:** só locais, sem push (nada de FCM). Verificação periódica em segundo plano a cada **1 h**. É **melhor esforço**, não garantia; o item nunca se perde porque a home é o próprio Inbox.

## 7. Autenticação e família

- **E-mail + senha.** SMS descartado. Login social descartado (complexidade do OAuth em Tauri e decisão de escopo).
- **Recuperação:** link de redefinição por e-mail. Link mágico descartado (segurança). Redefinição por admin descartada (exigiria painel).
- **Convite por QR code:** uso único, **expira em 24 h**, cancelável se ainda não usado. O QR contém um deep link que também pode ser mandado como texto no WhatsApp. O QR **vincula a conta** (nome, e-mail, senha) à família. *[proposta]* Sem verificação de e-mail bloqueante no primeiro uso.
- **Já tem conta em outra família:** na v1, mensagem "Você já participa de uma família. Multi-família chegará em breve". Multi-família é roadmap.

## 8. Arquitetura de informação

**Bottom bar:** `Inbox · Casa · [+] · Corporativo · Ajustes`. Some quando o teclado abre.

- **Inbox (home):** só de Casa. Itens soltos anotados ("manteiga", "sabão"). Ao montar uma lista de Casa, os itens do Inbox aparecem como sugestões prontas e **saem do Inbox ao serem adicionados**. Se forem removidos da lista, voltam ao Inbox.
- **Casa:** listas contínuas, vivem de Inbox e listas avulsas. Quase sem templates e sem uso de histórico.
- **Corporativo:** rotina semanal (toda **terça**), com template, catálogo e as três quantidades por item.
- **Ajustes:** menu no estilo de configuração do celular (categorias com ícone e telas próprias), **por papel**, com busca interna.

**Vocabulário fixo:** *Categoria* = tipo do produto (cor). *Frequência* = recorrente ou rara. São eixos independentes.

## 9. O botão "+"

| Onde | Toque | Toque longo (~300 ms) |
|---|---|---|
| Inbox e Casa | Cria **Entrada** (bottom sheet) | Popup com **Lista** (vibração curta) |
| Corporativo | O "+" gira, sai da barra e vira botão flutuante: cria **Lista** | — |

- **Entrada:** bottom sheet com campo, autocomplete e quantidade. **Permanece aberto** após confirmar, para adicionar em sequência. Fecha por arrasto ou toque fora. Teclado sobe junto e o sheet acompanha o topo dele.
- **Popup de Lista:** balão acima do "+", fechável por toque fora.
- **Descoberta:** balão único, sem bloqueio, que fica até ela usar o gesto e reaparece uma vez.
- **Lista de Casa:** ao criar, pergunta só a pasta. Em Corporativo a lista **nasce sozinha** (ver §10).

## 10. Corporativo: template, Montar e Comprar

Uma lista por semana, na **mesma tela em duas fases** com botão de troca: **Montar** e **Comprar**.

**Catálogo e template [decidido]:** ~53 itens recorrentes hoje (a folha de estoque manuscrita). Cada item tem nome, ilustração, categoria, frequência (recorrente ou rara) e **esperado** (o consumo semanal que hoje está na cabeça dela). O esperado é editado **só pelo Dono** no painel.

**Três números por item:**
| Número | Quem define | Papel |
|---|---|---|
| Esperado (ex.: 5 fardos) | Dono, editável | Referência: "o que normalmente usamos" |
| Última compra (ex.: 6) | O app | Memória: só o que foi riscado |
| Desta semana (ex.: 7) | Thaty, na hora | A decisão; é o que vira a lista |

**Fase Montar:** catálogo inteiro visível com quantidades.
- Agrupamento: **frequência primeiro** (recorrentes no topo, raros recolhidos). Zero em raro é silencioso.
- Item entra na lista de compra **só com quantidade ≥ 1**.
- **Linha de duas linhas:** 1ª com ilustração, nome e stepper (− / +); 2ª com esperado, última compra e marcas.
- **Selo de diferença** ("+2" ou "−1") ao lado do stepper, **só quando difere do esperado**, em cores neutras (sem vermelho, sem verde).
- **Alerta:** recorrente com esperado > 0 e quantidade 0 mostra "esperado 5, esta semana 0". Toque no item permite **"Tenho estoque"**, que silencia o alerta só naquela semana.
- Densidade compacta (~48 px) ou confortável (~60 px), *[proposta]*.

**Fase Comprar:** só itens com quantidade ≥ 1, agrupados por **categoria** (com visão corrida opcional), seção **Comprados** no fim. Linha de uma linha (~52 px) *[proposta]*. Ao tocar em Comprar com recorrentes zerados, aparece um **banner sem bloqueio** ("3 recorrentes fora da lista: leite, arroz, café", com toque para voltar a Montar, dispensável, sem reaparecer na compra). Cor de aviso, nunca vermelho.

**Concluir item:** o item riscado desce para "Comprados" (animação curta), e tocar nele o devolve. Item que acabou de ser concluído por outra pessoa não reverte sem aviso.

**Encerramento da compra [decidido]:**
- Encerra sozinho quando o último item ativo é **riscado ou excluído**. Só grava a "última compra" se houver ao menos um item riscado.
- **Snackbar "Desfazer"** de 5 a 10 s. Sem botão "Finalizar".
- **Timer:** se não encerrou em **24 h desde a primeira entrada na fase Comprar**, encerra automaticamente.
- **Sobras:** voltam **uma única vez** para a semana seguinte. Em Corporativo, entram na nova lista com a quantidade que faltou. Em Casa, voltam ao Inbox. Levam a marca "sobrou da semana passada". Se sobrarem de novo, não voltam mais.
- Excluir item sobrando: swipe com desfazer.

**Nova lista de Corporativo:** nasce sozinha quando a anterior encerra, a partir do **template padrão**. Ela cai direto em Montar. O botão flutuante cria uma lista extra. A troca de modelo existe dentro da lista, mas é esperado que quase ninguém a use, então o template padrão precisa estar sempre certo.

## 11. Autocomplete e itens novos

- Fonte: catálogo (~200 itens) mais itens criados. Ranking por uso da família *[proposta]*.
- **Sem correspondência:** o item é criado na hora e o app **adivinha a categoria por palavras** ("sabão" → Limpeza, "presunto" → Frios). A Thaty corrige com um toque, e cada correção **alimenta o dicionário**.
- **Termos novos:** histórico dos termos digitados, com categoria adivinhada, contagem e se foi corrigido. O Dono os revisa e **promove** a item de catálogo (com ilustração). Um **indicador discreto em Ajustes** (só Dono) aparece com termos de 3+ usos, sem notificação.
- **Duplicatas no Inbox:** itens iguais aparecem **agrupados com selo "2×"** e as iniciais de quem anotou ("D · T"), sem apagar nenhum.
- **Atribuição:** o app mostra quem anotou, riscou ou mexeu por último (iniciais e cor por pessoa).

## 12. Sincronização e presença

- **Presença (estilo Google Docs):** iniciais coloridas no topo da lista para quem está nela agora, e um **realce sutil** (~2 s) no item em que o outro está mexendo. Some sozinho. Sem "visto por último".
- **Sem indicador de sincronização** na interface principal.
- **Erro de sincronização:** **banner** (não popup, não bloqueia) **vermelho**, com ícone e texto, após **2 min** sem sincronizar **e** com mudanças pendentes. Aparece **só em uma lista aberta e em Ajustes**. Some sozinho, com confirmação curta em neutro. Dispensável, e só volta se piorar. O vermelho é reservado para isso.
- *[proposta]* Ajustes mostra a última sincronização e as pendências, para o Dono.
- **Notificações:**
  - Mudança do outro no **Inbox** → notificação do sistema (local, melhor esforço).
  - Mudança do outro numa **lista** → aviso dentro do app; se ela estiver fora do app, notificação local.
  - **Agrupadas** ("3 itens novos"), nunca sobre a própria mudança, e o toque abre direto o Inbox ou a lista.

## 13. Sistema visual

- **Direção:** Notion, Linear e Arc. Cantos de **6 a 8 px**, bordas finas, pouca sombra, densidade alta. **Paleta menos monocromática.** **Material Design e a estética Google estão proibidos visualmente** (cantos muito arredondados, ripples, Roboto). Convenções de **interação** (bottom sheet, snackbar de desfazer, swipe) continuam, por serem comportamento aprendido.
- **Cores:** a paleta e o acento **[aberto]**, mas a cor é **fixa**, sem personalização. Referência avaliada: rosa `#DE4E88`, navy `#14192D`, turquesa `#83E7D2`. O acento fica só nas ações. Vermelho reservado a erro de sincronização.
- **Tipografia [decidido]:** **Space Grotesk** em títulos, frases de voz e números grandes de quantidade; **Inter** no corpo (nomes de item, rótulos, avisos). Ambas **embutidas no APK**. Algarismos tabulares na Inter. Validar acentos (ã, ç, é, õ).
- **Ilustrações:** SVG próprias (~53 do corporativo + ~150 comuns de casa ≈ **200** na v1), com um **guia de estilo** antes da primeira (traço, grade, cores, detalhe). Item sem ilustração cai numa **letra inicial estilizada**. Versões para tema claro e escuro.
- **Cor por categoria do produto** (8 a 10 categorias). A cor nunca é o único sinal (ilustração e nome também).
- **Densidade:** compacta ou confortável, adaptativa por fase (Montar compacta, Comprar confortável).
- **Movimento:** sóbrio e rápido, **120 a 200 ms**, sem quique. **Nada estático:** toda mudança de estado tem transição (entrar, sair, riscar, expandir, trocar de aba e de fase). A animação nunca atrasa o toque. Cascata de entrada só nos primeiros ~6 itens. Só `transform` e `opacity`. Respeita "remover animações" do Android. Sem movimento ambiente contínuo e sem blur.
- **Tátil e som [decidido]:** vibração curta ao riscar e som curto ("tique"); som de conclusão na compra encerrada. Respeita o modo silencioso. *[proposta]* interruptor de som em Ajustes, ligado por padrão.
- **Tema:** claro, escuro e automático.

## 14. Voz e tom

- **Casa:** calorosa, doméstica e **ácida**, com humor descontraído.
- **Corporativo:** direta, contida e sem piada.
- **Regras:** curta (~10 palavras, uma ideia por linha), afirmativa (sem "ou... ou..."), específica (ancorada em algo concreto deles) e o alvo da piada é o cotidiano, nunca a Thaty ou o Diogo. Sem tique de assistente ("Pronto.").
- **Humor só onde o custo é baixo** (Inbox vazio, compra concluída, primeira vez). **Nunca** em erro, sincronização, exclusão ou desfazer.
- **Textos rotativos:** cada momento tem um conjunto pequeno de variações.
- **Textos gerados a partir de dados reais** (o dia da conclusão, nunca "Terça" fixo).
- Aprovados: *"Inbox vazio. Isso não dura, a manteiga acaba amanhã."* · *"Silêncio suspeito. Alguém aí não está sentindo falta de nada?"* · Corp: *"Terça resolvida. 14 itens comprados."*
- Rejeitados: *"Nada anotado. Ou a despensa está cheia, ou vocês esqueceram de anotar."* (evasivo e longo) · *"Compra concluída. 14 itens."* (sem graça) · *"Pronto. 14 itens, tudo riscado."* (com cara de IA).

## 15. Onboarding

- Ela chega **com conteúdo pronto**: o Inbox vazio e a pasta Corporativo com a lista da semana a partir do template configurado pelo Diogo.
- **Tour curto** (poucos cards, frases da voz do app), com **"Pular"** desde o primeiro card, exibido uma vez, e reabrível em Ajustes. O **último card** tem o interruptor **"Mostrar dicas"**, **ligado por padrão**.
- **Dicas contextuais:** balão sem bloqueio, **uma vez cada**, no máximo **uma por sessão**, some com qualquer toque. Sem spotlight e sem blur.

## 16. Busca

- **Filtro dentro da lista aberta** (foco na lupa no topo).
- **Global via toggle animado "Lista | Tudo"** abaixo do campo, visível só ao focar a busca (padrão "Lista"). Se o filtro não achar nada, o toggle sugere "Buscar em tudo?". **Sem ícone de globo** (ambíguo).
- **Busca em Ajustes:** alcance fixo e **respeita o papel** (não revela opções que a pessoa não vê).

## 17. Ajustes e painel de admin

- **Preferências por aparelho (v1):** densidade (prioridade), tema e som/tátil.
- **Thaty (Admin):** Conta, Aparelho, Família e convites.
- **Dono:** o mesmo, mais **Catálogo** (itens, categorias, frequência, esperado, termos novos), **Histórico** (Corporativo por padrão; gráficos futuros) e **Sincronização**.
- **Painel do Dono:** um painel responsivo (celular e web larga). Edição em massa, teclado e colar uma lista de nomes para criar itens em bloco.
- **Histórico:** completo, sem limite, em Ajustes. A Thaty não precisa dele.

## 18. Acessibilidade e idioma

- **pt-BR apenas.** Sem internacionalização.
- Layout suporta a fonte do sistema até **~115%** (ninguém usa maior hoje).
- Cor nunca é o único sinal; alvos de toque ≥ **44 px**; contraste adequado nos dois temas; respeitar "remover animações".

## 19. Métricas de sucesso

1. **Portão (obrigatório):** ver §2.
2. **Sucesso principal:** a Thaty usa o app na rotina corporativa por **4 semanas seguidas**, sem voltar ao papel ou ao WhatsApp.
3. **Casa:** a Thaty **risca itens** em compras reais. (Escrever no Inbox é uso do Diogo, não é métrica dela.)

## 20. Fora de escopo e roadmap

**Nunca:** preços e orçamento · OCR da folha de estoque · login social · lembretes por localização · entrada por voz · tamanho de texto e cor de acento personalizáveis.

**Roadmap:** iOS nativo (v2) · multi-família · convidar alguém de fora da família (permissão por lista) · app inteiro em layout de desktop (v2) · gráficos do histórico · atalho para abrir listas antigas.

## 21. Marcos

| Marco | Conteúdo | Critério de funcionou |
|---|---|---|
| **M0 · Portão** | Protótipo: uma lista, sincronização entre dois aparelhos, Tailscale, Tauri Android | Abertura ≤ 5 s e mudança ≤ 10 s no S23+ |
| **M1 · Mínimo usável** | Conta e QR, família, Inbox e Entrada (autocomplete básico), lista de Casa com Comprar, sincronização e offline | Uso em uma compra real de Casa |
| **M2 · Rotina corporativa** | Template, catálogo, Montar e Comprar, alerta, encerramento automático e sobras | A Thaty faz a lista de terça pelo app |
| **M3 · Manutenção** | Painel de admin (celular e web larga), termos novos, histórico | O Diogo mantém o catálogo sem código |
| **v2** | iOS nativo, app inteiro em desktop, multi-família, convidados de fora | — |

**Decisão:** o primeiro app mostrado à Thaty é **M1 + M2** (Casa e Corporativo). **Polimento impecável** só em: (1) **abertura a frio**, (3) **Montar a lista da terça** e (4) **sincronização**. O resto (visual, animações, textos, riscar, Entrada) é acabamento que vem depois, mas **riscar itens precisa funcionar sempre, sem erro**, porque é a métrica de Casa.

## 22. Riscos

- **Cold start do Tauri/WebView** pode estourar os 5 s. Plano B: app Android nativo.
- **Tailscale no celular dela:** VPN único, economia de bateria da Samsung, expiração de chave.
- **Notificação do Inbox é melhor esforço** (verificação a cada 1 h).
- **Latência do teclado em WebView.**
- **Token de sessão expirando** no meio do mercado.
- **Gargalo no curador:** se o Diogo esquecer de atualizar o esperado, o selo perde valor.
- **Item esquecido duas semanas seguidas** some sem aviso (a regra de sobras volta só uma vez).
- **iOS sem conta paga** (7 dias) e background fraco no iOS.
- **Escopo:** M1 + M2 na primeira entrega é grande. O polimento deve ficar restrito aos três pontos escolhidos.

## 23. Itens em aberto

1. **Paleta de cores e acento** (fixos).
2. **Valor inicial de "desta semana" em Montar:** vem preenchido com o esperado, ou zerado? A decisão de "pré-preenchido pelo template" convive com "a maioria dos itens fica zerada". Precisa de resolução.
3. **Lista das 8 a 10 categorias** de produto, nomes e cores.
4. **Logo e ícone do app.**
5. **Sons** (quais, duração) e ícones de UI.
6. **Estados de cada componente:** vazio, carregando, erro, offline.
7. **Templates:** existe mais de um modelo? Como duplicar uma lista em Corporativo?
8. **Verificação de e-mail**, prazo da lixeira, quem pode convidar.
9. **Backup** do servidor caseiro e o plano se a máquina cair por muito tempo.
10. **Nomes exatos** das pastas, seções e do estado "Comprados" (catálogo de textos).
11. **Como o M0 mede o portão** (quem cronometra, com que frequência).
12. **Métricas de erro:** falhas de sincronização e deslogues inesperados.
