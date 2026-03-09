

# Plano: Exportar resultado do Resumidor como PDF ou TXT

## Abordagem

Adicionar dois botões de exportação ao lado do botão de copiar no card de Resultado. Usar APIs nativas do browser — sem dependências extras.

## Mudanças em `src/components/modules/text-summarizer.tsx`

### 1. Adicionar ícone `Download` ao import do lucide-react

### 2. Criar duas funções de exportação

- **`handleExportTxt`**: Cria um `Blob` com `text/plain`, gera URL com `URL.createObjectURL`, dispara download via `<a>` temporário. Nome do arquivo: `resumo-pandabold.txt`.

- **`handleExportPdf`**: Usa a API `window.print()` com um truque: cria um iframe oculto, injeta o texto formatado em HTML básico (com estilos inline para headings/bullets), chama `print()` no iframe (que permite salvar como PDF no diálogo do browser). Alternativa mais simples: usar `Blob` com HTML e abrir em nova aba para o usuário salvar como PDF via Ctrl+P.

### 3. Adicionar botões na UI

No header do card de Resultado, ao lado do botão de copiar, adicionar um `DropdownMenu` com ícone `Download` contendo duas opções:
- "Exportar como TXT"
- "Exportar como PDF"

Isso mantém a interface limpa com um único botão de download.

### 4. Imports adicionais

Adicionar imports de `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` dos componentes UI existentes.

