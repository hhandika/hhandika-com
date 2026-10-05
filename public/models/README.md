# 3D models

Drop `.glb` files here (they are served from `/models/<name>.glb`).

- Specimen viewers: pass the URL to `ModelViewer`, e.g.
  `<ModelViewer modelUrl="/models/rattus-skull.glb" ... />`
  Models are auto-centered and scaled to fit.
- Archipelago terrain: uncomment `terrainUrl` in
  `src/pages/prototypes/archipelago.astro` to replace the procedural islands.

Tip: compress with `npx gltf-transform optimize in.glb out.glb` to keep files small.
