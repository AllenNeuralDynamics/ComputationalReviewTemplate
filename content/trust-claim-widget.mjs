function badgeClass(score) {
  if (score == null || Number.isNaN(Number(score))) return 'tc-score tc-pending';
  const n = Number(score);
  if (n >= 85) return 'tc-score tc-high';
  if (n >= 70) return 'tc-score tc-moderate';
  if (n >= 50) return 'tc-score tc-low';
  return 'tc-score tc-critical';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeJsonParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function renderCitationContexts(contexts) {
  if (!Array.isArray(contexts) || contexts.length === 0) {
    return '<div class="tc-empty">No citation contexts available yet.</div>';
  }
  return contexts.map((ctx) => {
    const doi = ctx.doi
      ? `<a href="https://doi.org/${escapeHtml(ctx.doi)}" target="_blank" rel="noopener">${escapeHtml(ctx.doi)}</a>`
      : 'No DOI';
    const passage = escapeHtml(ctx.supporting_passage || 'No supporting passage captured.');
    const citeKey = escapeHtml(ctx.cite_key || 'Unknown key');
    const role = escapeHtml(ctx.role || 'unverified');
    const source = escapeHtml(ctx.passage_source || 'unknown');
    return `
      <div class="tc-context-row">
        <div><strong>${citeKey}</strong> (${role})</div>
        <div class="tc-muted">Source: ${source} | Direction match: ${ctx.direction_match === true ? 'yes' : 'no'}</div>
        <div class="tc-passage">${passage}</div>
        <div class="tc-muted">${doi}</div>
      </div>
    `;
  }).join('');
}

function renderReferences(citationContexts, cites) {
  const refs = [];
  if (Array.isArray(citationContexts) && citationContexts.length > 0) {
    for (const ctx of citationContexts) {
      refs.push({ key: ctx.cite_key || null, doi: ctx.doi || null });
    }
  } else if (Array.isArray(cites)) {
    for (const key of cites) refs.push({ key, doi: null });
  }

  if (refs.length === 0) return '<div class="tc-empty">No references listed yet.</div>';

  return refs.map((ref) => {
    const key = escapeHtml(ref.key || 'Unknown');
    const doiLink = ref.doi
      ? ` <a href="https://doi.org/${escapeHtml(ref.doi)}" target="_blank" rel="noopener">doi</a>`
      : '';
    return `<li>${key}${doiLink}</li>`;
  }).join('');
}

function renderRationale(components) {
  if (!components || typeof components !== 'object') {
    return '<div class="tc-empty">Why this score was assigned will appear after validator scoring.</div>';
  }

  const labels = [
    ['traceability', 'T (Traceability)'],
    ['robustness', 'R (Robustness)'],
    ['uncertainty_calibration', 'U (Uncertainty)'],
    ['source_integrity', 'S (Source Integrity)'],
    ['transferability_scope_control', 'T (Transferability)'],
  ];

  const rows = [];
  for (const [key, label] of labels) {
    const item = components[key];
    if (!item || typeof item !== 'object') continue;
    const score = Number.isInteger(item.score) ? item.score : 'n/a';
    const rationale = escapeHtml(item.rationale || 'No rationale provided.');
    rows.push(`
      <div class="tc-rationale-row">
        <div class="tc-rationale-head"><strong>${label}</strong> <span class="tc-mini-score">${score}/4</span></div>
        <div class="tc-muted">${rationale}</div>
      </div>
    `);
  }

  return rows.length > 0
    ? rows.join('')
    : '<div class="tc-empty">Why this score was assigned will appear after validator scoring.</div>';
}

function summaryTitle(score) {
  if (score == null || Number.isNaN(Number(score))) return 'TRUST pending';
  return `TRUST ${Number(score)}`;
}

function trustBandText(score) {
  if (score == null || Number.isNaN(Number(score))) return 'Pending';
  const n = Number(score);
  if (n >= 85) return 'Very high';
  if (n >= 70) return 'High';
  if (n >= 50) return 'Moderate';
  return 'Low';
}

function scoreBandClass(score) {
  if (score == null || Number.isNaN(Number(score))) return 'tc-band-pending';
  const n = Number(score);
  if (n >= 85) return 'tc-band-high';
  if (n >= 50) return 'tc-band-moderate';
  return 'tc-band-low';
}

function claimClassLabel(claimType) {
  const t = String(claimType || '').toLowerCase();
  if (t === 'empirical' || t === 'comparative' || t === 'causal') return 'Cited fact';
  if (t === 'methodological' || t === 'definition') return 'Method note';
  if (t === 'review_synthesis' || t === 'speculation') return 'Inference';
  if (t === 'limitation') return 'Limitation';
  return 'Claim';
}

const WIDGET_STYLES = `
  :host {
    display: block;
    width: 14rem;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }

  .tc-root {
    display: block;
    width: 100%;
    margin: 0;
    padding-left: 0.6rem;
    position: relative;
    z-index: 4;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
  }

  .tc-root::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 999px;
    background: linear-gradient(180deg, #2563eb 0%, #0ea5e9 100%);
  }

  .tc-summary {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: stretch;
    gap: 0.45rem;
    cursor: pointer;
    list-style: none;
    border: 1px solid #cfd8e3;
    border-radius: 0.5rem;
    background: #f5f8fc;
    padding: 0.34rem 0.44rem;
    min-height: 54px;
    max-height: 54px;
  }

  .tc-card-btn {
    all: unset;
    box-sizing: border-box;
    width: 100%;
    text-align: left;
    display: flex;
    align-items: stretch;
    gap: 0.45rem;
    cursor: pointer;
    border: 1px solid #cfd8e3;
    border-radius: 0.5rem;
    background: #f5f8fc;
    padding: 0.34rem 0.44rem;
    min-height: 54px;
    max-height: 54px;
  }

  .tc-card-btn:hover { background: #eef4fb; }
  .tc-summary::-webkit-details-marker { display: none; }

  .tc-rail-line { width: 2px; background: #0284c7; border-radius: 999px; flex: 0 0 auto; }

  .tc-summary-main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }

  .tc-summary-head {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #0f172a;
    line-height: 1.05;
  }

  .tc-summary-sub { font-size: 0.69rem; font-weight: 650; line-height: 1.1; }
  .tc-band-high { color: #005ea8; }
  .tc-band-moderate { color: #8a5a00; }
  .tc-band-low { color: #9f1d1d; }
  .tc-band-pending { color: #475569; }

  .tc-score {
    align-self: center;
    border-radius: 0.32rem;
    padding: 0.18rem 0.42rem;
    font-size: 0.75rem;
    min-width: 2rem;
    text-align: center;
    font-weight: 800;
  }

  .tc-high { background: #0077c8; color: #fff; }
  .tc-moderate { background: #f2a900; color: #1f1500; }
  .tc-low, .tc-critical { background: #d64545; color: #fff; }
  .tc-pending { background: #e5e7eb; color: #374151; }

  .tc-box {
    margin-top: 0.36rem;
    border: 1px solid #d8e3f0;
    border-radius: 0.5rem;
    padding: 0.52rem 0.58rem;
    background: #f7f9fc;
    font-size: 0.78rem;
    color: #111827;
    line-height: 1.42;
  }

  .tc-row { margin-bottom: 0.25rem; }
  .tc-subhead {
    margin: 0.42rem 0 0.3rem;
    font-weight: 700;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .tc-list { margin: 0.1rem 0 0.34rem 1rem; padding: 0; }
  .tc-list li { margin: 0.06rem 0; }
  .tc-context-row, .tc-rationale-row {
    border-top: 1px solid #dbeafe;
    padding-top: 0.3rem;
    margin-top: 0.3rem;
  }
  .tc-rationale-head { display: flex; justify-content: space-between; gap: 0.4rem; }
  .tc-mini-score { color: #334155; font-weight: 700; }
  .tc-passage { color: #1e293b; margin: 0.12rem 0; }
  .tc-muted { color: #607083; font-size: 0.68rem; }
  .tc-empty { color: #64748b; }
  .tc-box a { color: #1d4ed8; text-decoration: underline; }

  .tc-slideout {
    position: absolute;
    top: 0;
    right: calc(100% + 0.7rem);
    width: min(27rem, 50vw);
    background: #fff;
    border: 1px solid #d8e3f0;
    border-radius: 0.55rem;
    box-shadow: 0 16px 28px rgba(2, 12, 24, 0.14);
    padding: 0.4rem;
    opacity: 0;
    transform: translateX(-8px);
    pointer-events: none;
    transition: opacity 160ms ease, transform 160ms ease;
    z-index: 30;
  }

  .tc-slideout-root.is-open .tc-slideout {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }

  .tc-slideout-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.1rem 0.2rem 0.35rem;
    font-size: 0.72rem;
    color: #0f172a;
  }

  .tc-close {
    border: 1px solid #cfd8e3;
    background: #fff;
    color: #334155;
    border-radius: 0.35rem;
    font-size: 0.68rem;
    padding: 0.12rem 0.35rem;
    cursor: pointer;
  }

  .tc-close:hover { background: #f3f6fb; }

  @media (max-width: 1023px) {
    :host {
      width: 100%;
      margin: 0.35rem 0 0.5rem;
    }

    .tc-root {
      width: 100%;
      margin: 0;
    }

    /* On narrow screens the card stacks inline below its paragraph and the
       details expand in-flow on tap (no absolute slideout / margin lane). */
    .tc-slideout {
      position: static;
      width: auto;
      margin-top: 0;
      transform: none;
      box-shadow: none;
      opacity: 0;
      max-height: 0;
      overflow: hidden;
      pointer-events: none;
      transition: none;
    }

    .tc-slideout-root.is-open .tc-slideout {
      opacity: 1;
      max-height: none;
      overflow: visible;
      pointer-events: auto;
      margin-top: 0.4rem;
    }
  }
`;

function render({ model, el }) {
  const claimId = model.get('claimId');
  const claimText = model.get('claimText') || '';
  const cites = safeJsonParse(model.get('cites'), []);
  const claimType = model.get('claimType') || '';
  const modality = model.get('modality') || '';
  const trustScore = model.get('trustScore');
  const trustLabel = model.get('trustLabel') || 'pending_validation';
  const evidenceRelation = model.get('evidenceRelation') || 'unverified';
  const citationContexts = safeJsonParse(model.get('citationContexts'), []);
  const rationale = safeJsonParse(model.get('rationale'), null);
  const humanReviewRequired = model.get('humanReviewRequired') === true;
  const interactionMode = String(model.get('interactionMode') || 'slideout').toLowerCase();

  const scoreText = trustScore == null || Number.isNaN(Number(trustScore)) ? '??' : String(Number(trustScore));
  const trustBand = trustBandText(trustScore);
  const bandClass = scoreBandClass(trustScore);
  const classLabel = claimClassLabel(claimType);

  const detailHtml = `
    <div class="tc-row"><strong>Claim ID:</strong> ${escapeHtml(claimId || 'placeholder')}</div>
    <div class="tc-row"><strong>Claim meaning:</strong> ${escapeHtml(claimType || 'unspecified')} | ${escapeHtml(modality || 'unspecified')}</div>
    <div class="tc-row"><strong>Evidence status:</strong> ${escapeHtml(evidenceRelation)}</div>
    <div class="tc-row"><strong>Claim text:</strong> ${escapeHtml(claimText || 'No claim text provided.')}</div>
    <div class="tc-row"><strong>Human review required:</strong> ${humanReviewRequired ? 'yes' : 'no'}</div>
    <div class="tc-subhead">References</div>
    <ul class="tc-list">${renderReferences(citationContexts, cites)}</ul>
    <div class="tc-subhead">Why this score was assigned</div>
    ${renderRationale(rationale)}
    <div class="tc-subhead">Citation contexts</div>
    ${renderCitationContexts(citationContexts)}
    <div class="tc-row tc-muted"><strong>Validator label:</strong> ${escapeHtml(trustLabel)}</div>
  `;

  const cardHtml = `
    <span class="tc-rail-line" aria-hidden="true"></span>
    <span class="${badgeClass(trustScore)}">${escapeHtml(scoreText)}</span>
    <span class="tc-summary-main">
      <span class="tc-summary-head">${escapeHtml(classLabel)}</span>
      <span class="tc-summary-sub ${bandClass}">${escapeHtml(summaryTitle(trustScore))} - ${escapeHtml(trustBand)}</span>
    </span>
  `;

  const root = el.shadowRoot || el.attachShadow({ mode: 'open' });
  root.innerHTML = '';

  const style = document.createElement('style');
  style.textContent = WIDGET_STYLES;
  root.appendChild(style);

  if (interactionMode === 'details') {
    const details = document.createElement('details');
    details.className = 'tc-root';
    const summary = document.createElement('summary');
    summary.className = 'tc-summary';
    summary.innerHTML = cardHtml;
    const box = document.createElement('div');
    box.className = 'tc-box';
    box.innerHTML = detailHtml;
    details.appendChild(summary);
    details.appendChild(box);
    root.appendChild(details);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'tc-root tc-slideout-root';

  const cardButton = document.createElement('button');
  cardButton.type = 'button';
  cardButton.className = 'tc-summary tc-card-btn';
  cardButton.setAttribute('aria-expanded', 'false');
  cardButton.innerHTML = cardHtml;

  const panel = document.createElement('aside');
  panel.className = 'tc-slideout';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="tc-slideout-header">
      <strong>Trust claim details</strong>
      <button type="button" class="tc-close" aria-label="Close trust details">Close</button>
    </div>
    <div class="tc-box">${detailHtml}</div>
  `;

  const closeBtn = panel.querySelector('.tc-close');

  function closePanel() {
    wrapper.classList.remove('is-open');
    cardButton.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
  }

  cardButton.addEventListener('click', () => {
    const open = wrapper.classList.toggle('is-open');
    cardButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  });

  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  wrapper.appendChild(cardButton);
  wrapper.appendChild(panel);
  root.appendChild(wrapper);
}

export default { render };
