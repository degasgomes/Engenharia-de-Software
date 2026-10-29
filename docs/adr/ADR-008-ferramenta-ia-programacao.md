# ADR-008 — Ferramenta de IA para programação

**Estado:** Proposto (a confirmar pela equipa no Sprint Planning do Mini Sprint 3).

**Contexto.** A restrição 7 do enunciado obriga a escolher e registar a ferramenta de IA
usada para programar e o modo como é usada. O EDS-10 (secção 5) deixou esta decisão em
aberto. No Mini Sprint 3 a equipa tem 5 dias para pôr a correr uma fatia vertical
(registo → pedido → voto → aprovação) e precisa de acelerar o código repetitivo
(modelos, serializers, ecrãs) sem perder o controlo sobre as regras de negócio.

**Decisão.** Usar o **Claude Code** (Anthropic) como assistente de programação, no
terminal e no editor, com estas regras:

1. A IA propõe; uma pessoa revê **linha a linha** antes de fazer commit. Quem faz o commit
   é responsável pelo código.
2. As regras de negócio (por exemplo `Pedido.aprovar()` só com esforço e impacto, um voto
   por utilizador e pedido) têm sempre um teste pytest escrito ou revisto por uma pessoa.
3. O código gerado segue os nomes do diagrama de classes (EDS-13) e do modelo ER (EDS-14).
4. Nunca se colam segredos (chaves, palavras-passe reais) nem dados pessoais nos prompts.
5. Os PR com código gerado por IA indicam-no na descrição; o revisor não pode ser quem
   gerou o código.
6. Guardam-se **2 exemplos** de código gerado, com o prompt e as correções feitas na
   revisão, para a apresentação (pasta `docs/ia/`).

**Alternativas consideradas.** *GitHub Copilot*: bom autocompletar no editor, mas menos
útil para alterações que tocam vários ficheiros (modelo + serializer + teste + ecrã).
*ChatGPT / Gemini no browser*: obriga a copiar e colar código, perdendo o contexto do
repositório. *Não usar IA*: mais lento para uma equipa de 5 pessoas num sprint de 5 dias.

**Consequências positivas.** Esqueleto do back-end e do front-end disponível no primeiro
dia; mais tempo para testes e revisão; o mesmo estilo de código em todos os módulos.

**Consequências negativas e riscos.** Risco de aceitar código que não se percebe — mitigado
pela revisão linha a linha e pelo PR com revisor; dependência de um serviço externo e do seu
custo; a IA pode inventar nomes que não existem nos diagramas — verificado pela DoD.
