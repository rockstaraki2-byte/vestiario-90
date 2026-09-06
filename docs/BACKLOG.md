# Backlog do MVP

## M0 — Fundação
- [x] Next.js/TypeScript, identidade responsiva, RNG e testes, manifesto PWA
- [x] contrato PostgreSQL/Prisma com entidades do MVP
- [x] autosave local versionado, Event Engine e CI
- [ ] provisionar PostgreSQL, gerar migration e integrar autenticação
- [ ] proteção da `main`

## M1 — Temporada jogável
- [x] 20 clubes e 600 jogadores por seed
- [x] calendário determinístico de 38 rodadas
- [x] telas funcionais de elenco e classificação
- [x] escalação, tática e match engine textual (vertical slice determinístico)
- [x] rodada completa com simulação dos 10 jogos e classificação persistente
- [x] condição, fadiga, moral, lesões, cartões e suspensões
- [x] escalação manual com bloqueio de indisponíveis
- [x] calendário funcional, encerramento e virada de temporada

## M1.5 — Base SoccerWiki + Sprint 3: dia de jogo
- [x] catálogo SoccerWiki normalizado como fonte de identidade (snapshot 2026-09-06)
- [x] Palmeiras como primeiro clube do save e identidades de clubes brasileiros no campeonato simulado
- [x] identidade SoccerWiki aplicada aos jogadores; atributos e vínculos permanecem simulados quando ausentes no snapshot
- [x] partida dividida em pré-jogo, primeiro tempo, intervalo, janela aos 70 minutos e reta final
- [x] banco de reservas e até 5 substituições distribuídas entre as janelas
- [x] lesão durante a partida obriga substituição antes de continuar
- [x] mudança de mentalidade, pressão e ritmo durante o jogo
- [x] conversa de intervalo (cobrar, incentivar ou acalmar) com efeito contextual no segundo tempo
- [x] resultado interativo alimenta classificação, condição, fadiga, moral, cartões, lesões e forma
- [ ] cartões vermelhos e inferioridade numérica
- [ ] substituições em qualquer minuto, sem janelas discretas

## M2 — Pessoas
- [~] moral e fadiga conectadas ao loop esportivo
- [ ] personalidade, relações, contratos e promessas

## M3 — Mundo vivo
- [ ] Event Engine, inbox, imprensa, diretoria, empresários e coletivas

## M4 — Mercado
- [ ] IA de necessidades, propostas, empréstimos e contratos

## M5 — Narrativa
- [ ] feed social, viagens, conflitos e `NarrativeProvider`
