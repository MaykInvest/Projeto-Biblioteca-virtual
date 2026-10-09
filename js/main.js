// botão de modo escuro e claro 
// Pegamos os elementos da página pelos IDs
const botaoTema = document.getElementById('botaoTema');
const iconeTema = document.getElementById('iconeTema');
const textoTema = document.getElementById('textoTema');
const html = document.documentElement;

// Evento de clique para alternar o modo noturno
botaoTema.addEventListener('click', () => {
  // Verifica se o tema atual é o escuro
  const ehEscuro = html.getAttribute('data-tema') === 'escuro';

  if (ehEscuro) {
    // Mudar para o tema claro
    html.setAttribute('data-tema', 'claro');
    iconeTema.className = 'bi bi-moon';
    textoTema.textContent = 'Modo Escuro';
  } else {
    // Mudar para o tema escuro
    html.setAttribute('data-tema', 'escuro');
    iconeTema.className = 'bi bi-sun';
    textoTema.textContent = 'Modo Claro';
  }
});

//  buscas por livros
















