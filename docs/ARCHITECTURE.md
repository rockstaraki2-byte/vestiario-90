# Arquitetura — Vestiário 90

Monólito modular em Next.js com três fronteiras: `src/app` para UI, `src/features` para casos de uso e `src/game-engine` para regras puras e determinísticas. A persistência via PostgreSQL/Prisma viverá em `src/db`.

Cada carreira carrega `gameSeed` e `tick`. Nenhuma regra da engine pode usar `Math.random()` diretamente. A narrativa começa com templates locais; IA generativa será apenas um adaptador opcional. O autosave será transacional no avanço de cada dia.
