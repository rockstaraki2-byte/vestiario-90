# Sprint 11 — estabilidade multi-temporada e certificação continental

## Objetivo

Transformar a qualificação dinâmica das Sprints 9 e 10 em um sistema autocertificado antes da virada de temporada. O save não pode avançar silenciosamente com campos continentais incompletos, clubes repetidos, participantes sintéticos ou coeficientes corrompidos.

## Regras certificadas

- Libertadores: exatamente 32 participantes.
- Sul-Americana: exatamente 32 participantes.
- Champions League: exatamente 36 participantes.
- Europa League: exatamente 36 participantes.
- Conference League: exatamente 36 participantes.
- Total continental auditado por ciclo: 172 vagas.
- Um clube não pode disputar LIB e SUD na mesma edição.
- Um clube não pode disputar simultaneamente UCL, UEL e UECL na mesma edição.
- Nomes `Classificado`, `virtual`, `placeholder`, `fictício` ou equivalentes bloqueiam a virada.
- Procedência ausente gera `warning`, preservando compatibilidade com saves antigos.
- Procedência apontando para temporada diferente gera `warning`.
- Coeficientes de associação não podem ter valores negativos, não finitos ou duplicidade país/temporada.
- O histórico de associação é limitado a cinco temporadas.

## Estados

### `certified`
Todos os campos estão completos e íntegros, sem advertências.

### `warning`
A estrutura esportiva está válida, mas há metadados legados incompletos, como procedência ausente. A situação fica visível para diagnóstico sem inutilizar saves antigos.

### `blocked`
Existe falha estrutural que pode corromper a próxima temporada. O fechamento do ecossistema lança erro antes de persistir uma virada inválida.

## Integração

A certificação é calculada depois da geração de `nextInternationalEntrants` e do novo histórico de coeficientes de associação. O snapshot é salvo no arquivo da temporada e também no estado corrente do ecossistema.

O painel `Mundo Persistente` exibe o selo de certificação da última virada, total de participantes auditados e quantidade de ocorrências quando houver alerta.

## Regressão multi-ano

A suíte da Sprint 11 cobre cinco ciclos consecutivos (2026–2030), garantindo:

- 172 participantes por ciclo;
- nenhum campo incompleto;
- nenhuma duplicidade concorrente;
- nenhuma identidade sintética;
- histórico de coeficientes com no máximo cinco temporadas;
- bloqueio explícito para 31/32, 35/36, duplicidade e coeficiente inválido.

## Estratégia de release

A Sprint 11 deve ser aplicada depois do patch da Sprint 10. Durante a fase de desenvolvimento, os arquivos permanecem em commits Git destacados, sem branch ligada ao Vercel. A integração em branch e o deploy devem acontecer apenas no release final autorizado.
