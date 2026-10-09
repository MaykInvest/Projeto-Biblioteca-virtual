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



//   galeria inicio da pagina 

const ROW = 13, COL = 9;   // tamanho da grade de pedacinhos
document.body.style.cssText = `--row: ${ROW}; --col: ${COL}`;

// 14 efeitos. Cada um calcula o atraso (delay) do pedacinho da linha i, coluna j
const x = COL - 1, y = ROW - 1, m = (x + y) / 2;
const efeitos = [
  (i, j) => i * 2,
  (i, j) => j * 2,
  () => Math.floor(Math.random() * (x + y + 1)),
  (i, j) => x + y - (j + i),
  (i, j) => i + j,
  (i, j) => x - i + j,
  (i, j) => i + (y - j),
  (i, j) => Math.abs(m - (j + i)),
  (i, j) => m - Math.abs(m - (j + i)),
  (i, j) => m - Math.abs(m - (j + i)) * Math.cos(i + j),
  (i, j) => Math.abs(m - (x - j + i)),
  (i, j) => Math.abs(m - Math.abs(m - (x - j + i))),
  (i, j) => Math.abs(x / 2 - j) + Math.abs(y / 2 - i),
  (i, j) => x / 2 - Math.abs(x / 2 - j) + (x / 2 - Math.abs(y / 2 - i)),
];

// Enche a caixa de pedacinhos e começa a animação
function animar(box) {
  const efeito = efeitos[box.dataset.i];
  box.classList.add("hide");
  box.replaceChildren();                      // apaga os pedacinhos da vez anterior
  for (let i = 0; i < ROW; i++) {
    for (let j = 0; j < COL; j++) {
      const par = (i + j) % 2 === 0;          // pedacinhos alternam: giram em X ou em Y
      const f = document.createElement("div");
      f.className = "fragment";
      f.style.cssText = `--x: ${j}; --y: ${i}; --delay: ${efeito(i, j) * 70}ms; --rx: ${par ? -180 : 0}deg; --ry: ${par ? 0 : -180}deg`;
      box.append(f);
    }
  }
}

document.querySelectorAll(".box").forEach((box, k) => {
  box.onclick = () => animar(box);            // clicar na caixa roda a animação
  if (k === 0) animar(box);                   // a primeira roda sozinha ao abrir a página
});











