# Horários IFPI - Campus São Raimundo Nonato

Site para divulgação dos horários (turmas, professores e salas) do IFPI – Campus São Raimundo Nonato.

## Acesso

O site é publicado via GitHub Pages:

- https://sergiocastro9.github.io/ifpisrn-horarios/
- https://profsergiocastro.github.io/ifpisrn-horarios/

## Desenvolvimento

Instalar dependências:

```bash
npm ci
```

Rodar com hot-reload (modo dev — a busca pode não funcionar aqui):

```bash
npm run dev
```

Rodar como produção (build + serve — busca funciona):

```bash
npm start
```

## Atualizar horários (FET CSV → MDX)

```bash
npm run generate:fet:csv -- "C:\Users\sergi\fet-results\csv\IFPISRN20261VersaoFinal\IFPISRN20261VersaoFinal_timetable.csv"
```
