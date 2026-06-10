# CLOCKIFY_ANALYSIS.md

## 1. Localização da Integração Atual

| Arquivo | Trecho | Função |
|---|---|---|
| `script.js` L5–7 | Constantes globais | `CLOCKIFY_API_KEY`, `CLOCKIFY_BASE_URL`, `projetosClockify[]` |
| `script.js` L2161–2206 | `carregarProjetosClockify()` | Busca workspaces + projetos paginados da API |
| `script.js` L2208–2211 | `popularSelectsEmpreendimento()` | Populava datalists HTML5 (removida) |
| `script.js` L2051–2097 | Event listeners | Lógica de match ao digitar (substituída) |
| `index.html` L96–107 | Form CREA | Campos `nomeEmpreendimentoCREA` e `codigoClockfyCREA` |
| `index.html` L257–270 | Form CRBio | Campos `nomeEmpreendimentoCRBio` e `codigoClockfyCRBio` |

---

## 2. Por que o preenchimento não funcionava

### Causa raiz: `<datalist>` nativo do browser

O campo usava `<input list="clockifyProjectsCREA">` com um `<datalist>` preenchido com os nomes dos projetos no formato `#0006-5-2025 (CASA DOS VENTOS)`.

**Problema:** O Chrome/Edge filtra o datalist apenas por **prefixo**. Ao digitar `CASA`, o browser não mostrava `#0006-5-2025 (CASA DOS VENTOS)` porque o valor começa com `#`, não com `CASA`.

### Causas secundárias

1. **Event listener `input` sobrescrevia a digitação**: ao encontrar um match parcial, `nomeField.value` era sobrescrito com `match._nome`, interrompendo a digitação do usuário.
2. **`change` event inconsistente**: diferentes browsers disparam `change` em momentos diferentes ao selecionar do datalist.
3. **Match só retornava 1 resultado**: `Array.find()` retorna apenas o primeiro match, sem mostrar lista de opções ao usuário.

---

## 3. Arquivos Alterados

| Arquivo | Alteração |
|---|---|
| `index.html` | Substituiu `<input list>` + `<datalist>` por `<div class="clockify-input-wrapper">` + `<div class="clockify-suggestions">` |
| `style.css` | Adicionou estilos para `.clockify-input-wrapper`, `.clockify-suggestions`, `.clockify-suggestion-item`, `.suggestion-nome`, `.suggestion-code`, `.clockify-suggestion-msg` |
| `script.js` | Removeu event listeners antigos; adicionou `normalizar()`, `debounce()`, `filtrarProjetosClockify()`, `mostrarSugestoesClockify()`, `esconderSugestoesClockify()`, `configurarClockifyAutocomplete()` |

---

## 4. Dados retornados pela API Clockify

Confirmado via `debugClockify()`:

- **106 projetos** carregados com sucesso
- Campo `code` da API: **vazio em todos os projetos**
- Campo `name` já contém o formato completo: `#0006-5-2025 (CASA DOS VENTOS)`
- O parse interno extrai: `_code = "#0006-5-2025"` e `_nome = "CASA DOS VENTOS"`

```
id: '62b1c2cd2518aa18da456ea1'
name: '#0000-1-1990 (SETEG INTERNO)'
_code: '#0000-1-1990'
_nome: 'SETEG INTERNO'
```
