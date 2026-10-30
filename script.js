
/* ============================================================
   MINHA BIBLIOTECA — script.js
   Busca, categorias, cadastro de arquivos, exclusão e favoritos.
   O Supabase é a única fonte de dados dos livros.
   ============================================================ */

// Conexão com o Supabase
const SUPABASE_URL = "https://qhawjvcaeawgbuhyopxp.supabase.co";
const SUPABASE_PUBLIC_KEY = "sb_publishable_rIrWotQfvIKzyQ-YMTsrgA_BH9mGZgp";
const TABELA_LIVROS = "Biblioteca Virtual";
const BUCKET_LIVROS = "livros"; // Vamos criar este bucket na etapa do banco.

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);


/* ============================================================
   1. DADOS
   ============================================================ */

let livros = [];
let categoriaAtiva = "Todas";
let livroSelecionado = null;
let sugestoesVisiveis = false;


/* ============================================================
   2. ELEMENTOS DO HTML
   ============================================================ */

// Estante e controles
const bookshelf = document.querySelector("#bookshelf");
const categoryGrid = document.querySelector("#category-grid");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const collectionTitle = document.querySelector("#collection-title");
const resultsCount = document.querySelector("#results-count");
const emptyState = document.querySelector("#empty-state");
const addStatus = document.querySelector("#add-status");

// Janela de detalhes
const dialog = document.querySelector("#book-dialog");
const dialogCover = document.querySelector("#dialog-cover");
const dialogTitle = document.querySelector("#dialog-title");
const dialogAuthor = document.querySelector("#dialog-author");
const dialogCategory = document.querySelector("#dialog-category");
const dialogSynopsis = document.querySelector("#dialog-synopsis");
const dialogHelp = document.querySelector("#dialog-help");
const readLink = document.querySelector("#read-link");
const favoriteButton = document.querySelector("#favorite-button");
const deleteButton = document.querySelector("#delete-button");

// Formulário de cadastro
const addButton = document.querySelector("#add-book-button");
const addDialog = document.querySelector("#add-dialog");
const addForm = document.querySelector("#add-form");
const addMessage = document.querySelector("#add-message");
const cancelAdd = document.querySelector("#cancel-add");


/* ============================================================
   3. FUNÇÕES AUXILIARES
   ============================================================ */

// Deixa a busca sem acentos e em letras minúsculas.
// Exemplo: "Hábitos" vira "habitos".
function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

// Cria um elemento HTML usando texto seguro.
function criarTexto(tag, classe, texto) {
  const elemento = document.createElement(tag);

  elemento.className = classe;
  elemento.textContent = texto ?? "";

  return elemento;
}

// Compara textos em português, ignorando diferenças de acentos
// para que a ordenação seja mais natural.
function compararTextos(a, b) {
  return String(a ?? "").localeCompare(
    String(b ?? ""),
    "pt-BR",
    { sensitivity: "base" }
  );
}

// Retorna um texto com os campos que podem ser pesquisados.
function textoPesquisavel(livro) {
  return [
    livro.titulo,
    livro.autor,
    livro.categoria,
    livro.sinopse
  ].join(" ");
}


/* ============================================================
   4. CARREGAR OS LIVROS DO SUPABASE
   ============================================================ */

async function carregarLivros() {
  const { data, error } = await supabaseClient
    .from(TABELA_LIVROS)
    .select("*")
    .order("titulo", { ascending: true });

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    throw new Error("A lista de livros recebida é inválida.");
  }

  livros = data.map((livro, indice) => ({
    ...livro,
    id: livro.id,
    titulo: livro.titulo ?? "",
    autor: livro.autor ?? "",
    categoria: livro.categoria ?? "",
    sinopse: livro.sinopse ?? "",
    pdf: livro.pdf ?? "",
    capa: livro.capa ?? "",
    favorito: Boolean(livro.favorito)
  }));

  renderizarAcervo();
}


// Envia um arquivo para o Storage e retorna a URL pública dele.
// O bucket precisa estar configurado como público e aceitar uploads.
async function enviarArquivo(arquivo, pasta) {
  if (!arquivo) return "";

  const nomeSeguro = arquivo.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  const caminho = `${pasta}/${crypto.randomUUID()}-${nomeSeguro}`;

  const { error } = await supabaseClient.storage
    .from(BUCKET_LIVROS)
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      upsert: false
    });

  if (error) throw error;

  const { data } = supabaseClient.storage
    .from(BUCKET_LIVROS)
    .getPublicUrl(caminho);

  return data.publicUrl;
}

// Atualiza apenas os dados necessários diretamente na tabela do Supabase.
async function atualizarLivroNoBanco(id, alteracoes) {
  const { data, error } = await supabaseClient
    .from(TABELA_LIVROS)
    .update(alteracoes)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
 

/* ============================================================
   5. CRIAR OS LIVROS NA ESTANTE
   ============================================================ */

function criarLivro(livro) {
  const capa = document.createElement("span");

  capa.className = "book-cover";

  if (livro.capa) {
    // O livro TEM imagem de capa: mostra a imagem
    const imagem = document.createElement("img");
    imagem.className = "cover-image";
    imagem.src = livro.capa;      // URL da capa salva no Supabase Storage ou link existente.
    imagem.alt = "";
    capa.append(imagem);
  } else {
    // Livro antigo sem capa cadastrada: mostra o título até a imagem ser adicionada.
    capa.innerHTML = `<span class="cover-ornament">✦</span>`;
    capa.append(
      criarTexto("span", "cover-title", livro.titulo),
      criarTexto("span", "cover-author", livro.autor)
    );
  }

  const legenda = document.createElement("span");
  legenda.className = "book-caption";

  legenda.append(
    criarTexto("strong", "", livro.titulo),
    criarTexto("span", "", livro.autor)
  );

  const botao = document.createElement("button");
  botao.className = "book";
  botao.type = "button";
  botao.setAttribute(
    "aria-label",
    `Ver detalhes de ${livro.titulo}`);

  botao.append(capa, legenda);
  botao.addEventListener("click", () => {
    abrirDetalhes(livro);
  });
  return botao;
}


/* ============================================================
   6. FILTRAR, ORDENAR E DESENHAR A ESTANTE
   ============================================================ */

function renderizarAcervo() {
  const busca = normalizarTexto(searchInput.value);

  const campo =
    sortSelect.value === "author" ? "autor" : "titulo";

  // Primeiro filtra pela categoria e pelo texto digitado.
  const resultado = livros.filter(livro => {
    const naCategoria =
      categoriaAtiva === "Todas" ||
      normalizarTexto(livro.categoria) ===
      normalizarTexto(categoriaAtiva);

    const naBusca = normalizarTexto(
      textoPesquisavel(livro)
    ).includes(busca);

    return naCategoria && naBusca;
  });

  // Depois ordena os resultados.
  resultado.sort((a, b) => {
    return compararTextos(a[campo], b[campo]);
  });

  // Limpa a estante antes de desenhá-la novamente.
  bookshelf.replaceChildren();

  resultado.forEach((livro, indice) => {
    bookshelf.append(criarLivro(livro));

    // Acrescenta uma prateleira a cada cinco livros.
    if (
      (indice + 1) % 5 === 0 &&
      indice !== resultado.length - 1
    ) {
      const prateleira = document.createElement("div");

      prateleira.className = "shelf-board";
      bookshelf.append(prateleira);
    }
  });

  // Atualiza as mensagens da página.
  emptyState.hidden = resultado.length > 0;

  resultsCount.textContent =
    `${resultado.length} ${resultado.length === 1
      ? "livro encontrado"
      : "livros encontrados"
    }`;

  collectionTitle.textContent =
    `Estante: ${categoriaAtiva === "Todas"
      ? "Todos os livros"
      : categoriaAtiva
    }`;
}


/* ============================================================
   7. SUGESTÕES DA BUSCA
   ============================================================ */

// Cria a caixa de sugestões sem precisar alterar o HTML.
const searchSuggestions = document.createElement("div");

searchSuggestions.id = "search-suggestions";
searchSuggestions.setAttribute("role", "listbox");
searchSuggestions.setAttribute(
  "aria-label",
  "Sugestões de livros"
);

Object.assign(searchSuggestions.style, {
  position: "fixed",
  display: "none",
  overflowY: "auto",
  maxHeight: "min(60vh, 420px)",
  background: "#1a201e",
  color: "#f8f2e9",
  border: "1px solid #87552f",
  borderRadius: "12px",
  boxShadow: "0 12px 30px #0008",
  zIndex: "9999",
  padding: "6px",
  boxSizing: "border-box"
});

document.body.append(searchSuggestions);


// Ajusta a caixa para ficar logo abaixo do campo de busca.
function posicionarSugestoes() {
  if (!sugestoesVisiveis) return;

  const retangulo = searchInput.getBoundingClientRect();

  searchSuggestions.style.left = `${retangulo.left}px`;
  searchSuggestions.style.top = `${retangulo.bottom + 6}px`;
  searchSuggestions.style.width = `${retangulo.width}px`;
}


// Exibe uma mensagem dentro da lista de sugestões.
function mostrarMensagemSugestoes(mensagem) {
  searchSuggestions.replaceChildren();

  const texto = criarTexto("div", "", mensagem);

  Object.assign(texto.style, {
    padding: "14px",
    color: "#c9c0b4",
    fontSize: "14px"
  });

  searchSuggestions.append(texto);
}


// Monta a lista de sugestões.
function mostrarSugestoes() {
  const termo = normalizarTexto(searchInput.value);

  // A lista de sugestões considera todos os livros,
  // independentemente da categoria selecionada.
  const encontrados = livros
    .filter(livro => {
      return normalizarTexto(
        textoPesquisavel(livro)
      ).includes(termo);
    })
    .sort((a, b) => compararTextos(a.titulo, b.titulo));

  searchSuggestions.replaceChildren();

  if (encontrados.length === 0) {
    mostrarMensagemSugestoes(
      "Nenhum livro correspondente."
    );
  } else {
    encontrados.forEach(livro => {
      const opcao = document.createElement("button");

      opcao.type = "button";
      opcao.setAttribute("role", "option");

      Object.assign(opcao.style, {
        display: "block",
        width: "100%",
        padding: "11px 12px",
        border: "0",
        borderRadius: "7px",
        background: "transparent",
        color: "#f8f2e9",
        textAlign: "left",
        cursor: "pointer"
      });

      const titulo = criarTexto(
        "span",
        "",
        livro.titulo
      );

      titulo.style.display = "block";
      titulo.style.fontWeight = "700";

      const autor = criarTexto(
        "span",
        "",
        `${livro.autor} · ${livro.categoria}`
      );

      Object.assign(autor.style, {
        display: "block",
        marginTop: "4px",
        fontSize: "12px",
        color: "#c9c0b4"
      });

      opcao.append(titulo, autor);

      opcao.addEventListener("mouseenter", () => {
        opcao.style.background = "#303a35";
      });

      opcao.addEventListener("mouseleave", () => {
        opcao.style.background = "transparent";
      });

      opcao.addEventListener("click", () => {
        searchInput.value = livro.titulo;

        // Ao escolher uma sugestão, mostra o livro
        // mesmo que outra categoria estivesse selecionada.
        categoriaAtiva = "Todas";

        categoryGrid
          .querySelectorAll("[data-category]")
          .forEach(botao => {
            botao.classList.toggle(
              "selected",
              botao.dataset.category === "Todas"
            );
          });

        esconderSugestoes();
        renderizarAcervo();

        document.querySelector("#acervo").scrollIntoView({
          behavior: "smooth"
        });
      });

      searchSuggestions.append(opcao);
    });
  }

  sugestoesVisiveis = true;
  searchSuggestions.style.display = "block";

  posicionarSugestoes();
}

// Esconde a caixa de sugestões.
function esconderSugestoes() {
  sugestoesVisiveis = false;
  searchSuggestions.style.display = "none";
}

// Ao digitar, atualiza os resultados e as sugestões.
searchInput.addEventListener("input", () => {
  renderizarAcervo();
  mostrarSugestoes();
});


// Ao clicar no campo, mostra todos os livros em ordem alfabética
// quando a pesquisa estiver vazia.
searchInput.addEventListener("focus", mostrarSugestoes);


// Enter não recarrega a página.
searchForm.addEventListener("submit", evento => {
  evento.preventDefault();

  esconderSugestoes();
  renderizarAcervo();

  document.querySelector("#acervo").scrollIntoView({
    behavior: "smooth"
  });
});


// Fecha a lista ao clicar fora dela.
document.addEventListener("click", evento => {
  if (
    !searchInput.contains(evento.target) &&
    !searchSuggestions.contains(evento.target)
  ) {
    esconderSugestoes();
  }
});


// Fecha as sugestões com Escape.
searchInput.addEventListener("keydown", evento => {
  if (evento.key === "Escape") {
    esconderSugestoes();
  }
});


// Mantém a caixa alinhada durante a rolagem ou redimensionamento.
window.addEventListener("resize", posicionarSugestoes);
window.addEventListener("scroll", posicionarSugestoes, true);


// Muda a ordenação da estante.
sortSelect.addEventListener("change", renderizarAcervo);


/* ============================================================
   8. CATEGORIAS
   ============================================================ */

categoryGrid.addEventListener("click", evento => {
  const botao = evento.target.closest("[data-category]");

  if (!botao) return;

  categoriaAtiva = botao.dataset.category;

  categoryGrid
    .querySelectorAll("[data-category]")
    .forEach(item => {
      item.classList.toggle("selected", item === botao);
    });

  renderizarAcervo();

  document.querySelector("#acervo").scrollIntoView({
    behavior: "smooth"
  });
});


/* ============================================================
   9. JANELA DE DETALHES
   ============================================================ */

function abrirDetalhes(livro) {
  livroSelecionado = livro;

  dialogTitle.textContent = livro.titulo;
  dialogAuthor.textContent = livro.autor;
  dialogCategory.textContent = livro.categoria;
  dialogSynopsis.textContent =
    livro.sinopse || "Nenhuma sinopse cadastrada.";

  dialogCover.alt = `Capa de ${livro.titulo}`;
  if (livro.capa) {
    dialogCover.src = livro.capa;
    dialogCover.hidden = false;
  } else {
    dialogCover.removeAttribute("src");
    dialogCover.hidden = true;
  }

  // Só mostra o botão de leitura se existir um PDF cadastrado.
  const temPdf = Boolean(livro.pdf);

  readLink.href = temPdf ? livro.pdf : "#";
  readLink.style.display = temPdf ? "" : "none";

  dialogHelp.textContent = temPdf
    ? "O PDF será aberto em uma nova aba."
    : "Este livro não tem PDF cadastrado.";

  atualizarBotaoFavorito();

  dialog.showModal();
}


function atualizarBotaoFavorito() {
  if (!livroSelecionado) return;

  favoriteButton.textContent = livroSelecionado.favorito
    ? "♥ Remover dos favoritos"
    : "♡ Adicionar aos favoritos";
}


/* ============================================================
   10. ADICIONAR LIVRO
   ============================================================ */

addButton.addEventListener("click", () => {
  addForm.reset();
  addMessage.textContent = "";
  addDialog.showModal();
});

cancelAdd.addEventListener("click", () => {
  addDialog.close();
});

addForm.addEventListener("submit", async evento => {
  evento.preventDefault();

  const campos = addForm.elements;
  const titulo = campos.titulo.value.trim();
  const autor = campos.autor.value.trim();
  const categoria = campos.categoria.value;
  const sinopse = campos.sinopse.value.trim();
  const arquivoPdf = campos.pdf.files[0];
  const arquivoCapa = campos.capa.files[0];

  if (!titulo || !autor || !categoria || !sinopse || !arquivoPdf || !arquivoCapa) {
    addMessage.textContent = "Preencha todos os campos e selecione o PDF e a imagem da capa.";
    return;
  }

  if (arquivoPdf.type !== "application/pdf" && !arquivoPdf.name.toLowerCase().endsWith(".pdf")) {
    addMessage.textContent = "Selecione um arquivo PDF válido.";
    return;
  }

  if (!arquivoCapa.type.startsWith("image/")) {
    addMessage.textContent = "Selecione um arquivo de imagem para a capa.";
    return;
  }

  const jaExiste = livros.some(livro =>
    normalizarTexto(livro.titulo) === normalizarTexto(titulo) &&
    normalizarTexto(livro.autor) === normalizarTexto(autor)
  );

  if (jaExiste) {
    addMessage.textContent = "Esse livro já está na estante.";
    return;
  }

  const botaoEnviar = addForm.querySelector('button[type="submit"]');
  botaoEnviar.disabled = true;
  botaoEnviar.textContent = "Enviando arquivos...";
  addMessage.textContent = "Enviando PDF e capa. Aguarde...";

  try {
    // Primeiro envia os dois arquivos para o Storage.
    const pdfUrl = await enviarArquivo(arquivoPdf, "pdfs");
    const capaUrl = await enviarArquivo(arquivoCapa, "capas");

    // Não enviamos o id: o Supabase deve gerá-lo automaticamente.
    const { data, error } = await supabaseClient
      .from(TABELA_LIVROS)
      .insert({
        titulo,
        autor,
        categoria,
        sinopse,
        pdf: pdfUrl,
        capa: capaUrl,
        favorito: false
      })
      .select()
      .single();

    if (error) throw error;

    livros.push({
      ...data,
      titulo: data.titulo ?? titulo,
      autor: data.autor ?? autor,
      categoria: data.categoria ?? categoria,
      sinopse: data.sinopse ?? sinopse,
      pdf: data.pdf ?? pdfUrl,
      capa: data.capa ?? capaUrl,
      favorito: Boolean(data.favorito)
    });

    addDialog.close();
    renderizarAcervo();
    addStatus.textContent = `"${titulo}" foi adicionado à estante.`;

    if (sugestoesVisiveis) mostrarSugestoes();
  } catch (erro) {
    addMessage.textContent = "Não foi possível cadastrar o livro. Na próxima etapa vamos configurar o Storage e as permissões do Supabase.";
    console.error("Erro ao cadastrar livro:", erro);
  } finally {
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = "Adicionar livro";
  }
});

/* ============================================================
   11. EXCLUIR LIVRO
   ============================================================ */

deleteButton.addEventListener("click", async () => {
  if (!livroSelecionado) return;

  const livroExcluido = livroSelecionado;
  const confirmou = confirm(`Excluir "${livroExcluido.titulo}" da estante?`);
  if (!confirmou) return;

  deleteButton.disabled = true;

  try {
    const { error } = await supabaseClient
      .from(TABELA_LIVROS)
      .delete()
      .eq("id", livroExcluido.id);

    if (error) throw error;

    livros = livros.filter(livro => livro.id !== livroExcluido.id);
    dialog.close();
    livroSelecionado = null;
    renderizarAcervo();
    addStatus.textContent = `"${livroExcluido.titulo}" foi excluído.`;
    if (sugestoesVisiveis) mostrarSugestoes();
  } catch (erro) {
    alert("Não foi possível excluir o livro. Verifique as permissões do Supabase.");
    console.error("Erro ao excluir livro:", erro);
  } finally {
    deleteButton.disabled = false;
  }
});

/* ============================================================
   12. FAVORITAR LIVRO
   ============================================================ */

favoriteButton.addEventListener("click", async () => {
  if (!livroSelecionado) return;

  const favoritoNovo = !livroSelecionado.favorito;
  favoriteButton.disabled = true;

  try {
    const atualizado = await atualizarLivroNoBanco(livroSelecionado.id, {
      favorito: favoritoNovo
    });

    livroSelecionado.favorito = Boolean(atualizado.favorito);
    const indice = livros.findIndex(livro => livro.id === livroSelecionado.id);
    if (indice !== -1) livros[indice].favorito = Boolean(atualizado.favorito);
    atualizarBotaoFavorito();
  } catch (erro) {
    alert("Não foi possível salvar o favorito. Verifique as permissões do Supabase.");
    console.error("Erro ao atualizar favorito:", erro);
  } finally {
    favoriteButton.disabled = false;
  }
});

/* ============================================================
   13. INICIALIZAÇÃO
   ============================================================ */

carregarLivros().catch(erro => {
  resultsCount.textContent =
    "Não foi possível carregar os livros do Supabase. Verifique a conexão e as permissões.";

  emptyState.hidden = false;

  console.error(
    "Erro ao carregar os livros do Supabase:",
    erro
  );
});

// ============================================================
// BOTÃO DE MODO CLARO E MODO ESCURO
// ============================================================

const botaoTema = document.getElementById("botaoTema");
const iconeTema = document.getElementById("iconeTema");
const textoTema = document.getElementById("textoTema");

const html = document.documentElement;

if (botaoTema && iconeTema && textoTema) {

    botaoTema.addEventListener("click", () => {

        const modoEscuro = html.getAttribute("data-tema") === "escuro";

        if (modoEscuro) {

            html.setAttribute("data-tema", "claro");

            iconeTema.textContent = "☾";
            textoTema.textContent = "Modo Escuro";

            botaoTema.setAttribute("aria-label", "Ativar modo escuro");

        } else {

            html.setAttribute("data-tema", "escuro");

            iconeTema.textContent = "☀";
            textoTema.textContent = "Modo Claro";

            botaoTema.setAttribute("aria-label", "Ativar modo claro");
        }
    });
}
