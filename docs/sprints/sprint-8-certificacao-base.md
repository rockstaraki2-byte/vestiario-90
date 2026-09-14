# Sprint 8 — Certificação da base e segurança de dependências

## Objetivo

Transformar a saúde da base em um gate de liberação. Depois das Sprints 6 e 7 eliminarem participantes virtuais das copas nacionais e continentais, a Sprint 8 impede que sincronizações futuras degradem silenciosamente as competições que já estão jogáveis.

## Escopo

- Certificação independente das competições seniores expostas pelo motor.
- Contagem real de participantes comparada ao campo esperado.
- Bloqueio para clubes virtuais em competição jogável.
- Bloqueio para registros suspeitos e erros de integridade.
- Sinalização de elencos curtos e escudos ausentes.
- Status de certificação visível no painel Saúde da Base.
- Certificação executada no CI e no fluxo diário de atualização de elencos.
- `npm audit --audit-level=moderate` como gate de segurança.
- Atualização do Vitest para uma versão sem os advisories detectados pelo audit.

## Níveis

- `certified`: nenhuma inconsistência de liberação e nenhum alerta não bloqueante.
- `warning`: a base pode rodar, mas possui pendências não bloqueantes, como cobertura visual incompleta.
- `blocked`: existe falha de integridade que impede considerar a base segura para publicação.

## Regras de liberação

Uma competição jogável não pode ser certificada quando:

1. não existe no painel de saúde;
2. o motor está desatualizado;
3. a quantidade de participantes difere do campo real esperado;
4. existem participantes `virtual-*`;
5. existem registros de jogadores suspeitos;
6. existe erro explícito na sincronização ou no modelo de saúde.

Elencos abaixo do mínimo e escudos ausentes continuam sendo rastreados pelo painel; o gate especializado das competições também preserva as validações específicas implementadas nas Sprints anteriores.

## Pipeline

Antes de aceitar a Sprint 8:

1. instalação limpa das dependências;
2. audit de segurança;
3. certificação da base;
4. testes específicos de saúde, copas e integrações;
5. suíte completa;
6. build de produção;
7. preview Vercel.

O fluxo diário de elencos passa a executar a certificação antes de gravar qualquer snapshot novo. Assim, uma fonte externa pode falhar sem substituir uma base válida por uma base degradada.
