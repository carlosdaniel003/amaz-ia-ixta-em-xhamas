# A Amazõia ixta em xhamas

Jogo 3D gratuito para navegador: um bombeiro indígena protege a floresta amazônica, apaga incêndios com uma mangueira e ganha moedas por cada foco eliminado.

## Jogar localmente

Este projeto é **estático, sem build e sem dependências para instalar**. Requer um navegador moderno com WebGL e uma conexão com a internet para carregar a versão fixada do Three.js (`0.180.0`) pelo CDN.

1. Clone o repositório.
2. Na raiz, execute `python -m http.server 8000` (ou use qualquer servidor estático, como Live Server).
3. Abra `http://localhost:8000`.

Não abra `index.html` diretamente com `file://`, pois navegadores restringem módulos ES nesse contexto.

## Controles

| Plataforma | Ação | Controle |
| --- | --- | --- |
| Computador | Mover | W / A / S / D ou setas |
| Computador | Mirar | Ponteiro do mouse |
| Computador | Jogar água | Segurar botão esquerdo do mouse, Espaço ou F |
| Computador | Pausar/retomar | Esc ou P |
| Celular/tablet | Mover | Controle virtual à esquerda |
| Celular/tablet | Mirar | Automático, no foco mais próximo |
| Celular/tablet | Jogar água | Segurar ÁGUA à direita |

**Objetivo:** apagar todos os 12 focos de incêndio. Cada foco apagado rende 25 moedas (300 no total). Mantenha a água direcionada para um foco até extingui-lo.

## Estrutura

- `index.html`: estrutura semântica, telas e import map do Three.js.
- `src/styles.css`: identidade visual, HUD, tela inicial e controles responsivos.
- `src/main.js`: inicialização e tratamento de falhas.
- `src/game/Game.js`: loop, câmera, estado e regras do jogo.
- `src/game/World.js`: floresta procedural, colisões e cenário.
- `src/game/Player.js`: personagem tridimensional e animação de locomoção.
- `src/game/FireSystem.js`: focos de incêndio e animação de chamas.
- `src/game/FireLogic.js`: regras puras de dano e seleção de alvos, testadas sem renderizador.
- `src/game/WaterSystem.js`: partículas recicladas do jato de água.
- `src/game/Input.js`: entrada para teclado, mouse e controles de toque.
- `src/ui/UI.js`: telas, moedas, progresso e mensagens.

## Testes

Com Node.js 22+ instalado, execute `npm test` (não requer `npm install`). Os testes cobrem a mira, alcance, duração do jato, extinção única e seleção de alvos.

## Decisões de desempenho

- Árvores, folhagens, arbustos, pedras e chamas usam `THREE.InstancedMesh` para reduzir draw calls.
- Partículas da mangueira e fumaça reutilizam buffers em vez de criar objetos a cada frame.
- Renderização sem sombras em tempo real, com sombras estilizadas estáticas no solo.
- Pixel ratio limitado para evitar renderização excessiva em dispositivos de alta densidade.
- Passo de simulação limitado para evitar picos após abas suspensas.
- O cenário e o personagem são feitos com geometria procedural: não há downloads de modelos 3D pesados.

## Publicar com GitHub Pages

Em **Settings → Pages → Build and deployment**, selecione **Deploy from a branch**, escolha a branch `main` e a pasta `/ (root)`. A publicação resultante é um site estático (não requer build).

## Escopo da primeira versão

Contém tela inicial, floresta 3D, personagem bombeiro, movimento, mira, mangueira, focos de incêndio, moedas, progresso, pausa, vitória e reinício. A estética é low-poly; sistemas como níveis, persistência de progresso, ranking e loja de itens ficam fora desta primeira versão.

## Licença

Código próprio do projeto. A biblioteca Three.js é utilizada por CDN sob a licença MIT. Nenhum conteúdo 3D de terceiros é incorporado ao repositório.