// Seed bookmark data + tag taxonomy + helpers
// Stored under window so Babel scripts can share it.

const SEED_BOOKMARKS = [
  {
    id: 'b01',
    title: 'The Anatomy of a Great Hover State',
    site: 'rauno.me',
    url: 'https://rauno.me/craft/hover',
    desc: 'A deep dive into micro-interactions, latency, and why hover is the most under-designed surface on the web.',
    tags: ['interaction', 'craft', 'micro-interactions'],
    collection: 'Craft & Detail',
    aspect: 1.55, // w/h
    color: '#0F1620', accent: '#7AA2FF',
    type: 'article',
    saved: '2 days ago', readTime: '8 min',
    domain: 'rauno.me',
    favIcon: 'R',
    image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80',
  },
  {
    id: 'b02',
    title: 'On Editorial Layout Systems',
    site: 'are.na',
    url: 'https://are.na/blocks/typography-systems',
    desc: 'A loose collection of grid experiments from independent magazines, pulled apart and annotated.',
    tags: ['typography', 'layout', 'editorial'],
    collection: 'Typography',
    aspect: 0.78,
    color: '#1A1612', accent: '#E8C792',
    type: 'collection',
    saved: '5 days ago', readTime: '—',
    domain: 'are.na',
    favIcon: 'A',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=1200&q=80',
  },
  {
    id: 'b03',
    title: 'Spring Physics for UI Engineers',
    site: 'evil-martians.com',
    url: 'https://evilmartians.com/chronicles/spring-physics',
    desc: 'Damping, stiffness, mass — and why every transition you\'ve been writing is wrong.',
    tags: ['motion', 'engineering', 'physics'],
    collection: 'Motion',
    aspect: 1.2,
    color: '#0E1814', accent: '#79E6B6',
    type: 'article',
    saved: '1 week ago', readTime: '14 min',
    domain: 'evilmartians.com',
    favIcon: 'EM',
    image: 'https://images.unsplash.com/photo-1551281044-8b89bf80c8e8?w=1200&q=80',
  },
  {
    id: 'b04',
    title: 'Linear\'s Approach to Motion Design',
    site: 'linear.app',
    url: 'https://linear.app/blog/motion',
    desc: 'How a single team built an internal motion library that ships across web, macOS, and mobile in lockstep.',
    tags: ['motion', 'systems', 'product'],
    collection: 'Motion',
    aspect: 1.6,
    color: '#16161D', accent: '#9D8DF0',
    type: 'article',
    saved: '1 week ago', readTime: '6 min',
    domain: 'linear.app',
    favIcon: 'L',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&q=80',
  },
  {
    id: 'b05',
    title: 'A Field Guide to Display Type',
    site: 'klim.co.nz',
    url: 'https://klim.co.nz/blog/display-type-field-guide',
    desc: 'Klim\'s notes on choosing a display face — proportion, weight contrast, and the difference between voice and noise.',
    tags: ['typography', 'fonts', 'craft'],
    collection: 'Typography',
    aspect: 1.05,
    color: '#1B1410', accent: '#F0A672',
    type: 'article',
    saved: '2 weeks ago', readTime: '11 min',
    domain: 'klim.co.nz',
    favIcon: 'K',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80',
  },
  {
    id: 'b06',
    title: 'Hand-tuned 3D for the Web',
    site: 'basement.studio',
    url: 'https://basement.studio/work/hand-tuned-3d',
    desc: 'Case study on shipping a hand-modeled hero scene that runs at 120fps on a five-year-old laptop.',
    tags: ['3d', 'performance', 'craft'],
    collection: 'Inspiration',
    aspect: 0.72,
    color: '#0B0E14', accent: '#5BC0EB',
    type: 'video',
    saved: '2 weeks ago', readTime: '4 min',
    domain: 'basement.studio',
    favIcon: 'B',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1200&q=80',
  },
  {
    id: 'b07',
    title: 'The Quiet Revolution in Mac Apps',
    site: 'increment.com',
    url: 'https://increment.com/apps/quiet-revolution-mac',
    desc: 'On Raycast, Arc, Things — and why a generation of indie devs are returning to native craft.',
    tags: ['product', 'native', 'industry'],
    collection: 'Reading List',
    aspect: 1.4,
    color: '#13110F', accent: '#D9A86C',
    type: 'article',
    saved: '3 weeks ago', readTime: '17 min',
    domain: 'increment.com',
    favIcon: 'I',
    image: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?w=1200&q=80',
  },
  {
    id: 'b08',
    title: 'Ableton — Learning Music',
    site: 'learningmusic.ableton.com',
    url: 'https://learningmusic.ableton.com',
    desc: 'A canonical interactive explainer. The kind of tool people send to friends a decade after launch.',
    tags: ['interaction', 'inspiration', 'education'],
    collection: 'Inspiration',
    aspect: 0.9,
    color: '#1F1A0E', accent: '#F8D86F',
    type: 'tool',
    saved: '3 weeks ago', readTime: '—',
    domain: 'ableton.com',
    favIcon: 'Ab',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&q=80',
  },
  {
    id: 'b09',
    title: 'Notes on a Design System That Lasted',
    site: 'figma.com',
    url: 'https://figma.com/blog/design-system-longevity',
    desc: 'What happens to tokens, components, and naming after four years and three rebrands.',
    tags: ['systems', 'tokens', 'product'],
    collection: 'Systems',
    aspect: 1.25,
    color: '#0F0E14', accent: '#B89DF5',
    type: 'article',
    saved: '1 month ago', readTime: '9 min',
    domain: 'figma.com',
    favIcon: 'F',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
  },
  {
    id: 'b10',
    title: 'Color in Dark Interfaces',
    site: 'lyft.design',
    url: 'https://lyft.design/color-in-dark',
    desc: 'Perceptual lightness, OKLCH, and why your dark mode looks muddy.',
    tags: ['color', 'dark-mode', 'craft'],
    collection: 'Craft & Detail',
    aspect: 1.0,
    color: '#0C0F14', accent: '#E879A8',
    type: 'article',
    saved: '1 month ago', readTime: '7 min',
    domain: 'lyft.design',
    favIcon: 'Ly',
    image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&q=80',
  },
  {
    id: 'b11',
    title: 'Building the Composer',
    site: 'craft.do',
    url: 'https://craft.do/blog/composer',
    desc: 'A long, honest writeup on shipping a text editor that doesn\'t fight its users.',
    tags: ['product', 'editor', 'craft'],
    collection: 'Reading List',
    aspect: 1.5,
    color: '#16110D', accent: '#E89A6F',
    type: 'article',
    saved: '1 month ago', readTime: '22 min',
    domain: 'craft.do',
    favIcon: 'C',
    image: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200&q=80',
  },
  {
    id: 'b12',
    title: 'Spline — Interactive 3D in the Browser',
    site: 'spline.design',
    url: 'https://spline.design/examples',
    desc: 'A gallery of interactive 3D scenes. Useful as a mood board for product hero pages.',
    tags: ['3d', 'inspiration', 'tools'],
    collection: 'Inspiration',
    aspect: 0.85,
    color: '#0E1018', accent: '#A78BFA',
    type: 'tool',
    saved: '2 months ago', readTime: '—',
    domain: 'spline.design',
    favIcon: 'S',
    image: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?w=1200&q=80',
  },
  {
    id: 'b13',
    title: 'A Theory of Empty States',
    site: 'maggieappleton.com',
    url: 'https://maggieappleton.com/empty-states',
    desc: 'On absence as a design surface — what your product says when there\'s nothing to say.',
    tags: ['ux', 'writing', 'craft'],
    collection: 'Craft & Detail',
    aspect: 1.15,
    color: '#14110C', accent: '#F0C875',
    type: 'article',
    saved: '2 months ago', readTime: '5 min',
    domain: 'maggieappleton.com',
    favIcon: 'M',
    image: 'https://images.unsplash.com/photo-1494059980473-813e73ee784b?w=1200&q=80',
  },
  {
    id: 'b14',
    title: 'The Grammar of Interaction',
    site: 'rauno.me',
    url: 'https://rauno.me/craft/grammar',
    desc: 'A short list of patterns that make a product feel alive: anticipation, response, and consequence.',
    tags: ['interaction', 'craft', 'patterns'],
    collection: 'Craft & Detail',
    aspect: 0.95,
    color: '#0F1620', accent: '#7AA2FF',
    type: 'article',
    saved: '2 months ago', readTime: '6 min',
    domain: 'rauno.me',
    favIcon: 'R',
    image: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?w=1200&q=80',
  },
  {
    id: 'b15',
    title: 'Mercury OS — A Concept',
    site: 'jasonyuan.design',
    url: 'https://jasonyuan.design/mercury-os',
    desc: 'A speculative OS concept that still gets cited four years later. A masterclass in narrative + craft.',
    tags: ['concept', 'os', 'inspiration'],
    collection: 'Inspiration',
    aspect: 1.7,
    color: '#0B0F18', accent: '#9FB8FF',
    type: 'article',
    saved: '3 months ago', readTime: '12 min',
    domain: 'jasonyuan.design',
    favIcon: 'JY',
    image: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=1200&q=80',
  },
  {
    id: 'b16',
    title: 'OKLCH in CSS, Practical Notes',
    site: 'evilmartians.com',
    url: 'https://evilmartians.com/oklch',
    desc: 'A working designer\'s field notes on the new color space — what to actually do on Monday.',
    tags: ['color', 'css', 'craft'],
    collection: 'Systems',
    aspect: 0.82,
    color: '#0E1610', accent: '#8FE0A8',
    type: 'article',
    saved: '3 months ago', readTime: '10 min',
    domain: 'evilmartians.com',
    favIcon: 'EM',
    image: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=1200&q=80',
  },
];

const COLLECTIONS = [
  { id: 'all', name: 'Everything', icon: '◐', count: SEED_BOOKMARKS.length },
  { id: 'unread', name: 'Unread', icon: '◌', count: 7 },
  { id: 'today', name: 'Saved today', icon: '◉', count: 0 },
];

const SMART_COLLECTIONS = [
  { id: 'craft', name: 'Craft & Detail', count: SEED_BOOKMARKS.filter(b => b.collection === 'Craft & Detail').length },
  { id: 'typography', name: 'Typography', count: SEED_BOOKMARKS.filter(b => b.collection === 'Typography').length },
  { id: 'motion', name: 'Motion', count: SEED_BOOKMARKS.filter(b => b.collection === 'Motion').length },
  { id: 'inspiration', name: 'Inspiration', count: SEED_BOOKMARKS.filter(b => b.collection === 'Inspiration').length },
  { id: 'systems', name: 'Systems', count: SEED_BOOKMARKS.filter(b => b.collection === 'Systems').length },
  { id: 'reading', name: 'Reading List', count: SEED_BOOKMARKS.filter(b => b.collection === 'Reading List').length },
];

const TAG_INDEX = (() => {
  const m = new Map();
  SEED_BOOKMARKS.forEach(b => b.tags.forEach(t => m.set(t, (m.get(t) || 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
})();

// Crude NL search simulation: maps natural-language tokens to tag/text matches
// and returns ranked results with a confidence-style score.
function nlSearch(query, items) {
  if (!query || !query.trim()) return null;
  const q = query.toLowerCase();
  const tokens = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const stop = new Set(['that','the','a','an','of','for','on','in','about','to','i','my','me','it','was','saved','last','this','some','any','thing','things','stuff']);
  const meaningful = tokens.filter(t => !stop.has(t) && t.length > 2);
  // recency hints
  const recency = /last\s+(week|month)|recent|today|yesterday/.exec(q);
  const scored = items.map(b => {
    let score = 0;
    const hay = (b.title + ' ' + b.desc + ' ' + b.tags.join(' ') + ' ' + b.collection + ' ' + b.site).toLowerCase();
    meaningful.forEach(t => {
      if (b.tags.some(tag => tag.includes(t))) score += 4;
      if (b.title.toLowerCase().includes(t)) score += 3;
      if (hay.includes(t)) score += 1;
    });
    if (recency && /day|week/.test(b.saved)) score += 1.5;
    return { b, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  return {
    interpretation: meaningful.length
      ? `Looking for ${meaningful.map(t => `"${t}"`).join(', ')}${recency ? ' · recent' : ''}`
      : 'Showing everything',
    results: scored.map(x => x.b),
  };
}

// Fake "AI auto-tag" — extracts plausible tags from a URL/title string
function suggestTagsFor(input) {
  const s = input.toLowerCase();
  const dict = [
    ['typography', /type|font|typo|kerning|serif/],
    ['motion', /motion|animation|spring|tween|fps/],
    ['color', /color|palette|oklch|hue/],
    ['interaction', /hover|click|interact|gesture|micro/],
    ['craft', /craft|detail|polish/],
    ['systems', /system|tokens|library|design.system/],
    ['product', /product|app|launch|case.study|writeup/],
    ['3d', /3d|webgl|three|spline|shader/],
    ['inspiration', /inspir|gallery|moodboard|reference/],
    ['ux', /ux|usability|empty.state|onboard/],
    ['engineering', /engineer|code|perf|build|stack/],
  ];
  const out = [];
  dict.forEach(([tag, re]) => { if (re.test(s)) out.push(tag); });
  return out.slice(0, 4);
}

window.SEED_BOOKMARKS = SEED_BOOKMARKS;
window.COLLECTIONS = COLLECTIONS;
window.SMART_COLLECTIONS = SMART_COLLECTIONS;
window.TAG_INDEX = TAG_INDEX;
window.nlSearch = nlSearch;
window.suggestTagsFor = suggestTagsFor;
