# Gastei — Identidade visual

Conceito escolhido: **06 · Cesto-telhado**, com a alça voltada para dentro do cesto.

## Paleta
| Cor | Hex | Uso |
|---|---|---|
| Floresta | `#002820` | tinta, fundo do ícone, fundo de marca em tema escuro |
| Verde de ação | `#46E57F` | ações, alça do símbolo — nunca texto |
| Menta | `#DFECE3` | corpo do cesto, superfícies |
| Gelo | `#F5F6F8` | texto sobre fundo escuro |
| Fundo claro (tema) | `#F4F8F5` | fundo do app no tema claro — Gelo com um fio de verde |
| AMOLED (tema escuro) | `#000000` | fundo do app no tema escuro |

## Arquivos

**Símbolo isolado** (`logo/`), SVG + PNG 512×512 transparente, em cores / monocromático / branco / preto:
`gastei-simbolo-{cores,monocromatico,branco,preto}.{svg,png}`

**Wordmark e logo horizontal** (`logo/wordmark/`), letras convertidas em curvas (Space Grotesk Bold), SVG + PNG transparente:
- `gastei-wordmark-*` — só o nome
- `gastei-logo-horizontal-*` — símbolo + nome

**Fonte** (`logo/fonts/`): `SpaceGrotesk-wght.ttf` (variável, OFL), usada para gerar as curvas e para texto real no app.

**Pacote Android** (`android-icons/res/`): ícone adaptativo (foreground/background), ícone temático monocromático, splash (API 12+), ícone de notificação, cores de tema claro/AMOLED, e ícones legados em mdpi–xxxhdpi. Copiar para `src-tauri/gen/android/app/src/main/res/` do projeto Tauri.

## Guia de uso
O guia completo (cores, espaço livre, tamanhos mínimos, versões por fundo, o que evitar, regras do ícone) está publicado como artefato: prancha "Guia de uso da marca" em
https://claude.ai/artifact/FEs53tiCq6Sb1u7gKs8CAq

## Pendências / decisões em aberto
- Validar o símbolo a 24 px e em tela real de celular (as frestas do cesto podem fechar).
- `postSplashScreenTheme` em `themes_splash.xml` referencia `Theme.Gastei`, nome provisório — trocar pelo tema real do app.
- Espaço livre e tamanhos mínimos do guia são propostas, não testadas em produto.
