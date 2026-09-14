# Sprint 9 — Qualificação dinâmica entre temporadas

## Objetivo

Fazer os resultados esportivos de uma temporada definirem os participantes continentais da temporada seguinte, sem placeholders ou convites artificiais.

## Escopo

- Libertadores e Sul-Americana recebem classificados do Brasileirão e campeões relevantes antes de completar o quadro com clubes reais da rota continental.
- Champions League recebe campeões continentais, classificados nacionais e vagas extras de desempenho.
- As seis ligas europeias de primeira divisão já carregadas entram na regra dinâmica: Inglaterra, Espanha, Alemanha, Itália, França e Portugal.
- Europa League e Conference League respeitam ocupação prévia para impedir o mesmo clube em duas competições UEFA na mesma temporada.
- Campeões continentais preservam sua vaga esportiva quando aplicável.
- Os quadros finais continuam com 32 clubes em LIB/SUD e 36 em UCL/UEL/UECL.

## Integridade

O fallback `Classificado <competição> N` foi removido. Se o motor não conseguir fechar um quadro com clubes reais conhecidos pela base, a virada de temporada falha explicitamente em vez de criar um clube fictício.

A resolução de um classificado procura primeiro o clube real nas ligas carregadas e, quando necessário, usa a identidade canônica dos snapshots continentais certificados. Participantes virtuais continuam proibidos.

## Critérios de aceite

- 32 participantes únicos em Libertadores e Sul-Americana.
- 36 participantes únicos em Champions, Europa League e Conference League.
- Nenhum nome `Classificado`, `virtual`, `placeholder` ou fictício.
- UCL, UEL e UECL sem sobreposição de clubes no mesmo ano.
- Inglaterra, Espanha, Alemanha, Itália, França e Portugal cobertas pelas regras UEFA.
- suíte completa, certificação da base, `npm audit` e build de produção aprovados.
