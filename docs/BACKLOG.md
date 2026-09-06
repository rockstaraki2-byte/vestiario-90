# Backlog do MVP

## M0 — Fundação
- [x] Next.js/TypeScript, identidade responsiva, RNG e testes, manifesto PWA
- [x] contrato PostgreSQL/Prisma com entidades do MVP
- [x] autosave local versionado, Event Engine e CI
- [ ] provisionar PostgreSQL, gerar migration e integrar autenticação
- [ ] proteção da `main`

## M1 — Temporada jogável
- [x] 20 clubes oficiais da Série A 2026 com elencos pesquisados e versionados
- [x] calendário determinístico de 38 rodadas
- [x] telas funcionais de elenco e classificação
- [x] escalação, tática e match engine textual (vertical slice determinístico)
- [x] rodada completa com simulação dos 10 jogos e classificação persistente
- [x] condição, fadiga, moral, lesões, cartões e suspensões
- [x] escalação manual com bloqueio de indisponíveis
- [x] calendário funcional, encerramento e virada de temporada

## M1.5 — Base SoccerWiki + Sprint 3: dia de jogo
- [x] catálogo SoccerWiki normalizado como fonte de identidade visual (snapshot 2026-09-06)
- [x] participantes da Série A 2026 alinhados à relação oficial da CBF
- [x] vínculos jogador-clube enriquecidos por pesquisa web atual, separados dos atributos simulados
- [x] partida dividida em pré-jogo, primeiro tempo, intervalo, janela aos 70 minutos e reta final
- [x] banco de reservas e até 5 substituições distribuídas entre as janelas
- [x] lesão durante a partida obriga substituição antes de continuar
- [x] mudança de mentalidade, pressão e ritmo durante o jogo
- [x] conversa de intervalo (cobrar, incentivar ou acalmar) com efeito contextual no segundo tempo
- [x] resultado interativo alimenta classificação, condição, fadiga, moral, cartões, lesões e forma
- [ ] cartões vermelhos e inferioridade numérica
- [x] substituições em qualquer minuto, sem janelas discretas

## M1.6 — Dados reais Transfermarkt
- [x] snapshot estático dos plantéis dos 20 clubes da Série A 2026
- [x] 663 perfis de jogadores vinculados aos clubes atuais do snapshot
- [x] idade factual do Transfermarkt aplicada à engine (100% de cobertura do snapshot)
- [x] valor de mercado em euros separado do overall simulado
- [x] valores positivos publicados para mais de 92% dos perfis; ausências preservadas como sem valor
- [x] ID Transfermarkt persistido no jogador e exibido no elenco
- [x] data de referência do valor preservada quando publicada pela fonte

## M2 — Pessoas e Vestiário / Sprint 4
- [x] moral e fadiga conectadas ao loop esportivo
- [x] personalidades determinísticas dos jogadores
- [x] hierarquia e papel no elenco: líder, titular, rotação, reserva e promessa
- [x] satisfação e confiança no treinador
- [x] minutagem, titularidades e participações persistentes
- [x] motor de preocupações por papel, falta de minutos, baixa confiança e promessas quebradas
- [x] conversas individuais: ouvir, elogiar e cobrar, com reação por personalidade
- [x] promessa de mais minutos com prazo, progresso, cumprimento e quebra
- [x] tela Vestiário com clima do grupo, líderes, questões ativas e histórico humano
- [x] contratos, salários simulados e renovação por agente
- [x] rede de relações jogador-jogador, panelinhas e influência dos líderes

## M2.5 — Relações coletivas / Sprint 7
- [x] química determinística e estável entre pares de jogadores
- [x] amizades, rivalidades e respeito interno
- [x] núcleos sociais formados em torno dos atletas mais influentes
- [x] coesão e influência calculadas por grupo
- [x] indicador de unidade geral do vestiário
- [x] conversas individuais repercutem em amigos, rivais e membros do mesmo núcleo
- [x] promessas cumpridas ou quebradas geram efeito cascata no grupo
- [x] deixar uma liderança saudável fora da partida afeta seu núcleo
- [x] rivalidades por posição reagem à escolha de titulares
- [x] venda, empréstimo e chegada de jogador alteram o clima social
- [x] tela Vestiário exibe panelinhas, líderes, amizades, rivalidades e influência

## M3 — Mundo vivo / Sprint 5
- [x] estado persistente de confiança da diretoria, apoio da torcida, pressão da mídia e reputação
- [x] Event Engine conectado ao inbox e ao loop da temporada
- [x] coletivas pós-jogo com escolhas e consequências
- [x] empresários reagindo a insatisfação, confiança e falta de minutos
- [x] reuniões periódicas com a diretoria
- [x] jogadores procurando o treinador conforme problemas do vestiário
- [x] feed de notícias gerado pelas partidas e decisões do treinador
- [x] decisões do inbox alteram métricas do mundo e relações com o elenco
- [x] telas funcionais de Caixa de entrada e Notícias
- [ ] entrevistas/TV com árvores longas de perguntas
- [x] vazamentos, redes sociais e conflitos entre jogadores

## M3.5 — Crises e repercussão / Sprint 8
- [x] discussões internas disparadas por rivalidades fortes
- [x] decisões de mediação, punição ou apoio com efeito nos dois envolvidos e no núcleo social
- [x] vazamentos para imprensa quando coesão/confiança se deterioram
- [x] investigação, negativa pública ou cobrança coletiva como respostas a vazamentos
- [x] líderes podem publicar mensagens ambíguas após derrotas
- [x] companheiros podem defender jogadores próximos publicamente
- [x] redes sociais alimentam pressão da mídia, torcida e confiança interna
- [x] repercussões viram notícias persistentes no Mundo Vivo
- [x] Caixa de entrada identifica Conflito, Vazamento e Rede social como categorias próprias
- [x] contraste da UI do Vestiário corrigido para cards de fundo branco em desktop e mobile

## M4 — Mercado / Sprint 6
- [x] orçamento de transferências e teto salarial por clube
- [x] contratos com salário, duração, agente e cláusula simulados
- [x] lista de transferências e pedido de saída por insatisfação
- [x] propostas de compra e empréstimo
- [x] negociação com clube vendedor e termos pessoais com jogador/agente
- [x] IA identifica posições e gera propostas pelo elenco do treinador
- [x] janelas de 2026 mapeadas às rodadas 1–6 e 19–26
- [x] limite doméstico de 12 jogos para troca entre clubes da Série A
- [x] agentes livres após fim de contrato
- [x] empréstados retornam ao clube de origem na temporada seguinte
- [x] transferências e contratos sobrevivem à virada da temporada
- [x] histórico persistente de transferências
- [x] tela Mercado funcional: elenco, oportunidades, propostas e histórico
- [ ] contrapropostas em múltiplas rodadas e bônus/cláusulas avançadas
- [ ] mercado internacional e clubes fora da Série A

## M5 — Narrativa avançada / Sprint 9
- [x] `NarrativeProvider` contextual ligado ao avanço dos dias
- [x] viagens e atrasos com impacto em descanso e preparação
- [x] problemas de hotel e recuperação
- [x] alertas de desgaste da comissão técnica
- [x] convites para TV e compromissos de patrocinador
- [x] escolhas narrativas alteram condição, fadiga, moral, diretoria, torcida e mídia
- [x] dia de jogo minuto a minuto com pausa e três velocidades
- [x] substituições e ajustes táticos em qualquer minuto
- [x] quadro tático reorganizado por formação e função dos jogadores
- [ ] eventos pessoais raros e conflitos externos de longo prazo

## M6 — Carreira do treinador / Sprint 10
- [x] vínculo persistente entre treinador e clube
- [x] segurança no cargo ligada a resultados e confiança da diretoria
- [x] demissão por crise esportiva/institucional
- [x] temporada continua simulando enquanto o treinador está sem clube
- [x] convites de outros clubes e mercado de treinadores
- [x] entrevistas de emprego com respostas e avaliação contextual
- [x] propostas formais, recusa e aceite
- [x] troca de clube durante a temporada com novo elenco e nova diretoria
- [x] reputação influencia processos seletivos
- [x] histórico de passagens, demissões, entrevistas e aproveitamento
- [x] tela Carreira com status, segurança, desempenho e processos abertos

## M7 — Gestão do clube / Sprint 11
- [x] dossiê acionável do próprio jogador a partir do elenco
- [x] conversa individual, promessa, elogio e cobrança no dossiê
- [x] contrato, salário, empresário, cláusula e renovação visíveis no jogador
- [x] indicar e retirar jogador da lista de transferências pelo dossiê
- [x] pedir observação interna e avaliação médica de atletas do elenco
- [x] Departamento de Futebol com responsável e nível de estrutura
- [x] Observação/Scouting com pedidos de relatório de jogadores externos
- [x] Categorias de Base persistentes com jovens gerados deterministicamente
- [x] avaliação de potencial/prontidão e promoção da base ao profissional
- [x] Análise de Desempenho com dossiê de adversário
- [x] Médico e Performance com parecer de condição, fadiga e lesão
- [x] diretoria decide aumento de verba de transferências e teto salarial
- [x] diretoria decide investimentos em scouting, base, análise e estrutura médica
- [x] confiança, reputação e segurança no cargo influenciam aprovação da diretoria
- [x] cooldown impede pedidos repetidos à diretoria a cada rodada
- [x] solicitações de departamentos têm prazo e relatórios chegam ao inbox
- [x] estrutura dos departamentos e base acompanha a carreira e vira a temporada


## M8 — Central de Dados, Mídia realista e partida viva / Sprint 14
- [x] menu dedicado `Central de Dados` para estatísticas
- [x] minutagem real de titulares e substitutos nas partidas interativas
- [x] condição e fadiga evoluem minuto a minuto conforme pressão, ritmo, idade e carga
- [x] notas de atuação dinâmicas durante a partida
- [x] gols, assistências, finalizações, cartões e gols sofridos alteram a nota ao vivo
- [x] nota, minutagem, condição e fadiga ao vivo alimentam o pós-jogo e as estatísticas persistentes
- [x] central `Mídia & Redes` separada da caixa de entrada/notícias
- [x] veículos e jornalistas reais como perfis editoriais, com conteúdo do jogo explicitamente marcado como simulação
- [x] Instagram, X, Threads, TikTok e YouTube modelados como canais distintos
- [ ] ampliar jornalistas e veículos por país/competição europeia
- [ ] coletivas com repórteres específicos, histórico de relação e linha editorial individual
- [ ] tendências, hashtags, vídeos virais e ciclos de repercussão de vários dias
