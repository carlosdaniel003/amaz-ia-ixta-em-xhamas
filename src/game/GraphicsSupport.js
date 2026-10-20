/**
 * Context detection is intentionally independent of Three.js so it can be
 * tested with fake canvases, without WebGL or a GPU.
 */
export function findGraphicsContext(canvas, attributes = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error('O elemento canvas de renderização não está disponível.');
  }

  // WebGL 2 is preferable, but some Windows/Edge installations only expose 1.
  // Context requests can throw on restricted browsers, not merely return null.
  const attempts = [];
  let context;
  try {
    context = canvas.getContext('webgl2', attributes);
  } catch (error) {
    attempts.push('WebGL2: ' + String(error?.message || error));
  }
  if (context && !context.isContextLost?.()) {
    return { context, type: 'WebGL2', attempts };
  }
  attempts.push('WebGL2: indisponível');

  for (const name of ['webgl', 'experimental-webgl']) {
    try {
      context = canvas.getContext(name, attributes);
      if (!context || context.isContextLost?.()) continue;
      // Our procedural forest uses InstancedMesh. WebGL1 requires this extension.
      if (!context.getExtension?.('ANGLE_instanced_arrays')) {
        throw new Error('WebGL1 detectado, mas a extensão ANGLE_instanced_arrays não está disponível.');
      }
      return { context, type: 'WebGL1', attempts };
    } catch (error) {
      attempts.push(name + ': ' + String(error?.message || error));
      if (String(error?.message || error).includes('ANGLE_instanced_arrays')) {
        throw new Error('WebGL1 funciona, mas não suporta a renderização instanciada necessária ao jogo.');
      }
    }
  }
  throw new Error('O Edge não disponibilizou WebGL2 nem WebGL1. Verifique edge://gpu e a opção de aceleração gráfica em edge://settings/system.');
}
