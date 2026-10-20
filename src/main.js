import { Game } from './game/Game.js';

try {
  new Game(document.getElementById('game-canvas'));
} catch (error) {
  console.error('Falha ao iniciar o jogo:', error);
  const banner = document.getElementById('fatal-error');
  banner.hidden = false;
  banner.textContent = `Erro ao carregar os módulos do jogo: ${error?.message || String(error)}. Verifique o console (F12) para detalhes.`;
}
