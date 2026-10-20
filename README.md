# A Amazõia ixta em xhamas

Jogo 3D gratuito para navegador: bombeiros indígenas combatem queimadas amazônicas, resgatam animais e solicitam apoio aéreo. O jogador começa sozinho, acumula moedas apagando focos e precisa sobreviver ao avanço do fogo e à fumaça.

## Jogar localmente

Este projeto é **estático, sem build e sem dependências para instalar**. Requer um navegador moderno com WebGL e uma conexão com a internet para carregar a versão fixada do Three.js (`0.162.0`) pelo CDN.

1. Clone o repositório.
2. Na raiz, execute `python -m http.server 8000` (ou use qualquer servidor estático, como Live Server).
3. Abra `http://localhost:8000`.

Não abra `index.html` diretamente com `file://`, pois navegadores restringem módulos ES nesse contexto.

## Controles

| Plataforma | Ação | Controle |
| --- | --- | --- |
| Computador | Mover | W / A / S / D ou setas |
| Computador | Olhar e mirar em primeira pessoa | Mover o mouse (cursor capturado) |
| Computador | Jogar água | Segurar botão esquerdo do mouse, Espaço ou F |
| Computador | Liberar o cursor/pausar | Esc (ou P para pausa) |
| Computador | Voltar a capturar o cursor | Clique na cena ou clique em Continuar |
| Computador | Contratar bombeiro | 1 (110 moedas; limite 3) |
| Computador | Solicitar avião da prefeitura | 2 (220 moedas; intervalo de 18 s) |
| Computador | Solicitar avião do estado | 3 (460 moedas; intervalo de 18 s) |
| Celular/tablet | Movimentar | Arrastar o joystick à esquerda |
| Celular/tablet | Olhar e mirar | Arrastar qualquer região livre da cena |
| Celular/tablet | Apagar incêndio | Manter pressionado o botão **ÁGUA** à direita |
| Celular/tablet | Reforços | Tocar em **◈ REFORÇOS** e comprar no painel |
| Celular/tablet | Pausar e retomar | Botão de pausa no topo e **Continuar** |

**Objetivo:** apagar todos os focos de incêndio sem morrer. O cenário começa com 12 focos, que se propagam gradualmente até um limite de 42. Cada foco extinto concede 30 moedas mais um bônus por sequência de extinções rápidas. Contato direto com fogo causa dano; respirar fumaça eleva o indicador de intoxicação e pode causar perda de vida. A vida se regenera após alguns segundos fora do perigo, com baixa exposição à fumaça. Focos que cercam o personagem aceleram os danos. Animais podem ser resgatados ao apagar incêndios próximos; alguns já foram encontrados mortos e outros podem morrer por fogo ou fumaça caso a missão demore.

## Estrutura

- `index.html`: estrutura semântica, telas e import map do Three.js.
- `src/styles.css`: identidade visual, HUD, tela inicial e controles responsivos.
- `src/main.js`: inicialização e tratamento de falhas.
- `src/game/Game.js`: loop, câmera, estado e regras do jogo.
- `src/game/World.js`: mata amazônica densa, árvores altas, palmeiras, cipós, samambaias, colisões e abertura localizada na linha de visão da câmera.
- `src/game/Atmosphere.js`: partículas de fumaça, névoa exponencial, fuligem e luz quente próxima aos incêndios.
- `src/ui/DamageFeedback.js`: alerta vermelho na tela quando a vida diminui.
- `src/game/Player.js`: personagem tridimensional e animação de locomoção.
- `src/game/FireSystem.js`: focos de incêndio, propagação limitada e animação de chamas.
- `src/game/SurvivalLogic.js`: regras puras de dano, fumaça, cerco, recompensas, economia e propagação.
- `src/game/Helpers.js`: bombeiros aliados que procuram focos e lançam água.
- `src/game/AirSupport.js`: aviões de apoio municipal e estadual com água em área.
- `src/game/Wildlife.js`: animais estilizados, resgates e perdas sem violência gráfica.
- `src/game/FireLogic.js`: regras puras de dano e seleção de alvos, testadas sem renderizador.
- `src/game/WaterSystem.js`: partículas recicladas do jato de água.
- `src/game/Input.js`: entrada unificada para teclado/mouse e múltiplos toques independentes (movimento, mira, água).
- `src/game/TouchLogic.js`: cálculo determinístico do joystick e rotação de câmera com dedo.
- `src/ui/UI.js`: telas, moedas, progresso e mensagens.

## Testes

Com Node.js 22+ instalado, execute `npm test` (não requer `npm install`). Os testes cobrem mira, alcance, extinção única, seleção de alvos, dano por fogo, intoxicação por fumaça, cura, cerco, preços, limite de aliados e condições da propagação.

## Primeira pessoa e recuperação gráfica

A câmera fica à altura dos olhos e acompanha a rotação do mouse via Pointer Lock. A mangueira permanece visível na parte inferior da tela. WASD movimenta o personagem em relação à orientação atual; a mira fica fixa no centro. Esc libera o cursor e pausa, e clicar na cena retoma a captura.

A página de escolha de dispositivo carrega sem criar WebGL ou objetos 3D. Ao iniciar, o programa verifica WebGL2 e monta o cenário progressivamente entre frames, com mensagens na tela. O modo inicial de compatibilidade prioriza uma floresta menos pesada (aproximadamente 105 árvores de grande porte), 18 partículas de fumaça, resolução interna limitada a cerca de 560 mil pixels no computador (300 mil no celular), renderização a 30 FPS (24 FPS no celular) e sem grandes animações CSS. Caso o navegador perca e consiga restaurar o contexto gráfico, o jogo permanece pausado e tenta se recuperar com qualidade reduzida. Se houver um erro de JavaScript ou de WebGL, a tela mostra a etapa e a mensagem técnica, com botão para copiar o diagnóstico. Não atribua uma falha de inicialização à GPU sem consultar o erro real; WebGL2 precisa estar habilitado no navegador.

## Diagnóstico de falha gráfica

Se o jogo ainda apresentar falha após clicar em **Começar missão**, use **Copiar diagnóstico** na tela do próprio jogo e envie o texto para análise. A seção mostra a etapa em que ocorreu o erro, a mensagem retornada pelo navegador, a disponibilidade do WebGL2 e se ocorreu `webglcontextlost`. Se WebGL2 estiver indisponível, verifique a aceleração gráfica nas configurações do navegador e seu relatório em `chrome://gpu` ou `edge://gpu`. O jogo usa Three.js 0.162.0, com suporte a WebGL2 e fallback automático para WebGL1 quando a extensão de instanciamento `ANGLE_instanced_arrays` está disponível. Se ambos os contextos estiverem desabilitados, o navegador precisa disponibilizar pelo menos WebGL1; isso depende das configurações do Edge, das políticas de segurança, do driver e da placa gráfica.

## Decisões de desempenho

- Árvores altas, palmeiras, cipós, samambaias, vegetação rasteira e chamas usam `THREE.InstancedMesh` para reduzir draw calls.
- A câmera em primeira pessoa fica abaixo das copas e dispensa recalcular centenas de instâncias para abrir corredores artificiais.
- Fumaça e brasas usam buffers de partículas reaproveitados, sem pós-processamento pesado.
- Partículas da mangueira e fumaça reutilizam buffers em vez de criar objetos a cada frame.
- Renderização sem sombras em tempo real, com sombras estilizadas estáticas no solo.
- Pixel ratio limitado a 1, orçamento de pixels e sem antialiasing pesado, para reduzir pressão sobre a GPU.
- Passo de simulação limitado para evitar picos após abas suspensas.
- O cenário e o personagem são feitos com geometria procedural: não há downloads de modelos 3D pesados.

## Publicar com GitHub Pages

Em **Settings → Pages → Build and deployment**, selecione **Deploy from a branch**, escolha a branch `main` e a pasta `/ (root)`. A publicação resultante é um site estático (não requer build).

## Escopo da primeira versão

Contém seleção inicial de dispositivo (computador e celular disponíveis), apresentação, floresta 3D, bombeiro indígena, movimento, mira, mangueira, propagação de incêndios, vida, intoxicação, cura, derrota, moedas, três opções de reforços, animais e resgate, progresso, pausa, vitória e reinício. A estética low-poly agora inclui vegetação amazônica fechada, céu escurecido, névoa de fumaça, brilho de fogo e feedback vermelho ao sofrer dano; recursos como níveis, persistência de progresso e ranking ficam para futuras versões.

## Licença

Código próprio do projeto. A biblioteca Three.js é utilizada por CDN sob a licença MIT. Nenhum conteúdo 3D de terceiros é incorporado ao repositório.


## Compatibilidade com WebGL1 e WebGL2

Ao iniciar a missão, o jogo tenta obter WebGL2 primeiro; se falhar, testa WebGL1. A floresta e as chamas são feitas com `InstancedMesh`, que precisa da extensão `ANGLE_instanced_arrays` no WebGL1. A interface de erro agora distingue os casos "WebGL2 indisponível, WebGL1 disponível" e "WebGL1 e WebGL2 indisponíveis".

O Microsoft Edge pode bloquear ambos os modos quando a aceleração gráfica está desabilitada ou quando políticas corporativas restringem WebGL. Consulte `edge://gpu` (linhas WebGL e WebGL2), `edge://settings/system` (usar aceleração gráfica quando disponível) e `edge://policy` (políticas impostas). As configurações gerenciadas pela empresa não devem ser contornadas.

## Jogar no celular

Acesse o endereço publicado pelo GitHub Pages no navegador do Android (Chrome ou Firefox) ou do iPhone (Safari). Escolha **CELULAR**, depois **COMEÇAR MISSÃO**. A tela é responsiva em retrato e paisagem; para uma visão mais ampla da floresta, recomenda-se girar o aparelho para paisagem. Não é necessário instalar aplicativo.

O joystick movimenta o personagem em relação à câmera; arrastar o cenário controla a mira e é independente do joystick e do botão **ÁGUA**, permitindo os três simultaneamente. Os reforços ficam em um painel recolhível, com preços e disponibilidade atualizados pelas mesmas regras do computador. O jogo pausa ao alternar para outro aplicativo e mantém a tela de vida, fumaça, animais e moedas.

**Requisitos:** o navegador do celular precisa permitir WebGL (preferencialmente WebGL2) e ter memória gráfica suficiente. O perfil móvel usa aproximadamente 75 árvores de grande porte, fumaça simplificada, sem sombras dinâmicas, 24 FPS e resolução reduzida. O desempenho real pode variar conforme aparelho e versão do navegador. Se WebGL estiver bloqueado no dispositivo, será exibido um diagnóstico sem travar silenciosamente a página.
