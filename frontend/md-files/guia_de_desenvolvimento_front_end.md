# Guia de Desenvolvimento Front-End para IA - CONTINUUM

> **Instrução Primária para a IA:** Você é um desenvolvedor Front-End Senior especialista em Web Standards. Seu objetivo é construir a interface do sistema **CONTINUUM** seguindo rigorosamente as especificações de negócio, o Design System unificado da marca e todos os Guard-rails técnicos definidos neste documento.

## 1. GUARD-RAILS TÉCNICOS & ARQUITETURA

A IA deve seguir **estritamente** as seguintes restrições de engenharia sob qualquer circunstância:

### 1.1 Tecnologias Permitidas

* **SOMENTE** HTML5 Vanilla, CSS3 Puro e JavaScript Vanilla (ES6+).

* **PROIBIDO** o uso de qualquer framework ou biblioteca JS (React, Vue, Angular, jQuery, Svelte, Tailwind, Bootstrap, Sass, etc.).

### 1.2 Estrutura de Pastas e Módulos por Tela

Para garantir a manutenibilidade do código e evitar arquivos monolíticos, o projeto é estruturado por funcionalidade/tela. Cada nova página desenvolvida deve possuir obrigatoriamente **sua própria pasta dedicada** contendo seus arquivos individuais de HTML, CSS e JS:

```
continuum-app/
├── assets/
│   ├── images/
│   └── icons/
├── css/
│   ├── global.css        # Variáveis CSS, resets, tipografia e componentes base BEM
│   └── responsive.css    # Regras globais de breakpoints e responsividade
├── pages/
│   ├── [pagina-requisitada]/
│   │   ├── index.html
│   │   ├── painel.css
│   │   └── painel.js
│
└── index.html             # Landing Page ou Redirecionamento

```

### 1.3 Mapeamento de Componentes (HTML Semântico Puro)

**ATENÇÃO:** Termos de especificação como "Button" ou "TextInput" são apenas nomenclaturas conceituais do Design System. **Não crie Web Components ou tags customizadas.** Utilize estritamente elementos HTML semânticos nativos estilizados por classes BEM:

| Nome Conceitual | Elemento HTML Real | Classe BEM Base | 
 | ----- | ----- | ----- | 
| `Button` | `<button type="button">` ou `<a class="btn">` | `.btn` | 
| `TextInput` | `<input type="text">` | `.form-input` | 
| `Select` | `<select>` | `.form-select` | 
| `TextArea` | `<textarea>` | `.form-textarea` | 
| `OptionCard` | `<label>` envelopando `<input type="radio">` | `.radio-card` | 
| `Badge / Tag` | `<span class="badge">` | `.badge` | 
| `SidebarNav` | `<aside>` com `<nav>` e `<ul>` | `.sidebar` | 

## 🎨 2. DESIGN SYSTEM UNIFICADO (CONTINUUM CRAFT)

Todos os elementos da interface devem compartilhar este único conjunto de tokens baseados no universo de ateliê, alfaiataria e confecção têxtil.

### 2.1 Paleta de Cores e Tokens CSS (`global.css`)

```css
:root {
  /* Cores Principais do Ateliê */
  --color-primary: #782736;         /* Vinho / Red Inferno (Cor Primária da Marca) */
  --color-primary-hover: #5e1e2a;   /* Variante escura para hover */
  --color-primary-light: #FDF2F4;   /* Tint suave para seleção e itens ativos */

  /* Neutros e Fundo Craft */
  --color-sand-offwhite: #F5F2EB;   /* Bege / Off-White de fundo geral da aplicação */
  --color-white: #FFFFFF;           /* Branco puro para containers, cards e sidebar */
  --color-charcoal-text: #2D3748;   /* Grafite escuro para leitura do corpo de texto */
  --color-muted-text: #718096;      /* Cinza intermediário para legendas e metadados */
  --color-border: #E2E8F0;          /* Borda sutil de divisão */
  --color-border-dark: #2D2D2D;     /* Borda proeminente / traçado de corte */

  /* Estados e Feedbacks */
  --color-error: #D32F2F;
  --color-error-bg: #FDEDED;
  --color-success: #2E7D32;
  --color-warning: #ED6C02;

  /* Geometria e Bordas (Responsivas em vh/vw) */
  --radius-sm: 0.25vw;
  --radius-md: 0.5vw;
  --radius-lg: 0.75vw;
  --border-stitch: 0.1vh dashed var(--color-primary);

  /* Tipografia */
  --font-title: 'Anton', sans-serif;         /* Títulos e Destaques em Caixas Altas */
  --font-body: 'Inter', sans-serif;          /* Interface, botões e corpo do texto */
  --font-detail: 'Space Mono', monospace;    /* Metadados, tags, códigos e sidebar footer */

  /* Escala de Espaçamento Responsiva em vh/vw */
  --space-2xs: 0.25vh;
  --space-xs: 0.5vh;
  --space-sm: 0.75vh;
  --space-md: 1vh;
  --space-lg: 1.5vh;
  --space-xl: 2vh;
  --space-2xl: 3vh;
}
```

### 2.2 Escala Tipográfica

* **Títulos Display e Seções (`Anton`):** Apenas caixa alta (`text-transform: uppercase`), espaçamento estendido de letra (`letter-spacing: 0.05em`).

* **Textos de Interface (`Inter`):** Leitura clara, pesagem regular (400) e semi-bold (600).

* **Detalhes Técnicos (`Space Mono`):** Usado em labels auxiliares, metadados de lote (ex: `4,3 kg • Ateliê Boreal`) e rodapés de sidebar.

```css
h1, .text-display {
  font-family: var(--font-title);
  font-size: 2.25vw;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-charcoal-text);
}

h2, .text-subtitle {
  font-family: var(--font-title);
  font-size: 1.5vw;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-charcoal-text);
}

body, p, .text-body {
  font-family: var(--font-body);
  font-size: 0.95vw;
  line-height: 1.5;
  color: var(--color-charcoal-text);
}

.text-detail, .meta-info {
  font-family: var(--font-detail);
  font-size: 0.8vw;
  color: var(--color-muted-text);
}
```

### 2.3 Convenção de Nomenclatura CSS

Adote estritamente o padrão **BEM (Block Element Modifier)** para evitar colisão de estilos:

* **Bloco (`.card-lote`):** Componente autônomo.

* **Elemento (`.card-lote__title`):** Parte interna do bloco.

* **Modificador (`.card-lote--featured` / `.btn--primary`):** Variante de estado ou aparência.

## 🏛️ 3. ESPECIFICAÇÃO DE COMPONENTES DA INTERFACE

Componentes padronizados com base na estrutura do protótipo e nas especificações de UI.

### 3.1 Sidebar / Navegação Lateral (`.sidebar`)

A barra lateral é fixa à esquerda, possui fundo branco puro (`--color-white`) e divide-se em três partes:

1. **Logo da Marca:** `CONTINUUM` em destaque vermelho (`--color-primary`) com `aDESIGNER` abaixo.

2. **Menu com Marcadores Têxteis:** Lista de navegação com bullet points (`•`). O item ativo recebe fundo arredondado avermelhado suave (`--color-primary-light`) e texto na cor primária.

3. **Rodapé de Usuário:** Informações do usuário logado estilizadas na fonte `Space Mono`.

```html
<aside class="sidebar">
  <div class="sidebar__brand">
    <span class="sidebar__logo">CONTINUUM</span>
    <span class="sidebar__sublogo">aDESIGNER</span>
  </div>

  <nav class="sidebar__nav">
    <ul>
      <li class="sidebar__item"><a href="#" class="sidebar__link">• Painel</a></li>
      <li class="sidebar__item sidebar__item--active"><a href="#" class="sidebar__link">• Lotes disponíveis</a></li>
      <li class="sidebar__item"><a href="#" class="sidebar__link">• Meus lotes</a></li>
      <li class="sidebar__item"><a href="#" class="sidebar__link">• Meus projetos</a></li>
    </ul>
  </nav>

  <div class="sidebar__footer">
    <p class="text-detail">Usuário teste</p>
    <p class="text-detail">@CONTINUUM * São Paulo</p>
  </div>
</aside>
```

```css
.sidebar {
  width: 15vw;
  min-height: 100vh;
  background-color: var(--color-white);
  border-right: 0.1vw solid var(--color-border);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar__logo {
  font-family: var(--font-title);
  font-size: 1.5vw;
  color: var(--color-primary);
  display: block;
}

.sidebar__sublogo {
  font-family: var(--font-detail);
  font-size: 0.75vw;
  color: var(--color-primary);
  display: block;
}

.sidebar__nav ul {
  list-style: none;
  padding: 0;
  margin: var(--space-xl) 0;
}

.sidebar__item {
  margin-bottom: var(--space-xs);
}

.sidebar__link {
  display: block;
  padding: 0.8vh 0.75vw;
  font-family: var(--font-body);
  font-size: 0.9vw;
  font-weight: 500;
  color: var(--color-charcoal-text);
  text-decoration: none;
  border-radius: var(--radius-md);
}

.sidebar__item--active .sidebar__link {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}
```

### 3.2 Formulários e Estados de Validação

Todo campo deve possuir `<label>` associada e estados visuais explícitos de erro.

```html
<div class="form-group form-group--error">
  <label for="campo-busca" class="form-label">Filtrar Lotes</label>
  <input type="text" id="campo-busca" class="form-input" placeholder="Filtrar..." aria-invalid="true" aria-describedby="erro-busca" />
  <span id="erro-busca" class="form-message">Nenhum lote encontrado com este termo.</span>
</div>
```

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  margin-bottom: var(--space-md);
}

.form-label {
  font-family: var(--font-body);
  font-size: 0.85vw;
  font-weight: 600;
  color: var(--color-charcoal-text);
}

.form-input {
  width: 100%;
  padding: 1vh 0.9vw;
  font-family: var(--font-body);
  font-size: 0.95vw;
  background-color: var(--color-white);
  border: 0.1vw solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 0.2vw rgba(120, 39, 54, 0.15);
}

/* Estado de Erro */
.form-group--error .form-input {
  border-color: var(--color-error);
  background-color: var(--color-error-bg);
}

.form-message {
  font-family: var(--font-detail);
  font-size: 0.75vw;
  color: var(--color-error);
}
```

### 3.4 Botões (`.btn`)

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1vh 1.25vw;
  font-family: var(--font-body);
  font-size: 0.9vw;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 0.1vw solid transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-decoration: none;
}

.btn--primary {
  background-color: var(--color-primary);
  color: var(--color-white);
}

.btn--primary:hover {
  background-color: var(--color-primary-hover);
}

.btn--stitched {
  background-color: transparent;
  color: var(--color-charcoal-text);
  border: var(--border-stitch);
}

.btn--full {
  width: 100%;
}
```

## 🧵 4. CATÁLOGO UNIFICADO DE ICONOGRAFIA (SVG INLINE)

Utilize exclusivamente os 5 ícones vetoriais padronizados no estilo *monoline/craft*.

### 4.1 Código dos Ícones Nativos

#### 1. Tesoura de Costura (`scissors`)

```html
<svg class="icon-textile" viewBox="0 0 24 24" width="1.25vw" height="1.25vw" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="6" cy="6" r="3" />
  <circle cx="6" cy="18" r="3" />
  <line x1="8.5" y1="7.5" x2="20" y2="19" />
  <line x1="8.5" y1="16.5" x2="20" y2="5" />
</svg>
```

#### 2. Agulha com Linha (`needle-thread`)

```html
<svg class="icon-textile" viewBox="0 0 24 24" width="1.25vw" height="1.25vw" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M20 4L11 13" />
  <ellipse cx="20.5" cy="3.5" rx="1.5" ry="1.5" transform="rotate(-45 20.5 3.5)" />
  <path d="M11 13C8 16 6 13 4 16C2 19 5 21 8 19" />
</svg>
```

#### 3. Carretel de Linha (`spool`)

```html
<svg class="icon-textile" viewBox="0 0 24 24" width="1.25vw" height="1.25vw" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <rect x="5" y="3" width="14" height="3" rx="1" />
  <rect x="5" y="18" width="14" height="3" rx="1" />
  <line x1="7" y1="6" x2="7" y2="18" />
  <line x1="17" y1="6" x2="17" y2="18" />
  <line x1="7" y1="9" x2="17" y2="9" />
  <line x1="7" y1="12" x2="17" y2="12" />
  <line x1="7" y1="15" x2="17" y2="15" />
</svg>
```

#### 4. Molde de Corte (`pattern`)

```html
<svg class="icon-textile" viewBox="0 0 24 24" width="1.25vw" height="1.25vw" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 4H16C18.2 4 20 5.8 20 8V20H4V4Z" />
  <path d="M4 12H20" stroke-dasharray="3 2" />
  <path d="M12 4V20" stroke-dasharray="3 2" />
</svg>
```

#### 5. Manequim (`mannequin`)

```html
<svg class="icon-textile" viewBox="0 0 24 24" width="1.25vw" height="1.25vw" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="17" x2="12" y2="22" />
  <path d="M9 22H15" />
  <path d="M8 4C8 3 9.5 2 12 2C14.5 2 16 3 16 4C16 7 18 9 17 12C16 14.5 14 17 12 17C10 17 8 14.5 7 12C6 9 8 7 8 4Z" />
</svg>
```

## ♿ 5. ACESSIBILIDADE (A11Y) E GUARD-RAILS DE INTERAÇÃO

1. **Foco Visível Nativo (`:focus-visible`):** Nenhum elemento interativo pode ter `outline: none` sem um substituto visual visível.

2. **Contraste WCAG AA:** Texto do corpo (`--color-charcoal-text`) sobre o fundo off-white (`--color-sand-offwhite`) e texto branco sobre o botão vinho (`--color-primary`) atendem à taxa mínima de contraste de 4.5:1.

3. **Navegação por Teclado:** Todos os botões e links devem ser acessáveis via tecla `Tab` e ativáveis com `Enter` / `Space`.