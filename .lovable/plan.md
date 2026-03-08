

# Correções na Sidebar: botão único, cores do tema, ícones minimizados

## Problema
1. Há **dois botões** para minimizar/maximizar: o `SidebarTrigger` no header (Index.tsx linha 55) e o `Button` toggle no footer da sidebar (app-sidebar.tsx linha 89-96)
2. As cores da sidebar podem não estar 100% alinhadas com o background do sistema
3. Os ícones quando minimizado ficam pequenos e sem destaque visual

## Mudanças

### `src/components/app-sidebar.tsx`
- **Remover** o botão toggle (`Button` com `PanelLeftClose`/`PanelLeft`) do `SidebarFooter` — manter apenas o `ThemeToggle` no footer
- **Remover** imports de `PanelLeftClose`, `PanelLeft`, `Button`, e `toggleSidebar` do useSidebar
- **Ajustar classe da Sidebar** para usar `bg-background` garantindo mesma cor do sistema (ou ajustar variáveis CSS `--sidebar-background` para igualar `--background`)
- **Melhorar ícones no modo colapsado**: aumentar tamanho dos ícones para `h-5 w-5`, adicionar padding e border-radius nos itens ativos quando colapsado para dar mais destaque visual

### `src/index.css`
- Ajustar `--sidebar-background` nos temas claro e escuro para usar o mesmo valor de `--background`, garantindo cor uniforme

### `src/pages/Index.tsx`
- Manter o `SidebarTrigger` no header como **único botão** de toggle — já está correto

