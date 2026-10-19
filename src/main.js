import { Game } from './game/Game.js';

try {
  new Game(document.getElementById('game-canvas'));
} catch (error) {
  console.error('Falha ao iniciar o jogo:', error);
  const banner = document.getElementById('fatal-error');
  banner.hidden = false;
  banner.textContent = 'Não foi possível iniciar o jogo 3D. Verifique sua conexão com a internet e se o navegador oferece suporte a WebGL. Depois, recarregue a página.';
}
