// figure-lightbox-plugin.mjs — MyST plugin: transform
// Installs exactly one anywidget per document whose ESM adds click-to-zoom
// behaviour to every <img> inside a <figure>. Opt-out per figure with
// :class: no-zoom on the {figure} directive.

const lightboxTransform = {
  name: 'figure-lightbox-installer',
  stage: 'document',
  plugin: (opts, utils) => (tree, vfile) => {
    let hasFigure = false;
    (function scan(n) {
      if (!n) return;
      if (n.type === 'container' && n.kind === 'figure') hasFigure = true;
      if (n.type === 'image') hasFigure = true;
      if (n.children) n.children.forEach(scan);
    })(tree);
    if (!hasFigure) return;

    tree.children = tree.children || [];
    tree.children.push({
      type: 'anywidget',
      id: `figlightbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      esm: './figure-lightbox-widget.mjs',
      model: {},
    });
  },
};

const plugin = {
  name: 'Figure Lightbox',
  directives: [],
  transforms: [lightboxTransform],
};

export default plugin;
