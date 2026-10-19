# A Amazõia ixta em xhamas

Jogo 3D gratuito para navegador: bombeiros indígenas combatem queimadas amazônicas, resgatam animais e solicitam apoio aéreo. O jogador começa sozinho, acumula moedas apagando focos e precisa sobreviver ao avanço do fogo e à fumaça.

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
| Computador | Contratar bombeiro | 1 (110 moedas; limite 3) |
| Computador | Solicitar avião da prefeitura | 2 (220 moedas; intervalo de 18 s) |
| Computador | Solicitar avião do estado | 3 (460 moedas; intervalo de 18 s) |
| Celular/tablet | Acesso | Tela informativa: versão em desenvolvimento |

**Objetivo:** apagar todos os focos de incêndio sem morrer. O cenário começa com 12 focos, que se propagam gradualmente até um limite de 42. Cada foco extinto concede 30 moedas mais um bônus por sequência de extinções rápidas. Contato direto com fogo causa dano; respirar fumaça eleva o indicador de intoxicação e pode causar perda de vida. A vida se regenera após alguns segundos fora do perigo, com baixa exposição à fumaça. Focos que cercam o personagem aceleram os danos. Animais podem ser resgatados ao apagar incêndios próximos; alguns já foram encontrados mortos e outros podem morrer por fogo ou fumaça caso a missão demore.

## Estrutura

- `index.html`: estrutura semântica, telas e import map do Three.js.
- `src/styles.css`: identidade visual, HUD, tela inicial e controles responsivos.
- `src/main.js`: inicialização e tratamento de falhas.
- `src/game/Game.js`: loop, câmera, estado e regras do jogo.
- `src/game/World.js`: floresta procedural, colisões e cenário.
- `src/game/Player.js`: personagem tridimensional e animação de locomoção.
- `src/game/FireSystem.js`: focos de incêndio, propagação limitada e animação de chamas.
- `src/game/SurvivalLogic.js`: regras puras de dano, fumaça, cerco, recompensas, economia e propagação.
- `src/game/Helpers.js`: bombeiros aliados que procuram focos e lançam água.
- `src/game/AirSupport.js`: aviões de apoio municipal e estadual com água em área.
- `src/game/Wildlife.js`: animais estilizados, resgates e perdas sem violência gráfica.
- `src/game/FireLogic.js`: regras puras de dano e seleção de alvos, testadas sem renderizador.
- `src/game/WaterSystem.js`: partículas recicladas do jato de água.
- `src/game/Input.js`: entrada para teclado e mouse.
- `src/ui/UI.js`: telas, moedas, progresso e mensagens.

## Testes

Com Node.js 22+ instalado, execute `npm test` (não requer `npm install`). Os testes cobrem mira, alcance, extinção única, seleção de alvos, dano por fogo, intoxicação por fumaça, cura, cerco, preços, limite de aliados e condições da propagação.

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

Contém seleção inicial de dispositivo (computador disponível; celular em desenvolvimento), apresentação, floresta 3D, bombeiro indígena, movimento, mira, mangueira, propagação de incêndios, vida, intoxicação, cura, derrota, moedas, três opções de reforços, animais e resgate, progresso, pausa, vitória e reinício. A estética é low-poly; recursos como níveis, persistência de progresso e ranking ficam para futuras versões.

## Licença

Código próprio do projeto. A biblioteca Three.js é utilizada por CDN sob a licença MIT. Nenhum conteúdo 3D de terceiros é incorporado ao repositório.
