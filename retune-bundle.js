"use client";
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../node_modules/retune/dist/chunk-THD5EQWV.js
function scanDesignTokens() {
  const tokens = [];
  const valueToTokens = /* @__PURE__ */ new Map();
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule) {
            extractTokensFromRule(rule, tokens);
          } else if (rule instanceof CSSMediaRule) {
            for (const nested of rule.cssRules) {
              if (nested instanceof CSSStyleRule) {
                extractTokensFromRule(nested, tokens);
              }
            }
          }
        }
      } catch {
      }
    }
  } catch {
  }
  for (const el of [document.documentElement, document.body]) {
    const computed = getComputedStyle(el);
    for (const token of tokens) {
      const resolved = computed.getPropertyValue(token.name).trim();
      if (resolved && resolved !== token.value) {
        token.value = resolved;
      }
    }
  }
  for (const token of tokens) {
    const normalized = normalizeValue(token.value);
    if (!valueToTokens.has(normalized)) {
      valueToTokens.set(normalized, []);
    }
    valueToTokens.get(normalized).push(token.name);
  }
  return { tokens, valueToTokens };
}
function extractTokensFromRule(rule, tokens) {
  const style = rule.style;
  for (let i3 = 0; i3 < style.length; i3++) {
    const prop = style.item(i3);
    if (prop.startsWith("--")) {
      const value = style.getPropertyValue(prop).trim();
      if (value) {
        tokens.push({
          name: prop,
          value,
          source: rule.selectorText
        });
      }
    }
  }
}
function normalizeValue(value) {
  let v = value.trim().toLowerCase();
  v = v.replace(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/g,
    (_, r, g, b) => `rgb(${r}, ${g}, ${b})`
  );
  return v;
}
function findTokensForValue(value, tokenMap) {
  const normalized = normalizeValue(value);
  return tokenMap.valueToTokens.get(normalized) || [];
}
function detectStylingApproach(element) {
  const classes = element.className && typeof element.className === "string" ? element.className.trim().split(/\s+/) : [];
  const tailwindPattern = /^-?(?:m|p|w|h|text|bg|border|flex|grid|gap|space|rounded|shadow|opacity|font|leading|tracking|z|inset|top|right|bottom|left|min|max|overflow|cursor|transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin|ring|outline|placeholder|divide|sr|not-sr|container|prose|aspect|columns|break|decoration|underline|overline|line-through|no-underline|antialiased|subpixel|italic|not-italic|normal-case|uppercase|lowercase|capitalize|truncate|indent|align|whitespace|hyphens|content|list|object|overflow|scroll|snap|touch|select|resize|appearance|accent|caret|will-change|fill|stroke)\b/;
  const tailwindCount = classes.filter((c3) => tailwindPattern.test(c3) || /^(sm|md|lg|xl|2xl|dark|hover|focus|active|group|peer):/.test(c3)).length;
  if (tailwindCount >= 3 || classes.length > 0 && tailwindCount / classes.length > 0.5) {
    return "tailwind";
  }
  if (classes.some((c3) => /^[a-zA-Z]+_[a-zA-Z]+__[a-zA-Z0-9]+$/.test(c3) || /^_[a-zA-Z]+_[a-zA-Z0-9]+$/.test(c3))) {
    return "css-modules";
  }
  if (classes.some((c3) => /^sc-[a-zA-Z0-9]+$/.test(c3) || /^css-[a-zA-Z0-9]+$/.test(c3))) {
    return "css-in-js";
  }
  if (element.hasAttribute("data-styled") || element.closest("[data-styled]")) {
    return "styled-components";
  }
  if (classes.length > 0) return "plain-css";
  return "unknown";
}
function summarizeTokenSystem(tokenMap) {
  if (tokenMap.tokens.length === 0) return null;
  const categories = {};
  for (const token of tokenMap.tokens) {
    const prefix = token.name.replace(/^--/, "").split("-").slice(0, 2).join("-");
    categories[prefix] = (categories[prefix] || 0) + 1;
  }
  const sorted = Object.entries(categories).sort((a4, b) => b[1] - a4[1]).slice(0, 10);
  const total = tokenMap.tokens.length;
  const prefixes = sorted.map(([prefix, count]) => `${prefix} (${count})`).join(", ");
  return `${total} CSS custom properties found. Top prefixes: ${prefixes}`;
}
var init_chunk_THD5EQWV = __esm({
  "../node_modules/retune/dist/chunk-THD5EQWV.js"() {
  }
});

// ../node_modules/@medv/finder/finder.js
function finder(input, options) {
  start = /* @__PURE__ */ new Date();
  if (input.nodeType !== Node.ELEMENT_NODE) {
    throw new Error(`Can't generate CSS selector for non-element node type.`);
  }
  if ("html" === input.tagName.toLowerCase()) {
    return "html";
  }
  const defaults = {
    root: document.body,
    idName: (name) => true,
    className: (name) => true,
    tagName: (name) => true,
    attr: (name, value) => false,
    seedMinLength: 1,
    optimizedMinLength: 2,
    threshold: 1e3,
    maxNumberOfTries: 1e4,
    timeoutMs: void 0
  };
  config = { ...defaults, ...options };
  rootDocument = findRootDocument(config.root, defaults);
  let path = bottomUpSearch(input, "all", () => bottomUpSearch(input, "two", () => bottomUpSearch(input, "one", () => bottomUpSearch(input, "none"))));
  if (path) {
    const optimized = sort(optimize(path, input));
    if (optimized.length > 0) {
      path = optimized[0];
    }
    return selector(path);
  } else {
    throw new Error(`Selector was not found.`);
  }
}
function findRootDocument(rootNode, defaults) {
  if (rootNode.nodeType === Node.DOCUMENT_NODE) {
    return rootNode;
  }
  if (rootNode === defaults.root) {
    return rootNode.ownerDocument;
  }
  return rootNode;
}
function bottomUpSearch(input, limit, fallback) {
  let path = null;
  let stack = [];
  let current = input;
  let i3 = 0;
  while (current) {
    const elapsedTime = (/* @__PURE__ */ new Date()).getTime() - start.getTime();
    if (config.timeoutMs !== void 0 && elapsedTime > config.timeoutMs) {
      throw new Error(`Timeout: Can't find a unique selector after ${elapsedTime}ms`);
    }
    let level = maybe(id(current)) || maybe(...attr(current)) || maybe(...classNames(current)) || maybe(tagName(current)) || [any()];
    const nth = index(current);
    if (limit == "all") {
      if (nth) {
        level = level.concat(level.filter(dispensableNth).map((node) => nthChild(node, nth)));
      }
    } else if (limit == "two") {
      level = level.slice(0, 1);
      if (nth) {
        level = level.concat(level.filter(dispensableNth).map((node) => nthChild(node, nth)));
      }
    } else if (limit == "one") {
      const [node] = level = level.slice(0, 1);
      if (nth && dispensableNth(node)) {
        level = [nthChild(node, nth)];
      }
    } else if (limit == "none") {
      level = [any()];
      if (nth) {
        level = [nthChild(level[0], nth)];
      }
    }
    for (let node of level) {
      node.level = i3;
    }
    stack.push(level);
    if (stack.length >= config.seedMinLength) {
      path = findUniquePath(stack, fallback);
      if (path) {
        break;
      }
    }
    current = current.parentElement;
    i3++;
  }
  if (!path) {
    path = findUniquePath(stack, fallback);
  }
  if (!path && fallback) {
    return fallback();
  }
  return path;
}
function findUniquePath(stack, fallback) {
  const paths = sort(combinations(stack));
  if (paths.length > config.threshold) {
    return fallback ? fallback() : null;
  }
  for (let candidate of paths) {
    if (unique(candidate)) {
      return candidate;
    }
  }
  return null;
}
function selector(path) {
  let node = path[0];
  let query = node.name;
  for (let i3 = 1; i3 < path.length; i3++) {
    const level = path[i3].level || 0;
    if (node.level === level - 1) {
      query = `${path[i3].name} > ${query}`;
    } else {
      query = `${path[i3].name} ${query}`;
    }
    node = path[i3];
  }
  return query;
}
function penalty(path) {
  return path.map((node) => node.penalty).reduce((acc, i3) => acc + i3, 0);
}
function unique(path) {
  const css = selector(path);
  switch (rootDocument.querySelectorAll(css).length) {
    case 0:
      throw new Error(`Can't select any node with this selector: ${css}`);
    case 1:
      return true;
    default:
      return false;
  }
}
function id(input) {
  const elementId = input.getAttribute("id");
  if (elementId && config.idName(elementId)) {
    return {
      name: "#" + CSS.escape(elementId),
      penalty: 0
    };
  }
  return null;
}
function attr(input) {
  const attrs = Array.from(input.attributes).filter((attr2) => config.attr(attr2.name, attr2.value));
  return attrs.map((attr2) => ({
    name: `[${CSS.escape(attr2.name)}="${CSS.escape(attr2.value)}"]`,
    penalty: 0.5
  }));
}
function classNames(input) {
  const names = Array.from(input.classList).filter(config.className);
  return names.map((name) => ({
    name: "." + CSS.escape(name),
    penalty: 1
  }));
}
function tagName(input) {
  const name = input.tagName.toLowerCase();
  if (config.tagName(name)) {
    return {
      name,
      penalty: 2
    };
  }
  return null;
}
function any() {
  return {
    name: "*",
    penalty: 3
  };
}
function index(input) {
  const parent = input.parentNode;
  if (!parent) {
    return null;
  }
  let child = parent.firstChild;
  if (!child) {
    return null;
  }
  let i3 = 0;
  while (child) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      i3++;
    }
    if (child === input) {
      break;
    }
    child = child.nextSibling;
  }
  return i3;
}
function nthChild(node, i3) {
  return {
    name: node.name + `:nth-child(${i3})`,
    penalty: node.penalty + 1
  };
}
function dispensableNth(node) {
  return node.name !== "html" && !node.name.startsWith("#");
}
function maybe(...level) {
  const list = level.filter(notEmpty);
  if (list.length > 0) {
    return list;
  }
  return null;
}
function notEmpty(value) {
  return value !== null && value !== void 0;
}
function* combinations(stack, path = []) {
  if (stack.length > 0) {
    for (let node of stack[0]) {
      yield* combinations(stack.slice(1, stack.length), path.concat(node));
    }
  } else {
    yield path;
  }
}
function sort(paths) {
  return [...paths].sort((a4, b) => penalty(a4) - penalty(b));
}
function* optimize(path, input, scope = {
  counter: 0,
  visited: /* @__PURE__ */ new Map()
}) {
  if (path.length > 2 && path.length > config.optimizedMinLength) {
    for (let i3 = 1; i3 < path.length - 1; i3++) {
      if (scope.counter > config.maxNumberOfTries) {
        return;
      }
      scope.counter += 1;
      const newPath = [...path];
      newPath.splice(i3, 1);
      const newPathKey = selector(newPath);
      if (scope.visited.has(newPathKey)) {
        return;
      }
      if (unique(newPath) && same(newPath, input)) {
        yield newPath;
        scope.visited.set(newPathKey, true);
        yield* optimize(newPath, input, scope);
      }
    }
  }
}
function same(path, input) {
  return rootDocument.querySelector(selector(path)) === input;
}
var config, rootDocument, start;
var init_finder = __esm({
  "../node_modules/@medv/finder/finder.js"() {
  }
});

// ../node_modules/parsel-js/dist/parsel.js
function gobbleParens(text, offset) {
  let nesting = 0;
  let result = "";
  for (; offset < text.length; offset++) {
    const char = text[offset];
    switch (char) {
      case "(":
        ++nesting;
        break;
      case ")":
        --nesting;
        break;
    }
    result += char;
    if (nesting === 0) {
      return result;
    }
  }
  return result;
}
function tokenizeBy(text, grammar = TOKENS) {
  if (!text) {
    return [];
  }
  const tokens = [text];
  for (const [type, pattern] of Object.entries(grammar)) {
    for (let i3 = 0; i3 < tokens.length; i3++) {
      const token = tokens[i3];
      if (typeof token !== "string") {
        continue;
      }
      pattern.lastIndex = 0;
      const match = pattern.exec(token);
      if (!match) {
        continue;
      }
      const from = match.index - 1;
      const args = [];
      const content = match[0];
      const before = token.slice(0, from + 1);
      if (before) {
        args.push(before);
      }
      args.push({
        ...match.groups,
        type,
        content
      });
      const after = token.slice(from + content.length + 1);
      if (after) {
        args.push(after);
      }
      tokens.splice(i3, 1, ...args);
    }
  }
  let offset = 0;
  for (const token of tokens) {
    switch (typeof token) {
      case "string":
        throw new Error(`Unexpected sequence ${token} found at index ${offset}`);
      case "object":
        offset += token.content.length;
        token.pos = [offset - token.content.length, offset];
        if (TRIM_TOKENS.has(token.type)) {
          token.content = token.content.trim() || " ";
        }
        break;
    }
  }
  return tokens;
}
function tokenize(selector2, grammar = TOKENS) {
  selector2 = selector2.trim();
  if (selector2 === "") {
    return [];
  }
  const replacements = [];
  selector2 = selector2.replace(ESCAPE_PATTERN, (value, offset) => {
    replacements.push({ value, offset });
    return "\uE000".repeat(value.length);
  });
  selector2 = selector2.replace(STRING_PATTERN, (value, quote, content, offset) => {
    replacements.push({ value, offset });
    return `${quote}${"\uE001".repeat(content.length)}${quote}`;
  });
  {
    let pos = 0;
    let offset;
    while ((offset = selector2.indexOf("(", pos)) > -1) {
      const value = gobbleParens(selector2, offset);
      replacements.push({ value, offset });
      selector2 = `${selector2.substring(0, offset)}(${"\xB6".repeat(value.length - 2)})${selector2.substring(offset + value.length)}`;
      pos = offset + value.length;
    }
  }
  const tokens = tokenizeBy(selector2, grammar);
  const changedTokens = /* @__PURE__ */ new Set();
  for (const replacement of replacements.reverse()) {
    for (const token of tokens) {
      const { offset, value } = replacement;
      if (!(token.pos[0] <= offset && offset + value.length <= token.pos[1])) {
        continue;
      }
      const { content } = token;
      const tokenOffset = offset - token.pos[0];
      token.content = content.slice(0, tokenOffset) + value + content.slice(tokenOffset + value.length);
      if (token.content !== content) {
        changedTokens.add(token);
      }
    }
  }
  for (const token of changedTokens) {
    const pattern = getArgumentPatternByType(token.type);
    if (!pattern) {
      throw new Error(`Unknown token type: ${token.type}`);
    }
    pattern.lastIndex = 0;
    const match = pattern.exec(token.content);
    if (!match) {
      throw new Error(`Unable to parse content for ${token.type}: ${token.content}`);
    }
    Object.assign(token, match.groups);
  }
  return tokens;
}
function nestTokens(tokens, { list = true } = {}) {
  if (list && tokens.find((t) => t.type === "comma")) {
    const selectors = [];
    const temp = [];
    for (let i3 = 0; i3 < tokens.length; i3++) {
      if (tokens[i3].type === "comma") {
        if (temp.length === 0) {
          throw new Error("Incorrect comma at " + i3);
        }
        selectors.push(nestTokens(temp, { list: false }));
        temp.length = 0;
      } else {
        temp.push(tokens[i3]);
      }
    }
    if (temp.length === 0) {
      throw new Error("Trailing comma");
    } else {
      selectors.push(nestTokens(temp, { list: false }));
    }
    return { type: "list", list: selectors };
  }
  for (let i3 = tokens.length - 1; i3 >= 0; i3--) {
    let token = tokens[i3];
    if (token.type === "combinator") {
      let left = tokens.slice(0, i3);
      let right = tokens.slice(i3 + 1);
      if (left.length === 0) {
        return {
          type: "relative",
          combinator: token.content,
          right: nestTokens(right)
        };
      }
      return {
        type: "complex",
        combinator: token.content,
        left: nestTokens(left),
        right: nestTokens(right)
      };
    }
  }
  switch (tokens.length) {
    case 0:
      throw new Error("Could not build AST.");
    case 1:
      return tokens[0];
    default:
      return {
        type: "compound",
        list: [...tokens]
        // clone to avoid pointers messing up the AST
      };
  }
}
function* flatten(node, parent) {
  switch (node.type) {
    case "list":
      for (let child of node.list) {
        yield* flatten(child, node);
      }
      break;
    case "complex":
      yield* flatten(node.left, node);
      yield* flatten(node.right, node);
      break;
    case "relative":
      yield* flatten(node.right, node);
      break;
    case "compound":
      yield* node.list.map((token) => [token, node]);
      break;
    default:
      yield [node, parent];
  }
}
function parse(selector2, { recursive = true, list = true } = {}) {
  const tokens = tokenize(selector2);
  if (!tokens) {
    return;
  }
  const ast = nestTokens(tokens, { list });
  if (!recursive) {
    return ast;
  }
  for (const [token] of flatten(ast)) {
    if (token.type !== "pseudo-class" || !token.argument) {
      continue;
    }
    if (!RECURSIVE_PSEUDO_CLASSES.has(token.name)) {
      continue;
    }
    let argument = token.argument;
    const childArg = RECURSIVE_PSEUDO_CLASSES_ARGS[token.name];
    if (childArg) {
      const match = childArg.exec(argument);
      if (!match) {
        continue;
      }
      Object.assign(token, match.groups);
      argument = match.groups["subtree"];
    }
    if (!argument) {
      continue;
    }
    Object.assign(token, {
      subtree: parse(argument, {
        recursive: true,
        list: true
      })
    });
  }
  return ast;
}
var TOKENS, TRIM_TOKENS, RECURSIVE_PSEUDO_CLASSES, nthChildRegExp, RECURSIVE_PSEUDO_CLASSES_ARGS, getArgumentPatternByType, STRING_PATTERN, ESCAPE_PATTERN;
var init_parsel = __esm({
  "../node_modules/parsel-js/dist/parsel.js"() {
    TOKENS = {
      attribute: /\[\s*(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)\s*(?:(?<operator>\W?=)\s*(?<value>.+?)\s*(\s(?<caseSensitive>[iIsS]))?\s*)?\]/gu,
      id: /#(?<name>[-\w\P{ASCII}]+)/gu,
      class: /\.(?<name>[-\w\P{ASCII}]+)/gu,
      comma: /\s*,\s*/g,
      combinator: /\s*[\s>+~]\s*/g,
      "pseudo-element": /::(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
      "pseudo-class": /:(?<name>[-\w\P{ASCII}]+)(?:\((?<argument>¶*)\))?/gu,
      universal: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?\*/gu,
      type: /(?:(?<namespace>\*|[-\w\P{ASCII}]*)\|)?(?<name>[-\w\P{ASCII}]+)/gu
      // this must be last
    };
    TRIM_TOKENS = /* @__PURE__ */ new Set(["combinator", "comma"]);
    RECURSIVE_PSEUDO_CLASSES = /* @__PURE__ */ new Set([
      "not",
      "is",
      "where",
      "has",
      "matches",
      "-moz-any",
      "-webkit-any",
      "nth-child",
      "nth-last-child"
    ]);
    nthChildRegExp = /(?<index>[\dn+-]+)\s+of\s+(?<subtree>.+)/;
    RECURSIVE_PSEUDO_CLASSES_ARGS = {
      "nth-child": nthChildRegExp,
      "nth-last-child": nthChildRegExp
    };
    getArgumentPatternByType = (type) => {
      switch (type) {
        case "pseudo-element":
        case "pseudo-class":
          return new RegExp(TOKENS[type].source.replace("(?<argument>\xB6*)", "(?<argument>.*)"), "gu");
        default:
          return TOKENS[type];
      }
    };
    STRING_PATTERN = /(['"])([^\\\n]*?)\1/g;
    ESCAPE_PATTERN = /\\./g;
  }
});

// ../node_modules/retune/dist/chunk-HFZOOAXJ.js
function getCategoryForProperty(prop) {
  return PROPERTY_CATEGORY[prop] ?? null;
}
function getSelector(element) {
  try {
    return finder(element, {
      root: document.body,
      className: (name) => {
        if (name.startsWith("_") || name.startsWith("css-")) return false;
        if (/^[a-z]{1,3}[A-Za-z0-9_]{8,}$/.test(name)) return false;
        return true;
      },
      seedMinLength: 1,
      optimizedMinLength: 2,
      threshold: 1e3
    });
  } catch {
    return buildFallbackSelector(element);
  }
}
function buildFallbackSelector(el) {
  const parts = [];
  let current = el;
  while (current && current !== document.body) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c3) => c3.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index2 = siblings.indexOf(current) + 1;
        part += `:nth-of-type(${index2})`;
      }
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(" > ");
}
function getSharedSelector(element) {
  const candidates = getSelectorCandidates(element);
  for (const c3 of candidates) {
    if (c3.count > 1) return c3;
  }
  return candidates.length > 0 ? candidates[0] : null;
}
function isHashedClass(name) {
  if (name.includes("__") || name.includes("--")) return false;
  if (name.startsWith("_") || name.startsWith("css-")) return true;
  if (/^[a-z]{1,3}[A-Za-z0-9_]{8,}$/.test(name)) return true;
  return false;
}
function extractStem(name) {
  const stripped = name.replace(/^.*?:/, "");
  const clean = stripped.replace(/^[-!]/, "");
  const multiMatch = clean.match(/^([a-z]+-[a-z]+)(?=-|$)/);
  if (multiMatch && UTILITY_STEMS.has(multiMatch[1])) return multiMatch[1];
  return clean.split("-")[0];
}
function scoreNamePattern(name) {
  if (!name || !name.trim()) return { score: 0, confidence: 1 };
  if (VARIANT_PREFIX.test(name)) return { score: 1, confidence: 0.95 };
  if (/\[.+\]/.test(name)) return { score: 1, confidence: 0.95 };
  if (/^[a-z][\w-]*\/\d+$/.test(name)) return { score: 1, confidence: 0.95 };
  if (/!$/.test(name)) return { score: 0.95, confidence: 0.9 };
  const stem = extractStem(name);
  if (name.includes("__") || /--[a-z]/.test(name)) return { score: 0.05, confidence: 0.8 };
  if (UTILITY_STEMS.has(name)) {
    return { score: 0.8, confidence: 0.75 };
  }
  if (SEMANTIC_STEMS.has(stem)) return { score: 0.15, confidence: 0.7 };
  if (/^(is-|has-|not-|no-|active|disabled|selected|open|closed|collapsed|expanded|loading|error|success|warning|checked|focused|pressed|dragging)$/.test(name)) {
    return { score: 0.25, confidence: 0.5 };
  }
  const isUtilityStem = UTILITY_STEMS.has(stem);
  const hasValueSuffix = /-(\d+\.?\d*|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|auto|full|screen|fit|min|max|none|px|0\.5|1\.5|2\.5|3\.5|\d+\/\d+)$/.test(name);
  const hasColorPattern = /-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white|transparent|current|inherit)-?\d*$/.test(name);
  const suffix = name.length > stem.length ? name.slice(stem.length + 1) : "";
  const hasKeywordValue = suffix !== "" && UTILITY_KEYWORD_VALUES.has(suffix);
  if (isUtilityStem && (hasValueSuffix || hasColorPattern || hasKeywordValue)) {
    return { score: 0.85, confidence: 0.8 };
  }
  if (isUtilityStem) {
    return { score: 0.5, confidence: 0.4 };
  }
  if (hasValueSuffix && !isUtilityStem) {
    return { score: 0.55, confidence: 0.35 };
  }
  if (name.length <= 6 && /^[a-z]+-\d/.test(name)) {
    return { score: 0.7, confidence: 0.5 };
  }
  return { score: 0.35, confidence: 0.2 };
}
function getPropertyFamily(prop) {
  if (prop.startsWith("padding-")) return "padding";
  if (prop.startsWith("margin-")) return "margin";
  if (prop.endsWith("-radius") && prop.startsWith("border-")) return "border-radius";
  if (/^border-(top|right|bottom|left)-(width|style|color)$/.test(prop)) return "border";
  if (prop.startsWith("border-") && (prop.startsWith("border-block") || prop.startsWith("border-inline"))) return "border";
  if (prop.startsWith("background-")) return "background";
  if (prop.startsWith("overflow-")) return "overflow";
  if (prop === "column-gap" || prop === "row-gap") return "gap";
  if (prop.startsWith("outline-") && prop !== "outline-offset") return "outline";
  if (prop.startsWith("text-decoration-")) return "text-decoration";
  if (prop.startsWith("transition-")) return "transition";
  if (prop.startsWith("animation-") && !prop.startsWith("animation-range")) return "animation";
  if (prop.startsWith("scroll-margin-")) return "scroll-margin";
  if (prop.startsWith("scroll-padding-")) return "scroll-padding";
  if (prop.startsWith("list-style-")) return "list-style";
  if (prop.startsWith("grid-template-")) return "grid-template";
  if (prop.startsWith("grid-auto-")) return "grid-auto";
  if (prop === "flex-grow" || prop === "flex-shrink" || prop === "flex-basis") return "flex";
  if (prop === "column-count" || prop === "column-width") return "columns";
  if (prop.startsWith("place-")) return prop;
  return prop;
}
function countAuthoredProperties(style) {
  const families = /* @__PURE__ */ new Set();
  for (let i3 = 0; i3 < style.length; i3++) {
    const prop = style[i3];
    if (prop.startsWith("--")) continue;
    families.add(getPropertyFamily(prop));
  }
  return families.size;
}
function isSimpleClassSelector(selectorText) {
  return selectorText.split(",").every((sel) => {
    const s2 = sel.trim();
    const noPseudo = s2.replace(/::?[\w-]+(?:\(.*?\))?/g, "");
    const cleaned = noPseudo.replace(/\[.*?\]/g, "").trim();
    if (/[\s>+~]/.test(cleaned)) return false;
    const classes = cleaned.match(/\./g);
    return classes !== null && classes.length === 1;
  });
}
function analyzeElementClasses(element) {
  const elClasses = element.classList ? Array.from(element.classList) : [];
  const result = {
    compoundClasses: /* @__PURE__ */ new Set(),
    utilityClasses: /* @__PURE__ */ new Set(),
    classesFoundInRules: /* @__PURE__ */ new Set(),
    scores: /* @__PURE__ */ new Map()
  };
  if (elClasses.length === 0) return result;
  const maxPropCount = /* @__PURE__ */ new Map();
  const hasComplexSelector = /* @__PURE__ */ new Set();
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walkRules(rules, elClasses, element, result, maxPropCount, hasComplexSelector, null);
  }
  const nonHashed = elClasses.filter((c3) => !isHashedClass(c3));
  for (const cls of nonHashed) {
    if (result.utilityClasses.has(cls)) {
      result.scores.set(cls, { score: 1, confidence: 0.98, verdict: "utility" });
      continue;
    }
    const nameSignal = scoreNamePattern(cls);
    const foundInRules = result.classesFoundInRules.has(cls);
    let sheetScore = null;
    if (foundInRules) {
      const maxProps = maxPropCount.get(cls) ?? 0;
      const isComplex = hasComplexSelector.has(cls);
      if (maxProps <= 1 && !isComplex) {
        sheetScore = { score: 0.9, confidence: 0.85 };
      } else if (maxProps <= 2 && !isComplex) {
        sheetScore = { score: 0.75, confidence: 0.8 };
      } else if (maxProps <= 3 && !isComplex) {
        sheetScore = { score: 0.5, confidence: 0.65 };
      } else if (maxProps >= 5) {
        sheetScore = { score: 0.1, confidence: 0.85 };
      } else if (isComplex) {
        sheetScore = { score: Math.max(0, 0.3 - maxProps * 0.05), confidence: 0.75 };
      } else {
        sheetScore = { score: 0.4, confidence: 0.6 };
      }
    }
    let finalScore;
    let finalConfidence;
    if (sheetScore) {
      if (nameSignal.score <= 0.25 && sheetScore.score >= 0.65) {
        finalScore = nameSignal.score;
        finalConfidence = nameSignal.confidence;
      } else {
        finalScore = sheetScore.score * 0.65 + nameSignal.score * 0.35;
        finalConfidence = Math.max(sheetScore.confidence, nameSignal.confidence);
        if (Math.abs(sheetScore.score - nameSignal.score) < 0.2) {
          finalConfidence = Math.min(finalConfidence + 0.1, 1);
        }
      }
    } else {
      finalScore = nameSignal.score;
      finalConfidence = nameSignal.confidence * 0.9;
    }
    if (nonHashed.length >= 10 && finalScore >= 0.35 && finalScore <= 0.65) {
      finalScore = Math.min(finalScore + 0.1, 1);
    } else if (nonHashed.length <= 2 && finalScore >= 0.35 && finalScore <= 0.65) {
      finalScore = Math.max(finalScore - 0.1, 0);
    }
    let verdict;
    if (finalScore >= 0.65) {
      verdict = "utility";
      result.utilityClasses.add(cls);
    } else if (finalScore <= 0.35) {
      verdict = "semantic";
    } else if (finalConfidence >= 0.7) {
      verdict = finalScore >= 0.5 ? "utility" : "semantic";
      if (verdict === "utility") result.utilityClasses.add(cls);
    } else {
      verdict = "ambiguous";
    }
    result.scores.set(cls, { score: finalScore, confidence: finalConfidence, verdict });
  }
  return result;
}
function walkRules(rules, elClasses, element, result, maxPropCount, hasComplexSelector, layerName) {
  for (let i3 = 0; i3 < rules.length; i3++) {
    const rule = rules[i3];
    if (typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
      walkRules(rule.cssRules, elClasses, element, result, maxPropCount, hasComplexSelector, rule.name);
      continue;
    }
    if (rule instanceof CSSGroupingRule) {
      walkRules(rule.cssRules, elClasses, element, result, maxPropCount, hasComplexSelector, layerName);
      continue;
    }
    if (!(rule instanceof CSSStyleRule)) continue;
    const sel = rule.selectorText;
    const selectorClasses = sel.match(/\.([a-zA-Z0-9_-]+)/g)?.map((c3) => c3.slice(1)) || [];
    const overlap = selectorClasses.filter((c3) => elClasses.includes(c3));
    if (overlap.length === 0) continue;
    try {
      if (!element.matches(sel)) continue;
    } catch {
      continue;
    }
    for (const c3 of overlap) result.classesFoundInRules.add(c3);
    if (overlap.length >= 2) {
      for (const c3 of overlap) result.compoundClasses.add(c3);
    }
    if (layerName === "utilities") {
      for (const c3 of overlap) result.utilityClasses.add(c3);
      continue;
    }
    const propCount = countAuthoredProperties(rule.style);
    const simple = isSimpleClassSelector(sel);
    for (const c3 of overlap) {
      const prev = maxPropCount.get(c3) ?? 0;
      maxPropCount.set(c3, Math.max(prev, propCount));
      if (!simple) hasComplexSelector.add(c3);
    }
  }
}
function getSelectorCandidates(element) {
  const el = element;
  if (!el.classList || el.classList.length === 0) return [];
  const analysis = analyzeElementClasses(element);
  const nonHashed = Array.from(el.classList).filter((name) => !isHashedClass(name));
  if (nonHashed.length === 0) return [];
  const candidates = [];
  const semantic = [];
  const ambiguous = [];
  const utility = [];
  for (const name of nonHashed) {
    const info = analysis.scores.get(name);
    if (!info) {
      ambiguous.push(name);
      continue;
    }
    if (analysis.compoundClasses.has(name) && info.verdict === "utility") {
      semantic.push(name);
      continue;
    }
    switch (info.verdict) {
      case "semantic":
        semantic.push(name);
        break;
      case "ambiguous":
        ambiguous.push(name);
        break;
      case "utility":
        utility.push(name);
        break;
    }
  }
  for (const c3 of semantic) {
    const selector2 = `.${CSS.escape(c3)}`;
    try {
      candidates.push({
        selector: selector2,
        count: document.querySelectorAll(selector2).length,
        verdict: "semantic"
      });
    } catch {
    }
  }
  for (const c3 of ambiguous) {
    const selector2 = `.${CSS.escape(c3)}`;
    try {
      candidates.push({
        selector: selector2,
        count: document.querySelectorAll(selector2).length,
        verdict: "ambiguous"
      });
    } catch {
    }
  }
  for (const c3 of utility) {
    const selector2 = `.${CSS.escape(c3)}`;
    try {
      candidates.push({
        selector: selector2,
        count: document.querySelectorAll(selector2).length,
        verdict: "utility"
      });
    } catch {
    }
  }
  const verdictPriority = { semantic: 0, ambiguous: 1, utility: 2 };
  candidates.sort((a4, b) => {
    const vp = verdictPriority[a4.verdict] - verdictPriority[b.verdict];
    if (vp !== 0) return vp;
    return b.count - a4.count;
  });
  return candidates;
}
function getFiber(element) {
  const key = Object.keys(element).find((k) => k.startsWith("__reactFiber$"));
  return key ? element[key] : null;
}
function getReactComponentHierarchy(element) {
  const fiber = getFiber(element);
  if (!fiber) return [];
  const components = [];
  let current = fiber;
  while (current) {
    if (typeof current.type === "function" || typeof current.type === "object") {
      const name = current.type?.displayName || current.type?.name || current.elementType?.displayName || current.elementType?.name;
      if (name && !isFrameworkInternal(name)) {
        components.push(name);
      }
    }
    current = current.return;
  }
  return components;
}
function getDirectReactComponent(element) {
  const fiber = getFiber(element);
  if (!fiber) return null;
  let current = fiber.return;
  while (current) {
    if (typeof current.type === "function" || typeof current.type === "object") {
      const name = current.type?.displayName || current.type?.name || current.elementType?.displayName || current.elementType?.name;
      if (name && !isFrameworkInternal(name)) {
        const rootDom = findFirstDomFiber(current);
        return rootDom === element ? name : null;
      }
    }
    current = current.return;
  }
  return null;
}
function findFirstDomFiber(fiber) {
  if (fiber.stateNode instanceof Element) return fiber.stateNode;
  let child = fiber.child;
  while (child) {
    const found = findFirstDomFiber(child);
    if (found) return found;
    child = child.sibling;
  }
  return null;
}
function isFrameworkInternal(name) {
  if (name.startsWith("_")) return true;
  if (/^(Fragment|Suspense|StrictMode|Profiler|Lazy|Memo|Forward)/.test(name)) return true;
  if (/(?:Provider|Consumer|Context|Boundary|Handler|Root|Wrapper)$/.test(name)) return true;
  if (/(?:Router|Layout|Template|Loading|Segment|Fallback|Reload|Manager|Metadata|Viewport|Head|Script|Link)/.test(name)) return true;
  if (/^(Home|App|Page|Main|Index|Default|View|Screen|Dashboard|Root)$/.test(name)) return true;
  if (name.length <= 2) return true;
  return false;
}
function getReactSource(element) {
  const fiber = getFiber(element);
  if (!fiber) return null;
  let current = fiber;
  while (current) {
    if (current._debugSource) {
      return {
        fileName: current._debugSource.fileName,
        lineNumber: current._debugSource.lineNumber,
        columnNumber: current._debugSource.columnNumber
      };
    }
    if (current._debugOwner?._debugSource) {
      return {
        fileName: current._debugOwner._debugSource.fileName,
        lineNumber: current._debugOwner._debugSource.lineNumber,
        columnNumber: current._debugOwner._debugSource.columnNumber
      };
    }
    current = current.return;
  }
  return null;
}
function getReactProps(element) {
  const fiber = getFiber(element);
  if (!fiber) return null;
  let current = fiber;
  while (current) {
    if ((typeof current.type === "function" || typeof current.type === "object") && current.memoizedProps) {
      const props = { ...current.memoizedProps };
      delete props.children;
      delete props.ref;
      delete props.key;
      return props;
    }
    current = current.return;
  }
  return null;
}
function humanizeAncestorPart(ancestor) {
  const ariaMatch = ancestor.match(/\[aria-([\w-]+)(?:="([^"]*)")?\]/);
  if (ariaMatch) {
    const [, attr2, val] = ariaMatch;
    const key = `aria-${attr2}`;
    if (ARIA_LABELS[key]) {
      return ARIA_LABELS[key][val || "true"] || titleCase(val || attr2);
    }
    return titleCase(val || attr2);
  }
  const dataValMatch = ancestor.match(/\[data-[\w-]+=["']?([^"'\]]+)["']?\]/);
  if (dataValMatch) return titleCase(dataValMatch[1]);
  const dataBoolMatch = ancestor.match(/\[data-([\w-]+)\]/);
  if (dataBoolMatch) return titleCase(dataBoolMatch[1]);
  const bemMatch = ancestor.match(/\.([\w-]+)--([\w-]+)/);
  if (bemMatch) return titleCase(bemMatch[2]);
  const stateMatch = ancestor.match(/\.(is|has)-([\w-]+)/);
  if (stateMatch) return titleCase(stateMatch[2]);
  const classMatch = ancestor.match(/\.([\w-]+)/);
  if (classMatch) return titleCase(classMatch[1]);
  return ancestor.replace(/[.\[\]="']/g, " ").trim();
}
function titleCase(s2) {
  return s2.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function isNoiseAncestor(selectorText) {
  if (/\[data-v-[a-f0-9]+\]/.test(selectorText)) return true;
  if (/\[_ng(host|content)-[\w-]+\]/.test(selectorText)) return true;
  if (/\.(css|sc|emotion)-[a-zA-Z0-9]{4,}/.test(selectorText) && !/[A-Z]/.test(selectorText)) return true;
  return false;
}
function splitSelector(selectorText) {
  let ast;
  try {
    ast = parse(selectorText, { recursive: true });
  } catch {
    return null;
  }
  if (!ast || ast.type !== "complex") return null;
  const rightContent = ast.right?.content;
  if (!rightContent) return null;
  const full = selectorText.trim();
  const rightIdx = full.lastIndexOf(rightContent);
  if (rightIdx <= 0) return null;
  const ancestorRaw = full.slice(0, rightIdx).trim();
  const ancestorPart = ancestorRaw.replace(/[>+~\s]+$/, "").trim();
  if (!ancestorPart) return null;
  return { ancestorPart, elementPart: rightContent };
}
function elementPartMatchesElement(elementPart, element) {
  const partClasses = elementPart.match(/\.([a-zA-Z0-9_-]+)/g)?.map((c3) => c3.slice(1)) || [];
  if (partClasses.length === 0) {
    const tag = elementPart.replace(/[:\[].*/g, "").trim().toLowerCase();
    return tag === element.tagName.toLowerCase();
  }
  return partClasses.some((c3) => element.classList.contains(c3));
}
function getAncestorScopes(element) {
  const seen = /* @__PURE__ */ new Map();
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walkRulesForAncestors(rules, element, seen);
  }
  const result = Array.from(seen.values());
  result.sort((a4, b) => b.count - a4.count);
  return result;
}
function walkRulesForAncestors(rules, element, seen) {
  for (let i3 = 0; i3 < rules.length; i3++) {
    const rule = rules[i3];
    if (rule instanceof CSSGroupingRule || typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
      walkRulesForAncestors(rule.cssRules, element, seen);
      continue;
    }
    if (!(rule instanceof CSSStyleRule)) continue;
    const sel = rule.selectorText;
    if (sel.includes(":hover") || sel.includes(":focus") || sel.includes(":active")) continue;
    try {
      if (!element.matches(sel)) continue;
    } catch {
      continue;
    }
    for (const part of sel.split(",")) {
      const trimmed = part.trim();
      const noParen = trimmed.replace(/\([^)]*\)/g, "");
      if (!/[\s>]/.test(noParen)) continue;
      const split = splitSelector(trimmed);
      if (!split) continue;
      if (!elementPartMatchesElement(split.elementPart, element)) continue;
      if (isNoiseAncestor(split.ancestorPart)) continue;
      const fullSelector = trimmed;
      if (seen.has(fullSelector)) continue;
      let count;
      try {
        count = document.querySelectorAll(fullSelector).length;
      } catch {
        continue;
      }
      if (count <= 0) continue;
      seen.set(fullSelector, {
        fullSelector,
        ancestorPart: split.ancestorPart,
        label: humanizeAncestorPart(split.ancestorPart),
        count
      });
    }
  }
}
function getVariableRegistry() {
  const sheetCount = document.styleSheets.length;
  if (cachedRegistry && cachedSheetCount === sheetCount) return cachedRegistry;
  cachedRegistry = buildRegistry();
  cachedSheetCount = sheetCount;
  return cachedRegistry;
}
function buildRegistry() {
  const groups = /* @__PURE__ */ new Map();
  const valueLookup = /* @__PURE__ */ new Map();
  const classLookup = /* @__PURE__ */ new Map();
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  let hasTwVars = false;
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      if (!hasTwVars) hasTwVars = detectTailwindVars(rules);
      scanRules(rules, probe, groups, valueLookup, classLookup, void 0);
    }
  } finally {
    probe.remove();
  }
  for (const [category, tokens] of groups) {
    groups.set(category, sortTokens(tokens, category));
  }
  const framework = detectFramework(hasTwVars, classLookup);
  return { groups, valueLookup, classLookup, framework };
}
function detectTailwindVars(rules) {
  for (let i3 = 0; i3 < rules.length; i3++) {
    const rule = rules[i3];
    if (rule instanceof CSSGroupingRule || typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
      if (detectTailwindVars(rule.cssRules)) return true;
      continue;
    }
    if (!(rule instanceof CSSStyleRule)) continue;
    for (let j = 0; j < rule.style.length; j++) {
      if (rule.style[j].startsWith("--tw-")) return true;
    }
  }
  return false;
}
function detectFramework(hasTwVars, classLookup) {
  if (hasTwVars) return "tailwind";
  const twPattern = /^(p|m|w|h|gap|text|bg|border|rounded|shadow|opacity|font|leading|tracking|flex|grid|z|inset|top|right|bottom|left)([xytrbl])?-/;
  let twCount = 0;
  for (const name of classLookup.keys()) {
    if (twPattern.test(name)) twCount++;
  }
  if (twCount > 10) return "tailwind";
  if (classLookup.size > 0) return "custom";
  return "unknown";
}
function scanRules(rules, probe, groups, valueLookup, classLookup, layerName) {
  for (let i3 = 0; i3 < rules.length; i3++) {
    const rule = rules[i3];
    if (rule instanceof CSSGroupingRule || typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
      const childLayer = typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule ? rule.name || layerName : layerName;
      scanRules(rule.cssRules, probe, groups, valueLookup, classLookup, childLayer);
      continue;
    }
    if (!(rule instanceof CSSStyleRule)) continue;
    if (!isSimpleClassSelector(rule.selectorText)) continue;
    const propCount = countAuthoredProperties(rule.style);
    if (propCount === 0 || propCount > MAX_UTILITY_PROPS) continue;
    const classMatch = rule.selectorText.match(/\.([a-zA-Z0-9_-]+)/);
    if (!classMatch) continue;
    const className = classMatch[1];
    const { score } = scoreNamePattern(className);
    if (score < 0.2) continue;
    if (classLookup.has(className)) continue;
    const values = {};
    for (let j = 0; j < rule.style.length; j++) {
      const prop = rule.style[j];
      if (prop.startsWith("--")) continue;
      let val = rule.style.getPropertyValue(prop).trim();
      if (val.includes("var(")) {
        probe.style.cssText = `position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;`;
        probe.style.setProperty(prop, val);
        val = getComputedStyle(probe).getPropertyValue(prop).trim();
        probe.style.removeProperty(prop);
      }
      if (val) values[prop] = val;
    }
    if (Object.keys(values).length === 0) continue;
    let category = null;
    let multiCategory = false;
    for (const prop of Object.keys(values)) {
      const cat = getCategoryForProperty(prop);
      if (!cat) continue;
      if (!category) {
        category = cat;
      } else if (cat !== category) {
        multiCategory = true;
        break;
      }
    }
    if (!category || multiCategory) continue;
    const token = { className, values, layerName };
    classLookup.set(className, token);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(token);
    for (const [prop, val] of Object.entries(values)) {
      const key = `${prop}:${val}`;
      if (!valueLookup.has(key)) valueLookup.set(key, []);
      valueLookup.get(key).push(token);
    }
  }
}
function sortTokens(tokens, category) {
  if (category === "colors") {
    return tokens.sort((a4, b) => {
      const hueA = extractHue(Object.values(a4.values)[0]);
      const hueB = extractHue(Object.values(b.values)[0]);
      return hueA - hueB;
    });
  }
  return tokens.sort((a4, b) => {
    const numA = parseFloat(Object.values(a4.values)[0]);
    const numB = parseFloat(Object.values(b.values)[0]);
    if (isNaN(numA) && isNaN(numB)) return a4.className.localeCompare(b.className);
    if (isNaN(numA)) return 1;
    if (isNaN(numB)) return -1;
    return numA - numB;
  });
}
function extractHue(color) {
  if (!color) return 0;
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgbMatch) return 0;
  const r = parseInt(rgbMatch[1]) / 255;
  const g = parseInt(rgbMatch[2]) / 255;
  const b = parseInt(rgbMatch[3]) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}
function isSpaceSeparatedRgb(value) {
  const m = SPACE_RGB_RE.exec(value.trim());
  if (!m) return false;
  return [m[1], m[2], m[3]].every((n) => {
    const v = parseInt(n, 10);
    return v >= 0 && v <= 255;
  });
}
function normalizeColorValue(value) {
  if (isSpaceSeparatedRgb(value)) return `rgb(${value.trim().replace(/\s+/g, ", ")})`;
  return value;
}
function resolveVariablesForElement(element, computedStyles, scopeSelector) {
  const registry = getVariableRegistry();
  const matches = /* @__PURE__ */ new Map();
  const classes = element.classList ? Array.from(element.classList) : [];
  if (classes.length > 0) {
    const activeTokens = [];
    for (const cls of classes) {
      const token = registry.classLookup.get(cls);
      if (token) activeTokens.push(token);
    }
    for (const token of activeTokens) {
      for (const [prop, tokenValue] of Object.entries(token.values)) {
        const camelProp = kebabToCamel(prop);
        const computed = computedStyles[camelProp] || computedStyles[prop];
        if (!computed) continue;
        const normalizedToken = normalizeValue2(tokenValue);
        const normalizedComputed = normalizeValue2(computed);
        if (normalizedToken === normalizedComputed) {
          matches.set(prop, { variable: token, property: prop });
        }
      }
    }
  }
  resolveVarReferences(element, matches, scopeSelector);
  return matches;
}
function resolveVarReferences(element, matches, scopeSelector) {
  const htmlEl = element;
  const { tokens: varTokens } = getCssVariables();
  if (varTokens.length === 0) return;
  const varLookup = /* @__PURE__ */ new Map();
  for (const t of varTokens) {
    const name = t.className.slice(4, -1);
    varLookup.set(name, t);
  }
  const matchSpecificity = /* @__PURE__ */ new Map();
  const tryMatch = (prop, raw, specificity = 0) => {
    if (!raw.includes("var(")) return;
    const existing = matches.get(prop);
    const prevSpec = matchSpecificity.get(prop) ?? -1;
    if (existing && !isRawUtility(existing.variable) && specificity < prevSpec) return;
    VAR_REF_RE.lastIndex = 0;
    let m;
    let variable;
    while ((m = VAR_REF_RE.exec(raw)) !== null) {
      variable = varLookup.get(m[1]);
      if (variable) break;
    }
    if (!variable) return;
    const longhands = SHORTHAND_LONGHANDS[prop];
    if (longhands) {
      for (const lh of longhands) {
        const lhExisting = matches.get(lh);
        const lhPrevSpec = matchSpecificity.get(lh) ?? -1;
        if (!lhExisting || isRawUtility(lhExisting.variable) || specificity >= lhPrevSpec) {
          matches.set(lh, { variable, property: lh });
          matchSpecificity.set(lh, specificity);
        }
      }
    } else {
      matches.set(prop, { variable, property: prop });
      matchSpecificity.set(prop, specificity);
    }
  };
  const tryClear = (prop, raw) => {
    if (!raw || raw === "") return;
    if (raw.includes("var(")) return;
    matches.delete(prop);
  };
  if (htmlEl.style && htmlEl.style.length > 0) {
    for (let i3 = 0; i3 < htmlEl.style.length; i3++) {
      const prop = htmlEl.style.item(i3);
      const raw = htmlEl.style.getPropertyValue(prop);
      tryMatch(prop, raw);
      tryClear(prop, raw);
    }
    for (const shorthand of Object.keys(SHORTHAND_LONGHANDS)) {
      const raw = htmlEl.style.getPropertyValue(shorthand);
      if (raw) tryMatch(shorthand, raw);
    }
  }
  const scopeClasses = scopeSelector?.match(/\.[a-zA-Z0-9_-]+/g) || null;
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (!(rule instanceof CSSStyleRule)) continue;
          if (!element.matches(rule.selectorText)) continue;
          const ruleClasses = rule.selectorText.match(/\.[a-zA-Z0-9_-]+/g) || [];
          if (scopeClasses) {
            if (ruleClasses.length === 0) continue;
            if (!ruleClasses.every((rc) => scopeClasses.includes(rc))) continue;
          }
          const ruleSpecificity = ruleClasses.length;
          for (let i3 = 0; i3 < rule.style.length; i3++) {
            const prop = rule.style.item(i3);
            const raw = rule.style.getPropertyValue(prop);
            tryMatch(prop, raw, ruleSpecificity);
            tryClear(prop, raw);
          }
          for (const shorthand of Object.keys(SHORTHAND_LONGHANDS)) {
            const raw = rule.style.getPropertyValue(shorthand);
            if (raw) tryMatch(shorthand, raw, ruleSpecificity);
          }
        }
      } catch {
      }
    }
  } catch {
  }
}
function getAlternativeVariables(property, currentVariable) {
  const registry = getVariableRegistry();
  const kebab = camelToKebab(property);
  const category = getCategoryForProperty(kebab);
  if (!category) return [];
  const group = registry.groups.get(category);
  if (!group) return [];
  return group.filter((t) => {
    if (!Object.keys(t.values).includes(kebab)) return false;
    if (currentVariable && t.className === currentVariable.className) return false;
    if (isRawUtility(t)) return false;
    return true;
  });
}
function findVariableForValue(property, value) {
  const registry = getVariableRegistry();
  const kebab = camelToKebab(property);
  const key = `${kebab}:${normalizeValue2(value)}`;
  const directMatches = registry.valueLookup.get(key);
  if (directMatches && directMatches.length > 0) {
    return directMatches[0];
  }
  const category = getCategoryForProperty(kebab);
  if (!category) return null;
  const group = registry.groups.get(category);
  if (!group) return null;
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return null;
  let closest = null;
  let closestDist = Infinity;
  for (const token of group) {
    const tokenVal = token.values[kebab];
    if (!tokenVal) continue;
    const tokenNum = parseFloat(tokenVal);
    if (isNaN(tokenNum)) continue;
    const dist = Math.abs(tokenNum - numValue);
    if (dist < closestDist) {
      closestDist = dist;
      closest = token;
    }
  }
  if (closest && closestDist <= Math.max(2, numValue * 0.1)) {
    return closest;
  }
  return null;
}
function normalizeValue2(val) {
  return val.trim().toLowerCase().replace(/\s+/g, " ");
}
function camelToKebab(str) {
  return str.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
}
function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
}
function isRawUtility(variable) {
  if (variable.layerName === "utilities") return true;
  if (!variable.layerName) return TW_PREFIX_LEGACY.test(variable.className);
  return false;
}
function categoryFromValue(value) {
  const v = value.trim().toLowerCase();
  if (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl") || v.startsWith("oklch") || v.startsWith("oklab")) {
    return "colors";
  }
  const num = parseFloat(v);
  if (!isNaN(num) && /^\d{3}$/.test(v)) {
    return "font-weight";
  }
  if (v.includes(",") || /^(sans-serif|serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace)/.test(v)) {
    return "font-family";
  }
  if (!isNaN(num) && (v.endsWith("px") || v.endsWith("rem") || v.endsWith("em"))) {
    return "spacing";
  }
  if (isSpaceSeparatedRgb(v)) return "colors";
  return null;
}
function categorizeVariable(token) {
  for (const { pattern, category } of VAR_CATEGORY_PATTERNS) {
    if (pattern.test(token.name)) return category;
  }
  return categoryFromValue(token.value);
}
function buildVariableUsageMap() {
  const usageMap = /* @__PURE__ */ new Map();
  function scanRuleList(rules) {
    for (let i3 = 0; i3 < rules.length; i3++) {
      const rule = rules[i3];
      if (rule instanceof CSSGroupingRule || typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
        scanRuleList(rule.cssRules);
        continue;
      }
      if (!(rule instanceof CSSStyleRule)) continue;
      if (!rule.cssText.includes("var(")) continue;
      for (let j = 0; j < rule.style.length; j++) {
        const prop = rule.style.item(j);
        if (prop.startsWith("--")) continue;
        const raw = rule.style.getPropertyValue(prop);
        extractVarUsages(prop, raw, usageMap);
      }
      for (const shorthand of Object.keys(SHORTHAND_LONGHANDS)) {
        const raw = rule.style.getPropertyValue(shorthand);
        if (raw && raw.includes("var(")) {
          for (const lh of SHORTHAND_LONGHANDS[shorthand]) {
            extractVarUsages(lh, raw, usageMap);
          }
        }
      }
    }
  }
  try {
    for (const sheet of document.styleSheets) {
      try {
        scanRuleList(sheet.cssRules);
      } catch {
      }
    }
  } catch {
  }
  return usageMap;
}
function extractVarUsages(prop, raw, map) {
  if (!raw.includes("var(")) return;
  VAR_REF_RE.lastIndex = 0;
  let m;
  while ((m = VAR_REF_RE.exec(raw)) !== null) {
    const varName = m[1];
    if (!map.has(varName)) map.set(varName, /* @__PURE__ */ new Set());
    map.get(varName).add(prop);
  }
}
function categorizeFromUsage(varName, usageMap) {
  const props = usageMap.get(varName);
  if (!props || props.size === 0) return null;
  const counts = /* @__PURE__ */ new Map();
  for (const prop of props) {
    const cat = getCategoryForProperty(prop);
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best = null;
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) {
      best = cat;
      bestCount = count;
    }
  }
  return best;
}
function getCssVariables() {
  const sheetCount = typeof document !== "undefined" ? document.styleSheets.length : 0;
  if (cssVarCache && cssVarSheetCount === sheetCount) return cssVarCache;
  const tokenMap = scanDesignTokens();
  const usageMap = buildVariableUsageMap();
  const tokens = [];
  const byCategory = /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set();
  for (const dt of tokenMap.tokens) {
    if (seen.has(dt.name)) continue;
    seen.add(dt.name);
    if (FRAMEWORK_INTERNAL_PREFIXES.some((p) => dt.name.startsWith(p))) continue;
    const category = categorizeFromUsage(dt.name, usageMap) ?? categorizeVariable(dt);
    if (!category) continue;
    const ut = {
      className: `var(${dt.name})`,
      values: { [dt.name]: normalizeColorValue(dt.value) }
    };
    tokens.push(ut);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(ut);
  }
  cssVarCache = { tokens, byCategory };
  cssVarSheetCount = sheetCount;
  return cssVarCache;
}
function getVariablesForProperty(property) {
  const kebab = camelToKebab(property);
  const category = getCategoryForProperty(kebab);
  if (!category) return [];
  const cssVars = getCssVariables().byCategory.get(category) || [];
  const registry = getVariableRegistry();
  const classTokens = (registry.groups.get(category) || []).filter((t) => Object.keys(t.values).includes(kebab));
  return [...classTokens, ...cssVars];
}
function hasVariablesForProperty(property) {
  const kebab = camelToKebab(property);
  const category = getCategoryForProperty(kebab);
  if (!category) return false;
  const { byCategory } = getCssVariables();
  if ((byCategory.get(category)?.length ?? 0) > 0) return true;
  const registry = getVariableRegistry();
  return (registry.groups.get(category) || []).some((t) => Object.keys(t.values).includes(kebab));
}
function camelToKebab2(prop) {
  if (prop.startsWith("webkit") || prop.startsWith("moz") || prop.startsWith("ms")) {
    return "-" + prop.replace(/([A-Z])/g, "-$1").toLowerCase();
  }
  return prop.replace(/([A-Z])/g, "-$1").toLowerCase();
}
function truncate(str, len) {
  const cleaned = str.replace(/\s+/g, " ").trim();
  return cleaned.length > len ? cleaned.slice(0, len) + "\u2026" : cleaned;
}
function findStyleSources(element, properties) {
  const result = /* @__PURE__ */ new Map();
  for (const prop of properties) {
    result.set(prop, []);
  }
  const inlineStyle = element.style;
  if (inlineStyle) {
    for (const prop of properties) {
      const kebab = camelToKebab2(prop);
      let value = inlineStyle.getPropertyValue(kebab);
      let matchedProperty = kebab;
      if (!value) {
        const shorthand = LONGHAND_TO_SHORTHAND[kebab];
        if (shorthand) {
          value = inlineStyle.getPropertyValue(shorthand);
          matchedProperty = shorthand;
        }
      }
      if (value) {
        result.get(prop).push({
          property: matchedProperty,
          value: value.trim(),
          selector: "[inline]",
          origin: "inline",
          important: inlineStyle.getPropertyPriority(matchedProperty) === "important"
        });
      }
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      const href = sheet.href || sheet.ownerNode?.textContent?.slice(0, 50) || "embedded";
      walkRules2(sheet.cssRules, element, properties, result, formatSheetName(href));
    } catch {
    }
  }
  for (const [, sources] of result) {
    sources.sort((a4, b) => {
      if (a4.origin === "inline" && b.origin !== "inline") return -1;
      if (b.origin === "inline" && a4.origin !== "inline") return 1;
      if (a4.important && !b.important) return -1;
      if (b.important && !a4.important) return 1;
      return 0;
    });
  }
  return result;
}
function walkRules2(rules, element, properties, result, sheetName, mediaQuery) {
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule) {
      walkRules2(rule.cssRules, element, properties, result, sheetName, rule.conditionText);
    } else if (rule instanceof CSSStyleRule) {
      try {
        if (!element.matches(rule.selectorText)) continue;
      } catch {
        continue;
      }
      const style = rule.style;
      for (const prop of properties) {
        const kebab = camelToKebab2(prop);
        let value = style.getPropertyValue(kebab);
        let matchedProperty = kebab;
        if (!value) {
          const shorthand = LONGHAND_TO_SHORTHAND[kebab];
          if (shorthand) {
            value = style.getPropertyValue(shorthand);
            matchedProperty = shorthand;
          }
        }
        if (value) {
          const source = {
            property: matchedProperty,
            value: value.trim(),
            selector: rule.selectorText,
            origin: "stylesheet",
            stylesheet: sheetName,
            important: style.getPropertyPriority(matchedProperty) === "important"
          };
          if (mediaQuery) {
            source.mediaQuery = mediaQuery;
          }
          result.get(prop).push(source);
        }
      }
    }
  }
}
function formatSheetName(href) {
  if (href === "embedded") return "embedded <style>";
  try {
    const url = new URL(href);
    const path = url.pathname;
    return path.replace(/^\/_next\/static\/css\//, "").replace(/^\//, "");
  } catch {
    return href.slice(0, 80);
  }
}
function stripPseudoState(selector2) {
  for (const pseudo of PSEUDO_STATES) {
    if (selector2.endsWith(pseudo)) {
      return selector2.slice(0, -pseudo.length);
    }
  }
  return selector2;
}
function resolvePropertyCandidates(prop, tokenMap, element) {
  const kebab = camelToKebab2(prop.property);
  getVariableRegistry();
  let recommended;
  const utilToken = findVariableForValue(kebab, prop.to);
  if (utilToken) {
    const tokenVal = utilToken.values[kebab] || "";
    const normalizedToken = tokenVal.trim().toLowerCase();
    const normalizedTarget = prop.to.trim().toLowerCase();
    const isExact = normalizedToken === normalizedTarget;
    const candidateType = isRawUtility(utilToken) ? "utility-class" : "semantic-token";
    recommended = {
      type: candidateType,
      name: utilToken.className,
      value: tokenVal,
      exact: isExact,
      distance: isExact ? void 0 : `nearest: ${tokenVal} vs ${prop.to}`
    };
  }
  const SKIP_CSS_VAR_PROPS = /* @__PURE__ */ new Set(["top", "right", "bottom", "left", "transform"]);
  const cssVarMatches = SKIP_CSS_VAR_PROPS.has(kebab) ? [] : findTokensForValue(prop.to, tokenMap);
  const cssVariables = cssVarMatches.slice(0, MAX_CSS_VARS);
  if (!recommended && cssVariables.length > 0) {
    recommended = {
      type: "css-variable",
      name: `var(${cssVariables[0]})`,
      value: prop.to,
      exact: true
    };
  }
  const alternatives = [];
  const altTokens = getAlternativeVariables(kebab, utilToken || void 0);
  for (const alt of altTokens) {
    if (alternatives.length >= MAX_ALTERNATIVES) break;
    const altVal = alt.values[kebab];
    if (!altVal) continue;
    if (recommended && alt.className === recommended.name) continue;
    alternatives.push({
      type: isRawUtility(alt) ? "utility-class" : "semantic-token",
      name: alt.className,
      value: altVal,
      exact: altVal.trim().toLowerCase() === prop.to.trim().toLowerCase()
    });
  }
  let source;
  let conflicts;
  if (element) {
    try {
      const sources = findStyleSources(element, [prop.property]);
      const propSources = sources.get(prop.property) || [];
      if (propSources.length > 0) {
        const winner = propSources[0];
        source = {
          selector: winner.selector,
          origin: winner.origin,
          stylesheet: winner.stylesheet,
          important: winner.important,
          mediaQuery: winner.mediaQuery
        };
        if (propSources.length > 1) {
          conflicts = propSources.slice(1, 4).map((s2) => ({
            selector: s2.selector,
            value: s2.value,
            important: s2.important
          }));
        }
      }
    } catch {
    }
  }
  return {
    ...prop,
    recommended,
    alternatives,
    cssVariables,
    source,
    conflicts
  };
}
function enrichPropertyChanges(changes, tokenMap, selector2) {
  let element = null;
  try {
    const baseSelector = stripPseudoState(selector2);
    element = document.querySelector(baseSelector);
  } catch {
  }
  return changes.filter((c3) => !c3.property.startsWith("__")).map((c3) => resolvePropertyCandidates(c3, tokenMap, element));
}
var PROPERTY_CATEGORY, UTILITY_STEMS, SEMANTIC_STEMS, UTILITY_KEYWORD_VALUES, VARIANT_PREFIX, ARIA_LABELS, MAX_UTILITY_PROPS, cachedRegistry, cachedSheetCount, SPACE_RGB_RE, FRAMEWORK_INTERNAL_PREFIXES, VAR_REF_RE, SHORTHAND_LONGHANDS, TW_PREFIX_LEGACY, cssVarCache, cssVarSheetCount, VAR_CATEGORY_PATTERNS, LONGHAND_TO_SHORTHAND, MAX_ALTERNATIVES, MAX_CSS_VARS, PSEUDO_STATES;
var init_chunk_HFZOOAXJ = __esm({
  "../node_modules/retune/dist/chunk-HFZOOAXJ.js"() {
    init_chunk_THD5EQWV();
    init_finder();
    init_parsel();
    PROPERTY_CATEGORY = {
      // Spacing
      "padding": "spacing",
      "padding-top": "spacing",
      "padding-right": "spacing",
      "padding-bottom": "spacing",
      "padding-left": "spacing",
      "padding-inline": "spacing",
      "padding-inline-start": "spacing",
      "padding-inline-end": "spacing",
      "padding-block": "spacing",
      "padding-block-start": "spacing",
      "padding-block-end": "spacing",
      "margin": "spacing",
      "margin-top": "spacing",
      "margin-right": "spacing",
      "margin-bottom": "spacing",
      "margin-left": "spacing",
      "margin-inline": "spacing",
      "margin-inline-start": "spacing",
      "margin-inline-end": "spacing",
      "margin-block": "spacing",
      "margin-block-start": "spacing",
      "margin-block-end": "spacing",
      "gap": "spacing",
      "row-gap": "spacing",
      "column-gap": "spacing",
      // Sizing
      "width": "sizing",
      "height": "sizing",
      "min-width": "sizing",
      "max-width": "sizing",
      "min-height": "sizing",
      "max-height": "sizing",
      "inline-size": "sizing",
      "block-size": "sizing",
      "min-inline-size": "sizing",
      "max-inline-size": "sizing",
      "min-block-size": "sizing",
      "max-block-size": "sizing",
      // Colors
      "color": "colors",
      "background-color": "colors",
      "border-color": "colors",
      "border-top-color": "colors",
      "border-right-color": "colors",
      "border-bottom-color": "colors",
      "border-left-color": "colors",
      "border-inline-start-color": "colors",
      "border-inline-end-color": "colors",
      "border-block-start-color": "colors",
      "border-block-end-color": "colors",
      "outline-color": "colors",
      "text-decoration-color": "colors",
      "accent-color": "colors",
      "caret-color": "colors",
      "fill": "colors",
      "stroke": "colors",
      // Typography (per-property categories)
      "font-size": "font-size",
      "font-weight": "font-weight",
      "line-height": "line-height",
      "letter-spacing": "letter-spacing",
      "font-family": "font-family",
      // Border radius
      "border-radius": "border-radius",
      "border-top-left-radius": "border-radius",
      "border-top-right-radius": "border-radius",
      "border-bottom-left-radius": "border-radius",
      "border-bottom-right-radius": "border-radius",
      "border-start-start-radius": "border-radius",
      "border-start-end-radius": "border-radius",
      "border-end-start-radius": "border-radius",
      "border-end-end-radius": "border-radius",
      // Border width
      "border-width": "border-width",
      "border-top-width": "border-width",
      "border-right-width": "border-width",
      "border-bottom-width": "border-width",
      "border-left-width": "border-width",
      "border-inline-start-width": "border-width",
      "border-inline-end-width": "border-width",
      "border-block-start-width": "border-width",
      "border-block-end-width": "border-width",
      // Box shadow
      "box-shadow": "box-shadow",
      // Opacity
      "opacity": "opacity",
      // Layout
      "display": "layout",
      "flex-direction": "layout",
      "align-items": "layout",
      "justify-content": "layout",
      "flex-wrap": "layout",
      "position": "layout"
    };
    UTILITY_STEMS = /* @__PURE__ */ new Set([
      // Spacing
      "m",
      "mx",
      "my",
      "mt",
      "mr",
      "mb",
      "ml",
      "ms",
      "me",
      "p",
      "px",
      "py",
      "pt",
      "pr",
      "pb",
      "pl",
      "ps",
      "pe",
      "space",
      "gap",
      // Sizing
      "w",
      "h",
      "min-w",
      "max-w",
      "min-h",
      "max-h",
      "size",
      // Typography
      "text",
      "font",
      "leading",
      "tracking",
      "indent",
      // Colors
      "bg",
      "from",
      "via",
      "to",
      // Borders
      "border",
      "rounded",
      "ring",
      "outline",
      "divide",
      // Layout
      "flex",
      "grid",
      "col",
      "row",
      "place",
      "items",
      "justify",
      "self",
      "order",
      "float",
      "clear",
      "basis",
      "grow",
      "shrink",
      "wrap",
      // Positioning
      "inset",
      "top",
      "right",
      "bottom",
      "left",
      "z",
      // Visual
      "shadow",
      "opacity",
      "blur",
      "brightness",
      "contrast",
      "saturate",
      "backdrop",
      "mix-blend",
      // Behavior
      "overflow",
      "overscroll",
      "scroll",
      "snap",
      "touch",
      "select",
      "cursor",
      "pointer-events",
      "resize",
      "appearance",
      // Transitions
      "transition",
      "duration",
      "ease",
      "delay",
      "animate",
      // Transforms
      "scale",
      "rotate",
      "translate",
      "skew",
      "origin",
      // Other
      "aspect",
      "columns",
      "break",
      "object",
      "decoration",
      "underline",
      "overline",
      "line-through",
      "no-underline",
      "uppercase",
      "lowercase",
      "capitalize",
      "normal-case",
      "truncate",
      "antialiased",
      "subpixel-antialiased",
      "whitespace",
      "hyphens",
      "content",
      "list",
      "sr",
      "not-sr",
      "will-change",
      "fill",
      "stroke",
      "caret",
      "accent",
      "container",
      "prose",
      // Single-word Tailwind utilities
      "block",
      "inline",
      "inline-block",
      "inline-flex",
      "inline-grid",
      "hidden",
      "visible",
      "invisible",
      "collapse",
      "static",
      "relative",
      "absolute",
      "fixed",
      "sticky",
      "isolate",
      "isolation",
      "table",
      "table-caption",
      "table-cell",
      "table-column",
      "table-row",
      "table-footer-group",
      "table-header-group",
      "table-row-group",
      "table-column-group",
      "contents",
      "flow-root",
      "line-clamp",
      "italic",
      "not-italic",
      // Tailwind v4 additions
      "inset-ring",
      "inset-shadow",
      "field-sizing",
      "text-wrap",
      "text-nowrap",
      "text-balance",
      "text-pretty"
    ]);
    SEMANTIC_STEMS = /* @__PURE__ */ new Set([
      "btn",
      "button",
      "card",
      "modal",
      "nav",
      "header",
      "footer",
      "sidebar",
      "hero",
      "section",
      "container-fluid",
      "wrapper",
      "layout",
      "page",
      "view",
      "panel",
      "dialog",
      "menu",
      "toolbar",
      "badge",
      "chip",
      "avatar",
      "icon",
      "logo",
      "form",
      "input",
      "item",
      "link",
      "tab",
      "accordion",
      "carousel",
      "dropdown",
      "tooltip",
      "popover",
      "alert",
      "toast",
      "banner",
      "widget"
    ]);
    UTILITY_KEYWORD_VALUES = /* @__PURE__ */ new Set([
      // font-weight
      "thin",
      "extralight",
      "light",
      "normal",
      "medium",
      "semibold",
      "bold",
      "extrabold",
      "black",
      // leading
      "none",
      "tight",
      "snug",
      "relaxed",
      "loose",
      // tracking
      "tighter",
      "wide",
      "wider",
      "widest",
      // overflow / visibility
      "hidden",
      "visible",
      "scroll",
      "auto",
      "clip",
      // shadow
      "inner",
      "outer",
      "inset",
      // text-align / justify / align
      "left",
      "center",
      "right",
      "justify",
      "start",
      "end",
      // flex direction / wrap
      "row",
      "col",
      "wrap",
      "nowrap",
      "reverse",
      // object-fit
      "cover",
      "contain",
      "fill",
      // alignment
      "baseline",
      "stretch",
      "between",
      "around",
      "evenly",
      // cursor
      "pointer",
      "default",
      "move",
      "grab",
      "grabbing",
      "not-allowed",
      "wait",
      "crosshair",
      // misc
      "ellipsis",
      "truncate",
      "clamp"
    ]);
    VARIANT_PREFIX = /^(?:sm|md|lg|xl|2xl|3xl|4xl|5xl|min-sm|min-md|min-lg|min-xl|min-2xl|max-sm|max-md|max-lg|max-xl|max-2xl|dark|light|hover|focus|focus-within|focus-visible|active|visited|target|first|last|only|odd|even|first-of-type|last-of-type|only-of-type|empty|disabled|enabled|checked|indeterminate|default|required|valid|invalid|in-range|out-of-range|placeholder-shown|autofill|read-only|open|closed|before|after|first-letter|first-line|marker|selection|file|backdrop|placeholder|group-hover|group-focus|group-active|group-first|group-last|peer-hover|peer-focus|peer-checked|peer-disabled|has|not|is|where|supports|aria|data|rtl|ltr|print|portrait|landscape|motion-safe|motion-reduce|contrast-more|contrast-less|forced-colors):/;
    ARIA_LABELS = {
      "aria-expanded": { "true": "Expanded", "false": "Collapsed" },
      "aria-selected": { "true": "Selected", "false": "Deselected" },
      "aria-disabled": { "true": "Disabled" },
      "aria-checked": { "true": "Checked", "mixed": "Partially Checked" },
      "aria-pressed": { "true": "Pressed", "mixed": "Partially Pressed" },
      "aria-current": { "page": "Current Page", "step": "Current Step", "true": "Current" },
      "aria-hidden": { "true": "Hidden" },
      "aria-busy": { "true": "Loading" },
      "aria-invalid": { "true": "Invalid", "grammar": "Grammar Error", "spelling": "Spelling Error" },
      "aria-required": { "true": "Required" },
      "aria-modal": { "true": "Modal" }
    };
    MAX_UTILITY_PROPS = 1;
    cachedRegistry = null;
    cachedSheetCount = -1;
    SPACE_RGB_RE = /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/;
    FRAMEWORK_INTERNAL_PREFIXES = ["--tw-", "--chakra-", "--mantine-", "--radix-", "--nextui-"];
    VAR_REF_RE = /var\((--[a-zA-Z0-9_-]+)/g;
    SHORTHAND_LONGHANDS = {
      "padding": ["padding-top", "padding-right", "padding-bottom", "padding-left"],
      "margin": ["margin-top", "margin-right", "margin-bottom", "margin-left"],
      "border-radius": ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"],
      "gap": ["row-gap", "column-gap"],
      "border-width": ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"],
      "border-color": ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color"],
      "border-style": ["border-top-style", "border-right-style", "border-bottom-style", "border-left-style"],
      "inset": ["top", "right", "bottom", "left"]
    };
    TW_PREFIX_LEGACY = /^-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|w|h|min-w|max-w|min-h|max-h|gap|space-[xy]|text|bg|border|rounded|shadow|opacity|font|leading|tracking|z|inset|top|right|bottom|left|flex|grid|grid-cols|col-span|row-span|items|justify|self|place|order|overflow|ring|outline|divide|sr|not-sr|container|aspect|columns|break|decoration|underline|overline|no-underline|cursor|transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin|fill|stroke|will-change|hidden|block|inline|inline-flex|inline-block|table|absolute|relative|fixed|sticky|float|clear|isolate|object|whitespace|align|indent|truncate|uppercase|lowercase|capitalize|normal-case|italic|not-italic|antialiased|subpixel|select|resize|appearance|accent|caret|snap|touch|scroll|hyphens|content|list)($|-)/;
    cssVarCache = null;
    cssVarSheetCount = -1;
    VAR_CATEGORY_PATTERNS = [
      { pattern: /^--(spacing|space|gap|pad|margin)/i, category: "spacing" },
      { pattern: /^--(size|width|height)/i, category: "sizing" },
      { pattern: /^--(color|bg|text-color|border-color|foreground|background|accent|muted|destructive|primary|secondary)/i, category: "colors" },
      { pattern: /^--(font-size|text-(?:xs|sm|base|lg|xl|\d))/i, category: "font-size" },
      { pattern: /^--(font-weight|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black))/i, category: "font-weight" },
      { pattern: /^--(leading|line-height)/i, category: "line-height" },
      { pattern: /^--(tracking|letter-spacing|letter)/i, category: "letter-spacing" },
      { pattern: /^--(font-family|font-(?:sans|serif|mono|display|body|heading))/i, category: "font-family" },
      { pattern: /^--(font|text)/i, category: "font-size" },
      { pattern: /^--(radius|border-radius|rounded)/i, category: "border-radius" },
      { pattern: /^--(border-width|border-w|stroke-width)/i, category: "border-width" },
      { pattern: /^--(shadow)/i, category: "box-shadow" },
      { pattern: /^--(opacity|alpha)/i, category: "opacity" }
    ];
    LONGHAND_TO_SHORTHAND = {
      "padding-top": "padding",
      "padding-right": "padding",
      "padding-bottom": "padding",
      "padding-left": "padding",
      "margin-top": "margin",
      "margin-right": "margin",
      "margin-bottom": "margin",
      "margin-left": "margin",
      "border-top-width": "border-width",
      "border-right-width": "border-width",
      "border-bottom-width": "border-width",
      "border-left-width": "border-width",
      "border-top-color": "border-color",
      "border-right-color": "border-color",
      "border-bottom-color": "border-color",
      "border-left-color": "border-color",
      "border-top-style": "border-style",
      "border-right-style": "border-style",
      "border-bottom-style": "border-style",
      "border-left-style": "border-style",
      "border-top-left-radius": "border-radius",
      "border-top-right-radius": "border-radius",
      "border-bottom-left-radius": "border-radius",
      "border-bottom-right-radius": "border-radius",
      "gap": "gap",
      "row-gap": "gap",
      "column-gap": "gap"
    };
    MAX_ALTERNATIVES = 3;
    MAX_CSS_VARS = 2;
    PSEUDO_STATES = [":hover", ":focus", ":active", ":focus-visible", ":focus-within"];
  }
});

// ../node_modules/retune/dist/tokens-JIHAQ2SJ.js
var tokens_JIHAQ2SJ_exports = {};
__export(tokens_JIHAQ2SJ_exports, {
  detectStylingApproach: () => detectStylingApproach,
  findTokensForValue: () => findTokensForValue,
  scanDesignTokens: () => scanDesignTokens,
  summarizeTokenSystem: () => summarizeTokenSystem
});
var init_tokens_JIHAQ2SJ = __esm({
  "../node_modules/retune/dist/tokens-JIHAQ2SJ.js"() {
    init_chunk_THD5EQWV();
  }
});

// ../node_modules/retune/dist/candidates-UBMLY2KQ.js
var candidates_UBMLY2KQ_exports = {};
__export(candidates_UBMLY2KQ_exports, {
  enrichPropertyChanges: () => enrichPropertyChanges,
  stripPseudoState: () => stripPseudoState
});
var init_candidates_UBMLY2KQ = __esm({
  "../node_modules/retune/dist/candidates-UBMLY2KQ.js"() {
    init_chunk_HFZOOAXJ();
    init_chunk_THD5EQWV();
  }
});

// ../node_modules/retune/dist/index.js
init_chunk_HFZOOAXJ();
init_chunk_THD5EQWV();
import e, { createContext, forwardRef, useRef, useState, useCallback, useLayoutEffect, useEffect, Fragment, memo, useMemo, useContext } from "react";
import { createPortal } from "react-dom";
import { jsxs, jsx, Fragment as Fragment$1 } from "react/jsx-runtime";
var overlay_css_default = `:host {
  all: initial;
  font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;
  font-size: 13px;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  line-height: 1.4;
  interpolate-size: allow-keywords;

  /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
     PRIMITIVES \u2014 raw palette, never change
     \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

  /* \u2500\u2500 Black (#1c1917) opacity ramp \u2500\u2500 */
  --retune-black: #1c1917;
  --retune-black-5:  color-mix(in srgb, var(--retune-black) 5%, transparent);
  --retune-black-10: color-mix(in srgb, var(--retune-black) 10%, transparent);
  --retune-black-15: color-mix(in srgb, var(--retune-black) 15%, transparent);
  --retune-black-20: color-mix(in srgb, var(--retune-black) 20%, transparent);
  --retune-black-25: color-mix(in srgb, var(--retune-black) 25%, transparent);
  --retune-black-30: color-mix(in srgb, var(--retune-black) 30%, transparent);
  --retune-black-35: color-mix(in srgb, var(--retune-black) 35%, transparent);
  --retune-black-40: color-mix(in srgb, var(--retune-black) 40%, transparent);
  --retune-black-45: color-mix(in srgb, var(--retune-black) 45%, transparent);
  --retune-black-50: color-mix(in srgb, var(--retune-black) 50%, transparent);
  --retune-black-55: color-mix(in srgb, var(--retune-black) 55%, transparent);
  --retune-black-60: color-mix(in srgb, var(--retune-black) 60%, transparent);
  --retune-black-65: color-mix(in srgb, var(--retune-black) 65%, transparent);
  --retune-black-70: color-mix(in srgb, var(--retune-black) 70%, transparent);
  --retune-black-75: color-mix(in srgb, var(--retune-black) 75%, transparent);
  --retune-black-80: color-mix(in srgb, var(--retune-black) 80%, transparent);
  --retune-black-85: color-mix(in srgb, var(--retune-black) 85%, transparent);
  --retune-black-90: color-mix(in srgb, var(--retune-black) 90%, transparent);
  --retune-black-95: color-mix(in srgb, var(--retune-black) 95%, transparent);

  /* \u2500\u2500 White (#ffffff) opacity ramp \u2500\u2500 */
  --retune-white: #ffffff;
  --retune-white-5:  color-mix(in srgb, var(--retune-white) 5%, transparent);
  --retune-white-10: color-mix(in srgb, var(--retune-white) 10%, transparent);
  --retune-white-15: color-mix(in srgb, var(--retune-white) 15%, transparent);
  --retune-white-20: color-mix(in srgb, var(--retune-white) 20%, transparent);
  --retune-white-25: color-mix(in srgb, var(--retune-white) 25%, transparent);
  --retune-white-30: color-mix(in srgb, var(--retune-white) 30%, transparent);
  --retune-white-35: color-mix(in srgb, var(--retune-white) 35%, transparent);
  --retune-white-40: color-mix(in srgb, var(--retune-white) 40%, transparent);
  --retune-white-45: color-mix(in srgb, var(--retune-white) 45%, transparent);
  --retune-white-50: color-mix(in srgb, var(--retune-white) 50%, transparent);
  --retune-white-55: color-mix(in srgb, var(--retune-white) 55%, transparent);
  --retune-white-60: color-mix(in srgb, var(--retune-white) 60%, transparent);
  --retune-white-65: color-mix(in srgb, var(--retune-white) 65%, transparent);
  --retune-white-70: color-mix(in srgb, var(--retune-white) 70%, transparent);
  --retune-white-75: color-mix(in srgb, var(--retune-white) 75%, transparent);
  --retune-white-80: color-mix(in srgb, var(--retune-white) 80%, transparent);
  --retune-white-85: color-mix(in srgb, var(--retune-white) 85%, transparent);
  --retune-white-90: color-mix(in srgb, var(--retune-white) 90%, transparent);
  --retune-white-95: color-mix(in srgb, var(--retune-white) 95%, transparent);

  /* \u2500\u2500 Blue (Figma blue ramp) \u2500\u2500 */
  --retune-blue-100: #F2F9FF;
  --retune-blue-200: #E5F4FF;
  --retune-blue-300: #BDE3FF;
  --retune-blue-400: #80CAFF;
  --retune-blue-500: #0D99FF;
  --retune-blue-600: #007BE5;
  --retune-blue-700: #0768CF;
  --retune-blue-800: #034AC1;
  --retune-blue-900: #093077;
  --retune-blue-1000: #0D193F;

  /* \u2500\u2500 Red (Tailwind red ramp) \u2500\u2500 */
  --retune-red-100: #FFF5F5;
  --retune-red-200: #FFE2E0;
  --retune-red-300: #FFC7C2;
  --retune-red-400: #FFAFA3;
  --retune-red-500: #F24822;
  --retune-red-600: #DC3412;
  --retune-red-700: #BD2915;
  --retune-red-800: #9F1F18;
  --retune-red-900: #771208;
  --retune-red-1000: #660E0B;

  /* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
     SEMANTIC \u2014 swap these for dark mode
     \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */

  /* \u2500\u2500 Always (mode-independent) \u2500\u2500 */
  --retune-always-white: #ffffff;
  --retune-always-black: #1c1917;

  /* \u2500\u2500 Text \u2500\u2500 */
  --retune-text: var(--retune-black);
  --retune-text-secondary: var(--retune-black-70);
  --retune-text-tertiary: var(--retune-black-50);
  --retune-text-disabled: var(--retune-black-25);

  /* \u2500\u2500 Surfaces \u2500\u2500 */
  --retune-surface: var(--retune-white);
  --retune-surface-hover: var(--retune-black-5);
  --retune-surface-active: var(--retune-black-5);
  --retune-input-bg: var(--retune-black-5);
  --retune-input-bg-hover: var(--retune-black-10);

  /* \u2500\u2500 Borders & shadows \u2500\u2500 */
  --retune-border: var(--retune-black-10);
  --retune-border-hover: var(--retune-black-15);
  --retune-border-subtle: var(--retune-black-5);
  --retune-shadow: var(--retune-black-10);

  /* \u2500\u2500 Blue \u2500\u2500 */
  --retune-blue: var(--retune-blue-500);
  --retune-blue-text: var(--retune-blue-700);
  --retune-blue-bg: var(--retune-blue-200);
  --retune-blue-bg-hover: var(--retune-blue-100);

  /* \u2500\u2500 Red \u2500\u2500 */
  --retune-red: var(--retune-red-500);
}

/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
   DARK MODE \u2014 swap semantic tokens only
   \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */
:host(.dark) {
  /* \u2500\u2500 Text \u2500\u2500 */
  --retune-text: var(--retune-white);
  --retune-text-secondary: var(--retune-white-70);
  --retune-text-tertiary: var(--retune-white-50);
  --retune-text-disabled: var(--retune-white-25);

  /* \u2500\u2500 Surfaces \u2500\u2500 */
  --retune-surface: color-mix(in srgb, var(--retune-black) 95%, var(--retune-white));
  --retune-surface-hover: var(--retune-white-5);
  --retune-surface-active: var(--retune-white-5);
  --retune-input-bg: var(--retune-white-5);
  --retune-input-bg-hover: var(--retune-white-10);

  /* \u2500\u2500 Borders & shadows \u2500\u2500 */
  --retune-border: var(--retune-white-10);
  --retune-border-hover: var(--retune-white-15);
  --retune-border-subtle: var(--retune-white-5);
  --retune-shadow: var(--retune-white-5);

  /* \u2500\u2500 Blue \u2500\u2500 */
  --retune-blue-text: var(--retune-blue-500);
  --retune-blue-bg: color-mix(in srgb, var(--retune-blue-700) 50%, transparent);
  --retune-blue-bg-hover: color-mix(in srgb, var(--retune-blue-700) 75%, transparent);

  /* \u2500\u2500 Red \u2500\u2500 */
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* \u2500\u2500 Toolbar \u2500\u2500 */
@keyframes retune-icon-in {
  from { filter: blur(2px); transform: scale(0.9); }
  to   { filter: blur(0);   transform: scale(1); }
}

.retune-toolbar {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
  background: var(--retune-surface);
  border-radius: 999px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
  height: 44px;
  padding: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  overflow: hidden;
  cursor: default;
  transition: padding 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              gap 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              width 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              background 0.15s ease;
}

.retune-toolbar.collapsed {
  padding: 0;
  gap: 0;
  width: 44px;
  cursor: pointer;
  overflow: visible;
  transition: transform 100ms ease, background 0.15s ease;
}
.retune-toolbar.collapsed:active {
  transform: scale(0.97);
}

.retune-toolbar.collapsed:hover {
  background: color-mix(in srgb, var(--retune-black) 5%, var(--retune-surface));
}

.retune-toolbar.top.right { top: 16px; right: 16px; }
.retune-toolbar.top.left { top: 16px; left: 16px; }
.retune-toolbar.bottom.right { bottom: 16px; right: 16px; }
.retune-toolbar.bottom.left { bottom: 16px; left: 16px; }

/* Collapse button (cursor-click) */
.retune-toolbar-collapse-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--retune-text);
  padding: 12px;
  width: 44px;
  height: 44px;
  background: transparent;
  flex-shrink: 0;
  transition: width 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              height 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              padding 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              opacity 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              filter 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
}

.retune-changes-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at center, #fff 1px, #0D99FF 1px);
  pointer-events: none;
}

/* When expanded: collapse button shrinks away */
.retune-toolbar.expanded .retune-toolbar-collapse-btn {
  position: absolute;
  width: 0;
  height: 0;
  padding: 0;
  opacity: 0;
  filter: blur(8px);
  transform: scale(0.8);
  overflow: hidden;
  pointer-events: none;
}

/* Expanded inner container */
.retune-toolbar-expanded {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 300px;
  transition: max-width 0.2s cubic-bezier(0.23, 1, 0.32, 1),
              opacity 0.15s cubic-bezier(0.23, 1, 0.32, 1),
              gap 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  overflow: hidden;
}

/* When collapsed: expanded items hidden */
.retune-toolbar.collapsed .retune-toolbar-expanded {
  max-width: 0;
  opacity: 0;
  pointer-events: none;
  gap: 0;
}

/* Expanded action buttons */
.retune-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: var(--retune-text);
  padding: 6px;
  flex-shrink: 0;
  transition: background 0.12s ease;
}

.retune-toolbar-btn:hover { background: var(--retune-surface-hover); }

.retune-toolbar-btn.disabled,
.retune-toolbar-btn:disabled {
  opacity: 0.2;
  cursor: default;
  pointer-events: none;
}

/* Animate expanded items in */
.retune-toolbar.expanded .retune-toolbar-expanded > :nth-child(1) {
  animation: retune-icon-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) 0ms backwards;
}
.retune-toolbar.expanded .retune-toolbar-expanded > :nth-child(2) {
  animation: retune-icon-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) 20ms backwards;
}
.retune-toolbar.expanded .retune-toolbar-expanded > :nth-child(3) {
  animation: retune-icon-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) 40ms backwards;
}
.retune-toolbar.expanded .retune-toolbar-expanded > :nth-child(4) {
  animation: retune-icon-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) 60ms backwards;
}
.retune-toolbar.expanded .retune-toolbar-expanded > :nth-child(5) {
  animation: retune-icon-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) 80ms backwards;
}

/* Animate collapse button in */
.retune-toolbar.collapsed .retune-toolbar-collapse-btn {
  animation: retune-icon-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) backwards;
}

.retune-icon-flip {
  display: flex;
  transform: scaleX(-1);
}

.retune-icon-swap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.retune-icon-swap-icon {
  position: absolute;
  display: flex;
  transition: opacity 150ms cubic-bezier(0.23, 1, 0.32, 1),
              transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
              filter 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.retune-icon-swap-icon.in {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
  transition-delay: 75ms;
}

.retune-icon-swap-icon.out {
  opacity: 0;
  transform: scale(0.5);
  filter: blur(2px);
  pointer-events: none;
  transition-delay: 0ms;
}

.retune-edit-count {
  font-size: 13px;
  font-weight: 500;
  background: var(--retune-blue);
  color: var(--retune-always-white);
  min-width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  flex-shrink: 0;
  animation: retune-icon-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) backwards;
}

/* \u2500\u2500 Panel \u2500\u2500 */
.retune-panel {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
  background: var(--retune-surface);
  border: none;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 280px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  overscroll-behavior: none;
}

.retune-panel-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: clip;
  scrollbar-width: none;
}

.retune-panel-body::-webkit-scrollbar { display: none; }

.retune-panel-anim {
  display: contents;
}

.retune-panel-anim.entering .retune-panel {
  animation: retune-panel-in 0.15s cubic-bezier(0.23, 1, 0.32, 1) both;
}

.retune-panel-anim.exiting .retune-panel {
  animation: retune-panel-out 0.15s cubic-bezier(0.23, 1, 0.32, 1) both;
}

@keyframes retune-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes retune-panel-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(12px);
  }
}

.retune-panel.right { right: 16px; bottom: 68px; }
.retune-panel.left { left: 16px; bottom: 68px; }
.retune-panel { height: calc(100vh - 84px); }

/* Hide scrollbar (now on .retune-panel-body) */

.retune-el-tag {
  font-size: 11px;
  line-height: 16px;
  font-weight: 550;
  color: var(--retune-text);
}

.retune-el-component {
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: #3b82f6;
  margin-top: 1px;
}

.retune-el-text {
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text-secondary);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* \u2500\u2500 Selector field (Webflow-style class tags) \u2500\u2500 */
.retune-row-group:has(.retune-selector-field) {
  padding-left: 0;
  padding-right: 0;
}
.retune-row-group:has(.retune-selector-field) > .retune-group-label-inline {
  padding-left: 16px;
}

.retune-selector-field {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  padding: 0 16px;
}
/* Remove gap around bridge connectors \u2014 the bridge IS the connection */
/* Bridge connector between active/included pills */
.retune-selector-bridge {
  width: 8px;
  height: 16px;
  flex-shrink: 0;
  position: relative;
  z-index: -1;
  margin: 0 -8px;
}
.retune-selector-bridge.filled {
  background: var(--retune-blue-bg);
}
.retune-selector-bridge::before,
.retune-selector-bridge::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 5px;
  background: var(--retune-surface);
}
.retune-selector-bridge::before {
  top: 0;
  border-radius: 0 0 4px 4px;
}
.retune-selector-bridge::after {
  bottom: 0;
  border-radius: 4px 4px 0 0;
}

.retune-selector-field::-webkit-scrollbar { display: none; }

.retune-selector-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: var(--retune-surface-hover);
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  line-height: 16px;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.retune-selector-tag:hover {
  background: var(--retune-border);
}

.retune-selector-tag.included,
.retune-selector-tag.active {
  background: var(--retune-blue-bg);
  color: var(--retune-blue-text);
}
.retune-selector-tag.included:hover,
.retune-selector-tag.active:hover {
  background: var(--retune-blue-bg-hover);
}

.retune-selector-tag-count {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 16px;
  background: var(--retune-surface);
  color: var(--retune-text);
  padding: 0 6px;
  border-radius: 4px;
}

.retune-selector-tag.included .retune-selector-tag-count,
.retune-selector-tag.active .retune-selector-tag-count {
  color: var(--retune-blue-text);
}

:host(.dark) .retune-panel,
:host(.dark) .retune-settings-panel,
:host(.dark) .retune-toolbar,
:host(.dark) .retune-floating-dialog {
  border: 1px solid var(--retune-black);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 10%),
    0 2px 12px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.04);
}

:host(.dark) .retune-floating-dialog {
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 10%),
    0 0 0 1px rgba(0, 0, 0, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.08);
}

:host(.dark) .retune-selector-tag.included,
:host(.dark) .retune-selector-tag.active {
  color: var(--retune-white);
}

:host(.dark) .retune-selector-tag.included .retune-selector-tag-count,
:host(.dark) .retune-selector-tag.active .retune-selector-tag-count {
  background: var(--retune-white);
  color: var(--retune-blue-700);
}

.retune-selector-tag-name {
  font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}


.retune-selector-divider {
  width: 1px;
  height: 20px;
  background: var(--retune-border);
  flex-shrink: 0;
  align-self: center;
}

/* \u2500\u2500 Tab bar \u2500\u2500 */

.retune-tab-bar {
  display: flex;
  position: relative;
  padding: 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--retune-border);
}

.retune-tab-pill {
  position: absolute;
  top: 8px;
  left: 0;
  height: calc(100% - 16px);
  border-radius: 8px;
  background: var(--retune-input-bg);
  transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), width 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  pointer-events: none;
}

.retune-tab {
  width: auto;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--retune-text-tertiary);
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 0.15s;
  text-align: center;
}

.retune-tab:hover {
  color: var(--retune-text-secondary);
}

.retune-tab.active {
  color: var(--retune-text);
}

/* \u2500\u2500 Element tree \u2500\u2500 */

.retune-tree {
  padding: 4px 0;
  overflow-x: auto;
}

.retune-tree-inner {
  min-width: 100%;
  width: fit-content;
  position: relative;
}

.retune-tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 8px;
  padding-bottom: 8px;
  padding-right: 12px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
  white-space: nowrap;
}

.retune-tree-node:hover {
  background: var(--retune-surface-hover);
}

.retune-tree-node.selected {
  background: var(--retune-surface-hover);
}

.retune-tree-arrow {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--retune-text-tertiary);
  transform: rotate(-90deg);
  transition: transform 0.12s ease;
}

.retune-tree-arrow.expanded {
  transform: rotate(0deg);
}

.retune-tree-arrow.empty {
  visibility: hidden;
}

.retune-tree-tag {
  font-size: 12px;
  font-weight: 400;
  color: var(--retune-text);
  white-space: nowrap;
}

.retune-tree-qualifier {
  font-size: 11px;
  font-weight: 400;
  color: var(--retune-text-tertiary);
  white-space: nowrap;
}

.retune-tree-component {
  font-size: 10px;
  font-weight: 500;
  color: var(--retune-blue-text);
  white-space: nowrap;
  margin-left: auto;
  flex-shrink: 0;
}

.retune-tree-moved {
  font-size: 9px;
  font-weight: 500;
  color: var(--retune-blue-500);
  background: var(--retune-blue-bg);
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* \u2500\u2500 Tree drag states \u2500\u2500 */

.retune-tree-node.dragging {
  opacity: 0.3;
}

.retune-tree-node.reparent-target {
  background: color-mix(in srgb, var(--retune-blue-500) 15%, transparent);
  outline: 1.5px dashed var(--retune-blue-500);
  outline-offset: -1.5px;
  border-radius: 4px;
}

.retune-tree-drop-indicator {
  position: absolute;
  right: 0;
  height: 2px;
  background: var(--retune-blue-500);
  pointer-events: none;
  z-index: 10;
  display: none;
}

.retune-tree-drop-indicator::before {
  content: "";
  position: absolute;
  left: -3px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--retune-blue-500);
}

.retune-tree-ghost {
  position: fixed;
  pointer-events: none;
  z-index: 100;
  opacity: 0.85;
  background: var(--retune-surface);
  border: 1.5px solid var(--retune-blue-500);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--retune-text);
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* \u2500\u2500 Section structure (matches portfolio editor) \u2500\u2500 */
.retune-section {
  border-bottom: 1px solid var(--retune-border);
  user-select: none;
}

.retune-section:last-child { border-bottom: none; }
/* Remove border from last section when followed by non-section elements (e.g., scroll anchor) */
.retune-section:has(+ :not(.retune-section)) { border-bottom: none; }

.retune-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 16px;
  height: 44px;
}

.retune-section-title {
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
  color: var(--retune-text);
}

.retune-section-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--retune-text);
  cursor: pointer;
  padding: 0;
}
.retune-section-action:hover {
  background: var(--retune-surface-hover);
  color: var(--retune-text);
}

/* Variable action in section header: styled like section-action buttons, visible on section hover */
.retune-section-header .retune-variable-action {
  position: static;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  color: transparent;
  transition: color 0.15s ease;
}
.retune-section:hover .retune-section-header .retune-variable-action {
  color: var(--retune-text-secondary);
}
.retune-section-header .retune-variable-action:hover {
  color: var(--retune-text) !important;
  background: var(--retune-surface-hover);
}

.retune-section-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
}

.retune-section-row {
  padding: 0 48px 0 16px;
}
.retune-section-row:has(.retune-split-btn) {
  padding-right: 8px;
}

/* Row group: wraps multiple rows with equal vertical + horizontal gaps */
.retune-row-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 48px 0 16px;
}
.retune-row-group:has(.retune-split-btn) {
  padding-right: 8px;
}

.retune-row-group > .retune-row + .retune-row { margin-top: 4px; }

/* \u2500\u2500 Alignment buttons (position section) \u2500\u2500 */
.retune-align-row {
  display: flex;
  gap: 8px;
}

.retune-btn-group {
  display: flex;
  flex: 1;
  background: var(--retune-surface-hover);
  border-radius: 8px;
  overflow: hidden;
}

.retune-btn-group > :not(:first-child) > .retune-align-btn {
  box-shadow: inset 1px 0 0 var(--retune-surface);
}

.retune-align-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--retune-text);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease;
}

.retune-align-btn:hover {
  color: var(--retune-text);
}

.retune-align-btn:active {
  color: var(--retune-text);
}

.retune-align-btn.active {
  background: var(--retune-border);
}

/* \u2500\u2500 Alignment grid (layout section) \u2500\u2500 */
.retune-alignment-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  background: var(--retune-surface-hover);
  border-radius: 8px;
  width: 100%;
  height: 72px;
  outline: none;
}

.retune-alignment-grid:focus-visible {
  outline: 1px solid var(--retune-text);
  outline-offset: -1px;
}

.retune-alignment-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
}

.retune-alignment-cell:hover {
  color: var(--retune-text);
}

/* \u2500\u2500 Grid picker \u2500\u2500 */
.retune-grid-picker-wrap {
  position: relative;
}

.retune-grid-picker-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 72px;
  padding: 4px;
  background: var(--retune-surface-hover);
  border: 1px solid var(--retune-border);
  border-radius: 8px;
  cursor: pointer;
  box-sizing: border-box;
}

.retune-grid-picker-preview:hover {
  background: #eeeceb;
}

.retune-grid-picker-mini {
  display: grid;
  gap: 2px;
  flex: 1;
  height: 100%;
  position: relative;
}

.retune-grid-picker-mini-cell {
  background: var(--retune-surface);
  border-radius: 2px;
  min-width: 0;
  min-height: 0;
}

.retune-grid-picker-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--retune-text-secondary);
  white-space: nowrap;
  pointer-events: none;
}

.retune-grid-picker-dialog {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  padding: 8px;
  background: var(--retune-surface);
  border: 1px solid var(--retune-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.retune-grid-picker-dialog-header {
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--retune-text-secondary);
  text-align: center;
}

.retune-grid-picker-grid {
  display: grid;
  grid-template-columns: repeat(10, 18px);
  grid-template-rows: repeat(10, 18px);
  gap: 2px;
  cursor: pointer;
}

.retune-grid-picker-cell {
  border-radius: 2px;
  background: var(--retune-border);
}

.retune-grid-picker-cell.selected {
  background: #3b82f6;
}

.retune-grid-picker-cell.preview {
  background: #93c5fd;
}

/* \u2500\u2500 Constraints visual (position section) \u2500\u2500 */
.retune-constraints {
  display: flex;
  gap: 4px;
  align-items: center;
  width: 100%;
}

.retune-constraints-side {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.retune-constraints-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: stretch;
}

.retune-pin-box {
  position: relative;
  background: var(--retune-surface-hover);
  border-radius: 8px;
  width: 100%;
  height: 64px;
}

.retune-pin-line {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.retune-pin-line.top {
  left: 50%;
  transform: translateX(-50%);
  top: 2px;
}

.retune-pin-line.right {
  left: calc(75% - 2px);
  top: 24px;
}

.retune-pin-line.bottom {
  left: 50%;
  transform: translateX(-50%);
  bottom: 2px;
}

.retune-pin-line.left {
  left: calc(25% - 14px);
  top: 24px;
}

.retune-pin-center-btn {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background: var(--retune-surface);
  border: 1px solid var(--retune-border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.retune-pin-center-btn:hover {
  border-color: var(--retune-border-hover);
}

.retune-pin-center-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #3b82f6;
}

/* Row layout: flex with gap for side-by-side fields */
.retune-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

/* Direct children in a row get flex: 1 */
.retune-row > .retune-prop,
.retune-row > .retune-combo,
.retune-row > .retune-select,
.retune-row > .retune-text-input,
.retune-row > .retune-font-input,
.retune-row > .retune-slider { flex: 1; min-width: 0; }

/* Field: flex-1 column with label above input */
.retune-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.retune-field-label {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: -0.005em;
  color: var(--retune-text-secondary);
  line-height: 16px;
}

/* Group label: single label above a set of related inputs */
.retune-group-label {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: -0.005em;
  color: var(--retune-text-secondary);
  line-height: 16px;
  padding: 0 16px;
}

/* Group label inside a RowGroup (no extra horizontal padding) */
.retune-group-label-inline {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: -0.005em;
  color: var(--retune-text-secondary);
  line-height: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Split toggle button (expand/collapse shorthand) */
.retune-split-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--retune-text);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.retune-split-btn:hover {
  background: var(--retune-surface-active);
  color: var(--retune-text);
}
.retune-split-btn.active {
  color: var(--retune-text);
  background: var(--retune-input-bg-hover);
}

/* Dropdown menu (size + button) */
.retune-dropdown-anchor {
  position: relative;
}
.retune-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 140px;
  background: var(--retune-surface);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06);
  padding: 4px;
  z-index: 100;
  animation: retune-dropdown-in 0.15s cubic-bezier(0.23, 1, 0.32, 1);
}
@keyframes retune-dropdown-in {
  from { opacity: 0; transform: translateY(-4px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.retune-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--retune-text);
  font-size: 13px;
  cursor: pointer;
  padding: 0 10px;
  transition: background 0.1s ease;
}
.retune-dropdown-item:hover {
  background: var(--retune-input-bg);
}
.retune-dropdown-item .retune-dropdown-check {
  margin-left: auto;
  color: var(--retune-text-tertiary);
}
.retune-dropdown-heading {
  padding: 6px 10px 2px;
  font-size: 11px;
  font-weight: 500;
  color: var(--retune-text-tertiary);
  letter-spacing: -0.005em;
}

/* Property cell \u2014 matches portfolio NumberInput */
.retune-prop {
  display: flex;
  align-items: center;
  gap: 0;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  border: none;
  min-width: 0;
  overflow: visible;
  position: relative;
  transition: background-color 0.15s ease;
}

.retune-prop:hover:not(.retune-prop-variable-applied) { background: var(--retune-border); }
.retune-prop:focus-within:not(.retune-prop-variable-applied) {
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
}
.retune-prop:focus-within:not(.retune-prop-variable-applied) {
  background: var(--retune-surface-hover);
}

.retune-prop-label {
  position: absolute;
  left: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  flex-shrink: 0;
  user-select: none;
  cursor: ew-resize;
  z-index: 1;
}

.retune-prop-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  font-family: inherit;
  color: var(--retune-text);
  outline: none;
  padding: 0 0 0 32px;
}

.retune-prop-input:first-child { padding-left: 12px; }
.retune-prop-input::selection { background: #bfdbfe; color: var(--retune-text); }
.retune-prop-input:focus { outline: none; }

/* \u2500\u2500 Color Input (split: [swatch|hex] [opacity%]) \u2500\u2500 */
.retune-color-row {
  display: flex;
  gap: 1px;
  flex: 1;
  min-width: 0;
  position: relative;
}

.retune-color-hex-section {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 32px;
  position: relative;
  background: var(--retune-surface-hover);
  border-radius: 8px 0 0 8px;
}

.retune-color-swatch {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.retune-color-swatch-inner {
  width: 20px;
  height: 20px;
  border-radius: 2px;
}

.retune-color-hex-input {
  flex: 1;
  min-width: 0;
  height: 32px;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  color: var(--retune-text);
  outline: none;
  padding: 0;
}

.retune-color-hex-input:focus { outline: none; }
.retune-color-hex-section:focus-within {
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
}
.retune-color-hex-input::selection { background: #bfdbfe; color: var(--retune-text); }

.retune-color-opacity-section {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px 0 4px;
  height: 32px;
  background: var(--retune-surface-hover);
  border-radius: 0 8px 8px 0;
  flex-shrink: 0;
}

.retune-color-opacity-input {
  width: 28px;
  height: 32px;
  background: transparent;
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  color: var(--retune-text);
  text-align: center;
  outline: none;
  padding: 0;
  -moz-appearance: textfield;
}

.retune-color-opacity-input:focus { outline: none; }
.retune-color-opacity-section:focus-within {
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
}
.retune-color-opacity-input::-webkit-outer-spin-button,
.retune-color-opacity-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.retune-color-opacity-unit {
  font-size: 10px;
  font-weight: 500;
  color: var(--retune-text-tertiary);
}

/* \u2500\u2500 Floating Dialog (shared shell for color picker, token dialog, etc.) \u2500\u2500 */
.retune-floating-dialog {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--retune-surface);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.12),
    0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  z-index: 2147483647;
  pointer-events: auto;
  animation: retune-dialog-enter 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes retune-dialog-enter {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.retune-floating-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 0 12px;
}

.retune-floating-dialog-title-area {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.retune-floating-dialog-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--retune-text);
}

/* Tab styles \u2014 single tab has no selected style */
.retune-floating-dialog-tab {
  height: 24px;
  padding: 0 8px;
  border-radius: 5px;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 0.055px;
  white-space: nowrap;
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;
  font-weight: 450;
  color: var(--retune-text-secondary);
  font-family: inherit;
}
.retune-floating-dialog-tab:hover {
  background: var(--retune-input-bg);
}
.retune-floating-dialog-tab-active {
  background: var(--retune-surface-hover);
  font-weight: 550;
  color: var(--retune-text);
}
.retune-floating-dialog-tab-active:hover {
  background: var(--retune-surface-hover);
}
.retune-floating-dialog-tab-single {
  font-weight: 550;
  color: var(--retune-text);
  cursor: inherit;
}
.retune-floating-dialog-tab-single:hover {
  background: none;
}

.retune-floating-dialog-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--retune-text-tertiary);
  cursor: pointer;
  border-radius: 8px;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.retune-floating-dialog-close:hover {
  color: var(--retune-text);
  background: var(--retune-surface-active);
}

.retune-floating-dialog-search {
  padding: 8px;
}
.retune-floating-dialog-search-input {
  width: 100%;
  height: 32px;
  background: var(--retune-surface-hover);
  border: none;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 12px;
  font-family: inherit;
  color: var(--retune-text);
  outline: none;
  box-sizing: border-box;
}
.retune-floating-dialog-search-input::placeholder {
  color: var(--retune-text-tertiary);
}
.retune-floating-dialog-search-input:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.retune-floating-dialog-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* \u2500\u2500 Color Picker Content \u2500\u2500 */

.retune-cp-sv-wrap {
  padding: 12px 12px 0 12px;
}

.retune-cp-sv {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  cursor: crosshair;
  touch-action: none;
  border-radius: 8px;
}

.retune-cp-sv-white,
.retune-cp-sv-black {
  border-radius: inherit;
}

.retune-cp-sv-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #fff, transparent);
}

.retune-cp-sv-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent, #000);
}

.retune-cp-handle {
  position: absolute;
  pointer-events: none;
  transform: translate(-50%, -50%);
  will-change: transform;
}

.retune-cp-handle-inner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow:
    0 0 0.5px rgba(0, 0, 0, 0.2),
    0 2px 6px rgba(0, 0, 0, 0.12);
}

.retune-cp-sliders {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}

.retune-cp-eyedropper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--retune-text-tertiary);
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease, color 0.15s ease;
}
.retune-cp-eyedropper:hover {
  color: var(--retune-text);
  background: var(--retune-surface-active);
}

.retune-cp-preview-checker {
  position: absolute;
  inset: 0;
  background-image: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%);
  background-size: 8px 8px;
}

.retune-cp-preview {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.retune-cp-slider-tracks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.retune-cp-hue {
  position: relative;
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  cursor: pointer;
  touch-action: none;
  overflow: visible;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.1);
}

.retune-cp-alpha {
  position: relative;
  height: 14px;
  border-radius: 7px;
  cursor: pointer;
  touch-action: none;
  overflow: visible;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.1);
}

.retune-cp-alpha-checker {
  position: absolute;
  inset: 0;
  background-image: repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%);
  background-size: 8px 8px;
  border-radius: 7px;
}

.retune-cp-alpha-gradient {
  position: absolute;
  inset: 0;
  border-radius: 7px;
}

.retune-cp-inputs {
  display: flex;
  gap: 4px;
  padding: 0 12px 10px;
}

.retune-cp-input-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.retune-cp-input-group:first-child {
  flex: 1.8;
}

.retune-cp-label {
  font-size: 9px;
  font-weight: 500;
  color: var(--retune-text-tertiary);
  text-transform: uppercase;
  letter-spacing: -0.005em;
  padding-left: 2px;
}

.retune-cp-input {
  height: 32px;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  color: var(--retune-text);
  padding: 0 6px;
  outline: none;
  width: 100%;
  min-width: 0;
}

.retune-cp-input:focus {
  outline: none;
  box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.5);
}

.retune-cp-input::selection { background: #bfdbfe; color: var(--retune-text); }

/* \u2500\u2500 Gradient Editor \u2500\u2500 */
.retune-gradient-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.retune-gradient-editor > * {
  padding: 0px 8px 0px 16px;
}

.retune-gradient-bar-wrap {
  position: relative;
  height: 32px;
  cursor: crosshair;
  margin: 0px 48px 0px 16px;
  padding: 0 !important;
}

.retune-gradient-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--retune-border);
}

.retune-gradient-bar-checker {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%),
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%);
  background-size: 6px 6px;
  background-position: 0 0, 3px 3px;
}

.retune-gradient-bar-fill {
  position: absolute;
  inset: 0;
}

.retune-gradient-stop-handle {
  position: absolute;
  top: 0px;
  transform: translateX(-50%);
  cursor: grab;
  touch-action: none;
}

.retune-gradient-stop-handle:active { cursor: grabbing; }

.retune-gradient-stop-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  filter: drop-shadow(0 0 0.5px rgba(0,0,0,0.18)) drop-shadow(0 2px 6px rgba(0,0,0,0.12));
}

.retune-gradient-stop-chit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 32px;
  border-radius: 5px;
}

.retune-gradient-stop-chit-color {
  width: 12px;
  height: 24px;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.retune-gradient-stop-caret {
  display: none;
}

.retune-gradient-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.retune-gradient-angle-input {
  width: 64px;
  height: 32px;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  padding: 0 8px;
  text-align: left;
}

.retune-gradient-angle-input:focus {
  outline: none;
  box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.5);
}

.retune-gradient-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.retune-gradient-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--retune-text-secondary);
  cursor: pointer;
  transition: background-color 0.08s ease, color 0.08s ease;
}

.retune-gradient-action-btn:hover { background: var(--retune-surface-hover); color: var(--retune-text); }
.retune-gradient-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.retune-gradient-action-btn:disabled:hover { background: transparent; color: var(--retune-text-secondary); }

.retune-gradient-stops-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.retune-gradient-stops-label {
  font-size: 11px;
  font-weight: 550;
  letter-spacing: -0.005em;
  color: var(--retune-text);
}

.retune-gradient-stops-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.retune-gradient-stop-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0;
}

.retune-gradient-stop-pos {
  position: relative;
  display: flex;
  align-items: center;
  width: 48px;
  flex-shrink: 0;
}

.retune-gradient-stop-pos-input {
  width: 100%;
  height: 32px;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  padding: 0 18px 0 6px;
  text-align: left;
}

.retune-gradient-stop-pos-input:focus {
  outline: none;
  box-shadow: 0 0 0 1.5px rgba(59, 130, 246, 0.5);
}

.retune-gradient-stop-pos-unit {
  position: absolute;
  right: 6px;
  font-size: 11px;
  color: var(--retune-text-tertiary);
  pointer-events: none;
}

.retune-gradient-stop-color {
  flex: 1;
  min-width: 0;
}

/* \u2500\u2500 SelectInput \u2500\u2500 */
.retune-select {
  position: relative;
  min-width: 0;
  overflow: visible;
}

.retune-select-button {
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
  transition: background-color 0.15s ease;
  position: relative;
}

.retune-select-button:hover { background: var(--retune-border); }
.retune-select-button:focus-visible {
  outline: 1px solid var(--retune-text);
  outline-offset: -1px;
}

.retune-select-label {
  position: absolute;
  left: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text-tertiary);
  flex-shrink: 0;
}

.retune-select-value {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  text-align: left;
  padding-left: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retune-select-chevron {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--retune-text-secondary);
  flex-shrink: 0;
}

.retune-select-dropdown-anchor {
  position: fixed;
  z-index: 2147483647;
  width: max-content;
}

/* \u2500\u2500 Slider \u2500\u2500 */
.retune-slider {
  position: relative;
  height: 32px;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  cursor: ew-resize;
  user-select: none;
  overflow: hidden;
  transition: background-color 0.15s ease;
}

.retune-slider:hover { }
.retune-slider:focus-visible { outline: 1px solid var(--retune-text); outline-offset: -1px; }

.retune-slider-fill {
  position: absolute;
  inset: 0;
  right: auto;
  background: #ebebeb;
  pointer-events: none;
}

.retune-slider-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 1px;
  height: 4px;
  border-radius: 1px;
  background: var(--retune-border);
  pointer-events: none;
}

.retune-slider-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 16px;
  border-radius: 1px;
  background: var(--retune-surface);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  margin-left: -1px;
}

.retune-slider-labels {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  pointer-events: none;
  overflow: hidden;
  white-space: nowrap;
}

.retune-slider-label {
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text-secondary);
}

.retune-slider-value {
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  font-family: inherit;
  color: var(--retune-text);
}

/* \u2500\u2500 SegmentedControl \u2500\u2500 */
.retune-segmented {
  display: flex;
  position: relative;
  height: 32px;
  background: var(--retune-surface-hover);
  border-radius: 8px;
  overflow: hidden;
  flex: 1;
}

.retune-segmented-pill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 8px;
  background: var(--retune-surface);
  border: 1px solid var(--retune-border);
  box-sizing: border-box;
  transition: transform 200ms cubic-bezier(0.77, 0, 0.175, 1);
  will-change: transform;
  pointer-events: none;
  z-index: 0;
}


.retune-segmented-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  padding: 0;
  color: var(--retune-text);
  transition: color 150ms ease;
  position: relative;
  z-index: 1;
}

.retune-segmented-item:hover:not(.disabled) { color: var(--retune-text-secondary); }

.retune-segmented-item.selected {
  color: var(--retune-text);
}

.retune-segmented-item.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.retune-segmented-item svg {
  width: 24px;
  height: 24px;
  display: block;
}

.retune-segmented-text {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.005em;
}

/* \u2500\u2500 FontInput \u2500\u2500 */
.retune-font-input {
  display: flex;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  min-width: 0;
  overflow: visible;
  position: relative;
  transition: background-color 0.15s ease;
}

.retune-font-input:hover { background: var(--retune-border); }
.retune-font-input:focus-within {
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
  background: var(--retune-surface-hover);
}

.retune-font-input-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text);
  cursor: pointer;
  padding: 0 4px 0 8px;
  gap: 4px;
}
.retune-font-input-value {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.retune-font-input-trigger svg {
  flex-shrink: 0;
  color: var(--retune-text-secondary);
}

/* \u2500\u2500 Font Picker (FloatingDialog) \u2500\u2500 */
.retune-font-filter {
  padding: 8px;
  border-top: 1px solid var(--retune-border);
}

.retune-font-list {
  overflow-y: auto;
  padding: 2px 0 4px;
  scrollbar-width: none;
}
.retune-font-list::-webkit-scrollbar { display: none; }

.retune-font-section-title {
  font-size: 11px;
  font-weight: 450;
  line-height: 16px;
  letter-spacing: -0.005em;
  color: var(--retune-text-secondary);
  padding: 8px 16px 8px;
}

.retune-font-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 450;
  color: var(--retune-text);
  transition: background-color 0.08s ease;
  min-height: 32px;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.retune-font-item:hover { background: var(--retune-surface-hover); }
.retune-font-item-active { background: var(--retune-surface-hover); }
.retune-font-item-active:hover { background: var(--retune-surface-hover); }
.retune-font-item-highlighted { background: var(--retune-input-bg); }
.retune-font-item-active.retune-font-item-highlighted { background: var(--retune-surface-hover); }

.retune-font-system-prompt {
  padding: 8px 16px 12px;
}
.retune-font-system-btn {
  width: 100%;
  padding: 8px;
  border: 1px dashed var(--retune-border-hover);
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--retune-text-secondary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.retune-font-system-btn:hover { background: var(--retune-surface-hover); color: var(--retune-text); }

.retune-font-denied {
  font-size: 11px;
  line-height: 16px;
  color: var(--retune-text-tertiary);
  margin: 0;
}

.retune-font-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--retune-text-tertiary);
  text-align: center;
}

/* \u2500\u2500 TextInput \u2500\u2500 */
.retune-text-input {
  display: flex;
  align-items: center;
  height: 32px;
  border-radius: 8px;
  background: var(--retune-surface-hover);
  min-width: 0;
  overflow: hidden;
  position: relative;
  transition: background-color 0.15s ease;
}

.retune-text-input:hover { background: var(--retune-border); }
.retune-text-input:focus-within {
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
  background: var(--retune-surface-hover);
}

.retune-text-input-field {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  font-family: inherit;
  color: var(--retune-text);
  outline: none;
  padding: 0 8px;
}

.retune-text-input-field::selection { background: #bfdbfe; color: var(--retune-text); }
.retune-text-input-field:focus { outline: none; }

/* \u2500\u2500 ComboInput \u2500\u2500 */
.retune-combo {
  display: flex;
  align-items: center;
  height: 32px;
  min-width: 0;
  overflow: visible;
  position: relative;
  gap: 1px;
}

.retune-combo-label {
  position: absolute;
  left: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  color: var(--retune-text-tertiary);
  flex-shrink: 0;
  user-select: none;
  cursor: ew-resize;
  z-index: 1;
}

.retune-combo-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  background: var(--retune-surface-hover);
  border-radius: 8px 0 0 8px;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  font-family: inherit;
  color: var(--retune-text);
  outline: none;
  padding: 0 0 0 32px;
  transition: background-color 0.15s ease;
}

.retune-combo-input:hover:not(.retune-combo-variable-applied) { background: var(--retune-border); }
.retune-combo-input:focus {
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
}
.retune-combo-variable-applied:focus {
  outline: 1px solid var(--retune-border-hover);
  outline-offset: -1px;
}
.retune-combo-input::selection { background: #bfdbfe; color: var(--retune-text); }

.retune-combo-trigger {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--retune-surface-hover);
  border-radius: 0 8px 8px 0;
  border: none;
  cursor: pointer;
  color: var(--retune-text-secondary);
  flex-shrink: 0;
  padding: 0;
  transition: background-color 0.15s ease, color 0.12s ease;
}

.retune-combo-trigger:hover { background: var(--retune-border); color: var(--retune-text); }
.retune-combo-trigger:focus-visible {
  outline: 1px solid var(--retune-text);
  outline-offset: -1px;
}

.retune-combo-dropdown-anchor {
  position: fixed;
  z-index: 2147483647;
}

/* \u2500\u2500 Dropdown Menu \u2500\u2500 */
.retune-menu-wrapper {
  position: relative;
  width: fit-content;
  min-width: max(120px, 100%);
  border-radius: 12px;
  overflow: hidden;
  user-select: none;
  box-shadow: 0 0 0.5px rgba(0,0,0,0.12), 0 10px 16px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.15);
}

.retune-menu-scroll {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 0;
  background: #1c1917;
  scrollbar-width: none;
  overscroll-behavior: none;
}

.retune-menu-scroll::-webkit-scrollbar { display: none; }

.retune-menu-separator {
  height: 16px;
  display: flex;
  align-items: center;
}

.retune-menu-separator-line {
  width: 100%;
  height: 1px;
  background: #292524;
}

.retune-menu-heading {
  padding: 4px 14px;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  line-height: 16px;
  color: rgba(255,255,255,0.4);
}

.retune-menu-item-wrap {
  padding: 0 6px;
}

.retune-menu-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 24px 4px 8px;
  border: none;
  background: transparent;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 450;
  letter-spacing: -0.005em;
  font-family: inherit;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.08s ease;
}

.retune-menu-item.has-check { padding-left: 28px; }

.retune-menu-item.highlighted { background: rgba(255,255,255,0.1); }
.retune-menu-item.selected { color: #fff; }
.retune-menu-item.disabled { opacity: 0.5; cursor: not-allowed; }

.retune-menu-check {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.retune-menu-item-label {
  line-height: 16px;
  white-space: nowrap;
}

.retune-menu-item-shortcut {
  margin-left: auto;
  padding-left: 16px;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
}

.retune-menu-empty {
  padding: 4px 16px;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}

.retune-menu-scroll-indicator {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  background: #1c1917;
  cursor: default;
  color: #fff;
}

.retune-menu-scroll-indicator.top {
  top: 0;
  border-radius: 12px 12px 0 0;
}

.retune-menu-scroll-indicator.bottom {
  bottom: 0;
  border-radius: 0 0 12px 12px;
}

/* \u2500\u2500 Tooltip \u2500\u2500 */
.retune-tooltip-trigger {
  display: contents;
}

.retune-tooltip {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
  max-width: 200px;
  border-radius: 5px;
  background: #1e1e1e;
  box-shadow: 0 0 0.5px rgba(0, 0, 0, 0.15), 0 5px 12px rgba(0, 0, 0, 0.13), 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  line-height: 16px;
  letter-spacing: -0.005em;
  white-space: nowrap;
  animation: retune-tooltip-in 150ms cubic-bezier(0.23, 1, 0.32, 1) both;
}

.retune-tooltip::before {
  content: "";
  position: absolute;
  width: 12px;
  height: 6px;
  background: #1e1e1e;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.retune-tooltip-bottom::before {
  top: -6px;
  left: var(--caret-x, 50%);
  transform: translateX(-50%);
}

.retune-tooltip-top::before {
  bottom: -6px;
  left: var(--caret-x, 50%);
  transform: translateX(-50%) rotate(180deg);
}

.retune-tooltip-left::before {
  right: -9px;
  top: var(--caret-y, 50%);
  transform: translateY(-50%) rotate(90deg);
}

.retune-tooltip-right::before {
  left: -9px;
  top: var(--caret-y, 50%);
  transform: translateY(-50%) rotate(-90deg);
}

.retune-tooltip-text {
  color: #fff;
  min-width: 0;
  flex: 1;
}

.retune-tooltip-shortcut {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

@keyframes retune-tooltip-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* \u2500\u2500 Reduced Motion \u2500\u2500 */
/* \u2500\u2500 Change Indicator (blue dot at top-left corner of changed inputs) \u2500\u2500 */
.retune-change-dot {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 16px;
  height: 16px;
  z-index: 3;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.retune-change-dot-inner {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--retune-blue);
  box-shadow: 0 0 0 3px var(--retune-surface);
  pointer-events: none;
}

/* \u2500\u2500 Variable Action (hexagon/unlink icons on right side of inputs) \u2500\u2500 */
.retune-variable-action {
  position: absolute;
  right: 0;
  top: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  transition: color 0.15s ease;
  cursor: pointer;
  z-index: 2;
}
/* Show on parent hover */
.retune-prop:hover .retune-variable-action:not(.retune-variable-unlink),
.retune-color-hex-section:hover .retune-variable-action:not(.retune-variable-unlink) {
  color: var(--retune-text-secondary);
}
.retune-variable-action:hover:not(.retune-variable-unlink) {
  color: var(--retune-text) !important;
}
/* Unlink icon: purple color, 80% opacity at rest, full on hover */
.retune-variable-unlink {
  color: var(--retune-text);
}
.retune-prop-variable-applied .retune-variable-unlink,
.retune-combo:has(.retune-combo-variable-applied) .retune-variable-unlink,
.retune-color-variable-applied .retune-variable-unlink {
  color: transparent;
}
.retune-prop-variable-applied:hover .retune-variable-unlink,
.retune-combo:has(.retune-combo-variable-applied):hover .retune-variable-unlink,
.retune-color-variable-applied:hover .retune-variable-unlink {
  color: var(--retune-text-secondary);
}
.retune-variable-unlink:hover {
  color: var(--retune-text) !important;
}

/* \u2500\u2500 Variable Applied State (white bg, bordered) \u2500\u2500 */
.retune-prop-variable-applied {
  background: var(--retune-surface);
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
}
.retune-prop-variable-applied:hover {
  outline-color: var(--retune-border-hover);
}
.retune-prop-variable-applied .retune-prop-input,
.retune-prop-variable-applied .retune-prop-label {
  cursor: pointer;
}
.retune-combo-variable-applied {
  background: var(--retune-surface);
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
  cursor: pointer;
  border-radius: 8px;
}
.retune-combo-variable-applied:hover {
  outline-color: var(--retune-border-hover);
}
.retune-combo:has(.retune-combo-variable-applied) .retune-combo-label {
  cursor: pointer;
}
.retune-combo:has(.retune-combo-variable-applied) .retune-combo-trigger {
  display: none;
}
.retune-color-variable-applied {
  background: var(--retune-surface);
  outline: 1px solid var(--retune-border);
  outline-offset: -1px;
  /* When variable applied, opacity section is hidden \u2014 hex section takes full width with full rounding */
  border-radius: 8px;
}
.retune-color-variable-applied:hover {
  outline-color: var(--retune-border-hover);
}
.retune-color-variable-applied .retune-color-hex-input {
  cursor: pointer;
}

/* \u2500\u2500 Token Picker (floating panel for swapping tokens) \u2500\u2500 */
.retune-variable-picker {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: #1c1917;
  border-radius: 10px;
  box-shadow: 0 0 0.5px rgba(0,0,0,0.12), 0 10px 16px rgba(0,0,0,0.2), 0 2px 5px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 2147483647;
  pointer-events: auto;
  animation: retune-variable-picker-enter 150ms ease-out;
}

@keyframes retune-variable-picker-enter {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.retune-variable-picker-header {
  padding: 8px 10px 4px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.retune-variable-picker-title {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.retune-variable-picker-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
  scrollbar-width: none;
}
.retune-variable-picker-list::-webkit-scrollbar { display: none; }

.retune-variable-picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  cursor: pointer;
  transition: background-color 0.08s ease;
  min-height: 30px;
  box-sizing: border-box;
}

.retune-variable-picker-item:hover {
  background: rgba(255,255,255,0.08);
}

.retune-variable-picker-item-active {
  background: rgba(59,130,246,0.15);
  cursor: default;
}
.retune-variable-picker-item-active:hover {
  background: rgba(59,130,246,0.15);
}

.retune-variable-picker-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15);
}

.retune-variable-picker-name {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retune-variable-picker-value {
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  flex-shrink: 0;
}

/* \u2500\u2500 Token Dialog List (content inside FloatingDialog) \u2500\u2500 */
.retune-variable-dialog-list {
  flex: 1 1 0;
  overflow-y: auto;
  padding: 2px 0 4px;
  scrollbar-width: none;
  border-top: 1px solid var(--retune-border);
}
.retune-variable-dialog-list::-webkit-scrollbar { display: none; }

.retune-variable-dialog-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.08s ease;
  min-height: 32px;
  box-sizing: border-box;
}
.retune-variable-dialog-item:hover {
  background: var(--retune-surface-hover);
}

.retune-variable-dialog-item-active {
  background: var(--retune-surface-hover);
}
.retune-variable-dialog-item-active:hover {
  background: var(--retune-surface-hover);
}
.retune-variable-dialog-item-highlighted {
  background: var(--retune-input-bg);
}
.retune-variable-dialog-item-active.retune-variable-dialog-item-highlighted {
  background: var(--retune-surface-hover);
}

.retune-variable-dialog-active-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #3b82f6;
  flex-shrink: 0;
}

.retune-variable-dialog-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.retune-variable-dialog-name {
  font-size: 11px;
  font-weight: 450;
  color: var(--retune-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retune-variable-dialog-value {
  font-size: 11px;
  color: var(--retune-text-tertiary);
  flex-shrink: 0;
}

.retune-variable-dialog-empty {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--retune-text-tertiary);
  text-align: center;
}

/* \u2500\u2500 Snap Guide Lines \u2500\u2500 */

.retune-snap-guide {
  position: fixed;
  pointer-events: none;
  z-index: 2147483645;
  background: var(--retune-red);
  display: none;
}

.retune-snap-guide.visible {
  display: block;
}

.retune-snap-label {
  position: fixed;
  pointer-events: none;
  z-index: 2147483646;
  font-size: 10px;
  font-weight: 500;
  font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  color: #fff;
  white-space: nowrap;
  background: var(--retune-red);
  padding: 1px 4px;
  border-radius: 2px;
  opacity: 0;
  transition: opacity 100ms ease;
}

.retune-snap-label.visible {
  opacity: 1;
  transition: none;
}

/* \u2500\u2500 Settings Panel \u2500\u2500 */

.retune-settings-clip {
  border-radius: inherit;
}

/* \u2500\u2500 Settings Panel \u2500\u2500 */

@keyframes retune-settings-in {
  from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
  to { opacity: 1; transform: none; filter: none; }
}

@keyframes retune-settings-out {
  from { opacity: 1; transform: none; filter: none; }
  to { opacity: 0; transform: translateY(8px); filter: blur(4px); }
}

.retune-settings-panel {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
  background: var(--retune-surface);
  border: none;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 280px;
  height: auto;
  max-height: calc(100vh - 84px);
  overflow: visible;
  bottom: 68px;
  animation: retune-settings-in 250ms cubic-bezier(0.5, 0, 0, 1);
}

.retune-settings-panel.exiting {
  animation: retune-settings-out 250ms cubic-bezier(0.5, 0, 0, 1) forwards;
}

.retune-settings-panel.right { right: 16px; }
.retune-settings-panel.left { left: 16px; }

.retune-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  width: 100%;
}

.retune-settings-label {
  font-size: 11px;
  font-weight: 400;
  line-height: 16px;
  letter-spacing: 0.06px;
  color: var(--retune-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Switch */
.retune-switch-wrap {
  padding: 6px 0;
  flex-shrink: 0;
}

.retune-switch {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 13px;
  background: var(--retune-input-bg);
  cursor: pointer;
  border: none;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s ease, border-radius 0.15s ease;
}

.retune-switch.on {
  background: var(--retune-blue);
  border-radius: 9999px;
}

.retune-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--retune-white);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
  transition: left 0.15s ease, box-shadow 0.15s ease;
}

.retune-switch.on .retune-switch-knob {
  left: 18px;
  box-shadow: none;
}

/* Keyboard shortcuts link row */
.retune-settings-row.clickable {
  cursor: pointer;
  height: 48px;
  color: var(--retune-text-secondary);
}

.retune-settings-row.clickable:hover {
  color: var(--retune-text);
}

.retune-settings-row.clickable:hover .retune-settings-label {
  color: var(--retune-text);
}

/* Keyboard shortcut key badge */
.retune-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  padding: 4px;
  border-radius: 4px;
  background: var(--retune-input-bg);
  border: none;
  box-shadow: 0 0 0 0.5px var(--retune-shadow) inset, 0 2px 0 0 var(--retune-border);
  font-family: inherit;
  font-size: 11px;
  font-weight: 450;
  line-height: 16px;
  letter-spacing: 0.055px;
  color: var(--retune-text);
}

.retune-key.wide {
  padding: 4px 8px;
  min-width: auto;
}

.retune-key-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Settings header with back button */
.retune-settings-header {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--retune-border);
  flex-shrink: 0;
}

.retune-settings-back {
  cursor: pointer;
  color: var(--retune-text-secondary);
}

.retune-settings-back:hover {
  color: var(--retune-text);
}

.retune-settings-title {
  font-size: 12px;
  font-weight: 550;
  line-height: 16px;
  letter-spacing: 0.06px;
  color: var(--retune-text);
  padding: 8px;
}

/* Settings body (scrollable for keyboard view) */
.retune-settings-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: clip;
  scrollbar-width: none;
  padding: 8px 0;
}

.retune-settings-body::-webkit-scrollbar { display: none; }


.retune-variable-dialog-group-title {
  font-size: 11px;
  font-weight: 450;
  line-height: 16px;
  letter-spacing: -0.005em;
  color: var(--retune-text-secondary);
  padding: 8px 16px 8px;
  text-transform: capitalize;
}

@media (prefers-reduced-motion: reduce) {
  .retune-toolbar,
  .retune-toolbar-collapse-btn,
  .retune-toolbar-expanded,
  .retune-toolbar-btn,
  .retune-icon-swap-icon,
  .retune-segmented-pill,
  .retune-segmented-item,
  .retune-align-btn,
  .retune-split-btn,
  .retune-section-header-btn,
  .retune-color-hex-input,
  .retune-color-opacity-input,
  .retune-number-input,
  .retune-font-input,
  .retune-select-button,
  .retune-combo-input,
  .retune-combo-trigger,
  .retune-gradient-action-btn,
  .retune-dropdown-trigger,
  .retune-dropdown-item,
  .retune-menu-item {
    transition: none;
  }

  .retune-panel-anim.entering .retune-panel,
  .retune-panel-anim.exiting .retune-panel,
  .retune-floating-dialog,
  .retune-dropdown-menu,
  .retune-tooltip,
  .retune-edit-count,
  .retune-toolbar.expanded .retune-toolbar-expanded > *,
  .retune-toolbar.collapsed .retune-toolbar-collapse-btn,
  .retune-grid-picker-dialog,
  .retune-combo-dropdown-anchor {
    animation: none;
  }

  .retune-variable-action,
  .retune-change-dot,
  .retune-variable-picker {
    transition: none;
    animation: none;
  }

  .retune-settings-view-container,
  .retune-settings-panel {
    transition: none;
    animation: none;
  }
}
`;
function mountOverlay() {
  if (!document.querySelector("link[data-retune-font]")) {
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = "https://rsms.me/";
    document.head.appendChild(preconnect);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://rsms.me/inter/inter.css";
    link.setAttribute("data-retune-font", "");
    document.head.appendChild(link);
  }
  const host = document.createElement("div");
  host.setAttribute("data-retune-host", "");
  host.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;
  const root = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(overlay_css_default);
  root.adoptedStyleSheets = [sheet];
  const container = document.createElement("div");
  container.setAttribute("data-retune-container", "");
  root.appendChild(container);
  for (const eventType of ["click", "pointerdown", "mousedown", "focusin", "focusout"]) {
    host.addEventListener(eventType, (e2) => {
      if (e2.composedPath()[0] !== host) {
        e2.stopPropagation();
      }
    });
  }
  document.documentElement.appendChild(host);
  return { host, root, container, sheet };
}
function unmountOverlay(host) {
  host.remove();
}
function computeSizingChanges(axis, mode, ctx) {
  const { isFlexChild, isGridChild, parentFlexDir, currentStyles, elementRect } = ctx;
  const pxValue = () => {
    const val = elementRect ? Math.round(axis === "width" ? elementRect.width : elementRect.height) : 200;
    return `${val}px`;
  };
  if (!isFlexChild) {
    if (isGridChild) {
      return computeGridChildChanges(axis, mode, currentStyles, pxValue);
    }
    return computeBlockChanges(axis, mode, pxValue);
  }
  const isMainAxis = axis === "width" && !parentFlexDir.startsWith("column") || axis === "height" && parentFlexDir.startsWith("column");
  if (isMainAxis) {
    return computeFlexMainAxisChanges(axis, mode, currentStyles, pxValue);
  }
  return computeFlexCrossAxisChanges(axis, mode, currentStyles, pxValue);
}
function computeBlockChanges(axis, mode, pxValue) {
  switch (mode) {
    case "fill":
      return { [axis]: "100%" };
    case "hug":
      return { [axis]: "fit-content" };
    case "fixed":
      return { [axis]: pxValue() };
  }
}
function computeGridChildChanges(axis, mode, currentStyles, pxValue) {
  const selfProp = axis === "width" ? "justifySelf" : "alignSelf";
  switch (mode) {
    case "fill":
      return { [axis]: "auto", [selfProp]: "stretch" };
    case "hug": {
      const changes = { [axis]: "fit-content" };
      const currentSelf = currentStyles[selfProp];
      if (!currentSelf || currentSelf === "stretch" || currentSelf === "auto" || currentSelf === "normal") {
        changes[selfProp] = "start";
      }
      return changes;
    }
    case "fixed":
      return { [axis]: pxValue() };
  }
}
function computeFlexMainAxisChanges(axis, mode, currentStyles, pxValue) {
  switch (mode) {
    case "fill":
      return {
        flexGrow: "1",
        flexShrink: "1",
        flexBasis: "0px",
        [axis]: "auto"
      };
    case "hug":
      return {
        flexGrow: "0",
        flexShrink: "0",
        flexBasis: "auto",
        [axis]: "auto"
      };
    case "fixed": {
      const changes = {
        flexGrow: "0",
        flexShrink: "0"
      };
      if (!currentStyles[axis] || currentStyles[axis] === "auto") {
        changes[axis] = pxValue();
      }
      return changes;
    }
  }
}
function computeFlexCrossAxisChanges(axis, mode, currentStyles, pxValue) {
  switch (mode) {
    case "fill": {
      const changes = { [axis]: "100%" };
      if (currentStyles[axis] !== "100%") {
        changes.alignSelf = "stretch";
      }
      return changes;
    }
    case "hug": {
      const changes = { [axis]: "auto" };
      const currentAlignSelf = currentStyles.alignSelf;
      if (!currentAlignSelf || currentAlignSelf === "auto" || currentAlignSelf === "stretch") {
        changes.alignSelf = "flex-start";
      }
      return changes;
    }
    case "fixed": {
      const changes = {};
      if (!currentStyles[axis] || currentStyles[axis] === "auto" || currentStyles[axis] === "100%") {
        changes[axis] = pxValue();
      }
      return changes;
    }
  }
}
function canFill(axis, ctx) {
  if (axis === "width") return true;
  const { isFlexChild, isGridChild, parentFlexDir, currentStyles } = ctx;
  if (isFlexChild && parentFlexDir.startsWith("column")) return true;
  if (isFlexChild && !parentFlexDir.startsWith("column")) return true;
  if (isGridChild) return true;
  return false;
}
function detectSizingMode(axis, ctx) {
  const { isFlexChild, isGridChild, parentFlexDir, currentStyles } = ctx;
  const val = currentStyles[axis];
  if (!isFlexChild && !isGridChild) {
    if (val === "100%") return "fill";
    if (val === "fit-content") return "hug";
    return null;
  }
  if (isGridChild) {
    const selfProp = axis === "width" ? "justifySelf" : "alignSelf";
    const selfVal = currentStyles[selfProp];
    if ((val === "auto" || !val) && (selfVal === "stretch" || selfVal === "auto" || selfVal === "normal" || !selfVal)) return "fill";
    if (val === "fit-content") return "hug";
    return null;
  }
  const isMainAxis = axis === "width" && !parentFlexDir.startsWith("column") || axis === "height" && parentFlexDir.startsWith("column");
  if (isMainAxis) {
    const grow = currentStyles.flexGrow;
    const basis = currentStyles.flexBasis;
    if (grow && parseFloat(grow) > 0 && (basis === "0px" || basis === "0" || basis === "0%")) return "fill";
    if (grow === "0" && (basis === "auto" || !basis) && (val === "auto" || !val)) return "hug";
    return null;
  }
  if (val === "100%") return "fill";
  const alignSelf = currentStyles.alignSelf;
  if ((val === "auto" || !val) && (alignSelf === "stretch" || alignSelf === "auto" || alignSelf === "normal" || !alignSelf)) return "fill";
  if (val === "auto" && (alignSelf === "flex-start" || alignSelf === "start" || alignSelf === "center" || alignSelf === "flex-end" || alignSelf === "end")) return "hug";
  return null;
}
function computeCanvasDropIndex(cursorX, cursorY, otherRects, otherIndices, horizontal, dragIndex) {
  const cursor = horizontal ? cursorX : cursorY;
  let insertBefore = otherRects.length;
  for (let i3 = 0; i3 < otherRects.length; i3++) {
    const mid = horizontal ? otherRects[i3].left + otherRects[i3].width / 2 : otherRects[i3].top + otherRects[i3].height / 2;
    if (cursor < mid) {
      insertBefore = i3;
      break;
    }
  }
  if (insertBefore >= otherIndices.length) {
    return otherIndices.length > 0 ? otherIndices[otherIndices.length - 1] + 1 : dragIndex;
  }
  return otherIndices[insertBefore];
}
function isEffectiveNoOp(dragIndex, dropIndex) {
  return dragIndex === dropIndex;
}
function formatSelectionLabel(width, height) {
  return `${Math.round(width)} \xD7 ${Math.round(height)}`;
}
function createPicker(shadowRoot, callbacks) {
  const highlight = document.createElement("div");
  highlight.setAttribute("data-retune-highlight", "");
  shadowRoot.appendChild(highlight);
  const label = document.createElement("div");
  label.setAttribute("data-retune-label", "");
  shadowRoot.appendChild(label);
  const selection = document.createElement("div");
  selection.setAttribute("data-retune-selection", "");
  shadowRoot.appendChild(selection);
  const selectionLabel = document.createElement("div");
  selectionLabel.setAttribute("data-retune-selection-label", "");
  shadowRoot.appendChild(selectionLabel);
  const parentIndicator = document.createElement("div");
  parentIndicator.setAttribute("data-retune-parent-indicator", "");
  parentIndicator.style.cssText = `
    position:fixed;display:none;pointer-events:none;z-index:2147483644;
    border:1px dotted #0D99FF;background:none;border-radius:0;
  `;
  shadowRoot.appendChild(parentIndicator);
  const siblingOutlinePool = [];
  for (let i3 = 0; i3 < 20; i3++) {
    const outline = document.createElement("div");
    outline.style.cssText = `
      position:fixed;display:none;pointer-events:none;z-index:2147483644;
      border:1px dotted #0D99FF;background:none;
    `;
    shadowRoot.appendChild(outline);
    siblingOutlinePool.push(outline);
  }
  function showSiblingOutlines(parent, selected) {
    const children = Array.from(parent.children).filter((c3) => {
      if (c3 === selected) return false;
      if (c3.hasAttribute("data-retune-host")) return false;
      const cs = getComputedStyle(c3);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return true;
    });
    let poolIdx = 0;
    for (const child of children) {
      if (poolIdx >= siblingOutlinePool.length) break;
      const r = child.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const outline = siblingOutlinePool[poolIdx++];
      outline.style.top = `${r.top}px`;
      outline.style.left = `${r.left}px`;
      outline.style.width = `${r.width}px`;
      outline.style.height = `${r.height}px`;
      outline.style.display = "block";
    }
    for (let i3 = poolIdx; i3 < siblingOutlinePool.length; i3++) {
      siblingOutlinePool[i3].style.display = "none";
    }
  }
  function showChildOutlines(parent) {
    const children = Array.from(parent.children).filter((c3) => {
      if (c3.hasAttribute("data-retune-host")) return false;
      const cs = getComputedStyle(c3);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return true;
    });
    let poolIdx = 0;
    for (const child of children) {
      if (poolIdx >= siblingOutlinePool.length) break;
      const r = child.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const outline = siblingOutlinePool[poolIdx++];
      outline.style.top = `${r.top}px`;
      outline.style.left = `${r.left}px`;
      outline.style.width = `${r.width}px`;
      outline.style.height = `${r.height}px`;
      outline.style.display = "block";
    }
    for (let i3 = poolIdx; i3 < siblingOutlinePool.length; i3++) {
      siblingOutlinePool[i3].style.display = "none";
    }
  }
  function hideSiblingOutlines() {
    for (const outline of siblingOutlinePool) {
      outline.style.display = "none";
    }
  }
  const scopeHighlightPool = [];
  for (let i3 = 0; i3 < 50; i3++) {
    const outline = document.createElement("div");
    outline.style.cssText = `
      position:fixed;display:none;pointer-events:none;z-index:2147483643;
      border:1px solid #0D99FF;background:none;
    `;
    shadowRoot.appendChild(outline);
    scopeHighlightPool.push(outline);
  }
  let activeScopeElements = [];
  function showScopeHighlights(selector2, excludeElement) {
    let elements;
    try {
      elements = Array.from(document.querySelectorAll(selector2));
    } catch {
      hideScopeHighlights();
      return;
    }
    activeScopeElements = elements.filter((el) => {
      if (el === excludeElement) return false;
      if (el.closest("[data-retune-host]")) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      return true;
    });
    refreshScopeHighlights();
  }
  function refreshScopeHighlights() {
    let poolIdx = 0;
    for (const el of activeScopeElements) {
      if (poolIdx >= scopeHighlightPool.length) break;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const outline = scopeHighlightPool[poolIdx++];
      outline.style.top = `${r.top}px`;
      outline.style.left = `${r.left}px`;
      outline.style.width = `${r.width}px`;
      outline.style.height = `${r.height}px`;
      outline.style.display = "block";
    }
    for (let i3 = poolIdx; i3 < scopeHighlightPool.length; i3++) {
      scopeHighlightPool[i3].style.display = "none";
    }
  }
  function hideScopeHighlights() {
    activeScopeElements = [];
    for (const outline of scopeHighlightPool) {
      outline.style.display = "none";
    }
  }
  const pinLines = {};
  for (const side of ["top", "right", "bottom", "left"]) {
    const line = document.createElement("div");
    line.style.cssText = "position:fixed;display:none;pointer-events:none;z-index:2147483644;";
    shadowRoot.appendChild(line);
    pinLines[side] = line;
  }
  function detectAuthoredPositionProps(el) {
    const htmlEl = el;
    const result = { top: false, right: false, bottom: false, left: false };
    const pos = getComputedStyle(el).position;
    if (pos !== "absolute" && pos !== "fixed") return result;
    for (const prop of ["top", "right", "bottom", "left"]) {
      if (htmlEl.style[prop] !== "") {
        result[prop] = true;
        continue;
      }
      try {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSStyleRule && el.matches(rule.selectorText)) {
                const val = rule.style.getPropertyValue(prop);
                if (val && val !== "auto") {
                  result[prop] = true;
                  break;
                }
              }
            }
          } catch {
          }
          if (result[prop]) break;
        }
      } catch {
      }
    }
    return result;
  }
  function showPinLines(elRect, parentRect, authored) {
    const elCenterX = elRect.left + elRect.width / 2;
    const elCenterY = elRect.top + elRect.height / 2;
    if (authored.top && elRect.top > parentRect.top) {
      pinLines.top.style.cssText = `
        position:fixed;display:block;pointer-events:none;z-index:2147483644;
        top:${parentRect.top}px;left:${elCenterX}px;
        width:0;height:${elRect.top - parentRect.top}px;
        border-left:1px dashed #0D99FF;
      `;
    } else {
      pinLines.top.style.display = "none";
    }
    if (authored.bottom && parentRect.bottom > elRect.bottom) {
      pinLines.bottom.style.cssText = `
        position:fixed;display:block;pointer-events:none;z-index:2147483644;
        top:${elRect.bottom}px;left:${elCenterX}px;
        width:0;height:${parentRect.bottom - elRect.bottom}px;
        border-left:1px dashed #0D99FF;
      `;
    } else {
      pinLines.bottom.style.display = "none";
    }
    if (authored.left && elRect.left > parentRect.left) {
      pinLines.left.style.cssText = `
        position:fixed;display:block;pointer-events:none;z-index:2147483644;
        top:${elCenterY}px;left:${parentRect.left}px;
        width:${elRect.left - parentRect.left}px;height:0;
        border-top:1px dashed #0D99FF;
      `;
    } else {
      pinLines.left.style.display = "none";
    }
    if (authored.right && parentRect.right > elRect.right) {
      pinLines.right.style.cssText = `
        position:fixed;display:block;pointer-events:none;z-index:2147483644;
        top:${elCenterY}px;left:${elRect.right}px;
        width:${parentRect.right - elRect.right}px;height:0;
        border-top:1px dashed #0D99FF;
      `;
    } else {
      pinLines.right.style.display = "none";
    }
  }
  function hidePinLines() {
    for (const line of Object.values(pinLines)) line.style.display = "none";
  }
  let cachedPinState = null;
  function refreshPinLines() {
    if (!selectedElement) return;
    const parent = selectedElement.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) return;
    const rect = selectedElement.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    const authored = cachedPinState || detectAuthoredPositionProps(selectedElement);
    if (authored.top || authored.right || authored.bottom || authored.left) {
      showPinLines(rect, pr, authored);
    } else {
      hidePinLines();
    }
  }
  let active = false;
  let suspended = false;
  let hoveredElement = null;
  let selectedElement = null;
  let selectionLabelHidden = false;
  let trackingRaf = null;
  let resizeObserver = null;
  let hoverTimer = null;
  let lastSelRect = { top: 0, left: 0, width: 0, height: 0 };
  let lastClickPos = { x: 0, y: 0 };
  let elementStack = [];
  let stackIndex = -1;
  const CLICK_RADIUS = 5;
  function initBoxStyles(box, labelEl) {
    box.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483644;
      box-sizing: border-box;
      display: none;
      outline: none;
    `;
    labelEl.style.cssText = `
      position: fixed;
      color: white;
      font-size: 11px;
      font-family: InterVariable, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-feature-settings: 'liga' 1, 'calt' 1, 'zero' 0, 'tnum' 0;
      padding: 2px 6px;
      border-radius: 3px;
      pointer-events: none;
      z-index: 2147483646;
      white-space: nowrap;
      display: none;
    `;
  }
  initBoxStyles(highlight, label);
  initBoxStyles(selection, selectionLabel);
  const HANDLE_SIZE = 8;
  const HALF_HANDLE = HANDLE_SIZE / 2;
  const EDGE_HIT_SIZE = 6;
  const CORNER_POSITIONS = ["nw", "ne", "se", "sw"];
  const EDGE_POSITIONS = ["n", "e", "s", "w"];
  const ALL_POSITIONS = [...CORNER_POSITIONS, ...EDGE_POSITIONS];
  const HANDLE_CURSORS = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize"
  };
  const HANDLE_AXES = {
    nw: { dx: -1, dy: -1 },
    n: { dx: 0, dy: -1 },
    ne: { dx: 1, dy: -1 },
    e: { dx: 1, dy: 0 },
    se: { dx: 1, dy: 1 },
    s: { dx: 0, dy: 1 },
    sw: { dx: -1, dy: 1 },
    w: { dx: -1, dy: 0 }
  };
  const handleEls = {};
  for (const pos of CORNER_POSITIONS) {
    const h = document.createElement("div");
    h.style.cssText = `
      position:fixed;pointer-events:auto;display:none;box-sizing:border-box;
      width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;
      background:#fff;border:1px solid #0D99FF;border-radius:1px;
      z-index:2147483645;cursor:${HANDLE_CURSORS[pos]};
    `;
    shadowRoot.appendChild(h);
    handleEls[pos] = h;
  }
  for (const pos of EDGE_POSITIONS) {
    const h = document.createElement("div");
    h.style.cssText = `
      position:fixed;pointer-events:auto;display:none;
      z-index:2147483645;cursor:${HANDLE_CURSORS[pos]};
    `;
    shadowRoot.appendChild(h);
    handleEls[pos] = h;
  }
  function positionHandles(rect) {
    const corners = {
      nw: { x: rect.left, y: rect.top },
      ne: { x: rect.right, y: rect.top },
      se: { x: rect.right, y: rect.bottom },
      sw: { x: rect.left, y: rect.bottom }
    };
    for (const pos of CORNER_POSITIONS) {
      const h = handleEls[pos];
      const p4 = corners[pos];
      h.style.left = `${p4.x - HALF_HANDLE}px`;
      h.style.top = `${p4.y - HALF_HANDLE}px`;
      h.style.display = "block";
    }
    const inset = HALF_HANDLE;
    handleEls.n.style.cssText += `display:block;left:${rect.left + inset}px;top:${rect.top - EDGE_HIT_SIZE / 2}px;width:${rect.width - inset * 2}px;height:${EDGE_HIT_SIZE}px;cursor:${HANDLE_CURSORS.n};`;
    handleEls.s.style.cssText += `display:block;left:${rect.left + inset}px;top:${rect.bottom - EDGE_HIT_SIZE / 2}px;width:${rect.width - inset * 2}px;height:${EDGE_HIT_SIZE}px;cursor:${HANDLE_CURSORS.s};`;
    handleEls.e.style.cssText += `display:block;left:${rect.right - EDGE_HIT_SIZE / 2}px;top:${rect.top + inset}px;width:${EDGE_HIT_SIZE}px;height:${rect.height - inset * 2}px;cursor:${HANDLE_CURSORS.e};`;
    handleEls.w.style.cssText += `display:block;left:${rect.left - EDGE_HIT_SIZE / 2}px;top:${rect.top + inset}px;width:${EDGE_HIT_SIZE}px;height:${rect.height - inset * 2}px;cursor:${HANDLE_CURSORS.w};`;
  }
  function hideHandles() {
    for (const pos of ALL_POSITIONS) handleEls[pos].style.display = "none";
  }
  const SNAP_THRESHOLD = 5;
  const snapGuidePool = [];
  for (let i3 = 0; i3 < 16; i3++) {
    const line = document.createElement("div");
    line.className = "retune-snap-guide";
    shadowRoot.appendChild(line);
    const label2 = document.createElement("div");
    label2.className = "retune-snap-label";
    shadowRoot.appendChild(label2);
    snapGuidePool.push({ line, label: label2 });
  }
  let snapCache = null;
  function buildSnapCache(el) {
    const parent = el.parentElement;
    const siblings = parent ? Array.from(parent.children).filter((c3) => c3 !== el && c3.tagName !== "SCRIPT" && c3.tagName !== "STYLE") : [];
    const siblingRects = siblings.map((s5) => s5.getBoundingClientRect());
    const siblingWidths = [...new Set(siblingRects.map((r) => Math.round(r.width)))].sort((a4, b) => a4 - b);
    const siblingHeights = [...new Set(siblingRects.map((r) => Math.round(r.height)))].sort((a4, b) => a4 - b);
    const parentRect = parent ? parent.getBoundingClientRect() : null;
    const parentCs = parent ? getComputedStyle(parent) : null;
    const parentWidth = parentRect && parentCs ? parentRect.width - parseFloat(parentCs.paddingLeft) - parseFloat(parentCs.paddingRight) - parseFloat(parentCs.borderLeftWidth) - parseFloat(parentCs.borderRightWidth) : 0;
    const parentHeight = parentRect && parentCs ? parentRect.height - parseFloat(parentCs.paddingTop) - parseFloat(parentCs.paddingBottom) - parseFloat(parentCs.borderTopWidth) - parseFloat(parentCs.borderBottomWidth) : 0;
    const parentPadding = parentCs ? {
      top: parseFloat(parentCs.paddingTop) || 0,
      right: parseFloat(parentCs.paddingRight) || 0,
      bottom: parseFloat(parentCs.paddingBottom) || 0,
      left: parseFloat(parentCs.paddingLeft) || 0
    } : { top: 0, right: 0, bottom: 0, left: 0 };
    const parentDisplay = parentCs?.display || "";
    const isFlexChild = parentDisplay.includes("flex");
    const isGridChild = parentDisplay.includes("grid");
    const parentFlexDir = parentCs?.flexDirection || "row";
    const sizingCtx = { isFlexChild, isGridChild, parentFlexDir, currentStyles: {} };
    const canFillWidth = canFill("width", sizingCtx);
    const canFillHeight = canFill("height", sizingCtx);
    snapCache = { siblingWidths, siblingHeights, siblingRects, parentRect, parentWidth: Math.round(parentWidth), parentHeight: Math.round(parentHeight), parentPadding, canFillWidth, canFillHeight };
  }
  function findSnap(value, candidates) {
    let lo = 0, hi = candidates.length - 1;
    let best = null;
    let bestDist = SNAP_THRESHOLD + 1;
    while (lo <= hi) {
      const mid = lo + hi >> 1;
      const dist = Math.abs(candidates[mid] - value);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidates[mid];
      }
      if (candidates[mid] < value) lo = mid + 1;
      else hi = mid - 1;
    }
    return bestDist <= SNAP_THRESHOLD ? best : null;
  }
  function snapResize(w, h, axes) {
    if (!snapCache) return { width: w, height: h, guides: [], fillWidth: false, fillHeight: false };
    const guides = [];
    let fillWidth = false;
    let fillHeight = false;
    if (axes.dx !== 0) {
      const parentSnapW = snapCache.canFillWidth && Math.abs(w - snapCache.parentWidth) <= SNAP_THRESHOLD ? snapCache.parentWidth : null;
      if (parentSnapW !== null) {
        w = parentSnapW;
        fillWidth = true;
        guides.push({ axis: "x", value: parentSnapW, ref: parentSnapW, fill: true });
      } else {
        const snapW = findSnap(w, snapCache.siblingWidths);
        if (snapW !== null) {
          w = snapW;
          const matchRect = snapCache.siblingRects.find((r) => Math.round(r.width) === snapW);
          guides.push({ axis: "x", value: snapW, ref: snapW, refRect: matchRect });
        }
      }
    }
    if (axes.dy !== 0) {
      const parentSnapH = snapCache.canFillHeight && Math.abs(h - snapCache.parentHeight) <= SNAP_THRESHOLD ? snapCache.parentHeight : null;
      if (parentSnapH !== null) {
        h = parentSnapH;
        fillHeight = true;
        guides.push({ axis: "y", value: parentSnapH, ref: parentSnapH, fill: true });
      } else {
        const snapH = findSnap(h, snapCache.siblingHeights);
        if (snapH !== null) {
          h = snapH;
          const matchRect = snapCache.siblingRects.find((r) => Math.round(r.height) === snapH);
          guides.push({ axis: "y", value: snapH, ref: snapH, refRect: matchRect });
        }
      }
    }
    return { width: w, height: h, guides, fillWidth, fillHeight };
  }
  const XMARK_SIZE = 4;
  function drawXMark(el, x, y) {
    el.style.cssText = `
      position:fixed;pointer-events:none;z-index:2147483645;
      top:${y - XMARK_SIZE}px;left:${x - XMARK_SIZE}px;
      width:${XMARK_SIZE * 2}px;height:${XMARK_SIZE * 2}px;
      background:none;
    `;
    el.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${XMARK_SIZE * 2}' height='${XMARK_SIZE * 2}'%3E%3Cline x1='2' y1='2' x2='${XMARK_SIZE * 2 - 2}' y2='${XMARK_SIZE * 2 - 2}' stroke='%23F24822' stroke-width='1'/%3E%3Cline x1='${XMARK_SIZE * 2 - 2}' y1='2' x2='2' y2='${XMARK_SIZE * 2 - 2}' stroke='%23F24822' stroke-width='1'/%3E%3C/svg%3E")`;
    el.style.backgroundSize = "contain";
  }
  function showSnapGuides(guides, elRect, handle) {
    for (const g of snapGuidePool) {
      g.line.classList.remove("visible");
      g.label.classList.remove("visible");
      g.label.style.display = "";
    }
    const axes = HANDLE_AXES[handle];
    let poolIdx = 0;
    for (const guide of guides) {
      if (guide.fill && snapCache?.parentRect) {
        const pr = snapCache.parentRect;
        const pad = snapCache.parentPadding;
        const hasPadding = guide.axis === "x" ? pad.left > 0 || pad.right > 0 : pad.top > 0 || pad.bottom > 0;
        parentIndicator.style.cssText = `
          position:fixed;display:block;pointer-events:none;z-index:2147483644;
          border:1px dotted #0D99FF;background:none;
          top:${pr.top}px;left:${pr.left}px;width:${pr.width}px;height:${pr.height}px;
        `;
        if (hasPadding) {
          const PADDING_BG = "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(13, 153, 255, 0.5) 3px, rgba(13, 153, 255, 0.5) 4px)";
          if (guide.axis === "x") {
            if (pad.left > 0 && poolIdx < snapGuidePool.length) {
              const g1 = snapGuidePool[poolIdx++];
              g1.line.style.cssText = `position:fixed;pointer-events:none;z-index:2147483645;top:${pr.top}px;left:${pr.left}px;width:${pad.left}px;height:${pr.height}px;background:${PADDING_BG};`;
              g1.line.classList.add("visible");
            }
            if (pad.right > 0 && poolIdx < snapGuidePool.length) {
              const g2 = snapGuidePool[poolIdx++];
              g2.line.style.cssText = `position:fixed;pointer-events:none;z-index:2147483645;top:${pr.top}px;left:${pr.right - pad.right}px;width:${pad.right}px;height:${pr.height}px;background:${PADDING_BG};`;
              g2.line.classList.add("visible");
            }
          } else {
            if (pad.top > 0 && poolIdx < snapGuidePool.length) {
              const g1 = snapGuidePool[poolIdx++];
              g1.line.style.cssText = `position:fixed;pointer-events:none;z-index:2147483645;top:${pr.top}px;left:${pr.left}px;width:${pr.width}px;height:${pad.top}px;background:${PADDING_BG};`;
              g1.line.classList.add("visible");
            }
            if (pad.bottom > 0 && poolIdx < snapGuidePool.length) {
              const g2 = snapGuidePool[poolIdx++];
              g2.line.style.cssText = `position:fixed;pointer-events:none;z-index:2147483645;top:${pr.bottom - pad.bottom}px;left:${pr.left}px;width:${pr.width}px;height:${pad.bottom}px;background:${PADDING_BG};`;
              g2.line.classList.add("visible");
            }
          }
        } else {
          if (guide.axis === "x") {
            const side = axes.dx > 0 ? "right" : "left";
            const x = side === "right" ? pr.right : pr.left;
            if (poolIdx < snapGuidePool.length) {
              const g1 = snapGuidePool[poolIdx++];
              drawXMark(g1.line, x, pr.top);
              g1.line.classList.add("visible");
            }
            if (poolIdx < snapGuidePool.length) {
              const g2 = snapGuidePool[poolIdx++];
              drawXMark(g2.line, x, pr.bottom);
              g2.line.classList.add("visible");
            }
          } else {
            const side = axes.dy > 0 ? "bottom" : "top";
            const y = side === "bottom" ? pr.bottom : pr.top;
            if (poolIdx < snapGuidePool.length) {
              const g1 = snapGuidePool[poolIdx++];
              drawXMark(g1.line, pr.left, y);
              g1.line.classList.add("visible");
            }
            if (poolIdx < snapGuidePool.length) {
              const g2 = snapGuidePool[poolIdx++];
              drawXMark(g2.line, pr.right, y);
              g2.line.classList.add("visible");
            }
          }
        }
      } else {
        const refRect = guide.refRect;
        if (!refRect || poolIdx + 1 >= snapGuidePool.length) continue;
        if (guide.axis === "x") {
          const side = axes.dx > 0 ? "right" : "left";
          const x = side === "right" ? refRect.right : refRect.left;
          const g1 = snapGuidePool[poolIdx++];
          drawXMark(g1.line, x, refRect.top);
          g1.line.classList.add("visible");
          const g2 = snapGuidePool[poolIdx++];
          drawXMark(g2.line, x, refRect.bottom);
          g2.line.classList.add("visible");
        } else {
          const side = axes.dy > 0 ? "bottom" : "top";
          const y = side === "bottom" ? refRect.bottom : refRect.top;
          const g1 = snapGuidePool[poolIdx++];
          drawXMark(g1.line, refRect.left, y);
          g1.line.classList.add("visible");
          const g2 = snapGuidePool[poolIdx++];
          drawXMark(g2.line, refRect.right, y);
          g2.line.classList.add("visible");
        }
      }
    }
  }
  function hideSnapGuides() {
    for (const g of snapGuidePool) {
      g.line.classList.remove("visible");
      g.label.classList.remove("visible");
    }
  }
  let posSnapCache = null;
  function buildPosSnapCache(el) {
    const parent = el.parentElement;
    if (!parent) {
      posSnapCache = null;
      return;
    }
    const pr = parent.getBoundingClientRect();
    const pcs = getComputedStyle(parent);
    const bt = parseFloat(pcs.borderTopWidth) || 0;
    const br = parseFloat(pcs.borderRightWidth) || 0;
    const bb = parseFloat(pcs.borderBottomWidth) || 0;
    const bl = parseFloat(pcs.borderLeftWidth) || 0;
    const pt = parseFloat(pcs.paddingTop) || 0;
    const pRight = parseFloat(pcs.paddingRight) || 0;
    const pb = parseFloat(pcs.paddingBottom) || 0;
    const pl = parseFloat(pcs.paddingLeft) || 0;
    const contentTop = pr.top + bt + pt;
    const contentRight = pr.right - br - pRight;
    const contentBottom = pr.bottom - bb - pb;
    const contentLeft = pr.left + bl + pl;
    const parentEdges = {
      top: contentTop,
      right: contentRight,
      bottom: contentBottom,
      left: contentLeft,
      centerX: (contentLeft + contentRight) / 2,
      centerY: (contentTop + contentBottom) / 2
    };
    const siblings = Array.from(parent.children).filter(
      (c3) => c3 !== el && c3.tagName !== "SCRIPT" && c3.tagName !== "STYLE"
    );
    const siblingEdges = siblings.map((s5) => {
      const r = s5.getBoundingClientRect();
      return {
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        left: r.left,
        centerX: r.left + r.width / 2,
        centerY: r.top + r.height / 2
      };
    });
    posSnapCache = { parentEdges, siblingEdges };
  }
  function checkPosSnap(elRect) {
    if (!posSnapCache) return { dx: 0, dy: 0, guides: [] };
    const elEdges = {
      top: elRect.top,
      right: elRect.right,
      bottom: elRect.bottom,
      left: elRect.left,
      centerX: elRect.left + elRect.width / 2,
      centerY: elRect.top + elRect.height / 2
    };
    const xTargets = [];
    const yTargets = [];
    const pe = posSnapCache.parentEdges;
    const pRef = { top: pe.top, right: pe.right, bottom: pe.bottom, left: pe.left };
    xTargets.push(
      { val: pe.left, isCenter: false, ...pRef },
      { val: pe.right, isCenter: false, ...pRef },
      { val: pe.centerX, isCenter: true, ...pRef }
    );
    yTargets.push(
      { val: pe.top, isCenter: false, ...pRef },
      { val: pe.bottom, isCenter: false, ...pRef },
      { val: pe.centerY, isCenter: true, ...pRef }
    );
    for (const s5 of posSnapCache.siblingEdges) {
      const sRef = { top: s5.top, right: s5.right, bottom: s5.bottom, left: s5.left };
      xTargets.push(
        { val: s5.left, isCenter: false, ...sRef },
        { val: s5.right, isCenter: false, ...sRef },
        { val: s5.centerX, isCenter: true, ...sRef }
      );
      yTargets.push(
        { val: s5.top, isCenter: false, ...sRef },
        { val: s5.bottom, isCenter: false, ...sRef },
        { val: s5.centerY, isCenter: true, ...sRef }
      );
    }
    const xEdges = [
      { val: elEdges.left, isCenter: false },
      { val: elEdges.right, isCenter: false },
      { val: elEdges.centerX, isCenter: true }
    ];
    let bestDx = 0;
    let bestXDist = SNAP_THRESHOLD + 1;
    let snapXPos = 0;
    let snapXRef = null;
    let snapXElIsCenter = false;
    for (const target of xTargets) {
      for (const edge of xEdges) {
        const dist = Math.abs(edge.val - target.val);
        if (dist < bestXDist) {
          bestXDist = dist;
          bestDx = target.val - edge.val;
          snapXPos = target.val;
          snapXRef = target;
          snapXElIsCenter = edge.isCenter;
        }
      }
    }
    const yEdges = [
      { val: elEdges.top, isCenter: false },
      { val: elEdges.bottom, isCenter: false },
      { val: elEdges.centerY, isCenter: true }
    ];
    let bestDy = 0;
    let bestYDist = SNAP_THRESHOLD + 1;
    let snapYPos = 0;
    let snapYRef = null;
    let snapYElIsCenter = false;
    for (const target of yTargets) {
      for (const edge of yEdges) {
        const dist = Math.abs(edge.val - target.val);
        if (dist < bestYDist) {
          bestYDist = dist;
          bestDy = target.val - edge.val;
          snapYPos = target.val;
          snapYRef = target;
          snapYElIsCenter = edge.isCenter;
        }
      }
    }
    const guides = [];
    const snapDx = bestXDist <= SNAP_THRESHOLD ? bestDx : 0;
    const snapDy = bestYDist <= SNAP_THRESHOLD ? bestDy : 0;
    if ((snapDx !== 0 || bestXDist <= SNAP_THRESHOLD) && snapXRef) {
      guides.push({ axis: "x", pos: snapXPos, elIsCenter: snapXElIsCenter, refIsCenter: snapXRef.isCenter, refTop: snapXRef.top, refRight: snapXRef.right, refBottom: snapXRef.bottom, refLeft: snapXRef.left });
    }
    if ((snapDy !== 0 || bestYDist <= SNAP_THRESHOLD) && snapYRef) {
      guides.push({ axis: "y", pos: snapYPos, elIsCenter: snapYElIsCenter, refIsCenter: snapYRef.isCenter, refTop: snapYRef.top, refRight: snapYRef.right, refBottom: snapYRef.bottom, refLeft: snapYRef.left });
    }
    return { dx: snapDx, dy: snapDy, guides };
  }
  function showPosSnapGuides(guides, elRect) {
    hideSnapGuides();
    let poolIdx = 0;
    function addXMark(x, y) {
      if (poolIdx >= snapGuidePool.length) return;
      const g = snapGuidePool[poolIdx++];
      drawXMark(g.line, x, y);
      g.line.classList.add("visible");
    }
    for (const guide of guides) {
      if (poolIdx >= snapGuidePool.length) break;
      const { line } = snapGuidePool[poolIdx++];
      if (guide.axis === "x") {
        line.style.cssText = `
          position:fixed;pointer-events:none;z-index:2147483645;background:none;
          top:0;left:${guide.pos}px;width:0;height:100vh;
          border-left:1px solid var(--retune-red);
        `;
        line.classList.add("visible");
        const cx = guide.pos + 0.5;
        if (guide.refIsCenter) {
          addXMark(cx, (guide.refTop + guide.refBottom) / 2);
        } else {
          addXMark(cx, guide.refTop);
          addXMark(cx, guide.refBottom);
        }
        if (guide.elIsCenter) {
          addXMark(cx, elRect.top + elRect.height / 2);
        } else {
          addXMark(cx, elRect.top);
          addXMark(cx, elRect.bottom);
        }
      } else {
        line.style.cssText = `
          position:fixed;pointer-events:none;z-index:2147483645;background:none;
          top:${guide.pos}px;left:0;width:100vw;height:0;
          border-top:1px solid var(--retune-red);
        `;
        line.classList.add("visible");
        const cy = guide.pos + 0.5;
        if (guide.refIsCenter) {
          addXMark((guide.refLeft + guide.refRight) / 2, cy);
        } else {
          addXMark(guide.refLeft, cy);
          addXMark(guide.refRight, cy);
        }
        if (guide.elIsCenter) {
          addXMark(elRect.left + elRect.width / 2, cy);
        } else {
          addXMark(elRect.left, cy);
          addXMark(elRect.right, cy);
        }
      }
    }
  }
  let resizeDrag = null;
  function handleResizePointerDown(e2, handle) {
    if (!selectedElement) return;
    e2.stopPropagation();
    e2.preventDefault();
    e2.target.setPointerCapture(e2.pointerId);
    hideHighlight();
    const rect = selectedElement.getBoundingClientRect();
    resizeDrag = {
      handle,
      startX: e2.clientX,
      startY: e2.clientY,
      startWidth: rect.width,
      startHeight: rect.height
    };
    buildSnapCache(selectedElement);
    document.addEventListener("pointermove", handleResizePointerMove, true);
    document.addEventListener("pointerup", handleResizePointerUp, true);
  }
  function computeResize(e2) {
    if (!resizeDrag) return { width: 0, height: 0 };
    const axes = HANDLE_AXES[resizeDrag.handle];
    const dx = e2.clientX - resizeDrag.startX;
    const dy = e2.clientY - resizeDrag.startY;
    const MIN_SIZE = 10;
    let w = axes.dx !== 0 ? Math.max(MIN_SIZE, resizeDrag.startWidth + dx * axes.dx) : resizeDrag.startWidth;
    let h = axes.dy !== 0 ? Math.max(MIN_SIZE, resizeDrag.startHeight + dy * axes.dy) : resizeDrag.startHeight;
    if (e2.shiftKey && axes.dx !== 0 && axes.dy !== 0 && resizeDrag.startWidth > 0 && resizeDrag.startHeight > 0) {
      const ratio = resizeDrag.startWidth / resizeDrag.startHeight;
      if (w / ratio < h) h = w / ratio;
      else w = h * ratio;
    }
    return { width: Math.round(w), height: Math.round(h) };
  }
  function handleResizePointerMove(e2) {
    if (!resizeDrag || !selectedElement) return;
    e2.preventDefault();
    const raw = computeResize(e2);
    const axes = HANDLE_AXES[resizeDrag.handle];
    const { width, height, guides, fillWidth, fillHeight } = snapResize(raw.width, raw.height, axes);
    const el = selectedElement;
    if (axes.dx !== 0) callbacks.onResizePreview?.(selectedElement, "width", fillWidth ? "100%" : `${width}px`);
    if (axes.dy !== 0) callbacks.onResizePreview?.(selectedElement, "height", fillHeight ? "100%" : `${height}px`);
    if (axes.dx !== 0) el.style.setProperty("width", fillWidth ? "100%" : `${width}px`, "important");
    if (axes.dy !== 0) el.style.setProperty("height", fillHeight ? "100%" : `${height}px`, "important");
    const newRect = selectedElement.getBoundingClientRect();
    positionBox(selection, selectionLabel, newRect, "solid", "0");
    positionHandles(newRect);
    selectionLabel.textContent = formatLabel(selectedElement);
    if (guides.length > 0) {
      showSnapGuides(guides, newRect, resizeDrag.handle);
    } else {
      hideSnapGuides();
    }
    refreshPinLines();
    refreshScopeHighlights();
  }
  function handleResizePointerUp(e2) {
    if (!resizeDrag || !selectedElement) {
      resizeDrag = null;
      return;
    }
    const raw = computeResize(e2);
    const axes = HANDLE_AXES[resizeDrag.handle];
    const { width, height, fillWidth, fillHeight } = snapResize(raw.width, raw.height, axes);
    const el = selectedElement;
    hideSnapGuides();
    snapCache = null;
    const widthChanged = axes.dx !== 0 && (fillWidth || Math.abs(width - resizeDrag.startWidth) > 0.5);
    const heightChanged = axes.dy !== 0 && (fillHeight || Math.abs(height - resizeDrag.startHeight) > 0.5);
    if (widthChanged) {
      el.style.removeProperty("width");
      callbacks.onResize?.(selectedElement, "width", fillWidth ? "100%" : `${width}px`);
    }
    if (heightChanged) {
      el.style.removeProperty("height");
      callbacks.onResize?.(selectedElement, "height", fillHeight ? "100%" : `${height}px`);
    }
    resizeDrag = null;
    document.removeEventListener("pointermove", handleResizePointerMove, true);
    document.removeEventListener("pointerup", handleResizePointerUp, true);
    const newRect = selectedElement.getBoundingClientRect();
    positionBox(selection, selectionLabel, newRect, "solid", "0");
    positionHandles(newRect);
    selectionLabel.textContent = formatLabel(selectedElement);
    refreshPinLines();
  }
  for (const pos of ALL_POSITIONS) {
    handleEls[pos].addEventListener("pointerdown", (e2) => handleResizePointerDown(e2, pos));
  }
  let repositionAxes = null;
  let repositionDrag = null;
  function isRepositionable(el) {
    const pos = getComputedStyle(el).position;
    return pos === "absolute" || pos === "fixed";
  }
  function updateSelectionCursor() {
    if (selectedElement && isRepositionable(selectedElement)) {
      selection.style.pointerEvents = "auto";
      selection.style.cursor = "move";
    } else if (selectedElement && detectReorderContext(selectedElement)) {
      selection.style.pointerEvents = "auto";
      selection.style.cursor = "grab";
    } else {
      selection.style.pointerEvents = "none";
      selection.style.cursor = "";
    }
  }
  function handleRepositionPointerDown(e2) {
    if (!selectedElement || !isRepositionable(selectedElement)) return;
    e2.stopPropagation();
    e2.preventDefault();
    selection.setPointerCapture(e2.pointerId);
    hideHighlight();
    selection.style.display = "none";
    selectionLabel.style.display = "none";
    hideHandles();
    const el = selectedElement;
    const cs = getComputedStyle(el);
    if (!repositionAxes) {
      const inlineTop = el.style.top;
      const inlineBottom = el.style.bottom;
      const inlineLeft = el.style.left;
      const inlineRight = el.style.right;
      let useBottom = false;
      let useRight = false;
      if (inlineBottom !== "" || inlineTop !== "") {
        useBottom = inlineBottom !== "" && inlineTop === "";
      } else {
        try {
          const rules = [...document.styleSheets].flatMap((s5) => {
            try {
              return [...s5.cssRules];
            } catch {
              return [];
            }
          }).filter((r) => r instanceof CSSStyleRule);
          const hasRuleBottom = rules.some((r) => el.matches(r.selectorText) && r.style.bottom && r.style.bottom !== "auto");
          const hasRuleTop = rules.some((r) => el.matches(r.selectorText) && r.style.top && r.style.top !== "auto");
          if (hasRuleBottom && !hasRuleTop) useBottom = true;
          else if (!hasRuleBottom && hasRuleTop) useBottom = false;
          else useBottom = parseFloat(cs.bottom) < parseFloat(cs.top);
        } catch {
          useBottom = parseFloat(cs.bottom) < parseFloat(cs.top);
        }
      }
      if (inlineRight !== "" || inlineLeft !== "") {
        useRight = inlineRight !== "" && inlineLeft === "";
      } else {
        try {
          const rules = [...document.styleSheets].flatMap((s5) => {
            try {
              return [...s5.cssRules];
            } catch {
              return [];
            }
          }).filter((r) => r instanceof CSSStyleRule);
          const hasRuleRight = rules.some((r) => el.matches(r.selectorText) && r.style.right && r.style.right !== "auto");
          const hasRuleLeft = rules.some((r) => el.matches(r.selectorText) && r.style.left && r.style.left !== "auto");
          if (hasRuleRight && !hasRuleLeft) useRight = true;
          else if (!hasRuleRight && hasRuleLeft) useRight = false;
          else useRight = parseFloat(cs.right) < parseFloat(cs.left);
        } catch {
          useRight = parseFloat(cs.right) < parseFloat(cs.left);
        }
      }
      repositionAxes = { useBottom, useRight };
    }
    repositionDrag = {
      startX: e2.clientX,
      startY: e2.clientY,
      startTop: parseFloat(cs.top) || 0,
      startLeft: parseFloat(cs.left) || 0,
      startRight: parseFloat(cs.right) || 0,
      startBottom: parseFloat(cs.bottom) || 0,
      startRect: selectedElement.getBoundingClientRect()
    };
    buildPosSnapCache(selectedElement);
    document.addEventListener("pointermove", handleRepositionPointerMove, true);
    document.addEventListener("pointerup", handleRepositionPointerUp, true);
  }
  function handleRepositionPointerMove(e2) {
    if (!repositionDrag || !selectedElement) return;
    e2.preventDefault();
    const rawDx = e2.clientX - repositionDrag.startX;
    const rawDy = e2.clientY - repositionDrag.startY;
    const el = selectedElement;
    const startRect = repositionDrag.startRect;
    const proposedRect = new DOMRect(
      startRect.left + rawDx,
      startRect.top + rawDy,
      startRect.width,
      startRect.height
    );
    const snap = checkPosSnap(proposedRect);
    const snapDx = snap.dx;
    const snapDy = snap.dy;
    if (snap.guides.length > 0) {
      const snappedRect = new DOMRect(
        proposedRect.left + snap.dx,
        proposedRect.top + snap.dy,
        proposedRect.width,
        proposedRect.height
      );
      showPosSnapGuides(snap.guides, snappedRect);
    } else {
      hideSnapGuides();
    }
    if (repositionAxes?.useBottom) {
      const newBottom = Math.round(repositionDrag.startBottom - rawDy - snapDy);
      el.style.setProperty("bottom", `${newBottom}px`, "important");
      callbacks.onRepositionPreview?.(selectedElement, "bottom", `${newBottom}px`);
    } else {
      const newTop = Math.round(repositionDrag.startTop + rawDy + snapDy);
      el.style.setProperty("top", `${newTop}px`, "important");
      callbacks.onRepositionPreview?.(selectedElement, "top", `${newTop}px`);
    }
    if (repositionAxes?.useRight) {
      const newRight = Math.round(repositionDrag.startRight - rawDx - snapDx);
      el.style.setProperty("right", `${newRight}px`, "important");
      callbacks.onRepositionPreview?.(selectedElement, "right", `${newRight}px`);
    } else {
      const newLeft = Math.round(repositionDrag.startLeft + rawDx + snapDx);
      el.style.setProperty("left", `${newLeft}px`, "important");
      callbacks.onRepositionPreview?.(selectedElement, "left", `${newLeft}px`);
    }
    const parent = selectedElement.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      const pr = parent.getBoundingClientRect();
      parentIndicator.style.top = `${pr.top}px`;
      parentIndicator.style.left = `${pr.left}px`;
      parentIndicator.style.width = `${pr.width}px`;
      parentIndicator.style.height = `${pr.height}px`;
    }
    refreshPinLines();
  }
  function handleRepositionPointerUp(e2) {
    if (!repositionDrag || !selectedElement) {
      repositionDrag = null;
      return;
    }
    const rawDx = e2.clientX - repositionDrag.startX;
    const rawDy = e2.clientY - repositionDrag.startY;
    const el = selectedElement;
    const startRect = repositionDrag.startRect;
    const finalProposed = new DOMRect(startRect.left + rawDx, startRect.top + rawDy, startRect.width, startRect.height);
    const finalSnap = checkPosSnap(finalProposed);
    if (repositionAxes?.useBottom) el.style.removeProperty("bottom");
    else el.style.removeProperty("top");
    if (repositionAxes?.useRight) el.style.removeProperty("right");
    else el.style.removeProperty("left");
    const totalDy = rawDy + finalSnap.dy;
    const totalDx = rawDx + finalSnap.dx;
    if (Math.abs(totalDy) > 0.5) {
      if (repositionAxes?.useBottom) {
        callbacks.onReposition?.(selectedElement, "bottom", `${Math.round(repositionDrag.startBottom - totalDy)}px`);
      } else {
        callbacks.onReposition?.(selectedElement, "top", `${Math.round(repositionDrag.startTop + totalDy)}px`);
      }
    }
    if (Math.abs(totalDx) > 0.5) {
      if (repositionAxes?.useRight) {
        callbacks.onReposition?.(selectedElement, "right", `${Math.round(repositionDrag.startRight - totalDx)}px`);
      } else {
        callbacks.onReposition?.(selectedElement, "left", `${Math.round(repositionDrag.startLeft + totalDx)}px`);
      }
    }
    repositionDrag = null;
    posSnapCache = null;
    hideSnapGuides();
    document.removeEventListener("pointermove", handleRepositionPointerMove, true);
    document.removeEventListener("pointerup", handleRepositionPointerUp, true);
    const newRect = selectedElement.getBoundingClientRect();
    positionBox(selection, selectionLabel, newRect, "solid", "0");
    positionHandles(newRect);
    selectionLabel.textContent = formatLabel(selectedElement);
    refreshPinLines();
  }
  const REORDER_THRESHOLD = 5;
  let reorderClickTimer = null;
  let reorderDragActive = false;
  let reorderDrag = null;
  function detectReorderContext(el) {
    const parent = el.parentElement;
    if (!parent) return null;
    const pos = getComputedStyle(el).position;
    if (pos === "absolute" || pos === "fixed") return null;
    const display = getComputedStyle(parent).display;
    const isFlex = display === "flex" || display === "inline-flex";
    const isGrid = display === "grid" || display === "inline-grid";
    const isBlock = display === "block" || display === "inline-block" || display === "flow-root";
    if (!isFlex && !isGrid && !isBlock) return null;
    const domSiblings = Array.from(parent.children).filter((c3) => {
      const cs = getComputedStyle(c3);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      if (cs.position === "absolute" || cs.position === "fixed") return false;
      return true;
    });
    if (domSiblings.length < 2) return null;
    if (!domSiblings.includes(el)) return null;
    let horizontal;
    if (isFlex) {
      const dir = getComputedStyle(parent).flexDirection;
      horizontal = dir === "row" || dir === "row-reverse";
    } else if (isGrid) {
      const autoFlow = getComputedStyle(parent).gridAutoFlow;
      if (autoFlow.startsWith("column")) {
        horizontal = false;
      } else if (domSiblings.length >= 2) {
        const r0 = domSiblings[0].getBoundingClientRect();
        const r1 = domSiblings[1].getBoundingClientRect();
        horizontal = Math.abs(r1.left - r0.left) > Math.abs(r1.top - r0.top);
      } else {
        horizontal = true;
      }
    } else {
      horizontal = false;
    }
    const siblings = [...domSiblings].sort((a4, b) => {
      const ra = a4.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return horizontal ? ra.left - rb.left : ra.top - rb.top;
    });
    const index2 = siblings.indexOf(el);
    if (index2 === -1) return null;
    return { parent, siblings, horizontal, index: index2 };
  }
  function findReparentTarget(x, y, draggedEl, originalParent) {
    const ghost = reorderDrag?.ghost;
    if (ghost) ghost.style.display = "none";
    draggedEl.style.visibility = "";
    const hit = document.elementFromPoint(x, y);
    draggedEl.style.visibility = "hidden";
    if (ghost) ghost.style.display = "";
    if (!hit || isOverlayElement(hit)) return null;
    let current = hit;
    while (current) {
      if (current === draggedEl) {
        current = current.parentElement;
        continue;
      }
      if (current === originalParent) return null;
      if (current === document.body || current === document.documentElement) break;
      const display = getComputedStyle(current).display;
      const isContainer = display === "flex" || display === "inline-flex" || display === "grid" || display === "inline-grid" || display === "block" || display === "inline-block" || display === "flow-root";
      const tag = current.tagName;
      const voidElements = /* @__PURE__ */ new Set([
        "INPUT",
        "IMG",
        "BR",
        "HR",
        "AREA",
        "BASE",
        "COL",
        "EMBED",
        "LINK",
        "META",
        "PARAM",
        "SOURCE",
        "TRACK",
        "WBR",
        "TEXTAREA",
        "SELECT"
      ]);
      if (voidElements.has(tag)) {
        current = current.parentElement;
        continue;
      }
      const isFlexOrGrid = display === "flex" || display === "inline-flex" || display === "grid" || display === "inline-grid";
      const isTextLayer = current.childElementCount === 0 && (current.textContent?.trim().length ?? 0) > 0 && !isFlexOrGrid;
      if (isTextLayer) {
        current = current.parentElement;
        continue;
      }
      if (isContainer && !isAncestor2(draggedEl, current)) {
        const children = Array.from(current.children).filter((c3) => {
          const cs = getComputedStyle(c3);
          return cs.display !== "none" && cs.visibility !== "hidden";
        });
        const dir = getComputedStyle(current).flexDirection;
        const horizontal = display === "flex" || display === "inline-flex" ? dir === "row" || dir === "row-reverse" : false;
        let insertIndex = children.length;
        for (let i3 = 0; i3 < children.length; i3++) {
          const r = children[i3].getBoundingClientRect();
          const mid = horizontal ? r.left + r.width / 2 : r.top + r.height / 2;
          const cursor = horizontal ? x : y;
          if (cursor < mid) {
            insertIndex = i3;
            break;
          }
        }
        return { target: current, insertIndex, horizontal };
      }
      current = current.parentElement;
    }
    return null;
  }
  function isAncestor2(ancestor, descendant) {
    let current = descendant.parentElement;
    while (current) {
      if (current === ancestor) return true;
      current = current.parentElement;
    }
    return false;
  }
  function showReparentHighlight(target, insertIndex, horizontal, dragState) {
    let hl = dragState.reparentHighlight;
    if (!hl) {
      hl = document.createElement("div");
      hl.setAttribute("data-retune-drag-ghost", "");
      hl.style.cssText = `
        position:fixed;pointer-events:none;z-index:2147483646;
        border:1px solid #0D99FF;
        background:rgba(13,153,255,0.04);
      `;
      document.body.appendChild(hl);
      dragState.reparentHighlight = hl;
    }
    const r = target.getBoundingClientRect();
    hl.style.left = `${r.left}px`;
    hl.style.top = `${r.top}px`;
    hl.style.width = `${r.width}px`;
    hl.style.height = `${r.height}px`;
    hl.style.display = "block";
    let line = hl.querySelector("[data-retune-reparent-line]");
    if (!line) {
      line = document.createElement("div");
      line.setAttribute("data-retune-reparent-line", "");
      line.style.cssText = `position:absolute;background:#0D99FF;pointer-events:none;border-radius:1px;`;
      hl.appendChild(line);
    }
    const INSET = Math.max(3, Math.min(12, Math.round((horizontal ? r.height : r.width) * 0.03)));
    const children = Array.from(target.children).filter((c3) => {
      const cs = getComputedStyle(c3);
      return cs.display !== "none" && cs.visibility !== "hidden";
    });
    if (horizontal) {
      let x;
      if (children.length === 0) {
        x = r.left + 4;
      } else if (insertIndex <= 0) {
        x = children[0].getBoundingClientRect().left;
      } else if (insertIndex >= children.length) {
        x = children[children.length - 1].getBoundingClientRect().right;
      } else {
        const prev = children[insertIndex - 1].getBoundingClientRect();
        const curr = children[insertIndex].getBoundingClientRect();
        x = (prev.right + curr.left) / 2;
      }
      line.style.left = `${x - r.left - 1}px`;
      line.style.top = `${INSET}px`;
      line.style.width = "2px";
      line.style.height = `${r.height - INSET * 2}px`;
    } else {
      let y;
      if (children.length === 0) {
        y = r.top + 4;
      } else if (insertIndex <= 0) {
        y = children[0].getBoundingClientRect().top;
      } else if (insertIndex >= children.length) {
        y = children[children.length - 1].getBoundingClientRect().bottom;
      } else {
        const prev = children[insertIndex - 1].getBoundingClientRect();
        const curr = children[insertIndex].getBoundingClientRect();
        y = (prev.bottom + curr.top) / 2;
      }
      line.style.left = `${INSET}px`;
      line.style.top = `${y - r.top - 1}px`;
      line.style.width = `${r.width - INSET * 2}px`;
      line.style.height = "2px";
    }
  }
  function hideReparentHighlight(dragState) {
    if (dragState.reparentHighlight) {
      dragState.reparentHighlight.style.display = "none";
    }
  }
  function handleReorderPointerMove(e2) {
    if (!reorderDrag || !selectedElement) return;
    e2.preventDefault();
    const dx = e2.clientX - reorderDrag.startX;
    const dy = e2.clientY - reorderDrag.startY;
    if (!reorderDrag.active) {
      if (Math.abs(dx) + Math.abs(dy) < REORDER_THRESHOLD) return;
      reorderDrag.active = true;
      reorderDragActive = true;
      if (selectedElement !== reorderDrag.element) {
        selectedElement = reorderDrag.element;
        callbacks.onSelect(reorderDrag.element);
      }
      selection.style.display = "none";
      selectionLabel.style.display = "none";
      hideHandles();
      const dragEl = reorderDrag.element;
      const origRect = reorderDrag.startRect;
      dragEl.style.visibility = "hidden";
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      const ghost = document.createElement("div");
      ghost.setAttribute("data-retune-drag-ghost", "");
      ghost.style.cssText = `
        position:fixed;pointer-events:none;z-index:2147483647;
        width:${origRect.width}px;height:${origRect.height}px;
        left:${origRect.left}px;top:${origRect.top}px;
        transition:none;overflow:hidden;opacity:0.85;
      `;
      const clone = dragEl.cloneNode(true);
      const origStyles = getComputedStyle(dragEl);
      const stylesToCopy = [
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "line-height",
        "letter-spacing",
        "color",
        "background-color",
        "background-image",
        "background",
        "padding",
        "border",
        "border-radius",
        "text-align",
        "text-decoration",
        "text-transform",
        "white-space",
        "word-break",
        "overflow-wrap",
        "display",
        "flex-direction",
        "align-items",
        "justify-content",
        "gap",
        "box-shadow",
        "opacity"
      ];
      for (const prop of stylesToCopy) {
        clone.style.setProperty(prop, origStyles.getPropertyValue(prop));
      }
      clone.style.visibility = "visible";
      clone.style.position = "static";
      clone.style.translate = "none";
      clone.style.transform = "none";
      clone.style.margin = "0";
      clone.style.width = "100%";
      clone.style.height = "100%";
      clone.style.boxSizing = "border-box";
      ghost.appendChild(clone);
      document.body.appendChild(ghost);
      reorderDrag.ghost = ghost;
      const allRects = reorderDrag.siblings.map((s5) => s5.getBoundingClientRect());
      reorderDrag.allRects = allRects;
      const otherR = [];
      const otherI = [];
      for (let i3 = 0; i3 < allRects.length; i3++) {
        if (i3 === reorderDrag.dragIndex) continue;
        otherR.push(allRects[i3]);
        otherI.push(i3);
      }
      reorderDrag.otherRects = otherR;
      reorderDrag.otherIndices = otherI;
      for (const idx of otherI) {
        reorderDrag.siblings[idx].style.transition = "transform 150ms ease-out";
      }
      return;
    }
    if (!reorderDrag.element.isConnected) {
      cleanupReorderDrag();
      return;
    }
    if (reorderDrag.ghost) {
      reorderDrag.ghost.style.left = `${reorderDrag.startRect.left + dx}px`;
      reorderDrag.ghost.style.top = `${reorderDrag.startRect.top + dy}px`;
    }
    const parentRect = reorderDrag.parent.getBoundingClientRect();
    const LEAVE_BUFFER = 10;
    const insideParent = reorderDrag.mode === "reparent" ? e2.clientX >= parentRect.left && e2.clientX <= parentRect.right && e2.clientY >= parentRect.top && e2.clientY <= parentRect.bottom : e2.clientX >= parentRect.left - LEAVE_BUFFER && e2.clientX <= parentRect.right + LEAVE_BUFFER && e2.clientY >= parentRect.top - LEAVE_BUFFER && e2.clientY <= parentRect.bottom + LEAVE_BUFFER;
    if (insideParent) {
      if (reorderDrag.mode === "reparent") {
        reorderDrag.mode = "reorder";
        reorderDrag.reparentTarget = null;
        hideReparentHighlight(reorderDrag);
      }
      const newIndex = computeCanvasDropIndex(
        e2.clientX,
        e2.clientY,
        reorderDrag.otherRects,
        reorderDrag.otherIndices,
        reorderDrag.horizontal,
        reorderDrag.dragIndex
      );
      if (newIndex !== reorderDrag.dropIndex) {
        reorderDrag.dropIndex = newIndex;
        const { siblings, dragIndex, allRects, horizontal } = reorderDrag;
        let dragOccupied;
        if (horizontal) {
          if (dragIndex < allRects.length - 1) {
            dragOccupied = allRects[dragIndex + 1].left - allRects[dragIndex].left;
          } else {
            const gap = dragIndex > 0 ? allRects[dragIndex].left - allRects[dragIndex - 1].right : 0;
            dragOccupied = allRects[dragIndex].width + gap;
          }
        } else {
          if (dragIndex < allRects.length - 1) {
            dragOccupied = allRects[dragIndex + 1].top - allRects[dragIndex].top;
          } else {
            const gap = dragIndex > 0 ? allRects[dragIndex].top - allRects[dragIndex - 1].bottom : 0;
            dragOccupied = allRects[dragIndex].height + gap;
          }
        }
        for (let i3 = 0; i3 < siblings.length; i3++) {
          if (i3 === dragIndex) continue;
          const el = siblings[i3];
          let shift = 0;
          if (dragIndex < newIndex) {
            if (i3 > dragIndex && i3 < newIndex) shift = -dragOccupied;
          } else if (dragIndex > newIndex) {
            if (i3 >= newIndex && i3 < dragIndex) shift = dragOccupied;
          }
          el.style.transform = shift !== 0 ? horizontal ? `translateX(${shift}px)` : `translateY(${shift}px)` : "";
        }
      }
    } else {
      reorderDrag.mode = "reparent";
      for (let i3 = 0; i3 < reorderDrag.siblings.length; i3++) {
        if (i3 === reorderDrag.dragIndex) continue;
        reorderDrag.siblings[i3].style.transform = "";
      }
      const reparentResult = findReparentTarget(e2.clientX, e2.clientY, reorderDrag.element, reorderDrag.parent);
      if (reparentResult) {
        reorderDrag.reparentTarget = reparentResult.target;
        reorderDrag.reparentIndex = reparentResult.insertIndex;
        showReparentHighlight(reparentResult.target, reparentResult.insertIndex, reparentResult.horizontal, reorderDrag);
      } else {
        reorderDrag.reparentTarget = null;
        hideReparentHighlight(reorderDrag);
      }
    }
  }
  function handleReorderPointerUp(e2) {
    document.removeEventListener("pointermove", handleReorderPointerMove, true);
    document.removeEventListener("pointerup", handleReorderPointerUp, true);
    if (!reorderDrag) return;
    const { element, dragIndex, dropIndex, active: active2, mode, reparentTarget, reparentIndex } = reorderDrag;
    if (active2 && mode === "reparent" && reparentTarget) {
      cleanupReorderDrag();
      callbacks.onCanvasReparent?.(element, reparentTarget, reparentIndex);
      reorderDragActive = false;
      if (selectedElement) showSelection();
    } else if (active2 && mode === "reorder" && !isEffectiveNoOp(dragIndex, dropIndex)) {
      cleanupReorderDrag();
      callbacks.onCanvasReorder?.(element, dragIndex, dropIndex);
      reorderDragActive = false;
      if (selectedElement) showSelection();
    } else if (active2) {
      cleanupReorderDrag();
      reorderDragActive = false;
      if (selectedElement) showSelection();
    } else {
      cleanupReorderDrag();
      reorderDragActive = false;
      const clickX = e2.clientX;
      const clickY = e2.clientY;
      const clickElement = element;
      if (reorderClickTimer) clearTimeout(reorderClickTimer);
      reorderClickTimer = setTimeout(() => {
        reorderClickTimer = null;
        selection.style.display = "none";
        selectionLabel.style.display = "none";
        hideHandles();
        const hit = document.elementFromPoint(clickX, clickY);
        if (hit && hit !== clickElement && !hit.hasAttribute("data-retune-host")) {
          selectedElement = hit;
          selectionLabelHidden = false;
          if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver.observe(hit);
          }
          showSelection();
          hideHighlight();
          hoveredElement = null;
          callbacks.onSelect(hit);
        } else {
          selection.style.display = "";
          selectionLabel.style.display = "";
          showSelection();
        }
      }, 200);
    }
  }
  function cleanupReorderDrag() {
    if (!reorderDrag) return;
    if (reorderDrag.ghost) reorderDrag.ghost.remove();
    if (reorderDrag.reparentHighlight) reorderDrag.reparentHighlight.remove();
    document.body.style.removeProperty("user-select");
    document.body.style.removeProperty("-webkit-user-select");
    const dragEl = reorderDrag.element;
    dragEl.style.removeProperty("visibility");
    if (dragEl.getAttribute("style")?.trim() === "") dragEl.removeAttribute("style");
    for (let i3 = 0; i3 < reorderDrag.siblings.length; i3++) {
      if (i3 === reorderDrag.dragIndex) continue;
      const el = reorderDrag.siblings[i3];
      el.style.transition = "none";
      el.style.removeProperty("transform");
      el.style.removeProperty("transition");
      if (el.getAttribute("style")?.trim() === "") el.removeAttribute("style");
    }
    reorderDrag = null;
  }
  selection.addEventListener("pointerdown", (e2) => {
    if (!selectedElement) return;
    if (isRepositionable(selectedElement)) {
      handleRepositionPointerDown(e2);
      return;
    }
    const context = detectReorderContext(selectedElement);
    if (!context) return;
    e2.preventDefault();
    const elRect = selectedElement.getBoundingClientRect();
    reorderDrag = {
      element: selectedElement,
      parent: context.parent,
      siblings: context.siblings,
      otherRects: [],
      otherIndices: [],
      dragIndex: context.index,
      dropIndex: context.index,
      horizontal: context.horizontal,
      startX: e2.clientX,
      startY: e2.clientY,
      startRect: elRect,
      active: false,
      ghost: null,
      mode: "reorder",
      reparentTarget: null,
      reparentIndex: 0,
      reparentHighlight: null
    };
    document.addEventListener("pointermove", handleReorderPointerMove, true);
    document.addEventListener("pointerup", handleReorderPointerUp, true);
  });
  selection.addEventListener("dblclick", (e2) => {
    if (!selectedElement) return;
    e2.preventDefault();
    e2.stopPropagation();
    if (reorderClickTimer) {
      clearTimeout(reorderClickTimer);
      reorderClickTimer = null;
    }
    selection.style.display = "none";
    selectionLabel.style.display = "none";
    hideHandles();
    const hit = document.elementFromPoint(e2.clientX, e2.clientY);
    selection.style.display = "";
    selectionLabel.style.display = "";
    showSelection();
    callbacks.onDoubleClick?.(hit || selectedElement);
  });
  const spacingContainer = document.createElement("div");
  spacingContainer.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:2147483646;";
  shadowRoot.appendChild(spacingContainer);
  const SPACING_LINE = "position:fixed;pointer-events:none;display:none;";
  const SPACING_LABEL = `
    position:fixed;pointer-events:none;display:none;
    font-size:10px;font-weight:500;
    font-family:InterVariable,Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
    color:#fff;white-space:nowrap;
    background:var(--retune-red);padding:1px 4px;border-radius:2px;
  `;
  function createMeasure() {
    const line = document.createElement("div");
    line.style.cssText = SPACING_LINE;
    const connector = document.createElement("div");
    connector.style.cssText = SPACING_LINE;
    const lbl = document.createElement("div");
    lbl.style.cssText = SPACING_LABEL;
    spacingContainer.appendChild(line);
    spacingContainer.appendChild(connector);
    spacingContainer.appendChild(lbl);
    return { line, connector, label: lbl };
  }
  const hMeasure = createMeasure();
  const vMeasure = createMeasure();
  const parentMeasures = {
    top: createMeasure(),
    right: createMeasure(),
    bottom: createMeasure(),
    left: createMeasure()
  };
  function hideSpacing() {
    for (const m of [hMeasure, vMeasure]) {
      m.line.style.display = "none";
      m.connector.style.display = "none";
      m.label.style.display = "none";
    }
    for (const m of Object.values(parentMeasures)) {
      m.line.style.display = "none";
      m.connector.style.display = "none";
      m.label.style.display = "none";
    }
  }
  function drawSegment(el, x, y, size, horizontal, dashed = true) {
    el.style.cssText = `
      position:fixed;pointer-events:none;display:block;
      top:${y}px;left:${x}px;
      width:${horizontal ? size : 0}px;height:${horizontal ? 0 : size}px;
      border-${horizontal ? "top" : "left"}:1px ${dashed ? "dashed" : "solid"} var(--retune-red);
    `;
  }
  function positionLabel(el, value, x, y, size, horizontal) {
    el.style.cssText = SPACING_LABEL;
    el.style.display = "block";
    el.textContent = `${value}`;
    if (horizontal) {
      el.style.top = `${y - 4}px`;
      el.style.left = `${x + size / 2}px`;
      el.style.transform = "translate(-50%, -100%)";
    } else {
      el.style.top = `${y + size / 2}px`;
      el.style.left = `${x + 4}px`;
      el.style.transform = "translateY(-50%)";
    }
  }
  function showSpacing(selRect, hoverRect) {
    hideSpacing();
    const hoverIsRight = hoverRect.left + hoverRect.width / 2 > selRect.left + selRect.width / 2;
    const hoverIsBelow = hoverRect.top + hoverRect.height / 2 > selRect.top + selRect.height / 2;
    const selEdgeX = hoverIsRight ? selRect.right : selRect.left;
    const selEdgeY = hoverIsBelow ? selRect.bottom : selRect.top;
    const hoverEdgeX = hoverIsRight ? hoverRect.left : hoverRect.right;
    const hoverEdgeY = hoverIsBelow ? hoverRect.top : hoverRect.bottom;
    const hGap = hoverIsRight ? hoverRect.left - selRect.right : selRect.left - hoverRect.right;
    const vGap = hoverIsBelow ? hoverRect.top - selRect.bottom : selRect.top - hoverRect.bottom;
    const hDist = hGap > 0 ? Math.round(hGap) : 0;
    const vDist = vGap > 0 ? Math.round(vGap) : 0;
    if (hDist <= 0 && vDist <= 0) return;
    if (hDist > 0) {
      const hOriginX = selEdgeX;
      const hOriginY = selRect.top + selRect.height / 2;
      const hx1 = Math.min(hOriginX, hoverEdgeX);
      drawSegment(hMeasure.line, hx1, hOriginY, hDist, true, false);
      positionLabel(hMeasure.label, hDist, hx1, hOriginY, hDist, true);
      if (hOriginY >= hoverRect.top && hOriginY <= hoverRect.bottom) {
        hMeasure.connector.style.display = "none";
      } else {
        const bendTargetY = hoverIsBelow ? hoverRect.top : hoverRect.bottom;
        const cy1 = Math.min(hOriginY, bendTargetY);
        drawSegment(hMeasure.connector, hoverEdgeX, cy1, Math.abs(bendTargetY - hOriginY), false);
      }
    }
    if (vDist > 0) {
      const vOriginX = selRect.left + selRect.width / 2;
      const vOriginY = selEdgeY;
      const vy1 = Math.min(vOriginY, hoverEdgeY);
      drawSegment(vMeasure.line, vOriginX, vy1, vDist, false, false);
      positionLabel(vMeasure.label, vDist, vOriginX, vy1, vDist, false);
      if (vOriginX >= hoverRect.left && vOriginX <= hoverRect.right) {
        vMeasure.connector.style.display = "none";
      } else {
        const bendTargetX = hoverIsRight ? hoverRect.left : hoverRect.right;
        const cx1 = Math.min(vOriginX, bendTargetX);
        drawSegment(vMeasure.connector, cx1, hoverEdgeY, Math.abs(bendTargetX - vOriginX), true);
      }
    }
  }
  function showParentSpacing(childRect, parentEl) {
    hideSpacing();
    const computed = getComputedStyle(parentEl);
    const parentRect = parentEl.getBoundingClientRect();
    const bt = parseFloat(computed.borderTopWidth) || 0;
    const br = parseFloat(computed.borderRightWidth) || 0;
    const bb = parseFloat(computed.borderBottomWidth) || 0;
    const bl = parseFloat(computed.borderLeftWidth) || 0;
    const innerTop = parentRect.top + bt;
    const innerRight = parentRect.right - br;
    const innerBottom = parentRect.bottom - bb;
    const innerLeft = parentRect.left + bl;
    const topDist = Math.round(childRect.top - innerTop);
    const rightDist = Math.round(innerRight - childRect.right);
    const bottomDist = Math.round(innerBottom - childRect.bottom);
    const leftDist = Math.round(childRect.left - innerLeft);
    const childCenterX = childRect.left + childRect.width / 2;
    const childCenterY = childRect.top + childRect.height / 2;
    if (topDist > 0) {
      drawSegment(parentMeasures.top.line, childCenterX, innerTop, topDist, false, false);
      positionLabel(parentMeasures.top.label, topDist, childCenterX, innerTop, topDist, false);
      parentMeasures.top.connector.style.display = "none";
    }
    if (bottomDist > 0) {
      drawSegment(parentMeasures.bottom.line, childCenterX, childRect.bottom, bottomDist, false, false);
      positionLabel(parentMeasures.bottom.label, bottomDist, childCenterX, childRect.bottom, bottomDist, false);
      parentMeasures.bottom.connector.style.display = "none";
    }
    if (leftDist > 0) {
      drawSegment(parentMeasures.left.line, innerLeft, childCenterY, leftDist, true, false);
      positionLabel(parentMeasures.left.label, leftDist, innerLeft, childCenterY, leftDist, true);
      parentMeasures.left.connector.style.display = "none";
    }
    if (rightDist > 0) {
      drawSegment(parentMeasures.right.line, childRect.right, childCenterY, rightDist, true, false);
      positionLabel(parentMeasures.right.label, rightDist, childRect.right, childCenterY, rightDist, true);
      parentMeasures.right.connector.style.display = "none";
    }
  }
  function positionBox(box, labelEl, rect, borderStyle, bgAlpha) {
    box.style.top = `${rect.top}px`;
    box.style.left = `${rect.left}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    box.style.border = `1px ${borderStyle} #0D99FF`;
    box.style.background = `rgba(13, 153, 255, ${bgAlpha})`;
    box.style.display = "";
    const viewportH = window.innerHeight;
    const labelY = rect.bottom + 4 + 20 < viewportH ? rect.bottom + 4 : rect.top - 24;
    labelEl.style.top = `${labelY}px`;
    labelEl.style.left = `${rect.left + rect.width / 2}px`;
    labelEl.style.transform = "translateX(-50%)";
    labelEl.style.background = "#0D99FF";
  }
  function updateHighlight(el) {
    const rect = el.getBoundingClientRect();
    positionBox(highlight, label, rect, "solid", "0");
    label.style.display = "none";
  }
  function showSelection() {
    if (!selectedElement) return;
    if (reorderDragActive) return;
    const rect = selectedElement.getBoundingClientRect();
    positionBox(selection, selectionLabel, rect, "solid", "0");
    lastSelRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    if (suspended) {
      selectionLabel.style.display = "none";
      selection.style.pointerEvents = "none";
      return;
    }
    if (!selectionLabelHidden) {
      selectionLabel.style.display = "";
    }
    selectionLabel.textContent = formatLabel(selectedElement);
    positionHandles(rect);
    updateSelectionCursor();
    const parent = selectedElement.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      const pr = parent.getBoundingClientRect();
      parentIndicator.style.cssText = `
        position:fixed;display:block;pointer-events:none;z-index:2147483644;
        border:1px dotted #0D99FF;background:none;
        top:${pr.top}px;left:${pr.left}px;width:${pr.width}px;height:${pr.height}px;
      `;
      const authored = detectAuthoredPositionProps(selectedElement);
      cachedPinState = authored;
      if (authored.top || authored.right || authored.bottom || authored.left) {
        showPinLines(rect, pr, authored);
      } else {
        hidePinLines();
      }
    } else {
      parentIndicator.style.display = "none";
      cachedPinState = null;
      hidePinLines();
    }
    refreshScopeHighlights();
  }
  function trackSelection() {
    if (!selectedElement || reorderDrag?.active) return;
    const rect = selectedElement.getBoundingClientRect();
    if (rect.top === lastSelRect.top && rect.left === lastSelRect.left && rect.width === lastSelRect.width && rect.height === lastSelRect.height) return;
    selection.style.top = `${rect.top}px`;
    selection.style.left = `${rect.left}px`;
    selection.style.width = `${rect.width}px`;
    selection.style.height = `${rect.height}px`;
    lastSelRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    if (suspended) return;
    const viewportH = window.innerHeight;
    const labelY = rect.bottom + 4 + 20 < viewportH ? rect.bottom + 4 : rect.top - 24;
    selectionLabel.style.top = `${labelY}px`;
    selectionLabel.style.left = `${rect.left + rect.width / 2}px`;
    selectionLabel.style.transform = "translateX(-50%)";
    selectionLabel.textContent = formatLabel(selectedElement);
    positionHandles(rect);
    const parent = selectedElement.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement && parentIndicator.style.display !== "none") {
      const pr = parent.getBoundingClientRect();
      parentIndicator.style.top = `${pr.top}px`;
      parentIndicator.style.left = `${pr.left}px`;
      parentIndicator.style.width = `${pr.width}px`;
      parentIndicator.style.height = `${pr.height}px`;
      const authored = detectAuthoredPositionProps(selectedElement);
      if (authored.top || authored.right || authored.bottom || authored.left) {
        showPinLines(rect, pr, authored);
      }
    }
  }
  function formatLabel(el) {
    const rect = el.getBoundingClientRect();
    return formatSelectionLabel(rect.width, rect.height);
  }
  function hideHighlight() {
    highlight.style.display = "none";
    label.style.display = "none";
    hideSpacing();
    hideSiblingOutlines();
  }
  function hideSelection() {
    selection.style.display = "none";
    selectionLabel.style.display = "none";
    selection.style.pointerEvents = "none";
    selection.style.cursor = "";
    parentIndicator.style.display = "none";
    hidePinLines();
    cachedPinState = null;
    repositionAxes = null;
    hideHandles();
  }
  function scheduleTrack() {
    if (trackingRaf !== null) return;
    trackingRaf = requestAnimationFrame(() => {
      trackingRaf = null;
      trackSelection();
    });
  }
  function handleScroll() {
    scheduleTrack();
    refreshScopeHighlights();
    if (hoveredElement) {
      hoveredElement = null;
      hideHighlight();
    }
  }
  function startTracking() {
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    window.addEventListener("resize", scheduleTrack, { passive: true });
    resizeObserver = new ResizeObserver(scheduleTrack);
    if (selectedElement) resizeObserver.observe(selectedElement);
    trackSelection();
  }
  function stopTracking() {
    if (trackingRaf !== null) {
      cancelAnimationFrame(trackingRaf);
      trackingRaf = null;
    }
    window.removeEventListener("scroll", handleScroll, true);
    window.removeEventListener("resize", scheduleTrack);
    resizeObserver?.disconnect();
    resizeObserver = null;
  }
  function isOverlayElement(el) {
    return !!el.closest("[data-retune-host]") || !!el.closest("[data-retune-drag-ghost]");
  }
  const SKIP_TAGS2 = /* @__PURE__ */ new Set(["BR", "WBR", "COL", "COLGROUP", "SOURCE", "TRACK", "AREA", "PARAM"]);
  function resolveElement(el) {
    let current = el;
    while (current && SKIP_TAGS2.has(current.tagName)) {
      current = current.parentElement;
    }
    return current;
  }
  function applyHover(el, altKey = false) {
    hoveredElement = el;
    if (el === selectedElement) {
      hideHighlight();
      hideSpacing();
      hideSiblingOutlines();
      selectionLabelHidden = false;
      selectionLabel.style.display = "";
    } else {
      updateHighlight(el);
      if (selectedElement) {
        if (el.contains(selectedElement)) {
          if (altKey) showParentSpacing(selectedElement.getBoundingClientRect(), el);
          else hideSpacing();
          showSiblingOutlines(el, selectedElement);
        } else {
          if (altKey) showSpacing(selectedElement.getBoundingClientRect(), el.getBoundingClientRect());
          else hideSpacing();
          showChildOutlines(el);
        }
      } else {
        showChildOutlines(el);
      }
    }
    callbacks.onHover(el, el.getBoundingClientRect());
  }
  function handleMouseMove(e2) {
    if (!active || suspended || repositionDrag || resizeDrag || reorderDrag) return;
    const hoverShadowHit = shadowRoot.elementFromPoint(e2.clientX, e2.clientY);
    if (hoverShadowHit && hoverShadowHit.getRootNode() === shadowRoot) {
      const isPickerOverlay = hoverShadowHit === selection || hoverShadowHit === selectionLabel || hoverShadowHit === highlight || hoverShadowHit === label || hoverShadowHit === parentIndicator;
      if (!isPickerOverlay) {
        if (hoveredElement) {
          hoveredElement = null;
          hideHighlight();
        }
        return;
      }
    }
    const selPE = selection.style.pointerEvents;
    selection.style.pointerEvents = "none";
    const raw = document.elementFromPoint(e2.clientX, e2.clientY);
    selection.style.pointerEvents = selPE;
    if (!raw || isOverlayElement(raw)) return;
    const el = resolveElement(raw);
    if (!el || isOverlayElement(el)) return;
    if (el === hoveredElement) return;
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    if (hoveredElement && el.contains(hoveredElement)) {
      hoverTimer = setTimeout(() => {
        hoverTimer = null;
        const current = document.elementFromPoint(e2.clientX, e2.clientY);
        if (current === el) applyHover(el, e2.altKey);
      }, 50);
    } else {
      applyHover(el, e2.altKey);
    }
  }
  function buildElementStack(x, y) {
    const all = document.elementsFromPoint(x, y);
    const stack = [];
    for (const raw of all) {
      if (isOverlayElement(raw)) continue;
      const el = resolveElement(raw);
      if (!el || isOverlayElement(el)) continue;
      if (stack.length > 0 && stack[stack.length - 1] === el) continue;
      if (el === document.documentElement) break;
      stack.push(el);
    }
    return stack;
  }
  function handleClick(e2) {
    if (!active) return;
    const path = e2.composedPath();
    const host = shadowRoot.host;
    if (path.includes(host)) return;
    const shadowHit = shadowRoot.elementFromPoint(e2.clientX, e2.clientY);
    if (shadowHit && shadowHit.getRootNode() === shadowRoot) return;
    e2.preventDefault();
    e2.stopPropagation();
    e2.stopImmediatePropagation();
    const { clientX: x, clientY: y } = e2;
    const sameSpot = Math.abs(x - lastClickPos.x) <= CLICK_RADIUS && Math.abs(y - lastClickPos.y) <= CLICK_RADIUS && elementStack.length > 1;
    if (sameSpot) {
      elementStack = buildElementStack(x, y);
      if (elementStack.length <= 1) {
        stackIndex = 0;
      } else {
        stackIndex = (stackIndex + 1) % elementStack.length;
      }
    } else {
      elementStack = buildElementStack(x, y);
      stackIndex = 0;
      lastClickPos = { x, y };
    }
    if (elementStack.length === 0) return;
    const el = elementStack[stackIndex];
    selectedElement = el;
    selectionLabelHidden = false;
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver.observe(el);
    }
    showSelection();
    hideHighlight();
    hoveredElement = null;
    callbacks.onSelect(el);
  }
  function handleDblClick(e2) {
    if (!active || !selectedElement) return;
    e2.preventDefault();
    e2.stopPropagation();
    if (reorderClickTimer) {
      clearTimeout(reorderClickTimer);
      reorderClickTimer = null;
    }
    const selDisplay = selection.style.display;
    selection.style.display = "none";
    selectionLabel.style.display = "none";
    hideHandles();
    const deepest = document.elementFromPoint(e2.clientX, e2.clientY);
    selection.style.display = selDisplay;
    selectionLabel.style.display = "";
    if (selectedElement) showSelection();
    callbacks.onDoubleClick?.(deepest || selectedElement);
  }
  function handleKeyDown(e2) {
    if (!active) return;
    if (e2.key === "Escape") {
      if (shadowRoot.querySelector(".retune-floating-dialog")) return;
      e2.preventDefault();
      e2.stopPropagation();
      callbacks.onCancel();
    }
    if (e2.key === "Alt" && hoveredElement && selectedElement) {
      applyHover(hoveredElement, true);
    }
  }
  function handleKeyUp(e2) {
    if (!active) return;
    if (e2.key === "Alt" && hoveredElement && selectedElement) {
      applyHover(hoveredElement, false);
    }
  }
  const cursorStyle = document.createElement("style");
  cursorStyle.setAttribute("data-retune-cursor", "");
  function activate() {
    active = true;
    cursorStyle.textContent = "* { cursor: default !important; }";
    document.head.appendChild(cursorStyle);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("dblclick", handleDblClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    startTracking();
  }
  function deactivate() {
    active = false;
    cursorStyle.textContent = "";
    cursorStyle.remove();
    hoveredElement = null;
    selectedElement = null;
    selectionLabelHidden = false;
    elementStack = [];
    stackIndex = -1;
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    hideHighlight();
    hideSelection();
    stopTracking();
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("dblclick", handleDblClick, true);
    document.removeEventListener("keydown", handleKeyDown, true);
    document.removeEventListener("keyup", handleKeyUp, true);
  }
  function clearSelection() {
    selectedElement = null;
    selectionLabelHidden = false;
    elementStack = [];
    stackIndex = -1;
    hideSelection();
    hideScopeHighlights();
  }
  function destroy() {
    deactivate();
    highlight.remove();
    label.remove();
    selection.remove();
    selectionLabel.remove();
    spacingContainer.remove();
    parentIndicator.remove();
    for (const line of Object.values(pinLines)) line.remove();
    for (const g of snapGuidePool) {
      g.line.remove();
      g.label.remove();
    }
    for (const pos of ALL_POSITIONS) handleEls[pos].remove();
  }
  function selectElement(el) {
    selectedElement = el;
    selectionLabelHidden = false;
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver.observe(el);
    }
    showSelection();
    hideHighlight();
    hoveredElement = null;
    callbacks.onSelect(el);
  }
  function highlightElement(el) {
    if (el) {
      updateHighlight(el);
    } else {
      hideHighlight();
    }
  }
  function suspend() {
    suspended = true;
    hideHighlight();
    selectionLabel.style.display = "none";
    selection.style.pointerEvents = "none";
    selection.style.cursor = "";
    parentIndicator.style.display = "none";
    hidePinLines();
    hideHandles();
    cursorStyle.textContent = "";
  }
  function resume() {
    suspended = false;
    cursorStyle.textContent = "* { cursor: default !important; }";
    if (selectedElement) showSelection();
  }
  function updatePinLines(authored) {
    cachedPinState = authored;
    if (!selectedElement) return;
    const rect = selectedElement.getBoundingClientRect();
    const parent = selectedElement.parentElement;
    if (!parent || parent === document.body || parent === document.documentElement) return;
    const pr = parent.getBoundingClientRect();
    if (authored.top || authored.right || authored.bottom || authored.left) {
      showPinLines(rect, pr, authored);
    } else {
      hidePinLines();
    }
  }
  return { activate, deactivate, destroy, hideHighlight, clearSelection, selectElement, highlightElement, refreshSelection: showSelection, updatePinLines, suspend, resume, showScopeHighlights, hideScopeHighlights };
}
var PreviewBridge = class {
  listeners = /* @__PURE__ */ new Map();
  _active = false;
  /** Whether a drag preview is in progress */
  get active() {
    return this._active;
  }
  /** Start a preview session (suppresses React state → DOM sync in inputs) */
  start() {
    this._active = true;
  }
  /** End the preview session */
  end() {
    this._active = false;
    this.listeners.forEach((_, key) => this.notify(key, ""));
  }
  /** Push a preview value to all subscribers of a property */
  set(property, value) {
    this.notify(property, value);
  }
  /** Subscribe to preview values for a specific property.
   *  Returns an unsubscribe function. */
  subscribe(property, listener) {
    if (!this.listeners.has(property)) {
      this.listeners.set(property, /* @__PURE__ */ new Set());
    }
    this.listeners.get(property).add(listener);
    return () => {
      const set = this.listeners.get(property);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(property);
      }
    };
  }
  notify(property, value) {
    const set = this.listeners.get(property);
    if (set) {
      for (const listener of set) listener(value);
    }
  }
};
var PreviewBridgeContext = createContext(null);
function usePreviewBridge() {
  return useContext(PreviewBridgeContext);
}
var LivePreviewEngine = class {
  sheet;
  rules = [];
  attached = false;
  constructor() {
    this.sheet = new CSSStyleSheet();
  }
  /** Attach the preview stylesheet to the document */
  attach() {
    if (this.attached) return;
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, this.sheet];
    this.attached = true;
  }
  /** Detach — instantly reverts all preview changes */
  detach() {
    if (!this.attached) return;
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (s5) => s5 !== this.sheet
    );
    this.attached = false;
  }
  /** Apply a single property change with !important to override existing styles */
  applyChange(selector2, property, value) {
    this.removeChange(selector2, property);
    const kebabProp = camelToKebab2(property);
    const rule = `${selector2} { ${kebabProp}: ${value} !important; }`;
    try {
      const index2 = this.sheet.insertRule(rule, this.sheet.cssRules.length);
      this.rules.push({ selector: selector2, property, value, index: index2 });
    } catch {
    }
  }
  /** Remove a specific property change */
  removeChange(selector2, property) {
    const ruleIndex = this.rules.findIndex(
      (r) => r.selector === selector2 && r.property === property
    );
    if (ruleIndex === -1) return;
    this.rebuildSheet(
      this.rules.filter((_, i3) => i3 !== ruleIndex)
    );
  }
  /** Remove all changes for a selector */
  removeAllChanges(selector2) {
    this.rebuildSheet(
      this.rules.filter((r) => r.selector !== selector2)
    );
  }
  /** Clear all preview changes */
  clearAll() {
    this.sheet.replaceSync("");
    this.rules = [];
  }
  /** Get all currently applied changes */
  getChanges() {
    return this.rules;
  }
  /** Migrate all changes from one selector to another */
  migrateChanges(fromSelector, toSelector) {
    const toMigrate = this.rules.filter((r) => r.selector === fromSelector);
    if (toMigrate.length === 0) return;
    for (const rule of toMigrate) {
      this.applyChange(toSelector, rule.property, rule.value);
    }
    for (const rule of toMigrate) {
      this.removeChange(fromSelector, rule.property);
    }
  }
  rebuildSheet(newRules) {
    this.sheet.replaceSync("");
    this.rules = [];
    for (const r of newRules) {
      this.applyChange(r.selector, r.property, r.value);
    }
  }
  destroy() {
    this.detach();
    this.clearAll();
  }
};
var COALESCE_MS = 300;
var ChangeTracker = class _ChangeTracker {
  tracked = /* @__PURE__ */ new Map();
  undoStack = [];
  redoStack = [];
  lastChange = null;
  groupCounter = 0;
  /** Start tracking an element — snapshots its current styles */
  track(selector2, tagName2, textContent, classes, reactComponents, currentStyles, sourceFile, stylingApproach, inlineStyles, elementId, accessibleName, parentContext, childSummary, domPath, nearbySiblings, position) {
    if (!this.tracked.has(selector2)) {
      this.tracked.set(selector2, {
        selector: selector2,
        tagName: tagName2,
        textContent,
        classes,
        reactComponents,
        originalStyles: { ...currentStyles },
        currentStyles: { ...currentStyles },
        sourceFile,
        stylingApproach,
        inlineStyles,
        elementId,
        accessibleName,
        parentContext,
        childSummary,
        domPath,
        nearbySiblings,
        position
      });
    }
  }
  /** Set an initial value for a property if it hasn't been set yet.
   *  Useful for structural properties like __reorder that aren't in the
   *  original computed styles snapshot. */
  ensureOriginalValue(selector2, property, value) {
    const tracked = this.tracked.get(selector2);
    if (tracked && !(property in tracked.originalStyles)) {
      tracked.originalStyles[property] = value;
      tracked.currentStyles[property] = value;
    }
  }
  /** Record a style change. Groups paired properties (e.g. paddingTop+paddingBottom
   *  from a single scrub gesture) into one undo step. */
  recordChange(selector2, property, newValue) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return null;
    const oldValue = tracked.currentStyles[property] || "";
    if (oldValue === newValue) return null;
    tracked.currentStyles[property] = newValue;
    const camelProp = property.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
    const prevVariableAssoc = tracked.variableAssociations?.[camelProp] ?? null;
    const prevUnlinked = tracked.unlinkedVariables?.has(camelProp) ?? false;
    const now = Date.now();
    const last = this.lastChange;
    if (last && last.selector === selector2 && now - last.time < COALESCE_MS) {
      const existingIdx = this.findInGroup(last.group, property);
      if (existingIdx !== -1) ;
      else {
        this.undoStack.push({ selector: selector2, property, value: oldValue, group: last.group, prevVariableAssoc, prevUnlinked });
      }
      last.time = now;
    } else {
      this.groupCounter++;
      this.undoStack.push({ selector: selector2, property, value: oldValue, group: this.groupCounter, prevVariableAssoc, prevUnlinked });
      this.lastChange = { selector: selector2, time: now, group: this.groupCounter };
    }
    this.redoStack = [];
    return { from: oldValue, to: newValue };
  }
  /** Record a change for persistence only — no undo stack entry.
   *  Used for bulk structural changes that undo through separate mechanisms. */
  recordChangeSilent(selector2, property, newValue) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return;
    tracked.currentStyles[property] = newValue;
  }
  /** Find an undo entry for a property within a specific group */
  findInGroup(group, property) {
    for (let i3 = this.undoStack.length - 1; i3 >= 0; i3--) {
      if (this.undoStack[i3].group === group) {
        if (this.undoStack[i3].property === property) return i3;
      } else {
        break;
      }
    }
    return -1;
  }
  /** Pop an entire undo group and return all entries */
  popUndo() {
    if (this.undoStack.length === 0) return null;
    const top = this.undoStack[this.undoStack.length - 1];
    const group = top.group;
    const entries = [];
    while (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1].group === group) {
      entries.push(this.undoStack.pop());
    }
    const redoGroup = ++this.groupCounter;
    for (const entry of entries) {
      const tracked = this.tracked.get(entry.selector);
      if (!tracked) continue;
      if (entry.action === "unlink") {
        tracked.unlinkedVariables?.delete(entry.property);
        if (entry.variableRef) {
          if (!tracked.variableAssociations) tracked.variableAssociations = {};
          tracked.variableAssociations[entry.property] = entry.variableRef;
        }
        this.redoStack.push({ selector: entry.selector, property: entry.property, value: "", group: redoGroup, action: "unlink", variableRef: entry.variableRef });
      } else {
        const currentValue = tracked.currentStyles[entry.property] || "";
        const camelProp = entry.property.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
        const currentAssoc = tracked.variableAssociations?.[camelProp] ?? null;
        const currentUnlinked = tracked.unlinkedVariables?.has(camelProp) ?? false;
        this.redoStack.push({ selector: entry.selector, property: entry.property, value: currentValue, group: redoGroup, prevVariableAssoc: currentAssoc, prevUnlinked: currentUnlinked });
        tracked.currentStyles[entry.property] = entry.value;
        if (entry.prevVariableAssoc !== void 0) {
          if (entry.prevVariableAssoc) {
            if (!tracked.variableAssociations) tracked.variableAssociations = {};
            tracked.variableAssociations[camelProp] = entry.prevVariableAssoc;
          } else {
            if (tracked.variableAssociations) delete tracked.variableAssociations[camelProp];
          }
        }
        if (entry.prevUnlinked !== void 0) {
          if (entry.prevUnlinked) {
            if (!tracked.unlinkedVariables) tracked.unlinkedVariables = /* @__PURE__ */ new Set();
            tracked.unlinkedVariables.add(camelProp);
          } else {
            tracked.unlinkedVariables?.delete(camelProp);
          }
        }
      }
    }
    this.persist();
    return entries;
  }
  /** Pop an entire redo group and return all entries */
  popRedo() {
    if (this.redoStack.length === 0) return null;
    const top = this.redoStack[this.redoStack.length - 1];
    const group = top.group;
    const entries = [];
    while (this.redoStack.length > 0 && this.redoStack[this.redoStack.length - 1].group === group) {
      entries.push(this.redoStack.pop());
    }
    const undoGroup = ++this.groupCounter;
    for (const entry of entries) {
      const tracked = this.tracked.get(entry.selector);
      if (!tracked) continue;
      if (entry.action === "unlink") {
        if (!tracked.unlinkedVariables) tracked.unlinkedVariables = /* @__PURE__ */ new Set();
        tracked.unlinkedVariables.add(entry.property);
        if (tracked.variableAssociations) {
          delete tracked.variableAssociations[entry.property];
        }
        this.undoStack.push({ selector: entry.selector, property: entry.property, value: "", group: undoGroup, action: "unlink", variableRef: entry.variableRef });
      } else {
        const currentValue = tracked.currentStyles[entry.property] || "";
        const camelProp = entry.property.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
        const currentAssoc = tracked.variableAssociations?.[camelProp] ?? null;
        const currentUnlinked = tracked.unlinkedVariables?.has(camelProp) ?? false;
        this.undoStack.push({ selector: entry.selector, property: entry.property, value: currentValue, group: undoGroup, prevVariableAssoc: currentAssoc, prevUnlinked: currentUnlinked });
        tracked.currentStyles[entry.property] = entry.value;
        if (entry.prevVariableAssoc !== void 0) {
          if (entry.prevVariableAssoc) {
            if (!tracked.variableAssociations) tracked.variableAssociations = {};
            tracked.variableAssociations[camelProp] = entry.prevVariableAssoc;
          } else {
            if (tracked.variableAssociations) delete tracked.variableAssociations[camelProp];
          }
        }
        if (entry.prevUnlinked !== void 0) {
          if (entry.prevUnlinked) {
            if (!tracked.unlinkedVariables) tracked.unlinkedVariables = /* @__PURE__ */ new Set();
            tracked.unlinkedVariables.add(camelProp);
          } else {
            tracked.unlinkedVariables?.delete(camelProp);
          }
        }
      }
    }
    this.persist();
    return entries;
  }
  /** Get all pending changes (properties that differ from original) */
  getPendingChanges() {
    const changes = [];
    for (const tracked of this.tracked.values()) {
      const propertyChanges = [];
      for (const [prop, currentVal] of Object.entries(tracked.currentStyles)) {
        const originalVal = tracked.originalStyles[prop] || "";
        if (currentVal !== originalVal) {
          propertyChanges.push({
            property: prop,
            from: originalVal,
            to: currentVal
          });
        }
      }
      const unlinked = tracked.unlinkedVariables ? Array.from(tracked.unlinkedVariables).map((prop) => ({
        property: prop,
        value: tracked.currentStyles[prop] || ""
      })) : [];
      const hasChanges = propertyChanges.length > 0 || unlinked.length > 0;
      if (hasChanges) {
        const change = {
          selector: tracked.selector,
          tagName: tracked.tagName,
          textContent: tracked.textContent,
          classes: tracked.classes,
          reactComponents: tracked.reactComponents,
          changes: propertyChanges,
          timestamp: Date.now(),
          sourceFile: tracked.sourceFile,
          stylingApproach: tracked.stylingApproach,
          inlineStyles: tracked.inlineStyles,
          elementId: tracked.elementId,
          accessibleName: tracked.accessibleName,
          parentContext: tracked.parentContext,
          childSummary: tracked.childSummary,
          domPath: tracked.domPath,
          nearbySiblings: tracked.nearbySiblings,
          position: tracked.position
        };
        if (tracked.variableAssociations && Object.keys(tracked.variableAssociations).length > 0) {
          change.variableAssociations = tracked.variableAssociations;
        }
        if (unlinked.length > 0) {
          change.unlinkedProperties = unlinked;
        }
        changes.push(change);
      }
    }
    return changes;
  }
  /** Check if there are any pending changes */
  hasPendingChanges() {
    return this.getPendingChanges().length > 0;
  }
  /** Migrate pending changes from one selector to another.
   *  Moves diffed properties (original vs current) to the target selector,
   *  resets the source selector back to its original state. */
  migrateChanges(fromSelector, toSelector) {
    const from = this.tracked.get(fromSelector);
    const to = this.tracked.get(toSelector);
    if (!from || !to) return [];
    const migrated = [];
    for (const [prop, currentVal] of Object.entries(from.currentStyles)) {
      const originalVal = from.originalStyles[prop] || "";
      if (currentVal !== originalVal) {
        migrated.push({ property: prop, value: currentVal });
        to.currentStyles[prop] = currentVal;
        from.currentStyles[prop] = originalVal;
      }
    }
    if (from.variableAssociations) {
      if (!to.variableAssociations) to.variableAssociations = {};
      for (const { property } of migrated) {
        const camelProp = property.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
        if (from.variableAssociations[camelProp]) {
          to.variableAssociations[camelProp] = from.variableAssociations[camelProp];
          delete from.variableAssociations[camelProp];
        }
        if (from.variableAssociations[property]) {
          to.variableAssociations[property] = from.variableAssociations[property];
          delete from.variableAssociations[property];
        }
      }
    }
    this.undoStack = [];
    this.redoStack = [];
    return migrated;
  }
  /** Associate a value-only variable apply with specific properties */
  setVariableAssociation(selector2, properties, token) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return;
    if (!tracked.variableAssociations) tracked.variableAssociations = {};
    for (const prop of properties) {
      tracked.variableAssociations[prop] = token;
    }
  }
  /** Remove variable association for specific properties */
  clearVariableAssociation(selector2, properties) {
    const tracked = this.tracked.get(selector2);
    if (!tracked?.variableAssociations) return;
    for (const prop of properties) {
      delete tracked.variableAssociations[prop];
    }
  }
  /** Mark properties as explicitly unlinked from their variable */
  unlinkVariable(selector2, properties) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return;
    if (tracked.variableAssociations) {
      for (const prop of properties) {
        delete tracked.variableAssociations[prop];
      }
    }
    if (!tracked.unlinkedVariables) tracked.unlinkedVariables = /* @__PURE__ */ new Set();
    for (const prop of properties) {
      tracked.unlinkedVariables.add(prop);
    }
  }
  /** Unlink properties and push to undo stack so the operation is undoable */
  recordUnlink(selector2, properties) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return;
    const savedRefs = {};
    for (const prop of properties) {
      savedRefs[prop] = tracked.variableAssociations?.[prop];
    }
    this.unlinkVariable(selector2, properties);
    this.groupCounter++;
    for (const prop of properties) {
      this.undoStack.push({
        selector: selector2,
        property: prop,
        value: "",
        group: this.groupCounter,
        action: "unlink",
        variableRef: savedRefs[prop]
      });
    }
    this.lastChange = null;
    this.redoStack = [];
  }
  /** Check if a property has been explicitly unlinked */
  isVariableUnlinked(selector2, property) {
    return this.tracked.get(selector2)?.unlinkedVariables?.has(property) ?? false;
  }
  /** Get all unlinked variable properties for a selector */
  getUnlinkedVariables(selector2) {
    return this.tracked.get(selector2)?.unlinkedVariables ?? /* @__PURE__ */ new Set();
  }
  /** Re-link a property (clear the unlinked state, e.g. when user picks a new variable) */
  relinkVariable(selector2, properties) {
    const tracked = this.tracked.get(selector2);
    if (!tracked?.unlinkedVariables) return;
    for (const prop of properties) {
      tracked.unlinkedVariables.delete(prop);
    }
  }
  /** Get variable association for a property, if any */
  getVariableAssociation(selector2, property) {
    return this.tracked.get(selector2)?.variableAssociations?.[property];
  }
  /** Get all variable associations for a selector */
  getVariableAssociations(selector2) {
    return this.tracked.get(selector2)?.variableAssociations;
  }
  /** Check if a single property differs from its original value or has been unlinked */
  isPropertyChanged(selector2, property) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return false;
    if (tracked.unlinkedVariables?.has(property)) return true;
    const original = tracked.originalStyles[property] || "";
    const current = tracked.currentStyles[property] || "";
    return original !== current;
  }
  /** Get all changed properties for an element (camelCase keys) */
  getChangedProperties(selector2) {
    const result = /* @__PURE__ */ new Set();
    const tracked = this.tracked.get(selector2);
    if (!tracked) return result;
    for (const [prop, currentVal] of Object.entries(tracked.currentStyles)) {
      const originalVal = tracked.originalStyles[prop] || "";
      if (currentVal !== originalVal) {
        result.add(prop);
      }
    }
    if (tracked.unlinkedVariables) {
      for (const prop of tracked.unlinkedVariables) {
        result.add(prop);
      }
    }
    return result;
  }
  /** Silently revert a property to its original value without touching the undo stack.
   *  Used for bulk entry cleanup when undoing structural changes. */
  silentRevert(selector2, property) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return;
    const original = tracked.originalStyles[property] || "";
    tracked.currentStyles[property] = original;
  }
  /** Completely remove a pseudo-property from a tracked element.
   *  Deletes from both originalStyles and currentStyles so it won't appear in pending changes. */
  removeProperty(selector2, property) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return;
    delete tracked.originalStyles[property];
    delete tracked.currentStyles[property];
  }
  /** Reset a property to its original value. Pushes to undo stack so redo works. */
  resetProperty(selector2, property) {
    const tracked = this.tracked.get(selector2);
    if (!tracked) return null;
    const currentValue = tracked.currentStyles[property] || "";
    const originalValue = tracked.originalStyles[property] || "";
    const isUnlinked = tracked.unlinkedVariables?.has(property) ?? false;
    if (currentValue === originalValue && !isUnlinked) return null;
    tracked.currentStyles[property] = originalValue;
    const camelProp = property.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
    const prevVariableAssoc = tracked.variableAssociations?.[camelProp] ?? tracked.variableAssociations?.[property] ?? null;
    const prevUnlinked = tracked.unlinkedVariables?.has(camelProp) || tracked.unlinkedVariables?.has(property) || false;
    this.groupCounter++;
    this.undoStack.push({ selector: selector2, property, value: currentValue, group: this.groupCounter, prevVariableAssoc, prevUnlinked });
    this.lastChange = null;
    this.redoStack = [];
    if (tracked.variableAssociations) {
      delete tracked.variableAssociations[camelProp];
      delete tracked.variableAssociations[property];
    }
    if (tracked.unlinkedVariables) {
      tracked.unlinkedVariables.delete(property);
      tracked.unlinkedVariables.delete(camelProp);
    }
    this.persist();
    return { from: currentValue, to: originalValue };
  }
  /** Prevent the next change from coalescing with the previous one */
  breakCoalescing() {
    this.lastChange = null;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  /** Clear all tracking */
  clear() {
    this.tracked.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.persist();
  }
  static STORAGE_KEY = "retune-pending-changes";
  /** Save state to localStorage */
  persist() {
    try {
      const entries = Array.from(this.tracked.entries()).map(([k, v]) => [
        k,
        { ...v, unlinkedVariables: v.unlinkedVariables ? Array.from(v.unlinkedVariables) : void 0 }
      ]);
      const data = {
        tracked: entries,
        undoStack: this.undoStack,
        redoStack: this.redoStack
      };
      localStorage.setItem(_ChangeTracker.STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }
  /** Restore state from localStorage */
  restore() {
    try {
      const raw = localStorage.getItem(_ChangeTracker.STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.tracked = new Map(data.tracked);
      for (const tracked of this.tracked.values()) {
        if (tracked.unlinkedVariables && Array.isArray(tracked.unlinkedVariables)) {
          tracked.unlinkedVariables = new Set(tracked.unlinkedVariables);
        }
      }
      this.undoStack = data.undoStack || [];
      this.redoStack = data.redoStack || [];
      for (const e2 of this.undoStack) {
        if (e2.group > this.groupCounter) this.groupCounter = e2.group;
      }
      for (const e2 of this.redoStack) {
        if (e2.group > this.groupCounter) this.groupCounter = e2.group;
      }
      return this.hasPendingChanges();
    } catch {
      return false;
    }
  }
};
var PSEUDO_STATES2 = [":hover", ":focus", ":active", ":focus-visible", ":focus-within"];
function parsePseudoState(selector2) {
  for (const pseudo of PSEUDO_STATES2) {
    if (selector2.endsWith(pseudo)) {
      return {
        base: selector2.slice(0, -pseudo.length),
        pseudoState: pseudo.slice(1)
        // remove the leading ":"
      };
    }
  }
  return { base: selector2, pseudoState: null };
}
function describeSelectorScope(selector2) {
  const { base } = parsePseudoState(selector2);
  const noParen = base.replace(/\([^)]*\)/g, "");
  const hasDescendant = /[.\])\w]\s+[.\[:]/.test(noParen);
  const hasChild = /[.\])\w]\s*>\s*[.\[:]/.test(noParen);
  if (base.startsWith(".") || base.startsWith(":") || base.startsWith("[")) {
    try {
      const count = document.querySelectorAll(base).length;
      const countStr = count > 0 ? `, ${count} element${count > 1 ? "s" : ""}` : "";
      if (hasDescendant || hasChild) {
        return `ancestor-scoped${countStr}`;
      }
      if (count > 0) {
        return `class-scoped${countStr}`;
      }
    } catch {
    }
    if (hasDescendant || hasChild) return "ancestor-scoped";
    return "class-scoped";
  }
  if (base.startsWith("#")) {
    return "id-scoped, unique";
  }
  if (base.includes(">")) {
    return "element-specific";
  }
  return null;
}
var cachedTokenMap = null;
function getTokenMap() {
  if (!cachedTokenMap) {
    cachedTokenMap = scanDesignTokens();
  }
  return cachedTokenMap;
}
function formatChanges(changes, fidelity) {
  if (changes.length === 0) return "No changes recorded.";
  const bulkCount = changes.filter((c3) => c3.changes.some((p4) => p4.property === "__bulkOf")).length;
  const primaryChanges = changes.filter((c3) => !c3.changes.some((p4) => p4.property === "__bulkOf"));
  changes = primaryChanges;
  const tokenMap = getTokenMap();
  const lines = [];
  lines.push("Apply these Retune visual changes to the source code:\n");
  lines.push(`# Visual Changes (${changes.length} element${changes.length > 1 ? "s" : ""})`);
  lines.push("");
  lines.push("**Environment:**");
  lines.push(`- URL: ${window.location.href}`);
  lines.push(`- Viewport: ${window.innerWidth}\xD7${window.innerHeight}`);
  lines.push(`- Device Pixel Ratio: ${window.devicePixelRatio}`);
  lines.push(`- Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  lines.push("");
  if (fidelity !== "minimal") {
    const tokenSummary = summarizeTokenSystem(tokenMap);
    if (tokenSummary) {
      lines.push(`> **Design tokens detected:** ${tokenSummary}`);
      lines.push("");
    }
  }
  const registry = getVariableRegistry();
  if (registry.framework === "tailwind") {
    lines.push("> **Framework:** Tailwind CSS detected. Apply all changes using Tailwind utility classes \u2014 do NOT use inline styles or raw CSS values. When a class swap is suggested, replace the old class with the new one in the JSX/HTML.");
    lines.push("");
  }
  const sections = changes.map((change) => formatSingleChange(change, fidelity, tokenMap, bulkCount));
  lines.push(sections.join("\n---\n\n"));
  return lines.join("\n");
}
function formatSingleChange(change, fidelity, tokenMap, bulkInstanceCount = 0) {
  const lines = [];
  lines.push(`## \`<${change.tagName.toLowerCase()}>\`${change.textContent ? ` "${truncate(change.textContent, 60)}"` : ""}`);
  lines.push("");
  if (change.sourceFile) {
    const col = change.sourceFile.columnNumber ? `:${change.sourceFile.columnNumber}` : "";
    lines.push(`**Source:** \`${change.sourceFile.fileName}:${change.sourceFile.lineNumber}${col}\``);
  }
  if (change.reactComponents.length > 0) {
    lines.push(`**Component:** ${change.reactComponents.join(" \u2192 ")}`);
  }
  if (change.stylingApproach && change.stylingApproach !== "unknown") {
    lines.push(`**Styling:** ${formatStylingApproach(change.stylingApproach)}`);
  }
  if (fidelity !== "minimal" && change.domPath) {
    lines.push(`**DOM Path:** \`${change.domPath}\``);
  }
  const { base: baseSelector, pseudoState } = parsePseudoState(change.selector);
  const selectorAnnotations = [];
  if (pseudoState) {
    selectorAnnotations.push(`${pseudoState} state`);
  }
  const scope = describeSelectorScope(change.selector);
  if (scope) {
    selectorAnnotations.push(scope);
  }
  const selectorSuffix = selectorAnnotations.length > 0 ? ` (${selectorAnnotations.join(", ")})` : "";
  lines.push(`**Selector:** \`${baseSelector}\`${selectorSuffix}`);
  const noParen = baseSelector.replace(/\([^)]*\)/g, "");
  const isAncestorSelector = /\.[a-zA-Z][\w-]*\s+\.[a-zA-Z]/.test(noParen) || /\.[a-zA-Z][\w-]*\s*>\s*\.[a-zA-Z]/.test(noParen);
  if (isAncestorSelector) {
    const parts = baseSelector.split(/\s+(?=[.#\[:])/).filter(Boolean);
    if (parts.length >= 2) {
      const ancestorPart = parts.slice(0, -1).join(" ");
      const elementPart = parts[parts.length - 1];
      lines.push(`**Ancestor context:** \`${ancestorPart}\` \u2014 change only applies inside this ancestor`);
      lines.push(`**Target element:** \`${elementPart}\` \u2014 the element being styled`);
    }
  } else {
    const compoundClasses = baseSelector.match(/\.[a-zA-Z0-9_-]+/g);
    if (compoundClasses && compoundClasses.length > 1) {
      const classBreakdown = compoundClasses.map((c3) => {
        const cls = c3.slice(1);
        try {
          const count = document.querySelectorAll(c3).length;
          return `\`.${cls}\` (${count})`;
        } catch {
          return `\`.${cls}\``;
        }
      });
      lines.push(`**Target classes:** ${classBreakdown.join(" \u2192 ")} \u2014 apply changes where all these classes are present`);
    }
  }
  if (fidelity === "full" && change.elementId) {
    lines.push(`**ID:** \`${change.elementId}\``);
  }
  if (fidelity === "full" && change.accessibleName) {
    lines.push(`**Accessible name:** "${change.accessibleName}"`);
  }
  if (change.classes.length > 0) {
    lines.push(`**Classes:** \`${change.classes.join(" ")}\``);
  }
  if (fidelity === "full" && change.position) {
    lines.push(`**Position:** x:${change.position.x}, y:${change.position.y} (${change.position.width}\xD7${change.position.height}px)`);
  }
  if (fidelity === "full" && change.nearbySiblings) {
    lines.push(`**Nearby elements:** ${change.nearbySiblings}`);
  }
  if (fidelity === "full" && change.parentContext) {
    lines.push(`**Parent:** \`${change.parentContext}\``);
  }
  if (fidelity === "full" && change.childSummary) {
    lines.push(`**Children:** ${change.childSummary}`);
  }
  if (fidelity === "full" && change.inlineStyles) {
    lines.push(`**Inline styles:** \`${change.inlineStyles}\``);
  }
  const isDelete = change.changes.some((c3) => c3.property === "__delete");
  if (isDelete) {
    lines.push("");
    lines.push("### Action: Delete Element");
    lines.push("");
    lines.push("Remove this element from the source code entirely.");
    if (change.classes.length > 0) {
      lines.push(`**Classes:** \`${change.classes.join(" ")}\``);
    }
    lines.push("");
    return lines.join("\n");
  }
  const reparentChange = change.changes.find((c3) => c3.property === "__reparent");
  if (reparentChange) {
    const fromAtIdx = reparentChange.from.lastIndexOf("@");
    const fromSelector = fromAtIdx !== -1 ? reparentChange.from.slice(0, fromAtIdx) : reparentChange.from;
    const toAtIdx = reparentChange.to.lastIndexOf("@");
    const toSelector = toAtIdx !== -1 ? reparentChange.to.slice(0, toAtIdx) : reparentChange.to;
    const toIndex = toAtIdx !== -1 ? reparentChange.to.slice(toAtIdx + 1) : "0";
    lines.push("");
    lines.push("### Action: Reparent Element");
    lines.push("");
    if (bulkInstanceCount > 0) {
      lines.push(`Move this element from its current parent to a new parent container. **This is a component-level change affecting ${bulkInstanceCount + 1} instances** \u2014 apply the change to the component JSX template, not individual instances.`);
    } else {
      lines.push("Move this element from its current parent to a new parent container.");
    }
    lines.push(`**From:** \`${fromSelector}\``);
    lines.push(`**To:** \`${toSelector}\` (as child at position ${toIndex})`);
    lines.push("");
    return lines.join("\n");
  }
  const reorderChange = change.changes.find((c3) => c3.property === "__reorder");
  if (reorderChange) {
    lines.push("");
    lines.push("### Action: Reorder Element");
    lines.push("");
    if (bulkInstanceCount > 0) {
      lines.push(`Moved from position ${reorderChange.from} to position ${reorderChange.to} within its parent container. **This is a component-level change affecting ${bulkInstanceCount + 1} instances** \u2014 reorder the children in the component JSX template, not individual instances.`);
    } else {
      lines.push(`Moved from position ${reorderChange.from} to position ${reorderChange.to} within its parent container.`);
    }
    lines.push("");
  }
  const textChange = change.changes.find((c3) => c3.property === "__text");
  if (textChange) {
    lines.push("");
    lines.push("### Action: Edit Text Content");
    lines.push("");
    lines.push("**Before:**");
    lines.push("```");
    lines.push(textChange.from);
    lines.push("```");
    lines.push("**After:**");
    lines.push("```");
    lines.push(textChange.to);
    lines.push("```");
    lines.push("");
  }
  const collapsed = collapseShorthands(change.changes);
  const enriched = enrichPropertyChanges(collapsed, tokenMap, change.selector);
  if (change.variableAssociations) {
    for (const prop of enriched) {
      const camelProp = prop.property.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
      const assoc = change.variableAssociations[camelProp];
      if (assoc) {
        const isVar = assoc.className.startsWith("var(");
        prop.recommended = {
          type: isVar ? "css-variable" : "semantic-token",
          name: assoc.className,
          value: Object.values(assoc.values)[0] || prop.to,
          exact: true
        };
      }
    }
  }
  if (enriched.length > 0) {
    lines.push("");
    lines.push("### Changes");
    lines.push("");
    lines.push("| Property | Before | After | Token |");
    lines.push("|----------|--------|-------|-------|");
    for (const prop of enriched) {
      const kebab = prop.property.startsWith("class:") ? prop.property : camelToKebab2(prop.property);
      const tokenStr = formatRecommended(prop);
      lines.push(`| \`${kebab}\` | \`${prop.from}\` | \`${prop.to}\` | ${tokenStr} |`);
    }
  }
  if (change.unlinkedProperties && change.unlinkedProperties.length > 0) {
    lines.push("");
    lines.push("### Detached Variables");
    lines.push("");
    lines.push("The following properties had their design token/variable binding removed. Hardcode the current values \u2014 do not use the token class or CSS variable:");
    lines.push("");
    lines.push("| Property | Current Value |");
    lines.push("|----------|---------------|");
    for (const { property, value } of change.unlinkedProperties) {
      const kebab = camelToKebab2(property);
      lines.push(`| \`${kebab}\` | \`${value}\` |`);
    }
  }
  if (fidelity !== "minimal") {
    const detailLines = formatResolutionContext(enriched);
    if (detailLines) {
      lines.push("");
      lines.push(detailLines);
    }
  }
  lines.push("");
  return lines.join("\n");
}
function formatStylingApproach(approach) {
  switch (approach) {
    case "tailwind":
      return "Tailwind CSS (modify utility classes)";
    case "css-modules":
      return "CSS Modules (modify `.module.css` file)";
    case "css-in-js":
      return "CSS-in-JS / Emotion (modify style object)";
    case "styled-components":
      return "styled-components (modify template literal)";
    case "plain-css":
      return "Plain CSS (modify stylesheet)";
    default:
      return approach;
  }
}
function formatRecommended(prop) {
  if (!prop.recommended) return "\u2014";
  const r = prop.recommended;
  const name = r.type === "css-variable" ? `\`${r.name}\`` : `\`.${r.name}\``;
  if (!r.exact && r.distance) {
    return `${name} (${r.distance})`;
  }
  return name;
}
function formatResolutionContext(enriched) {
  const entries = [];
  for (const prop of enriched) {
    const hasAlternatives = prop.alternatives.length > 0;
    const hasCssVars = prop.cssVariables.length > 0;
    const hasConflicts = prop.conflicts && prop.conflicts.length > 0;
    if (!hasAlternatives && !hasCssVars && !hasConflicts) continue;
    const kebab = camelToKebab2(prop.property);
    const lines = [];
    lines.push(`**\`${kebab}\`** \`${prop.from}\` \u2192 \`${prop.to}\``);
    if (prop.recommended) {
      const r = prop.recommended;
      const label = r.exact ? "exact" : r.distance || "fuzzy";
      const nameStr = r.type === "css-variable" ? `\`${r.name}\`` : `\`.${r.name}\``;
      lines.push(`- Recommended: ${nameStr} (${label}, \`${r.value}\`)`);
    }
    if (hasAlternatives) {
      const altStr = prop.alternatives.map((a4) => `\`.${a4.name}\` (\`${a4.value}\`)`).join(", ");
      lines.push(`- Alternatives: ${altStr}`);
    }
    if (hasCssVars) {
      const varStr = prop.cssVariables.map((v) => `\`var(${v})\``).join(", ");
      lines.push(`- CSS vars: ${varStr}`);
    }
    if (hasConflicts) {
      for (const c3 of prop.conflicts) {
        const imp = c3.important ? ", !important" : "";
        lines.push(`- Competing rule: \`${c3.selector}\` (\`${c3.value}\`${imp})`);
      }
    }
    entries.push(lines.join("\n"));
  }
  if (entries.length === 0) return null;
  return `<details>
<summary>Resolution context</summary>

${entries.join("\n\n")}

</details>`;
}
var SHORTHAND_GROUPS = [
  {
    shorthand: "borderRadius",
    longhands: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius"]
  },
  {
    shorthand: "padding",
    longhands: ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]
  },
  {
    shorthand: "margin",
    longhands: ["marginTop", "marginRight", "marginBottom", "marginLeft"]
  },
  {
    shorthand: "borderWidth",
    longhands: ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]
  },
  {
    shorthand: "borderColor",
    longhands: ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"]
  },
  {
    shorthand: "borderStyle",
    longhands: ["borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"]
  }
];
function collapseShorthands(changes) {
  const result = [...changes];
  for (const group of SHORTHAND_GROUPS) {
    const matches = group.longhands.map((lh) => result.find((c3) => c3.property === lh));
    if (matches.every((m) => m != null)) {
      const allSameTo = new Set(matches.map((m) => m.to)).size === 1;
      const allSameFrom = new Set(matches.map((m) => m.from)).size === 1;
      if (allSameTo && allSameFrom) {
        for (const lh of group.longhands) {
          const idx = result.findIndex((c3) => c3.property === lh);
          if (idx !== -1) result.splice(idx, 1);
        }
        result.push({ property: group.shorthand, from: matches[0].from, to: matches[0].to });
      }
    }
  }
  return result;
}
var BridgeClient = class {
  ws = null;
  port;
  handlers = null;
  reconnectTimer = null;
  pendingRequests = /* @__PURE__ */ new Map();
  requestId = 0;
  _connected = false;
  reconnectDelay = 3e3;
  maxReconnectDelay = 6e4;
  /** If set, a newer version is available */
  updateAvailable = null;
  onUpdateCallback = null;
  constructor(port = 9223) {
    this.port = port;
  }
  get connected() {
    return this._connected;
  }
  /** Register a handler for incoming requests from the MCP server */
  onRequest(handler) {
    this.handlers = handler;
  }
  /** Register a callback for when an update is available */
  onUpdate(callback) {
    this.onUpdateCallback = callback;
    if (this.updateAvailable) callback(this.updateAvailable);
  }
  /** Connect to the MCP server */
  connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(`ws://localhost:${this.port}/ws`);
      this.ws.onopen = () => {
        this.reconnectDelay = 3e3;
        const handshakeId = String(++this.requestId);
        const timer = setTimeout(() => {
          this.pendingRequests.delete(handshakeId);
          if (!this._connected) {
            this._connected = true;
            console.log("[Retune] Connected to MCP server (handshake not acknowledged, assuming compatible)");
          }
        }, 3e3);
        this.pendingRequests.set(handshakeId, {
          resolve: (result) => {
            this._connected = true;
            console.log("[Retune] Connected to MCP server (verified)");
            if (result?.latestVersion) {
              const overlayVersion = true ? "0.6.2" : "0.0.0";
              if (result.latestVersion !== overlayVersion && this.isNewer(result.latestVersion, overlayVersion)) {
                this.updateAvailable = { current: overlayVersion, latest: result.latestVersion };
                this.onUpdateCallback?.(this.updateAvailable);
              }
            }
          },
          reject: () => {
            this._connected = true;
            console.warn("[Retune] Handshake rejected, connected in fallback mode");
          },
          timer
        });
        this.ws?.send(JSON.stringify({ id: handshakeId, method: "handshake", params: { client: "retune-overlay" } }));
      };
      this.ws.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch (err) {
          console.error("[Retune] Failed to parse message:", err);
          return;
        }
        if (msg.id && this.pendingRequests.has(msg.id)) {
          const pending = this.pendingRequests.get(msg.id);
          clearTimeout(pending.timer);
          this.pendingRequests.delete(msg.id);
          if (msg.error) {
            pending.reject(new Error(msg.error));
          } else {
            pending.resolve(msg.result);
          }
          return;
        }
        if (msg.method && this.handlers) {
          try {
            const result = await this.handlers(msg.method, msg.params);
            const json = JSON.stringify({ id: msg.id, result }, (_key, value) => {
              if (value instanceof Element || value instanceof Node) return void 0;
              if (typeof value === "function") return void 0;
              return value;
            });
            this.ws?.send(json);
          } catch (err) {
            this.ws?.send(JSON.stringify({ id: msg.id, error: err.message }));
          }
        }
      };
      this.ws.onclose = () => {
        this._connected = false;
        this.ws = null;
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      };
      this.ws.onerror = () => {
      };
    } catch {
    }
  }
  /** Send pending changes to the MCP server */
  async sendChanges(changes) {
    await this.request("pushChanges", { changes });
  }
  /** Send a request to the MCP server and wait for response */
  request(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected to MCP server"));
        return;
      }
      const id2 = String(++this.requestId);
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id2)) {
          this.pendingRequests.delete(id2);
          reject(new Error("Request timed out"));
        }
      }, 1e4);
      this.pendingRequests.set(id2, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id: id2, method, params }));
    });
  }
  /** Simple semver comparison: is `a` newer than `b`? */
  isNewer(a4, b) {
    const pa = a4.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i3 = 0; i3 < 3; i3++) {
      if ((pa[i3] || 0) > (pb[i3] || 0)) return true;
      if ((pa[i3] || 0) < (pb[i3] || 0)) return false;
    }
    return false;
  }
  /** Disconnect and clean up */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Disconnected"));
    }
    this.pendingRequests.clear();
  }
};
var SPACING_PROPS = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft"
];
var SIZING_PROPS = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight"
];
var BORDER_PROPS = [
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius"
];
var TYPOGRAPHY_PROPS = [
  "fontSize",
  "fontWeight",
  "fontFamily",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "verticalAlign",
  "textDecoration",
  "textTransform",
  "whiteSpace",
  "wordSpacing",
  "textIndent",
  "color"
];
var BACKGROUND_PROPS = [
  "backgroundColor",
  "backgroundImage"
];
var LAYOUT_PROPS = [
  "display",
  "position",
  "flexDirection",
  "flexWrap",
  "alignItems",
  "justifyContent",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
  "top",
  "right",
  "bottom",
  "left",
  "zIndex",
  // Flex child
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "order",
  // Grid child
  "gridColumn",
  "gridRow",
  "justifySelf"
];
var VISUAL_PROPS = [
  "opacity",
  "overflow",
  "boxShadow",
  "textShadow",
  "transform",
  "filter",
  "backdropFilter"
];
var TEXT_OVERFLOW_PROPS = [
  "textOverflow",
  "overflowWrap",
  "wordBreak",
  "webkitLineClamp",
  "webkitBoxOrient"
];
var ALL_PROPS = [
  ...SPACING_PROPS,
  ...SIZING_PROPS,
  ...BORDER_PROPS,
  ...TYPOGRAPHY_PROPS,
  ...BACKGROUND_PROPS,
  ...LAYOUT_PROPS,
  ...VISUAL_PROPS,
  ...TEXT_OVERFLOW_PROPS
];
function getPseudoStateStyles(element, state) {
  const styles = {};
  const stateRegex = new RegExp(state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  function walkRules3(rules) {
    for (let i3 = 0; i3 < rules.length; i3++) {
      const rule = rules[i3];
      if (rule instanceof CSSGroupingRule || typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
        walkRules3(rule.cssRules);
        continue;
      }
      if (!(rule instanceof CSSStyleRule)) continue;
      const sel = rule.selectorText;
      if (!sel.includes(state)) continue;
      const baseSel = sel.replace(stateRegex, "").replace(/\s+/g, " ").trim();
      if (!baseSel) continue;
      try {
        if (!element.matches(baseSel)) continue;
      } catch {
        continue;
      }
      for (let j = 0; j < rule.style.length; j++) {
        const prop = rule.style[j];
        styles[prop] = rule.style.getPropertyValue(prop);
      }
    }
  }
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walkRules3(rules);
  }
  return expandShorthands(styles);
}
function expandShorthands(styles) {
  const result = { ...styles };
  function expandBoxValues(shorthand, sides) {
    if (!(shorthand in result)) return;
    const raw = result[shorthand].trim();
    const parts = raw.split(/\s+/);
    let top, right, bottom, left;
    switch (parts.length) {
      case 1:
        top = right = bottom = left = parts[0];
        break;
      case 2:
        top = bottom = parts[0];
        right = left = parts[1];
        break;
      case 3:
        top = parts[0];
        right = left = parts[1];
        bottom = parts[2];
        break;
      default:
        top = parts[0];
        right = parts[1];
        bottom = parts[2];
        left = parts[3];
        break;
    }
    if (!(sides[0] in result)) result[sides[0]] = top;
    if (!(sides[1] in result)) result[sides[1]] = right;
    if (!(sides[2] in result)) result[sides[2]] = bottom;
    if (!(sides[3] in result)) result[sides[3]] = left;
    delete result[shorthand];
  }
  function expandBorderRadius() {
    if (!("border-radius" in result)) return;
    const raw = result["border-radius"].trim();
    const horizontal = raw.split("/")[0].trim();
    const parts = horizontal.split(/\s+/);
    const corners = [
      "border-top-left-radius",
      "border-top-right-radius",
      "border-bottom-right-radius",
      "border-bottom-left-radius"
    ];
    let tl, tr, br, bl;
    switch (parts.length) {
      case 1:
        tl = tr = br = bl = parts[0];
        break;
      case 2:
        tl = br = parts[0];
        tr = bl = parts[1];
        break;
      case 3:
        tl = parts[0];
        tr = bl = parts[1];
        br = parts[2];
        break;
      default:
        tl = parts[0];
        tr = parts[1];
        br = parts[2];
        bl = parts[3];
        break;
    }
    if (!(corners[0] in result)) result[corners[0]] = tl;
    if (!(corners[1] in result)) result[corners[1]] = tr;
    if (!(corners[2] in result)) result[corners[2]] = br;
    if (!(corners[3] in result)) result[corners[3]] = bl;
    delete result["border-radius"];
  }
  function expandGap() {
    if (!("gap" in result)) return;
    const raw = result["gap"].trim();
    const parts = raw.split(/\s+/);
    const rowGap = parts[0];
    const colGap = parts.length > 1 ? parts[1] : parts[0];
    if (!("row-gap" in result)) result["row-gap"] = rowGap;
    if (!("column-gap" in result)) result["column-gap"] = colGap;
    delete result["gap"];
  }
  expandBoxValues("padding", [
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left"
  ]);
  expandBoxValues("margin", [
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left"
  ]);
  expandBoxValues("border-width", [
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width"
  ]);
  expandBoxValues("border-color", [
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color"
  ]);
  expandBoxValues("border-style", [
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style"
  ]);
  expandBorderRadius();
  expandGap();
  return result;
}
function getStyleSources(element) {
  const sources = {};
  function walkRules3(rules) {
    for (let i3 = 0; i3 < rules.length; i3++) {
      const rule = rules[i3];
      if (rule instanceof CSSGroupingRule || typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
        walkRules3(rule.cssRules);
        continue;
      }
      if (!(rule instanceof CSSStyleRule)) continue;
      const sel = rule.selectorText;
      if (sel.includes(":hover") || sel.includes(":focus") || sel.includes(":active")) continue;
      try {
        if (!element.matches(sel)) continue;
      } catch {
        continue;
      }
      for (let j = 0; j < rule.style.length; j++) {
        const prop = rule.style[j];
        const camel = prop.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
        sources[camel] = { selector: sel, value: rule.style.getPropertyValue(prop) };
      }
    }
  }
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walkRules3(rules);
  }
  return sources;
}
function getScopedStyles(element, scopeSelector) {
  const ownedProperties = /* @__PURE__ */ new Set();
  const scopedValues = {};
  const scopedSpecificity = {};
  const scopeClasses = scopeSelector.match(/\.[a-zA-Z0-9_-]+/g) || [];
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  function resolveRuleValue(rule, prop) {
    let val = rule.style.getPropertyValue(prop).trim();
    if (!val) {
      for (const sh of ["padding", "margin", "border-radius", "gap", "border-width", "border-color", "border-style"]) {
        const shVal = rule.style.getPropertyValue(sh).trim();
        if (shVal && prop.startsWith(sh.split("-")[0])) {
          probe.style.setProperty(sh, shVal);
          val = getComputedStyle(probe).getPropertyValue(prop).trim();
          probe.style.removeProperty(sh);
          break;
        }
      }
    } else if (val.includes("var(")) {
      probe.style.setProperty(prop, val);
      val = getComputedStyle(probe).getPropertyValue(prop).trim();
      probe.style.removeProperty(prop);
    }
    return val;
  }
  function walkScopedRules(rules) {
    for (let i3 = 0; i3 < rules.length; i3++) {
      const rule = rules[i3];
      if (rule instanceof CSSGroupingRule || typeof CSSLayerBlockRule !== "undefined" && rule instanceof CSSLayerBlockRule) {
        walkScopedRules(rule.cssRules);
        continue;
      }
      if (!(rule instanceof CSSStyleRule)) continue;
      const sel = rule.selectorText;
      if (sel.includes(":hover") || sel.includes(":focus") || sel.includes(":active")) continue;
      try {
        if (!element.matches(sel)) continue;
      } catch {
        continue;
      }
      const ruleClasses = sel.match(/\.[a-zA-Z0-9_-]+/g) || [];
      if (ruleClasses.length === 0) continue;
      const ruleWithinScope = ruleClasses.every((rc) => scopeClasses.includes(rc));
      const ruleSupersetOfScope = !ruleWithinScope && scopeClasses.every((sc) => ruleClasses.includes(sc));
      if (!ruleWithinScope && !ruleSupersetOfScope) continue;
      const ruleSpecificity = ruleClasses.length;
      for (let j = 0; j < rule.style.length; j++) {
        const prop = rule.style[j];
        const camel = prop.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
        if (ruleWithinScope) ownedProperties.add(camel);
        const val = resolveRuleValue(rule, prop);
        if (!val) continue;
        const prevSpec = scopedSpecificity[camel] ?? -1;
        if (ruleSpecificity >= prevSpec) {
          scopedValues[camel] = val;
          scopedSpecificity[camel] = ruleSpecificity;
        }
      }
    }
  }
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    walkScopedRules(rules);
  }
  probe.remove();
  const computed = window.getComputedStyle(element);
  const styles = {};
  for (const prop of ALL_PROPS) {
    if (scopedValues[prop]) {
      styles[prop] = scopedValues[prop];
      continue;
    }
    let value = computed.getPropertyValue(camelToKebab2(prop));
    if (value) {
      if (value === "normal" && NORMAL_TO_ZERO.has(prop)) {
        value = "0px";
      }
      styles[prop] = value;
    }
  }
  return { styles, ownedProperties };
}
var NORMAL_TO_ZERO = /* @__PURE__ */ new Set(["gap", "rowGap", "columnGap"]);
function getRelevantStyles(element) {
  const computed = window.getComputedStyle(element);
  const styles = {};
  for (const prop of ALL_PROPS) {
    let value = computed.getPropertyValue(camelToKebab2(prop));
    if (value) {
      if (value === "normal" && NORMAL_TO_ZERO.has(prop)) {
        value = "0px";
      }
      styles[prop] = value;
    }
  }
  return styles;
}
function detectLayoutMode(element) {
  const computed = window.getComputedStyle(element);
  const display = computed.display;
  const position = computed.position;
  if (position === "fixed") return "fixed";
  if (position === "absolute") return "absolute";
  if (position === "sticky") return "sticky";
  if (position === "relative") return "relative";
  if (display.includes("flex")) return "flex";
  if (display.includes("grid")) return "grid";
  if (display.includes("inline")) return "inline";
  return "block";
}
function inspectElement(element) {
  const rect = element.getBoundingClientRect();
  return {
    element,
    selector: getSelector(element),
    tagName: element.tagName,
    textContent: getDirectTextContent(element),
    classes: element.className && typeof element.className === "string" ? element.className.trim().split(/\s+/) : [],
    rect,
    computedStyles: getRelevantStyles(element),
    layoutMode: detectLayoutMode(element),
    reactComponents: getReactComponentHierarchy(element),
    reactProps: getReactProps(element),
    sourceFile: getReactSource(element),
    stylingApproach: detectStylingApproach(element),
    inlineStyles: element.style?.cssText || null,
    elementId: element.id || null,
    accessibleName: getAccessibleName(element),
    parentContext: getParentContext(element),
    childSummary: getChildSummary(element),
    domPath: getDomPath(element),
    nearbySiblings: getNearbySiblings(element),
    position: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}
function matchesHotkey(e2, hotkey) {
  const parts = hotkey.toLowerCase().split("+");
  const key = parts.pop();
  const needsAlt = parts.includes("alt");
  const needsCtrl = parts.includes("ctrl");
  const needsMeta = parts.includes("meta") || parts.includes("cmd");
  const needsShift = parts.includes("shift");
  const pressedKey = e2.key.toLowerCase();
  const codeKey = e2.code?.replace(/^(Key|Digit)/i, "").toLowerCase() || "";
  const keyMatch = pressedKey === key || needsAlt && codeKey === key;
  return keyMatch && e2.altKey === needsAlt && e2.ctrlKey === needsCtrl && e2.metaKey === needsMeta && e2.shiftKey === needsShift;
}
function getDirectTextContent(element) {
  const parts = [];
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) parts.push(text);
    }
  }
  const result = parts.join(" ").trim();
  return result ? result.slice(0, 100) : null;
}
function getAccessibleName(element) {
  const label = element.getAttribute("aria-label") || element.getAttribute("alt") || element.getAttribute("title") || element.getAttribute("placeholder") || element.getAttribute("name");
  return label || null;
}
function getParentContext(element) {
  const parent = element.parentElement;
  if (!parent || parent === document.body) return null;
  const tag = parent.tagName.toLowerCase();
  const id2 = parent.id ? `#${parent.id}` : "";
  const cls = parent.className && typeof parent.className === "string" ? parent.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
  const clsStr = cls ? `.${cls}` : "";
  return `${tag}${id2}${clsStr}`;
}
function getChildSummary(element) {
  const children = element.children;
  if (children.length === 0) return null;
  const tags = Array.from(children).slice(0, 6).map((c3) => c3.tagName.toLowerCase());
  const suffix = children.length > 6 ? `, +${children.length - 6} more` : "";
  return `${children.length} children: ${tags.join(", ")}${suffix}`;
}
function getDomPath(element) {
  const parts = [];
  let current = element;
  while (current && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();
    if (current.id) {
      part += `#${current.id}`;
    } else if (current.className && typeof current.className === "string") {
      const cls = current.className.trim().split(/\s+/).slice(0, 2).join(".");
      if (cls) part += `.${cls}`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }
  return parts.join(" > ");
}
function getNearbySiblings(element) {
  const parent = element.parentElement;
  if (!parent) return null;
  const siblings = Array.from(parent.children);
  const index2 = siblings.indexOf(element);
  const nearby = [];
  for (let i3 = Math.max(0, index2 - 2); i3 < Math.min(siblings.length, index2 + 3); i3++) {
    const sib = siblings[i3];
    const tag = sib.tagName.toLowerCase();
    const label = i3 === index2 ? `**${tag}**` : tag;
    nearby.push(label);
  }
  return nearby.join(", ");
}
function getFiber2(element) {
  const key = Object.keys(element).find((k) => k.startsWith("__reactFiber$"));
  return key ? element[key] : null;
}
function detectChildrenType(container) {
  const children = Array.from(container.children);
  if (children.length < 2) return "static";
  const fibers = children.map(getFiber2).filter(Boolean);
  if (fibers.length === 0) return "static";
  const sourceLines = /* @__PURE__ */ new Map();
  let withKeys = 0;
  for (const fiber of fibers) {
    const src = fiber._debugSource;
    if (src) {
      const key = `${src.fileName}:${src.lineNumber}`;
      sourceLines.set(key, (sourceLines.get(key) || 0) + 1);
    }
    if (fiber.key !== null) withKeys++;
  }
  const maxShared = Math.max(...sourceLines.values(), 0);
  if (maxShared >= fibers.length * 0.7) return "array";
  if (withKeys >= fibers.length * 0.7 && sourceLines.size <= 2) return "array";
  return "static";
}
function Section({ label, gap, action, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "retune-section", children: [
    /* @__PURE__ */ jsxs("div", { className: "retune-section-header", children: [
      /* @__PURE__ */ jsx("span", { className: "retune-section-title", children: label }),
      action
    ] }),
    children && /* @__PURE__ */ jsx("div", { className: "retune-section-body", style: gap != null ? { gap } : void 0, children })
  ] });
}
function Row({ children }) {
  return /* @__PURE__ */ jsx("div", { className: "retune-section-row", children: /* @__PURE__ */ jsx("div", { className: "retune-row", children }) });
}
function RowGroup({ label, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "retune-row-group", children: [
    label && /* @__PURE__ */ jsx("div", { className: "retune-group-label-inline", children: label }),
    children
  ] });
}
function Field({ label, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "retune-field", children: [
    /* @__PURE__ */ jsx("span", { className: "retune-field-label", children: label }),
    children
  ] });
}
function roundCssValue(val) {
  if (/^-?\d+\.\d+$/.test(val.trim())) {
    const rounded = parseFloat(parseFloat(val).toFixed(2));
    return String(rounded);
  }
  return val.replace(/-?\d+\.\d+/g, (match) => {
    const rounded = parseFloat(parseFloat(match).toFixed(2));
    return String(rounded);
  });
}
var UNITLESS_PROPS = /* @__PURE__ */ new Set([
  "opacity",
  "z-index",
  "zIndex",
  "font-weight",
  "fontWeight",
  "flex-grow",
  "flexGrow",
  "flex-shrink",
  "flexShrink",
  "order",
  "orphans",
  "widows",
  "columns",
  "column-count",
  "columnCount",
  "tab-size",
  "tabSize"
]);
var UNIT_RE = /[a-z%]+$/i;
var BARE_NUMBER_RE = /^-?\d+(\.\d+)?$/;
var VALID_CSS_UNITS = /* @__PURE__ */ new Set([
  "px",
  "em",
  "rem",
  "%",
  "vh",
  "vw",
  "vmin",
  "vmax",
  "ch",
  "ex",
  "cap",
  "ic",
  "lh",
  "rlh",
  "svh",
  "svw",
  "lvh",
  "lvw",
  "dvh",
  "dvw",
  "cm",
  "mm",
  "in",
  "pt",
  "pc",
  "q",
  "deg",
  "rad",
  "grad",
  "turn",
  "s",
  "ms",
  "fr"
]);
function inferCssUnit(input, prevValue, prop) {
  const trimmed = input.trim();
  if (!BARE_NUMBER_RE.test(trimmed)) return trimmed;
  if (UNITLESS_PROPS.has(prop)) return trimmed;
  const unitMatch = prevValue.match(UNIT_RE);
  if (unitMatch && VALID_CSS_UNITS.has(unitMatch[0].toLowerCase())) {
    return trimmed + unitMatch[0];
  }
  return trimmed + "px";
}
var TooltipPortalContext = createContext(null);
function useTooltipPortal() {
  return useContext(TooltipPortalContext);
}
function Tooltip({
  content,
  shortcut,
  side = "bottom",
  sideOffset = 6,
  delay = 400,
  children
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timerRef = useRef(null);
  const portalTarget = useTooltipPortal();
  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [delay]);
  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);
  useLayoutEffect(() => {
    if (!visible) {
      setCoords(null);
      return;
    }
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;
    const triggerEl = trigger.children[0];
    if (!triggerEl) return;
    const tr = triggerEl.getBoundingClientRect();
    const tt = tooltip.getBoundingClientRect();
    let top = 0;
    let left = 0;
    if (side === "bottom") {
      top = tr.bottom + sideOffset;
      left = tr.left + (tr.width - tt.width) / 2;
    } else if (side === "top") {
      top = tr.top - tt.height - sideOffset;
      left = tr.left + (tr.width - tt.width) / 2;
    } else if (side === "right") {
      top = tr.top + (tr.height - tt.height) / 2;
      left = tr.right + sideOffset;
    } else {
      top = tr.top + (tr.height - tt.height) / 2;
      left = tr.left - tt.width - sideOffset;
    }
    const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - tt.width - 8));
    const clampedTop = Math.max(8, Math.min(top, window.innerHeight - tt.height - 8));
    const triggerCenterX = tr.left + tr.width / 2;
    const triggerCenterY = tr.top + tr.height / 2;
    const caretX = triggerCenterX - clampedLeft;
    const caretY = triggerCenterY - clampedTop;
    tooltip.style.setProperty("--caret-x", `${caretX}px`);
    tooltip.style.setProperty("--caret-y", `${caretY}px`);
    setCoords({ top: clampedTop, left: clampedLeft });
  }, [visible, side, sideOffset]);
  const tooltipEl = visible ? /* @__PURE__ */ jsxs(
    "div",
    {
      ref: tooltipRef,
      className: `retune-tooltip retune-tooltip-${side}`,
      style: coords ? { top: coords.top, left: coords.left, opacity: 1 } : { opacity: 0 },
      children: [
        /* @__PURE__ */ jsx("span", { className: "retune-tooltip-text", children: content }),
        shortcut && /* @__PURE__ */ jsx("span", { className: "retune-tooltip-shortcut", children: shortcut })
      ]
    }
  ) : null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: triggerRef,
      className: "retune-tooltip-trigger",
      onPointerEnter: show,
      onPointerLeave: hide,
      onPointerDown: hide,
      children: [
        children,
        portalTarget ? tooltipEl && createPortal(tooltipEl, portalTarget) : tooltipEl
      ]
    }
  );
}
function ChangeIndicator({ isChanged, onReset }) {
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const dotRef = useCallback((el) => {
    if (!el) return;
    const handler = (e2) => {
      e2.stopPropagation();
      e2.preventDefault();
      onResetRef.current();
    };
    el.addEventListener("pointerdown", handler);
    return () => el.removeEventListener("pointerdown", handler);
  }, []);
  if (!isChanged) return null;
  return /* @__PURE__ */ jsx(Tooltip, { content: "Reset property", side: "top", delay: 200, children: /* @__PURE__ */ jsx("span", { ref: dotRef, className: "retune-change-dot", children: /* @__PURE__ */ jsx("span", { className: "retune-change-dot-inner" }) }) });
}
var lockCount = 0;
var savedOverflow = "";
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      savedOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.documentElement.style.overflow = savedOverflow;
      }
    };
  }, [active]);
}
function FloatingDialog({
  title,
  tabs,
  activeTab,
  onTabChange,
  onClose,
  anchorRect,
  search,
  children,
  headerActions,
  onHeaderAction,
  maxHeight: maxHeightProp = 400,
  minHeight = 400,
  className
}) {
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  useScrollLock(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onHeaderActionRef = useRef(onHeaderAction);
  onHeaderActionRef.current = onHeaderAction;
  useEffect(() => {
    if (!search) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [!!search]);
  useEffect(() => {
    const handlePointerDown = (e2) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (!e2.composedPath().includes(panel)) {
        onCloseRef.current();
      }
    };
    const handleKeyDown = (e2) => {
      if (e2.key === "Escape") {
        e2.preventDefault();
        e2.stopPropagation();
        onCloseRef.current();
      }
    };
    const root = panelRef.current?.getRootNode();
    const timer = setTimeout(() => {
      root.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    root.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      clearTimeout(timer);
      root.removeEventListener("pointerdown", handlePointerDown);
      root.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const handleClick = (e2) => {
      const target = e2.target;
      if (target.closest("[data-dialog-close]")) {
        e2.preventDefault();
        e2.stopPropagation();
        onCloseRef.current();
        return;
      }
      const actionEl = target.closest("[data-dialog-action]");
      if (actionEl) {
        e2.preventDefault();
        e2.stopPropagation();
        const action = actionEl.dataset.dialogAction;
        if (action) onHeaderActionRef.current?.(action);
      }
    };
    panel.addEventListener("pointerdown", handleClick);
    return () => panel.removeEventListener("pointerdown", handleClick);
  }, []);
  const host = document.querySelector("[data-retune-host]");
  const parentPanel = host?.shadowRoot?.querySelector(".retune-panel");
  const parentRect = parentPanel?.getBoundingClientRect();
  const panelWidth = parentRect ? parentRect.width - 24 : 240;
  const left = parentRect ? parentRect.left + (parentRect.width - panelWidth) / 2 : Math.max(4, Math.min(anchorRect.left + anchorRect.width - panelWidth, window.innerWidth - panelWidth - 4));
  const gap = 4;
  const spaceBelow = window.innerHeight - anchorRect.top - anchorRect.height - gap;
  const spaceAbove = anchorRect.top - gap;
  const flipUp = spaceBelow < maxHeightProp && spaceAbove > spaceBelow;
  const maxHeight = Math.min(maxHeightProp, flipUp ? spaceAbove : spaceBelow);
  const clampedMinHeight = Math.min(minHeight, maxHeight);
  const posStyle = flipUp ? { position: "fixed", bottom: window.innerHeight - anchorRect.top + gap, left, width: panelWidth, maxHeight, minHeight: clampedMinHeight } : { position: "fixed", top: anchorRect.top + anchorRect.height + gap, left, width: panelWidth, maxHeight, minHeight: clampedMinHeight };
  const isTabs = !!tabs;
  const isSingleTab = isTabs && tabs.length === 1;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: panelRef,
      className: `retune-floating-dialog${className ? ` ${className}` : ""}`,
      style: posStyle,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "retune-floating-dialog-header", children: [
          /* @__PURE__ */ jsx("div", { className: "retune-floating-dialog-title-area", children: isTabs ? tabs.map((tab) => {
            const isActive = tab.value === activeTab;
            return /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: isSingleTab ? "retune-floating-dialog-tab retune-floating-dialog-tab-single" : `retune-floating-dialog-tab${isActive ? " retune-floating-dialog-tab-active" : ""}`,
                onClick: onTabChange ? () => onTabChange(tab.value) : void 0,
                children: tab.label
              },
              tab.value
            );
          }) : /* @__PURE__ */ jsx("span", { className: "retune-floating-dialog-title", children: title }) }),
          headerActions,
          /* @__PURE__ */ jsx("button", { type: "button", className: "retune-floating-dialog-close", "data-dialog-close": true, children: /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M16.6464 6.64645C16.8417 6.45118 17.1582 6.45118 17.3535 6.64645C17.5487 6.84171 17.5487 7.15822 17.3535 7.35348L12.707 12L17.3535 16.6464C17.5487 16.8417 17.5487 17.1582 17.3535 17.3535C17.1582 17.5487 16.8417 17.5487 16.6464 17.3535L12 12.707L7.35348 17.3535C7.15822 17.5487 6.84171 17.5487 6.64645 17.3535C6.45118 17.1582 6.45118 16.8417 6.64645 16.6464L11.2929 12L6.64645 7.35348C6.45123 7.15821 6.4512 6.84169 6.64645 6.64645C6.8417 6.45125 7.15823 6.45125 7.35348 6.64645L12 11.2929L16.6464 6.64645Z", fill: "currentColor" }) }) })
        ] }),
        search && /* @__PURE__ */ jsx("div", { className: "retune-floating-dialog-search", children: /* @__PURE__ */ jsx(
          "input",
          {
            ref: searchRef,
            className: "retune-floating-dialog-search-input",
            placeholder: search.placeholder || "Search",
            value: search.value,
            onChange: (e2) => search.onChange(e2.target.value),
            onKeyDown: search.onKeyDown,
            spellCheck: false
          }
        ) }),
        /* @__PURE__ */ jsx("div", { className: "retune-floating-dialog-body", children })
      ]
    }
  );
}
function formatName(className) {
  if (className.startsWith("var(--") && className.endsWith(")")) {
    return className.slice(6, -1);
  }
  return className;
}
function formatValue(variable) {
  const vals = Object.values(variable.values);
  if (vals.length === 0) return "";
  const val = vals[0];
  return val.length > 20 ? val.slice(0, 20) + "\u2026" : val;
}
function getSwatchColor(variable) {
  for (const [prop, val] of Object.entries(variable.values)) {
    if (prop.includes("color") || prop === "background-color" || prop === "fill" || prop === "stroke") {
      return val;
    }
    const v = val.trim().toLowerCase();
    if (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl") || v.startsWith("oklch") || v.startsWith("oklab")) {
      return val;
    }
  }
  return null;
}
function VariableDialog({ property, currentVariable, onSelect, onUnlink, onClose, anchorRect }) {
  const listRef = useRef(null);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const allVariables = useMemo(() => getVariablesForProperty(property), [property]);
  const category = getCategoryForProperty(property.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`));
  const isColor = category === "colors";
  const filtered = useMemo(() => {
    if (!search) return allVariables;
    const q = search.toLowerCase();
    return allVariables.filter(
      (t2) => t2.className.toLowerCase().includes(q) || Object.values(t2.values).some((v) => v.toLowerCase().includes(q))
    );
  }, [allVariables, search]);
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered]);
  useEffect(() => {
    if (highlightedIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-token-index="${highlightedIndex}"]`);
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const handleSearchKeyDown = useCallback((e2) => {
    const count = filteredRef.current.length;
    if (count === 0) return;
    if (e2.key === "ArrowDown") {
      e2.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % count);
    } else if (e2.key === "ArrowUp") {
      e2.preventDefault();
      setHighlightedIndex((prev) => prev <= 0 ? count - 1 : prev - 1);
    } else if (e2.key === "Enter") {
      e2.preventDefault();
      setHighlightedIndex((curr) => {
        if (curr >= 0 && curr < count) {
          const token = filteredRef.current[curr];
          if (token) {
            onSelectRef.current(token);
            onCloseRef.current();
          }
        }
        return curr;
      });
    }
  }, []);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const handleClick = (e2) => {
      const target = e2.target;
      const item = target.closest("[data-token-index]");
      if (!item) return;
      e2.preventDefault();
      e2.stopPropagation();
      const idx = parseInt(item.dataset.tokenIndex, 10);
      const token = filteredRef.current[idx];
      if (token) {
        onSelectRef.current(token);
        onCloseRef.current();
      }
    };
    list.addEventListener("pointerdown", handleClick);
    return () => list.removeEventListener("pointerdown", handleClick);
  }, []);
  const handleHeaderAction = useCallback((action) => {
    if (action === "unlink") {
      onUnlink?.();
    }
  }, [onUnlink]);
  const isUnlinkDisabled = !currentVariable;
  const unlinkButton = /* @__PURE__ */ jsx(Tooltip, { content: currentVariable ? "Unlink variable" : "No variable linked", side: "bottom", delay: 300, children: /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      className: "retune-floating-dialog-close",
      "data-dialog-action": isUnlinkDisabled ? void 0 : "unlink",
      style: isUnlinkDisabled ? { opacity: 0.3, cursor: "default" } : void 0,
      children: /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8.14694 12.1475C8.3422 11.9522 8.65871 11.9522 8.85397 12.1475C9.04903 12.3427 9.04916 12.6593 8.85397 12.8545L7.35397 14.3545C6.72133 14.9876 6.72123 16.0134 7.35397 16.6465C7.98708 17.2796 9.01376 17.2795 9.64694 16.6465L11.1469 15.1465C11.3421 14.9517 11.6588 14.9517 11.854 15.1465C12.0491 15.3416 12.0488 15.6582 11.854 15.8535L10.354 17.3535C9.33027 18.377 7.67057 18.3771 6.64694 17.3535C5.62359 16.3299 5.6235 14.6701 6.64694 13.6465L8.14694 12.1475ZM14.5005 15.5C14.7764 15.5001 15.0004 15.724 15.0005 16V17.5C15.0005 17.7761 14.7765 17.9999 14.5005 18C14.2243 18 14.0005 17.7761 14.0005 17.5V16C14.0005 15.7239 14.2244 15.5 14.5005 15.5ZM17.5005 14C17.7764 14.0001 18.0004 14.224 18.0005 14.5C18.0005 14.7761 17.7765 14.9999 17.5005 15H16.0005C15.7243 15 15.5005 14.7761 15.5005 14.5C15.5005 14.2239 15.7244 14 16.0005 14H17.5005ZM13.6469 6.64648C14.6706 5.62308 16.3303 5.62301 17.354 6.64648C18.3774 7.6701 18.3774 9.32986 17.354 10.3535L15.854 11.8535C15.6587 12.0487 15.3422 12.0487 15.1469 11.8535C14.9517 11.6583 14.9518 11.3417 15.1469 11.1465L16.6469 9.64648C17.2798 9.01335 17.2799 7.98661 16.6469 7.35351C16.0138 6.72057 14.9871 6.72064 14.354 7.35351L12.854 8.85351C12.6588 9.04859 12.3422 9.04843 12.1469 8.85351C11.952 8.65825 11.9519 8.34165 12.1469 8.14648L13.6469 6.64648ZM8.00045 9C8.27642 9.00014 8.50036 9.22402 8.50045 9.5C8.50045 9.77605 8.27647 9.99985 8.00045 10H6.50045C6.22431 10 6.00045 9.77614 6.00045 9.5C6.00054 9.22393 6.22437 9 6.50045 9H8.00045ZM9.50045 6C9.77642 6.00014 10.0004 6.22402 10.0005 6.5V8C10.0005 8.27605 9.77647 8.49985 9.50045 8.5C9.22431 8.5 9.00045 8.27614 9.00045 8V6.5C9.00054 6.22393 9.22437 6 9.50045 6Z", fill: "currentColor" }) })
    }
  ) });
  return /* @__PURE__ */ jsx(
    FloatingDialog,
    {
      title: "Variables",
      onClose,
      anchorRect,
      search: { value: search, onChange: setSearch, placeholder: "Search", onKeyDown: handleSearchKeyDown },
      headerActions: unlinkButton,
      onHeaderAction: handleHeaderAction,
      minHeight: 400,
      children: /* @__PURE__ */ jsxs("div", { ref: listRef, className: "retune-variable-dialog-list", children: [
        filtered.length === 0 && /* @__PURE__ */ jsx("div", { className: "retune-variable-dialog-empty", children: "No variables found" }),
        filtered.map((v, i3) => {
          const isActive = currentVariable?.className === v.className;
          const isHighlighted = i3 === highlightedIndex;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: `retune-variable-dialog-item${isActive ? " retune-variable-dialog-item-active" : ""}${isHighlighted ? " retune-variable-dialog-item-highlighted" : ""}`,
              "data-token-index": i3,
              children: [
                isColor && /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "retune-variable-dialog-swatch",
                    style: { backgroundColor: getSwatchColor(v) || "transparent" }
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "retune-variable-dialog-name", children: formatName(v.className) }),
                /* @__PURE__ */ jsx("span", { className: "retune-variable-dialog-value", children: formatValue(v) })
              ]
            },
            v.className
          );
        })
      ] })
    }
  );
}
var activeClose = null;
function claimDialog(close) {
  if (activeClose && activeClose !== close) {
    activeClose();
  }
  activeClose = close;
}
function releaseDialog(close) {
  if (activeClose === close) {
    activeClose = null;
  }
}
function HexagonIcon() {
  return /* @__PURE__ */ jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: [
    /* @__PURE__ */ jsx("path", { d: "M12.5 11.0346C13.0522 11.0346 13.4999 11.4824 13.5 12.0346C13.5 12.5868 13.0523 13.0346 12.5 13.0346C11.9477 13.0346 11.5 12.5868 11.5 12.0346C11.5001 11.4824 11.9478 11.0346 12.5 11.0346Z", fill: "currentColor" }),
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M11.5 6.26795C12.1188 5.91068 12.8812 5.91068 13.5 6.26795L17 8.28846C17.6187 8.64574 18 9.30641 18 10.0209V14.0619C17.9999 14.7763 17.6187 15.4371 17 15.7943L13.5 17.8148C12.8813 18.1719 12.1187 18.1719 11.5 17.8148L8 15.7943C7.3813 15.4371 7.00013 14.7763 7 14.0619V10.0209C7 9.30641 7.38129 8.64574 8 8.28846L11.5 6.26795ZM13 7.13416C12.6906 6.95553 12.3094 6.95553 12 7.13416L8.5 9.15467L8.38965 9.22791C8.14588 9.41565 8 9.70826 8 10.0209V14.0619C8.00013 14.419 8.1907 14.7495 8.5 14.9281L12 16.9486C12.2707 17.1048 12.5965 17.1244 12.8809 17.0072L13 16.9486L16.5 14.9281C16.8093 14.7495 16.9999 14.419 17 14.0619V10.0209C17 9.70826 16.8541 9.41565 16.6104 9.22791L16.5 9.15467L13 7.13416Z", fill: "currentColor" })
  ] });
}
function UnlinkIcon() {
  return /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M12.3533 14.646C12.5485 14.8412 12.5484 15.1578 12.3533 15.3531L11.3534 16.353C10.3297 17.3765 8.67028 17.3766 7.64665 16.353C6.62317 15.3294 6.62317 13.6699 7.64665 12.6462L8.64654 11.6463C8.84181 11.4512 9.15844 11.4511 9.35364 11.6463C9.54883 11.8415 9.54874 12.1582 9.35364 12.3534L8.35375 13.3533C7.7208 13.9865 7.7208 15.0128 8.35375 15.6459C8.98687 16.279 10.0132 16.2789 10.6463 15.6459L11.6462 14.646C11.8414 14.451 12.1581 14.4511 12.3533 14.646ZM8.0002 9.00021C8.27634 9.00021 8.50015 9.22401 8.50015 9.50015C8.49994 9.77612 8.27622 10.0001 8.0002 10.0001H6.50036C6.22434 10.0001 6.00061 9.77612 6.00041 9.50015C6.00041 9.22401 6.22422 9.00021 6.50036 9.00021H8.0002ZM14.5002 15.5002C14.7763 15.5002 15.0001 15.724 15.0001 16.0001V17.5C15 17.776 14.7763 17.9999 14.5002 17.9999C14.2241 17.9999 14.0004 17.776 14.0002 17.5V16.0001C14.0002 15.724 14.2241 15.5002 14.5002 15.5002ZM9.50073 5.99984C9.77664 6.00011 10.0007 6.22381 10.0007 6.49978V7.99962C10.0007 8.2756 9.77664 8.4993 9.50073 8.49957C9.22459 8.49957 9.00078 8.27576 9.00078 7.99962V6.49978C9.00078 6.22364 9.22459 5.99984 9.50073 5.99984ZM17.5006 13.9997C17.7765 13.9998 18.0004 14.2237 18.0005 14.4996C18.0005 14.7757 17.7766 14.9994 17.5006 14.9996H16.0007C15.7246 14.9996 15.5008 14.7758 15.5008 14.4996C15.5009 14.2235 15.7246 13.9997 16.0007 13.9997H17.5006ZM16.3543 7.64676C17.3774 8.67043 17.3776 10.33 16.3543 11.3535L15.3544 12.3534C15.1592 12.5486 14.8426 12.5484 14.6473 12.3534C14.452 12.1582 14.452 11.8416 14.6473 11.6463L15.6472 10.6464C16.28 10.0134 16.2798 8.98702 15.6472 8.35387C15.0141 7.72075 13.9871 7.72018 13.3539 8.35317L12.354 9.35307C12.1588 9.54825 11.8422 9.54808 11.6469 9.35307C11.4519 9.15779 11.4517 8.84114 11.6469 8.64596L12.6468 7.64607C13.6705 6.62254 15.3306 6.62312 16.3543 7.64676Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function VariableAction({ match, property, relatedProperties, onVariableSelect, onVariableApply, onVariableUnlink, onRequestOpen, openPickerRef }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const pickerOpenRef = useRef(false);
  pickerOpenRef.current = pickerOpen;
  const iconElRef = useRef(null);
  const stableCloseRef = useRef(() => setPickerOpen(false));
  const hasAvailable = useMemo(() => hasVariablesForProperty(property), [property]);
  const isActive = !!match;
  const onRequestOpenRef = useRef(onRequestOpen);
  onRequestOpenRef.current = onRequestOpen;
  const onVariableUnlinkRef = useRef(onVariableUnlink);
  onVariableUnlinkRef.current = onVariableUnlink;
  const openPicker = useCallback(() => {
    const el = iconElRef.current;
    if (!el) return;
    if (pickerOpenRef.current) {
      releaseDialog(stableCloseRef.current);
      setPickerOpen(false);
      return;
    }
    const row = el.closest(".retune-prop, .retune-color-row, .retune-row, .retune-combo");
    const rect = row ? row.getBoundingClientRect() : el.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setPickerOpen(true);
    claimDialog(stableCloseRef.current);
  }, []);
  const iconRef = useCallback((el) => {
    if (iconElRef.current && iconElRef.current !== el) {
      iconElRef.current.removeEventListener("pointerdown", handleNativePointerDown);
    }
    iconElRef.current = el;
    if (el) {
      el.addEventListener("pointerdown", handleNativePointerDown);
    }
  }, []);
  function handleNativePointerDown(e2) {
    e2.stopPropagation();
    e2.preventDefault();
    const target = e2.target;
    if (target.closest(".retune-variable-unlink")) {
      onVariableUnlinkRef.current?.();
      return;
    }
    if (onRequestOpenRef.current) {
      onRequestOpenRef.current();
      return;
    }
    const el = iconElRef.current;
    if (!el) return;
    if (pickerOpenRef.current) {
      releaseDialog(stableCloseRef.current);
      setPickerOpen(false);
      return;
    }
    const row = el.closest(".retune-prop, .retune-color-row, .retune-row, .retune-combo");
    const rect = row ? row.getBoundingClientRect() : el.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setPickerOpen(true);
    claimDialog(stableCloseRef.current);
  }
  const handleSelect = useCallback((variable) => {
    const props = relatedProperties || [property];
    if (match) {
      onVariableSelect?.(match.variable, variable, props);
    } else {
      onVariableApply?.(variable, props);
    }
  }, [match, property, relatedProperties, onVariableSelect, onVariableApply]);
  const handleClose = useCallback(() => {
    releaseDialog(stableCloseRef.current);
    setPickerOpen(false);
  }, []);
  if (!isActive && !hasAvailable) return null;
  const portalTarget = iconElRef.current?.getRootNode() instanceof ShadowRoot ? iconElRef.current.getRootNode().querySelector("[data-retune-container]") : null;
  if (openPickerRef) openPickerRef.current = openPicker;
  return /* @__PURE__ */ jsxs(Fragment$1, { children: [
    isActive ? (
      // Variable applied: show unlink icon on hover
      /* @__PURE__ */ jsx(Tooltip, { content: "Unlink variable", side: "top", delay: 300, children: /* @__PURE__ */ jsx("span", { ref: iconRef, className: "retune-variable-action retune-variable-unlink", children: /* @__PURE__ */ jsx(UnlinkIcon, {}) }) })
    ) : (
      // Variable available: show hexagon icon on hover → opens picker
      /* @__PURE__ */ jsx(Tooltip, { content: "Add variable", side: "top", delay: 300, children: /* @__PURE__ */ jsx("span", { ref: iconRef, className: "retune-variable-action retune-variable-add", children: /* @__PURE__ */ jsx(HexagonIcon, {}) }) })
    ),
    pickerOpen && anchorRect && portalTarget && createPortal(
      /* @__PURE__ */ jsx(
        VariableDialog,
        {
          property,
          currentVariable: match?.variable,
          onSelect: handleSelect,
          onUnlink: onVariableUnlink ? () => {
            onVariableUnlink();
            handleClose();
          } : void 0,
          onClose: handleClose,
          anchorRect
        }
      ),
      portalTarget
    )
  ] });
}
function usePreviewValue(prop, inputRef) {
  const bridge = usePreviewBridge();
  const previewActiveRef = useRef(false);
  useEffect(() => {
    if (!bridge) return;
    const unsubscribe = bridge.subscribe(prop, (value) => {
      const el = inputRef.current;
      if (!el) return;
      if (value && bridge.active) {
        el.value = value;
        previewActiveRef.current = true;
      } else {
        previewActiveRef.current = false;
      }
    });
    return unsubscribe;
  }, [bridge, prop, inputRef]);
  return previewActiveRef;
}
function clampNum(val, min, max) {
  if (min !== void 0 && val < min) return min;
  if (max !== void 0 && val > max) return max;
  return val;
}
function clampCssValue(val, min, max) {
  if (min === void 0 && max === void 0) return val;
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  const clamped = clampNum(num, min, max);
  if (clamped === num) return val;
  const unit = val.match(/[a-z%]+$/i)?.[0] || "";
  return `${clamped}${unit}`;
}
function NumberInput({ label, prop, value, placeholder, onChange, min, max, step: stepProp, variableMatch, property, onVariableSelect, onVariableApply, onVariableUnlink, isChanged, onReset }) {
  const [localValue, setLocalValue] = useState(roundCssValue(value || ""));
  const labelRef = useRef(null);
  const varPickerRef = useRef(null);
  const inputRef = useRef(null);
  const previewActiveRef = usePreviewValue(prop, inputRef);
  const handleInputClick = useCallback(() => {
    if (variableMatch) varPickerRef.current?.();
  }, [variableMatch]);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!previewActiveRef.current) {
      setLocalValue(roundCssValue(value || ""));
    }
  }
  const scrubRef = useRef({ startX: 0, startVal: 0, active: false });
  const handleLabelPointerDown = (e2) => {
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    scrubRef.current = { startX: e2.clientX, startVal: num, active: true };
    e2.target.setPointerCapture(e2.pointerId);
  };
  const handleLabelPointerMove = (e2) => {
    if (!scrubRef.current.active) return;
    const pixelDelta = e2.clientX - scrubRef.current.startX;
    const baseStep = stepProp ?? 1;
    const raw = scrubRef.current.startVal + Math.round(pixelDelta) * baseStep;
    const precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0;
    const rounded = precision > 0 ? parseFloat(raw.toFixed(precision)) : raw;
    const clamped = clampNum(rounded, min, max);
    const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
    const newVal = `${clamped}${unit}`;
    setLocalValue(newVal);
    onChange(prop, newVal);
  };
  const handleLabelPointerUp = () => {
    scrubRef.current.active = false;
  };
  const SCRUB_ZONE = 16;
  const handleInputPointerDown = (e2) => {
    if (label) return;
    const rect = e2.currentTarget.getBoundingClientRect();
    if (e2.clientX - rect.left > SCRUB_ZONE) return;
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    e2.preventDefault();
    scrubRef.current = { startX: e2.clientX, startVal: num, active: true };
    e2.currentTarget.setPointerCapture(e2.pointerId);
  };
  const handleInputPointerMove = (e2) => {
    if (scrubRef.current.active) {
      const pixelDelta = e2.clientX - scrubRef.current.startX;
      const baseStep = stepProp ?? 1;
      const raw = scrubRef.current.startVal + Math.round(pixelDelta) * baseStep;
      const precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0;
      const rounded = precision > 0 ? parseFloat(raw.toFixed(precision)) : raw;
      const clamped = clampNum(rounded, min, max);
      const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
      const newVal = `${clamped}${unit}`;
      setLocalValue(newVal);
      onChange(prop, newVal);
      return;
    }
    const rect = e2.currentTarget.getBoundingClientRect();
    const inZone = e2.clientX - rect.left <= SCRUB_ZONE;
    e2.currentTarget.style.cursor = inZone ? "ew-resize" : "";
  };
  const handleInputPointerUp = () => {
    scrubRef.current.active = false;
  };
  const handleFocus = (e2) => {
    e2.target.select();
  };
  const handleChange = (e2) => {
    setLocalValue(e2.target.value);
  };
  const commitValue = (val) => {
    const resolved = clampCssValue(inferCssUnit(val, value || "", prop), min, max);
    setLocalValue(resolved);
    onChange(prop, resolved);
  };
  const handleBlur = () => {
    const resolved = clampCssValue(inferCssUnit(localValue, value || "", prop), min, max);
    if (resolved !== value) {
      commitValue(localValue);
    }
  };
  const handleKeyDown = (e2) => {
    if (e2.key === "Enter") {
      commitValue(localValue);
      e2.target.blur();
    }
    if (e2.key === "ArrowUp" || e2.key === "ArrowDown") {
      e2.preventDefault();
      const num = parseFloat(localValue);
      if (isNaN(num)) return;
      const baseStep = stepProp ?? 1;
      const step = e2.shiftKey ? baseStep * 10 : baseStep;
      const delta = e2.key === "ArrowUp" ? step : -step;
      const raw = num + delta;
      const precision = baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0;
      const rounded = precision > 0 ? parseFloat(raw.toFixed(precision)) : raw;
      const clamped = clampNum(rounded, min, max);
      const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
      const newVal = `${clamped}${unit}`;
      setLocalValue(newVal);
      onChange(prop, newVal);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: `retune-prop${variableMatch ? " retune-prop-variable-applied" : ""}`, children: [
    /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isChanged ?? false, onReset: onReset ?? (() => {
    }) }),
    label && /* @__PURE__ */ jsx(
      "span",
      {
        ref: labelRef,
        className: "retune-prop-label",
        onClick: handleInputClick,
        onPointerDown: variableMatch ? void 0 : handleLabelPointerDown,
        onPointerMove: variableMatch ? void 0 : handleLabelPointerMove,
        onPointerUp: variableMatch ? void 0 : handleLabelPointerUp,
        children: label
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: inputRef,
        className: "retune-prop-input",
        style: label ? void 0 : { paddingLeft: 8 },
        value: localValue,
        placeholder: placeholder || "\u2013",
        readOnly: !!variableMatch,
        onClick: handleInputClick,
        onPointerDown: !label && !variableMatch ? handleInputPointerDown : void 0,
        onPointerMove: !label && !variableMatch ? handleInputPointerMove : void 0,
        onPointerUp: !label && !variableMatch ? handleInputPointerUp : void 0,
        onFocus: variableMatch ? void 0 : handleFocus,
        onChange: variableMatch ? void 0 : handleChange,
        onBlur: variableMatch ? void 0 : handleBlur,
        onKeyDown: variableMatch ? void 0 : handleKeyDown,
        spellCheck: false
      }
    ),
    /* @__PURE__ */ jsx(
      VariableAction,
      {
        match: variableMatch,
        property: property || prop,
        onVariableSelect,
        onVariableApply,
        onVariableUnlink,
        openPickerRef: varPickerRef
      }
    )
  ] });
}
function I({ size = 24, children }) {
  return /* @__PURE__ */ jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children });
}
function RadiusTopLeft({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M12.4781 8L12.5 8H15.5C15.7761 8 16 8.22386 16 8.5C16 8.77614 15.7761 9 15.5 9H12.5C11.7917 9 11.2905 9.00039 10.8987 9.0324C10.5128 9.06393 10.2772 9.12365 10.092 9.21799C9.71569 9.40973 9.40973 9.71569 9.21799 10.092C9.12365 10.2772 9.06393 10.5128 9.0324 10.8987C9.00039 11.2905 9 11.7917 9 12.5V15.5C9 15.7761 8.77614 16 8.5 16C8.22386 16 8 15.7761 8 15.5V12.5L8 12.4781C8 11.7966 7.99999 11.2546 8.03572 10.8173C8.07231 10.3695 8.14884 9.98765 8.32698 9.63803C8.6146 9.07354 9.07354 8.6146 9.63803 8.32698C9.98765 8.14884 10.3695 8.07231 10.8173 8.03572C11.2546 7.99999 11.7966 8 12.4781 8Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function RadiusTopRight({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M11.5219 8L11.5 8H8.5C8.22386 8 8 8.22386 8 8.5C8 8.77614 8.22386 9 8.5 9H11.5C12.2083 9 12.7095 9.00039 13.1013 9.0324C13.4872 9.06393 13.7228 9.12365 13.908 9.21799C14.2843 9.40973 14.5903 9.71569 14.782 10.092C14.8764 10.2772 14.9361 10.5128 14.9676 10.8987C14.9996 11.2905 15 11.7917 15 12.5V15.5C15 15.7761 15.2239 16 15.5 16C15.7761 16 16 15.7761 16 15.5V12.5V12.4781C16 11.7966 16 11.2546 15.9643 10.8173C15.9277 10.3695 15.8512 9.98765 15.673 9.63803C15.3854 9.07354 14.9265 8.6146 14.362 8.32698C14.0123 8.14884 13.6305 8.07231 13.1827 8.03572C12.7454 7.99999 12.2034 8 11.5219 8Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function RadiusBottomLeft({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M12.4781 16H12.5H15.5C15.7761 16 16 15.7761 16 15.5C16 15.2239 15.7761 15 15.5 15H12.5C11.7917 15 11.2905 14.9996 10.8987 14.9676C10.5128 14.9361 10.2772 14.8764 10.092 14.782C9.71569 14.5903 9.40973 14.2843 9.21799 13.908C9.12365 13.7228 9.06393 13.4872 9.0324 13.1013C9.00039 12.7095 9 12.2083 9 11.5V8.5C9 8.22386 8.77614 8 8.5 8C8.22386 8 8 8.22386 8 8.5V11.5L8 11.5219C8 12.2034 7.99999 12.7454 8.03572 13.1827C8.07231 13.6305 8.14884 14.0123 8.32698 14.362C8.6146 14.9265 9.07354 15.3854 9.63803 15.673C9.98765 15.8512 10.3695 15.9277 10.8173 15.9643C11.2546 16 11.7966 16 12.4781 16Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function RadiusBottomRight({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M11.5219 16H11.5H8.5C8.22386 16 8 15.7761 8 15.5C8 15.2239 8.22386 15 8.5 15H11.5C12.2083 15 12.7095 14.9996 13.1013 14.9676C13.4872 14.9361 13.7228 14.8764 13.908 14.782C14.2843 14.5903 14.5903 14.2843 14.782 13.908C14.8764 13.7228 14.9361 13.4872 14.9676 13.1013C14.9996 12.7095 15 12.2083 15 11.5V8.5C15 8.22386 15.2239 8 15.5 8C15.7761 8 16 8.22386 16 8.5V11.5V11.5219C16 12.2034 16 12.7454 15.9643 13.1827C15.9277 13.6305 15.8512 14.0123 15.673 14.362C15.3854 14.9265 14.9265 15.3854 14.362 15.673C14.0123 15.8512 13.6305 15.9277 13.1827 15.9643C12.7454 16 12.2034 16 11.5219 16Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlPaddingHorizontal({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 7.5C8 7.22386 7.77614 7 7.5 7C7.22386 7 7 7.22386 7 7.5V16.5C7 16.7761 7.22386 17 7.5 17C7.77614 17 8 16.7761 8 16.5V7.5ZM16.5 7C16.7761 7 17 7.22386 17 7.5V16.5C17 16.7761 16.7761 17 16.5 17C16.2239 17 16 16.7761 16 16.5V7.5C16 7.22386 16.2239 7 16.5 7ZM13 13V11H11V13H13ZM14 11C14 10.4477 13.5523 10 13 10H11C10.4477 10 10 10.4477 10 11V13C10 13.5523 10.4477 14 11 14H13C13.5523 14 14 13.5523 14 13V11Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlPaddingVertical({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M7.5 16C7.22386 16 7 16.2239 7 16.5C7 16.7761 7.22386 17 7.5 17H16.5C16.7761 17 17 16.7761 17 16.5C17 16.2239 16.7761 16 16.5 16H7.5ZM7 7.5C7 7.22385 7.22386 7 7.5 7H16.5C16.7761 7 17 7.22385 17 7.5C17 7.77615 16.7761 8 16.5 8H7.5C7.22386 8 7 7.77615 7 7.5ZM13 11H11V13H13V11ZM11 10C10.4477 10 10 10.4477 10 11V13C10 13.5523 10.4477 14 11 14H13C13.5523 14 14 13.5523 14 13V11C14 10.4477 13.5523 10 13 10H11Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlPaddingTop({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M7.5 7C7.22386 7 7 7.22385 7 7.5C7 7.77615 7.22386 8 7.5 8H16.5C16.7761 8 17 7.77615 17 7.5C17 7.22385 16.7761 7 16.5 7L7.5 7ZM11 11H13V13H11V11ZM10 11C10 10.4477 10.4477 10 11 10H13C13.5523 10 14 10.4477 14 11V13C14 13.5523 13.5523 14 13 14H11C10.4477 14 10 13.5523 10 13V11Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlPaddingBottom({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M11 11H13V13H11V11ZM10 11C10 10.4477 10.4477 10 11 10H13C13.5523 10 14 10.4477 14 11V13C14 13.5523 13.5523 14 13 14H11C10.4477 14 10 13.5523 10 13V11ZM7.5 16C7.22386 16 7 16.2239 7 16.5C7 16.7761 7.22386 17 7.5 17H16.5C16.7761 17 17 16.7761 17 16.5C17 16.2239 16.7761 16 16.5 16H7.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlPaddingLeft({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 7.5C8 7.22386 7.77614 7 7.5 7C7.22386 7 7 7.22386 7 7.5V16.5C7 16.7761 7.22386 17 7.5 17C7.77614 17 8 16.7761 8 16.5V7.5ZM13 11V13H11V11H13ZM13 10C13.5523 10 14 10.4477 14 11V13C14 13.5523 13.5523 14 13 14H11C10.4477 14 10 13.5523 10 13V11C10 10.4477 10.4477 10 11 10H13Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlPaddingRight({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M17 7.5C17 7.22386 16.7761 7 16.5 7C16.2239 7 16 7.22386 16 7.5V16.5C16 16.7761 16.2239 17 16.5 17C16.7761 17 17 16.7761 17 16.5V7.5ZM13 11V13H11V11H13ZM13 10C13.5523 10 14 10.4477 14 11V13C14 13.5523 13.5523 14 13 14H11C10.4477 14 10 13.5523 10 13V11C10 10.4477 10.4477 10 11 10H13Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlPaddingSides({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 9.5C8 9.22385 7.77614 9 7.5 9C7.22386 9 7 9.22385 7 9.5L7 14.5C7 14.7761 7.22386 15 7.5 15C7.77614 15 8 14.7761 8 14.5V9.5ZM17 9.5C17 9.22385 16.7761 9 16.5 9C16.2239 9 16 9.22385 16 9.5V14.5C16 14.7761 16.2239 15 16.5 15C16.7761 15 17 14.7761 17 14.5V9.5ZM9 7.5C9 7.22385 9.22386 7 9.5 7H14.5C14.7761 7 15 7.22385 15 7.5C15 7.77615 14.7761 8 14.5 8H9.5C9.22386 8 9 7.77615 9 7.5ZM9.5 16C9.22386 16 9 16.2239 9 16.5C9 16.7761 9.22386 17 9.5 17H14.5C14.7761 17 15 16.7761 15 16.5C15 16.2239 14.7761 16 14.5 16H9.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlSpacingHorizontal({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M7 15.5C7 15.2239 7.22386 15 7.5 15H7.75C7.88807 15 8 14.8881 8 14.75V8.25C8 8.11193 7.88807 8 7.75 8H7.5C7.22386 8 7 7.77614 7 7.5C7 7.22386 7.22386 7 7.5 7H7.75C8.44036 7 9 7.55964 9 8.25V14.75C9 15.4404 8.44036 16 7.75 16H7.5C7.22386 16 7 15.7761 7 15.5ZM15 14.7502C15 14.8883 15.1119 15.0002 15.25 15.0002H15.5C15.7761 15.0002 16 15.2241 16 15.5002C16 15.7764 15.7761 16.0002 15.5 16.0002H15.25C14.5596 16.0002 14 15.4406 14 14.7502V8.25012C14 7.55977 14.5596 7.00012 15.25 7.00012H15.5C15.7761 7.00012 16 7.22398 16 7.50012C16 7.77626 15.7761 8.00012 15.5 8.00012H15.25C15.1119 8.00012 15 8.11205 15 8.25012V14.7502ZM11 13.5C11 13.7761 11.2239 14 11.5 14C11.7761 14 12 13.7761 12 13.5V9.5C12 9.22386 11.7761 9 11.5 9C11.2239 9 11 9.22386 11 9.5V13.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AlSpacingVertical({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M7.5 7C7.77614 7 8 7.22386 8 7.5V7.75C8 7.88807 8.11193 8 8.25 8H14.75C14.8881 8 15 7.88807 15 7.75V7.5C15 7.22386 15.2239 7 15.5 7C15.7761 7 16 7.22386 16 7.5V7.75C16 8.44036 15.4404 9 14.75 9H8.25C7.55964 9 7 8.44036 7 7.75V7.5C7 7.22386 7.22386 7 7.5 7ZM8.25 15C8.11193 15 8 15.1119 8 15.25V15.5C8 15.7761 7.77614 16 7.5 16C7.22386 16 7 15.7761 7 15.5V15.25C7 14.5596 7.55964 14 8.25 14H14.7501C15.4405 14 16.0001 14.5596 16.0001 15.25V15.5C16.0001 15.7761 15.7763 16 15.5001 16C15.224 16 15.0001 15.7761 15.0001 15.5V15.25C15.0001 15.1119 14.8882 15 14.7501 15H8.25ZM9.5 11C9.22386 11 9 11.2239 9 11.5C9 11.7761 9.22386 12 9.5 12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H9.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function LayoutAlignLeft({ size }) {
  return /* @__PURE__ */ jsxs(I, { size, children: [
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M17.25 10C17.6642 10 18 9.66421 18 9.25V8.75C18 8.33579 17.6642 8 17.25 8H8.75C8.33579 8 8 8.33579 8 8.75V9.25C8 9.66421 8.33579 10 8.75 10H17.25ZM13.25 15C13.6642 15 14 14.6642 14 14.25V13.75C14 13.3358 13.6642 13 13.25 13H8.75C8.33579 13 8 13.3358 8 13.75V14.25C8 14.6642 8.33579 15 8.75 15H13.25Z", fill: "currentColor", fillOpacity: 0.9 }),
    /* @__PURE__ */ jsx("path", { d: "M6 17.5C6 17.7761 5.77614 18 5.5 18C5.22386 18 5 17.7761 5 17.5V5.5C5 5.22386 5.22386 5 5.5 5C5.77614 5 6 5.22386 6 5.5V17.5Z", fill: "currentColor", fillOpacity: 0.3 })
  ] });
}
function LayoutAlignRight({ size }) {
  return /* @__PURE__ */ jsxs(I, { size, children: [
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M6.75 10C6.33579 10 6 9.66421 6 9.25V8.75C6 8.33579 6.33579 8 6.75 8H15.25C15.6642 8 16 8.33579 16 8.75V9.25C16 9.66421 15.6642 10 15.25 10H6.75ZM10.75 15C10.3358 15 10 14.6642 10 14.25V13.75C10 13.3358 10.3358 13 10.75 13H15.25C15.6642 13 16 13.3358 16 13.75V14.25C16 14.6642 15.6642 15 15.25 15H10.75Z", fill: "currentColor", fillOpacity: 0.9 }),
    /* @__PURE__ */ jsx("path", { d: "M18 17.5C18 17.7761 18.2239 18 18.5 18C18.7761 18 19 17.7761 19 17.5V5.5C19 5.22386 18.7761 5 18.5 5C18.2239 5 18 5.22386 18 5.5V17.5Z", fill: "currentColor", fillOpacity: 0.3 })
  ] });
}
function LayoutAlignHorizontalCenter({ size }) {
  return /* @__PURE__ */ jsxs(I, { size, children: [
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M17.25 10C17.6642 10 18 9.66421 18 9.25V8.75C18 8.33579 17.6642 8 17.25 8H7.75C7.33579 8 7 8.33579 7 8.75V9.25C7 9.66421 7.33579 10 7.75 10H17.25ZM15.25 15C15.6642 15 16 14.6642 16 14.25V13.75C16 13.3358 15.6642 13 15.25 13H9.75C9.33579 13 9 13.3358 9 13.75V14.25C9 14.6642 9.33579 15 9.75 15H15.25Z", fill: "currentColor", fillOpacity: 0.9 }),
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M13 17.5C13 17.7761 12.7761 18 12.5 18C12.2239 18 12 17.7761 12 17.5V15H13V17.5ZM13 13V10H12V13H13ZM13 5.5V8H12V5.5C12 5.22386 12.2239 5 12.5 5C12.7761 5 13 5.22386 13 5.5Z", fill: "currentColor", fillOpacity: 0.3 })
  ] });
}
function LayoutAlignTop({ size }) {
  return /* @__PURE__ */ jsxs(I, { size, children: [
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M10 17.25C10 17.6642 9.66421 18 9.25 18H8.75C8.33579 18 8 17.6642 8 17.25L8 8.75C8 8.33579 8.33579 8 8.75 8H9.25C9.66421 8 10 8.33579 10 8.75V17.25ZM15 13.25C15 13.6642 14.6642 14 14.25 14H13.75C13.3358 14 13 13.6642 13 13.25V8.75C13 8.33579 13.3358 8 13.75 8H14.25C14.6642 8 15 8.33579 15 8.75V13.25Z", fill: "currentColor", fillOpacity: 0.9 }),
    /* @__PURE__ */ jsx("path", { d: "M17.5 6C17.7761 6 18 5.77614 18 5.5C18 5.22386 17.7761 5 17.5 5L5.5 5C5.22386 5 5 5.22386 5 5.5C5 5.77614 5.22386 6 5.5 6L17.5 6Z", fill: "currentColor", fillOpacity: 0.3 })
  ] });
}
function LayoutAlignBottom({ size }) {
  return /* @__PURE__ */ jsxs(I, { size, children: [
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M10 6.75C10 6.33579 9.66421 6 9.25 6H8.75C8.33579 6 8 6.33579 8 6.75L8 15.25C8 15.6642 8.33579 16 8.75 16H9.25C9.66421 16 10 15.6642 10 15.25V6.75ZM15 10.75C15 10.3358 14.6642 10 14.25 10H13.75C13.3358 10 13 10.3358 13 10.75V15.25C13 15.6642 13.3358 16 13.75 16H14.25C14.6642 16 15 15.6642 15 15.25V10.75Z", fill: "currentColor", fillOpacity: 0.9 }),
    /* @__PURE__ */ jsx("path", { d: "M17.5 18C17.7761 18 18 18.2239 18 18.5C18 18.7761 17.7761 19 17.5 19H5.5C5.22386 19 5 18.7761 5 18.5C5 18.2239 5.22386 18 5.5 18H17.5Z", fill: "currentColor", fillOpacity: 0.3 })
  ] });
}
function LayoutAlignVerticalCenter({ size }) {
  return /* @__PURE__ */ jsxs(I, { size, children: [
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M10 6.75C10 6.33579 9.66421 6 9.25 6H8.75C8.33579 6 8 6.33579 8 6.75V16.25C8 16.6642 8.33579 17 8.75 17H9.25C9.66421 17 10 16.6642 10 16.25V6.75ZM15 8.75C15 8.33579 14.6642 8 14.25 8H13.75C13.3358 8 13 8.33579 13 8.75V14.25C13 14.6642 13.3358 15 13.75 15H14.25C14.6642 15 15 14.6642 15 14.25V8.75Z", fill: "currentColor", fillOpacity: 0.9 }),
    /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M17.5 11C17.7761 11 18 11.2239 18 11.5C18 11.7761 17.7761 12 17.5 12H15V11H17.5ZM13 11H10V12H13V11ZM5.5 11H8V12H5.5C5.22386 12 5 11.7761 5 11.5C5 11.2239 5.22386 11 5.5 11Z", fill: "currentColor", fillOpacity: 0.3 })
  ] });
}
function TextAlignLeft({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M5 7.5C5 7.22386 5.22386 7 5.5 7H18.5C18.7761 7 19 7.22386 19 7.5C19 7.77614 18.7761 8 18.5 8H5.5C5.22386 8 5 7.77614 5 7.5ZM5 11.5C5 11.2239 5.22386 11 5.5 11H12.5C12.7761 11 13 11.2239 13 11.5C13 11.7761 12.7761 12 12.5 12H5.5C5.22386 12 5 11.7761 5 11.5ZM5.5 15C5.22386 15 5 15.2239 5 15.5C5 15.7761 5.22386 16 5.5 16H14.5C14.7761 16 15 15.7761 15 15.5C15 15.2239 14.7761 15 14.5 15H5.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function TextAlignCenter({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M5 7.5C5 7.22386 5.22386 7 5.5 7H18.5C18.7761 7 19 7.22386 19 7.5C19 7.77614 18.7761 8 18.5 8H5.5C5.22386 8 5 7.77614 5 7.5ZM8 11.5C8 11.2239 8.22386 11 8.5 11H15.5C15.7761 11 16 11.2239 16 11.5C16 11.7761 15.7761 12 15.5 12H8.5C8.22386 12 8 11.7761 8 11.5ZM7.5 15C7.22386 15 7 15.2239 7 15.5C7 15.7761 7.22386 16 7.5 16H16.5C16.7761 16 17 15.7761 17 15.5C17 15.2239 16.7761 15 16.5 15H7.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function TextAlignRight({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M19 7.5C19 7.22386 18.7761 7 18.5 7H5.5C5.22386 7 5 7.22386 5 7.5C5 7.77614 5.22386 8 5.5 8H18.5C18.7761 8 19 7.77614 19 7.5ZM19 11.5C19 11.2239 18.7761 11 18.5 11H11.5C11.2239 11 11 11.2239 11 11.5C11 11.7761 11.2239 12 11.5 12H18.5C18.7761 12 19 11.7761 19 11.5ZM18.5 15C18.7761 15 19 15.2239 19 15.5C19 15.7761 18.7761 16 18.5 16H9.5C9.22386 16 9 15.7761 9 15.5C9 15.2239 9.22386 15 9.5 15H18.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function TextAlignTop({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M5.5 5C5.22386 5 5 5.22386 5 5.5C5 5.77614 5.22386 6 5.5 6H17.5C17.7761 6 18 5.77614 18 5.5C18 5.22386 17.7761 5 17.5 5H5.5ZM11.8536 7.14645C11.6583 6.95118 11.3417 6.95118 11.1464 7.14645L8.14645 10.1464C7.95118 10.3417 7.95118 10.6583 8.14645 10.8536C8.34171 11.0488 8.65829 11.0488 8.85355 10.8536L11 8.70711V16.5C11 16.7761 11.2239 17 11.5 17C11.7761 17 12 16.7761 12 16.5V8.70711L14.1464 10.8536C14.3417 11.0488 14.6583 11.0488 14.8536 10.8536C15.0488 10.6583 15.0488 10.3417 14.8536 10.1464L11.8536 7.14645Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function TextAlignMiddle({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M11.8536 9.85355L13.8536 7.85355C14.0488 7.65829 14.0488 7.34171 13.8536 7.14645C13.6583 6.95118 13.3417 6.95118 13.1464 7.14645L12 8.29289V4.5C12 4.22386 11.7761 4 11.5 4C11.2239 4 11 4.22386 11 4.5V8.29289L9.85355 7.14645C9.65829 6.95118 9.34171 6.95118 9.14645 7.14645C8.95118 7.34171 8.95118 7.65829 9.14645 7.85355L11.1464 9.85355C11.3417 10.0488 11.6583 10.0488 11.8536 9.85355ZM11.8536 13.1464L13.8536 15.1464C14.0488 15.3417 14.0488 15.6583 13.8536 15.8536C13.6583 16.0488 13.3417 16.0488 13.1464 15.8536L12 14.7071V18.5C12 18.7761 11.7761 19 11.5 19C11.2239 19 11 18.7761 11 18.5V14.7071L9.85355 15.8536C9.65829 16.0488 9.34171 16.0488 9.14645 15.8536C8.95118 15.6583 8.95118 15.3417 9.14645 15.1464L11.1464 13.1464C11.3417 12.9512 11.6583 12.9512 11.8536 13.1464ZM5.5 11C5.22386 11 5 11.2239 5 11.5C5 11.7761 5.22386 12 5.5 12H17.5C17.7761 12 18 11.7761 18 11.5C18 11.2239 17.7761 11 17.5 11H5.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function TextAlignBottom({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M14.8536 13.8536L11.8536 16.8536C11.6583 17.0488 11.3417 17.0488 11.1464 16.8536L8.14645 13.8536C7.95118 13.6583 7.95118 13.3417 8.14645 13.1464C8.34171 12.9512 8.65829 12.9512 8.85355 13.1464L11 15.2929V7.5C11 7.22386 11.2239 7 11.5 7C11.7761 7 12 7.22386 12 7.5V15.2929L14.1464 13.1464C14.3417 12.9512 14.6583 12.9512 14.8536 13.1464C15.0488 13.3417 15.0488 13.6583 14.8536 13.8536ZM5.5 19C5.22386 19 5 18.7761 5 18.5C5 18.2239 5.22386 18 5.5 18H17.5C17.7761 18 18 18.2239 18 18.5C18 18.7761 17.7761 19 17.5 19H5.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function RectangleSmall({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M16.5 7H7.5C7.22386 7 7 7.22386 7 7.5V16.5C7 16.7761 7.22386 17 7.5 17H16.5C16.7761 17 17 16.7761 17 16.5V7.5C17 7.22386 16.7761 7 16.5 7ZM7.5 6C6.67157 6 6 6.67157 6 7.5V16.5C6 17.3284 6.67157 18 7.5 18H16.5C17.3284 18 18 17.3284 18 16.5V7.5C18 6.67157 17.3284 6 16.5 6H7.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AutolayoutAddHorizontal({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { d: "M9.2998 18C10.1282 18 10.7998 17.3284 10.7998 16.5L10.7998 7.5C10.7998 6.67157 10.1282 6 9.2998 6H7.5L7.34668 6.00781C6.59028 6.08461 6 6.72334 6 7.5L6 16.5C6 17.3284 6.67157 18 7.5 18H9.2998ZM16.5 18C17.3283 17.9998 18 17.3283 18 16.5V7.5C18 6.67167 17.3283 6.00015 16.5 6H14.7002L14.5469 6.00781C13.7905 6.08461 13.2002 6.72334 13.2002 7.5L13.2002 16.5C13.2002 17.3284 13.8718 18 14.7002 18H16.5ZM7.5 17C7.22386 17 7 16.7761 7 16.5L7 7.5C7 7.22386 7.22386 7 7.5 7H9.2998C9.57595 7 9.7998 7.22386 9.7998 7.5L9.7998 16.5C9.7998 16.7761 9.57595 17 9.2998 17H7.5ZM14.7002 17C14.4241 17 14.2002 16.7761 14.2002 16.5L14.2002 7.5C14.2002 7.22386 14.4241 7 14.7002 7H16.5C16.776 7.00015 17 7.22395 17 7.5V16.5C17 16.7761 16.776 16.9998 16.5 17H14.7002Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function AutolayoutAddVertical({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { d: "M6 9.2998C6 10.1282 6.67157 10.7998 7.5 10.7998L16.5 10.7998C17.3284 10.7998 18 10.1282 18 9.29981L18 7.5L17.9922 7.34668C17.9154 6.59028 17.2767 6 16.5 6L7.5 6C6.67157 6 6 6.67157 6 7.5L6 9.2998ZM6 16.5C6.00015 17.3283 6.67167 18 7.5 18L16.5 18C17.3283 18 17.9998 17.3283 18 16.5L18 14.7002L17.9922 14.5469C17.9154 13.7905 17.2767 13.2002 16.5 13.2002L7.5 13.2002C6.67157 13.2002 6 13.8718 6 14.7002L6 16.5ZM7 7.5C7 7.22386 7.22386 7 7.5 7L16.5 7C16.7761 7 17 7.22386 17 7.5L17 9.29981C17 9.57595 16.7761 9.79981 16.5 9.79981L7.5 9.7998C7.22386 9.7998 7 9.57595 7 9.2998L7 7.5ZM7 14.7002C7 14.4241 7.22386 14.2002 7.5 14.2002L16.5 14.2002C16.7761 14.2002 17 14.4241 17 14.7002L17 16.5C16.9998 16.776 16.776 17 16.5 17L7.5 17C7.22395 17 7.00015 16.776 7 16.5L7 14.7002Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function GridView({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M7 7H10V10H7V7ZM6 7C6 6.44771 6.44771 6 7 6H10C10.5523 6 11 6.44771 11 7V10C11 10.5523 10.5523 11 10 11H7C6.44771 11 6 10.5523 6 10V7ZM7 14H10V17H7V14ZM6 14C6 13.4477 6.44771 13 7 13H10C10.5523 13 11 13.4477 11 14V17C11 17.5523 10.5523 18 10 18H7C6.44771 18 6 17.5523 6 17V14ZM17 7H14V10H17V7ZM14 6C13.4477 6 13 6.44771 13 7V10C13 10.5523 13.4477 11 14 11H17C17.5523 11 18 10.5523 18 10V7C18 6.44771 17.5523 6 17 6H14ZM14 14H17V17H14V14ZM13 14C13 13.4477 13.4477 13 14 13H17C17.5523 13 18 13.4477 18 14V17C18 17.5523 17.5523 18 17 18H14C13.4477 18 13 17.5523 13 17V14Z", fill: "currentColor" }) });
}
function AdjustSmall({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 5.5C8 5.22386 8.22386 5 8.5 5C8.77614 5 9 5.22386 9 5.5V12.05C10.1411 12.2816 11 13.2905 11 14.5C11 15.7095 10.1411 16.7184 9 16.95V18.5C9 18.7761 8.77614 19 8.5 19C8.22386 19 8 18.7761 8 18.5V16.95C6.85888 16.7184 6 15.7095 6 14.5C6 13.2905 6.85888 12.2816 8 12.05V5.5ZM7 14.5C7 13.6716 7.67157 13 8.5 13C9.32843 13 10 13.6716 10 14.5C10 15.3284 9.32843 16 8.5 16C7.67157 16 7 15.3284 7 14.5ZM15 18.5C15 18.7761 15.2239 19 15.5 19C15.7761 19 16 18.7761 16 18.5V11.95C17.1411 11.7184 18 10.7095 18 9.5C18 8.29052 17.1411 7.28164 16 7.05001V5.5C16 5.22386 15.7761 5 15.5 5C15.2239 5 15 5.22386 15 5.5V7.05001C13.8589 7.28164 13 8.29052 13 9.5C13 10.7095 13.8589 11.7184 15 11.95V18.5ZM14 9.5C14 10.3284 14.6716 11 15.5 11C16.3284 11 17 10.3284 17 9.5C17 8.67157 16.3284 8 15.5 8C14.6716 8 14 8.67157 14 9.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function Check({ size = 16 }) {
  return /* @__PURE__ */ jsx("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsx("path", { d: "M11.0839 4.22268C11.2371 3.99294 11.5475 3.93087 11.7773 4.08401C12.007 4.23718 12.0691 4.5476 11.916 4.77737L7.91596 10.7774C7.83287 10.902 7.69784 10.9833 7.54877 10.9981C7.39988 11.0127 7.25223 10.9593 7.14643 10.8535L4.14643 7.85354C3.9512 7.65827 3.95118 7.34176 4.14643 7.14651C4.34168 6.95126 4.6582 6.95128 4.85346 7.14651L7.42182 9.71487L11.0839 4.22268Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function ChevronDown({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M9.64645 11.1464C9.84171 10.9512 10.1583 10.9512 10.3536 11.1464L12 12.7929L13.6464 11.1464C13.8417 10.9512 14.1583 10.9512 14.3536 11.1464C14.5488 11.3417 14.5488 11.6583 14.3536 11.8536L12.3536 13.8536C12.1583 14.0488 11.8417 14.0488 11.6464 13.8536L9.64645 11.8536C9.45118 11.6583 9.45118 11.3417 9.64645 11.1464Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function ChevronUp({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M11.6464 10.1464C11.8417 9.95118 12.1583 9.95118 12.3536 10.1464L14.3536 12.1464C14.5488 12.3417 14.5488 12.6583 14.3536 12.8536C14.1583 13.0488 13.8417 13.0488 13.6464 12.8536L12 11.2071L10.3536 12.8536C10.1583 13.0488 9.84171 13.0488 9.64645 12.8535C9.45118 12.6583 9.45118 12.3417 9.64645 12.1464L11.6464 10.1464Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function Plus({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M12 6C12.2761 6 12.5 6.22386 12.5 6.5V11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H12.5V17.5C12.5 17.7761 12.2761 18 12 18C11.7239 18 11.5 17.7761 11.5 17.5V12.5H6.5C6.22386 12.5 6 12.2761 6 12C6 11.7239 6.22386 11.5 6.5 11.5H11.5V6.5C11.5 6.22386 11.7239 6 12 6Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function Minus({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M6 12C6 11.7239 6.22386 11.5 6.5 11.5H17.5C17.7761 11.5 18 11.7239 18 12C18 12.2761 17.7761 12.5 17.5 12.5H6.5C6.22386 12.5 6 12.2761 6 12Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function FlipHorizontalSmall({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M12.5 6.5C12.5 6.22386 12.2761 6 12 6C11.7239 6 11.5 6.22386 11.5 6.5V17.5C11.5 17.7761 11.7239 18 12 18C12.2761 18 12.5 17.7761 12.5 17.5V6.5ZM6 9.10355C6 8.43538 6.80786 8.10075 7.28033 8.57323L10 11.2929C10.3905 11.6834 10.3905 12.3166 10 12.7071L7.28033 15.4268C6.80785 15.8993 6 15.5646 6 14.8965V9.10355ZM7 14.2929L9.29289 12L7 9.70711V14.2929ZM18 9.10355C18 8.43538 17.1921 8.10075 16.7197 8.57323L14 11.2929C13.6095 11.6834 13.6095 12.3166 14 12.7071L16.7197 15.4268C17.1922 15.8993 18 15.5646 18 14.8965V9.10355ZM17 14.2929L14.7071 12L17 9.70711V14.2929Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function ListView({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M6 7C6 6.44772 6.44772 6 7 6C7.55228 6 8 6.44772 8 7C8 7.55228 7.55228 8 7 8C6.44772 8 6 7.55228 6 7ZM10.5 6.5C10.2239 6.5 10 6.72386 10 7C10 7.27614 10.2239 7.5 10.5 7.5H17.5C17.7761 7.5 18 7.27614 18 7C18 6.72386 17.7761 6.5 17.5 6.5H10.5ZM10.5 16.5C10.2239 16.5 10 16.7239 10 17C10 17.2761 10.2239 17.5 10.5 17.5H17.5C17.7761 17.5 18 17.2761 18 17C18 16.7239 17.7761 16.5 17.5 16.5H10.5ZM10.5 11.5C10.2239 11.5 10 11.7239 10 12C10 12.2761 10.2239 12.5 10.5 12.5H17.5C17.7761 12.5 18 12.2761 18 12C18 11.7239 17.7761 11.5 17.5 11.5H10.5ZM6 12C6 11.4477 6.44772 11 7 11C7.55228 11 8 11.4477 8 12C8 12.5523 7.55228 13 7 13C6.44772 13 6 12.5523 6 12ZM7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18C7.55228 18 8 17.5523 8 17C8 16.4477 7.55228 16 7 16Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function NumberList({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M11 7C11 6.72386 11.2238 6.5 11.5 6.5H17.5C17.7761 6.5 18 6.72386 18 7C18 7.27614 17.7761 7.5 17.5 7.5H11.5C11.2238 7.5 11 7.27614 11 7ZM6 7.00001C6 6.72387 6.22386 6.50001 6.5 6.50001H7.5C7.77614 6.50001 8 6.72387 8 7.00001V10.5C8 10.7762 7.77614 11 7.5 11C7.22386 11 7 10.7762 7 10.5V7.50001H6.5C6.22386 7.50001 6 7.27616 6 7.00001ZM6 13.5C6 13.2239 6.22386 13 6.5 13H8.5C8.77614 13 9 13.2239 9 13.5V15C9 15.1894 8.893 15.3625 8.72361 15.4472L7 16.309V16.5H8.5C8.77614 16.5 9 16.7239 9 17C9 17.2762 8.77614 17.5 8.5 17.5H6.5C6.22386 17.5 6 17.2762 6 17V16C6 15.8106 6.107 15.6375 6.27639 15.5528L8 14.691V14H6.5C6.22386 14 6 13.7762 6 13.5ZM11.5 16.5C11.2238 16.5 11 16.7239 11 17C11 17.2761 11.2238 17.5 11.5 17.5H17.5C17.7761 17.5 18 17.2761 18 17C18 16.7239 17.7761 16.5 17.5 16.5H11.5ZM11.5 11.5C11.2238 11.5 11 11.7239 11 12C11 12.2761 11.2238 12.5 11.5 12.5H17.5C17.7761 12.5 18 12.2761 18 12C18 11.7239 17.7761 11.5 17.5 11.5H11.5Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
function Rotate({ size }) {
  return /* @__PURE__ */ jsx(I, { size, children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M10.2322 6.47491C11.2085 5.4986 12.7915 5.4986 13.7678 6.47491L15.2929 8.00003H14C13.7239 8.00003 13.5 8.22389 13.5 8.50003C13.5 8.77618 13.7239 9.00003 14 9.00003H16.5C16.7761 9.00003 17 8.77618 17 8.50003V6.00003C17 5.72389 16.7761 5.50003 16.5 5.50003C16.2239 5.50003 16 5.72389 16 6.00003V7.29293L14.4749 5.7678C13.108 4.40097 10.892 4.40097 9.52513 5.7678L7.14645 8.14648C6.95118 8.34174 6.95118 8.65833 7.14645 8.85359C7.34171 9.04885 7.65829 9.04885 7.85355 8.85359L10.2322 6.47491ZM13.0607 9.64648C12.4749 9.0607 11.5251 9.06069 10.9393 9.64648L7.64645 12.9394C7.06066 13.5252 7.06066 14.4749 7.64645 15.0607L10.9393 18.3536C11.5251 18.9394 12.4749 18.9394 13.0607 18.3536L16.3536 15.0607C16.9393 14.4749 16.9393 13.5252 16.3536 12.9394L13.0607 9.64648ZM11.6464 10.3536C11.8417 10.1583 12.1583 10.1583 12.3536 10.3536L15.6464 13.6465C15.8417 13.8417 15.8417 14.1583 15.6464 14.3536L12.3536 17.6465C12.1583 17.8417 11.8417 17.8417 11.6464 17.6465L8.35355 14.3536C8.15829 14.1583 8.15829 13.8417 8.35355 13.6465L11.6464 10.3536Z", fill: "currentColor", fillOpacity: 0.9 }) });
}
var SCROLL_SPEED = 150;
var CheckIcon = () => /* @__PURE__ */ jsx(Check, { size: 16 });
var ChevronUpIcon = () => /* @__PURE__ */ jsx(ChevronUp, { size: 20 });
var ChevronDownIcon = () => /* @__PURE__ */ jsx(ChevronDown, { size: 20 });
var DropdownMenu = forwardRef(
  ({
    options,
    value,
    highlightedIndex = -1,
    onSelect,
    onHighlight,
    onItemHover,
    showCheckmark = true,
    style,
    minWidth,
    initialScrollTop,
    renderLabel
  }, ref) => {
    const internalRef = useRef(null);
    const rafRef = useRef(0);
    const directionRef = useRef(null);
    const [showTop, setShowTop] = useState(false);
    const [showBottom, setShowBottom] = useState(false);
    const [internalHighlight, setInternalHighlight] = useState(-1);
    const activeHighlight = onHighlight ? highlightedIndex : internalHighlight;
    const handleHighlight = onHighlight ?? setInternalHighlight;
    const setRefs = useCallback(
      (node) => {
        internalRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref)
          ref.current = node;
      },
      [ref]
    );
    const stopScrolling = useCallback(() => {
      directionRef.current = null;
      cancelAnimationFrame(rafRef.current);
    }, []);
    const updateOverflow = useCallback(() => {
      const el = internalRef.current;
      if (!el) return;
      const newShowTop = el.scrollTop > 1;
      const newShowBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      if (!newShowTop && directionRef.current === "up") stopScrolling();
      if (!newShowBottom && directionRef.current === "down") stopScrolling();
      setShowTop(newShowTop);
      setShowBottom(newShowBottom);
    }, [stopScrolling]);
    const startScrolling = useCallback((direction) => {
      directionRef.current = direction;
      let lastTime = performance.now();
      const tick = (now) => {
        const dt = Math.min((now - lastTime) / 1e3, 0.05);
        lastTime = now;
        const el = internalRef.current;
        if (!el || !directionRef.current) return;
        el.scrollTop += (directionRef.current === "down" ? 1 : -1) * SCROLL_SPEED * dt;
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, []);
    useLayoutEffect(() => {
      if (initialScrollTop != null && initialScrollTop > 0 && internalRef.current) {
        internalRef.current.scrollTop = initialScrollTop;
      }
      updateOverflow();
    }, [options.length, updateOverflow, initialScrollTop]);
    useEffect(() => {
      return () => cancelAnimationFrame(rafRef.current);
    }, []);
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: "retune-menu-wrapper",
        style: { minWidth, ...style },
        children: [
          /* @__PURE__ */ jsxs(
            "div",
            {
              ref: setRefs,
              className: "retune-menu-scroll",
              role: "listbox",
              "aria-label": "Options",
              onScroll: updateOverflow,
              children: [
                options.map((option, index2) => {
                  const isSelected = value === option.value;
                  const isHighlighted = activeHighlight === index2;
                  return /* @__PURE__ */ jsxs(Fragment, { children: [
                    option.separatorBefore && /* @__PURE__ */ jsx("div", { className: "retune-menu-separator", children: /* @__PURE__ */ jsx("div", { className: "retune-menu-separator-line" }) }),
                    option.headingBefore && /* @__PURE__ */ jsx("div", { className: "retune-menu-heading", children: option.headingBefore }),
                    /* @__PURE__ */ jsx("div", { className: "retune-menu-item-wrap", children: /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => onSelect(option),
                        onMouseEnter: () => {
                          handleHighlight(index2);
                          onItemHover?.(option);
                        },
                        onMouseLeave: () => {
                          handleHighlight(-1);
                          onItemHover?.(null);
                        },
                        disabled: option.disabled,
                        className: "retune-menu-item" + (isHighlighted ? " highlighted" : "") + (isSelected ? " selected" : "") + (option.disabled ? " disabled" : "") + (showCheckmark ? " has-check" : ""),
                        role: "option",
                        "aria-selected": isSelected,
                        children: [
                          showCheckmark && isSelected && /* @__PURE__ */ jsx("span", { className: "retune-menu-check", children: /* @__PURE__ */ jsx(CheckIcon, {}) }),
                          /* @__PURE__ */ jsx("span", { className: "retune-menu-item-label", children: renderLabel ? renderLabel(option) : option.label }),
                          option.shortcut && /* @__PURE__ */ jsx("span", { className: "retune-menu-item-shortcut", children: option.shortcut })
                        ]
                      }
                    ) })
                  ] }, `${index2}-${option.value}`);
                }),
                options.length === 0 && /* @__PURE__ */ jsx("div", { className: "retune-menu-empty", children: "No options available" })
              ]
            }
          ),
          showTop && /* @__PURE__ */ jsx(
            "div",
            {
              className: "retune-menu-scroll-indicator top",
              onMouseEnter: () => startScrolling("up"),
              onMouseLeave: stopScrolling,
              "aria-hidden": "true",
              tabIndex: -1,
              children: /* @__PURE__ */ jsx(ChevronUpIcon, {})
            }
          ),
          showBottom && /* @__PURE__ */ jsx(
            "div",
            {
              className: "retune-menu-scroll-indicator bottom",
              onMouseEnter: () => startScrolling("down"),
              onMouseLeave: stopScrolling,
              "aria-hidden": "true",
              tabIndex: -1,
              children: /* @__PURE__ */ jsx(ChevronDownIcon, {})
            }
          )
        ]
      }
    );
  }
);
DropdownMenu.displayName = "DropdownMenu";
var ITEM_HEIGHT = 28;
var MENU_PADDING_Y = 6;
var VIEWPORT_MARGIN = 8;
var MAX_MENU_HEIGHT = 400;
function calcMenuPosition(triggerRect, selectedIndex, optionCount) {
  const selectedItemOffset = MENU_PADDING_Y + selectedIndex * ITEM_HEIGHT;
  const menuContentHeight = MENU_PADDING_Y * 2 + optionCount * ITEM_HEIGHT;
  const menuHeight = Math.min(menuContentHeight, MAX_MENU_HEIGHT);
  const vh = window.innerHeight;
  const triggerCenter = triggerRect.top + triggerRect.height / 2;
  const idealTop = triggerCenter - selectedItemOffset - ITEM_HEIGHT / 2;
  const clampedTop = Math.max(
    VIEWPORT_MARGIN,
    Math.min(idealTop, vh - VIEWPORT_MARGIN - menuHeight)
  );
  const targetVisibleOffset = triggerCenter - clampedTop - ITEM_HEIGHT / 2;
  const maxScrollTop = Math.max(0, menuContentHeight - menuHeight);
  const scrollTop = Math.max(
    0,
    Math.min(selectedItemOffset - targetVisibleOffset, maxScrollTop)
  );
  return {
    top: clampedTop,
    left: triggerRect.left,
    width: triggerRect.width,
    scrollTop
  };
}
function ComboInput({ label, prop, value, options, onChange, variableMatch, property, onVariableSelect, onVariableApply, onVariableUnlink, isChanged, onReset }) {
  const [localValue, setLocalValue] = useState(roundCssValue(value || ""));
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState(null);
  const containerRef = useRef(null);
  const labelRef = useRef(null);
  const comboInputRef = useRef(null);
  const editingRef = useRef(false);
  const previewActiveRef = usePreviewValue(prop, comboInputRef);
  useScrollLock(open);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState(null);
  const stableCloseRef = useRef(() => setPickerOpen(false));
  const hasAvailable = useMemo(() => hasVariablesForProperty(property || prop), [property, prop]);
  const ADD_VARIABLE_VALUE = "__add_variable__";
  const allOptions = useMemo(() => {
    if (!hasAvailable || variableMatch) return options;
    return [...options, { value: ADD_VARIABLE_VALUE, label: "Add variable", separatorBefore: true }];
  }, [options, hasAvailable, variableMatch]);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!editingRef.current && !previewActiveRef.current) {
      setLocalValue(roundCssValue(value || ""));
    }
  }
  const openDropdown = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const selectedIndex = Math.max(0, allOptions.findIndex((opt) => opt.value === localValue));
    const pos = calcMenuPosition(rect, selectedIndex, allOptions.length);
    setMenuPos(pos);
    setOpen(true);
    setHighlightedIndex(selectedIndex);
  }, [allOptions, localValue]);
  const closeDropdown = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
    setMenuPos(null);
  }, []);
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e2) => {
      const container = containerRef.current;
      if (!container) return;
      const path = e2.composedPath();
      if (!path.includes(container)) {
        closeDropdown();
      }
    };
    const root = containerRef.current?.getRootNode();
    root.addEventListener("pointerdown", handlePointerDown);
    return () => root.removeEventListener("pointerdown", handlePointerDown);
  }, [open, closeDropdown]);
  const displayValue = (() => {
    const match = options.find((opt) => opt.value === localValue);
    return match ? match.label : localValue;
  })();
  const scrubRef = useRef({ startX: 0, startVal: 0, active: false });
  const handleLabelPointerDown = (e2) => {
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    scrubRef.current = { startX: e2.clientX, startVal: num, active: true };
    e2.target.setPointerCapture(e2.pointerId);
  };
  const handleLabelPointerMove = (e2) => {
    if (!scrubRef.current.active) return;
    const delta = Math.round(e2.clientX - scrubRef.current.startX);
    const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
    const raw = scrubRef.current.startVal + delta;
    const clamped = raw < 0 && !prop.includes("margin") && !prop.includes("top") && !prop.includes("right") && !prop.includes("bottom") && !prop.includes("left") && !prop.includes("indent") ? 0 : raw;
    const newVal = `${clamped}${unit}`;
    setLocalValue(newVal);
    onChange(prop, newVal);
  };
  const handleLabelPointerUp = () => {
    scrubRef.current.active = false;
  };
  const SCRUB_ZONE = 16;
  const handleInputPointerDown = (e2) => {
    if (label) return;
    const rect = e2.currentTarget.getBoundingClientRect();
    if (e2.clientX - rect.left > SCRUB_ZONE) return;
    const num = parseFloat(localValue);
    if (isNaN(num)) return;
    e2.preventDefault();
    scrubRef.current = { startX: e2.clientX, startVal: num, active: true };
    e2.currentTarget.setPointerCapture(e2.pointerId);
  };
  const handleInputPointerMove = (e2) => {
    if (scrubRef.current.active) {
      const delta = Math.round(e2.clientX - scrubRef.current.startX);
      const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
      const raw = scrubRef.current.startVal + delta;
      const clamped = raw < 0 && !prop.includes("margin") && !prop.includes("top") && !prop.includes("right") && !prop.includes("bottom") && !prop.includes("left") && !prop.includes("indent") ? 0 : raw;
      const newVal = `${clamped}${unit}`;
      setLocalValue(newVal);
      onChange(prop, newVal);
      return;
    }
    const rect = e2.currentTarget.getBoundingClientRect();
    const inZone = e2.clientX - rect.left <= SCRUB_ZONE;
    e2.currentTarget.style.cursor = inZone ? "ew-resize" : "";
  };
  const handleInputPointerUp = () => {
    scrubRef.current.active = false;
  };
  const handleFocus = (e2) => {
    editingRef.current = true;
    e2.target.select();
  };
  const handleInputChange = (e2) => {
    const newValue = e2.target.value;
    setLocalValue(newValue);
    const match = options.find(
      (opt) => opt.label.toLowerCase() === newValue.toLowerCase() || opt.value.toLowerCase() === newValue.toLowerCase()
    );
    if (match) {
      onChange(prop, match.value);
    }
  };
  const handleBlur = () => {
    editingRef.current = false;
    const resolved = inferCssUnit(localValue, value || "", prop);
    setLocalValue(resolved);
    if (resolved !== value) {
      onChange(prop, resolved);
    }
  };
  const handleKeyDown = (e2) => {
    if (e2.key === "Enter") {
      e2.preventDefault();
      if (open && highlightedIndex >= 0) {
        const opt = allOptions[highlightedIndex];
        if (opt.value === ADD_VARIABLE_VALUE) {
          closeDropdown();
          openVariablePicker();
        } else {
          setLocalValue(opt.value);
          onChange(prop, opt.value);
          closeDropdown();
        }
      } else {
        const resolved = inferCssUnit(localValue, value || "", prop);
        setLocalValue(resolved);
        onChange(prop, resolved);
        e2.target.blur();
      }
      return;
    }
    if (e2.key === "Escape") {
      closeDropdown();
      return;
    }
    if (e2.key === "ArrowDown" || e2.key === "ArrowUp") {
      e2.preventDefault();
      if (open) {
        if (e2.key === "ArrowDown") {
          setHighlightedIndex((prev) => prev < allOptions.length - 1 ? prev + 1 : prev);
        } else {
          setHighlightedIndex((prev) => prev > 0 ? prev - 1 : prev);
        }
      } else {
        const num = parseFloat(localValue);
        if (isNaN(num)) return;
        const step = e2.shiftKey ? 10 : 1;
        const delta = e2.key === "ArrowUp" ? step : -step;
        const unit = localValue.match(/[a-z%]+$/i)?.[0] || "";
        const newVal = `${num + delta}${unit}`;
        setLocalValue(newVal);
        onChange(prop, newVal);
      }
    }
  };
  const openVariablePicker = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPickerAnchor({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setPickerOpen(true);
    claimDialog(stableCloseRef.current);
  }, []);
  const closeVariablePicker = useCallback(() => {
    releaseDialog(stableCloseRef.current);
    setPickerOpen(false);
  }, []);
  const handleVariableSelectInternal = useCallback((variable) => {
    const props = [property || prop];
    if (variableMatch) {
      onVariableSelect?.(variableMatch.variable, variable, props);
    } else {
      onVariableApply?.(variable, props);
    }
  }, [variableMatch, property, prop, onVariableSelect, onVariableApply]);
  const handleOptionSelect = (option) => {
    if (option.value === ADD_VARIABLE_VALUE) {
      closeDropdown();
      openVariablePicker();
      return;
    }
    setLocalValue(option.value);
    onChange(prop, option.value);
    closeDropdown();
  };
  const onVariableUnlinkRef = useRef(onVariableUnlink);
  onVariableUnlinkRef.current = onVariableUnlink;
  const unlinkElRef = useRef(null);
  const unlinkHandlerRef = useRef(null);
  const unlinkRef = useCallback((el) => {
    if (unlinkElRef.current && unlinkHandlerRef.current) {
      unlinkElRef.current.removeEventListener("pointerdown", unlinkHandlerRef.current);
    }
    unlinkElRef.current = el;
    if (el) {
      const handler = (e2) => {
        e2.stopPropagation();
        e2.preventDefault();
        onVariableUnlinkRef.current?.();
      };
      unlinkHandlerRef.current = handler;
      el.addEventListener("pointerdown", handler);
    }
  }, []);
  const portalTarget = containerRef.current?.getRootNode() instanceof ShadowRoot ? containerRef.current.getRootNode().querySelector("[data-retune-container]") : null;
  if (variableMatch) {
    return /* @__PURE__ */ jsxs("div", { className: "retune-combo", ref: containerRef, children: [
      /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isChanged ?? false, onReset: onReset ?? (() => {
      }) }),
      label && /* @__PURE__ */ jsx(
        "span",
        {
          ref: labelRef,
          className: "retune-combo-label",
          children: label
        }
      ),
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "retune-combo-input retune-combo-variable-applied",
          style: label ? void 0 : { paddingLeft: 8 },
          value: displayValue,
          readOnly: true,
          onClick: openVariablePicker,
          spellCheck: false
        }
      ),
      /* @__PURE__ */ jsx(Tooltip, { content: "Unlink variable", side: "top", delay: 300, children: /* @__PURE__ */ jsx("span", { ref: unlinkRef, className: "retune-variable-action retune-variable-unlink", children: /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M12.3533 14.646C12.5485 14.8412 12.5484 15.1578 12.3533 15.3531L11.3534 16.353C10.3297 17.3765 8.67028 17.3766 7.64665 16.353C6.62317 15.3294 6.62317 13.6699 7.64665 12.6462L8.64654 11.6463C8.84181 11.4512 9.15844 11.4511 9.35364 11.6463C9.54883 11.8415 9.54874 12.1582 9.35364 12.3534L8.35375 13.3533C7.7208 13.9865 7.7208 15.0128 8.35375 15.6459C8.98687 16.279 10.0132 16.2789 10.6463 15.6459L11.6462 14.646C11.8414 14.451 12.1581 14.4511 12.3533 14.646ZM8.0002 9.00021C8.27634 9.00021 8.50015 9.22401 8.50015 9.50015C8.49994 9.77612 8.27622 10.0001 8.0002 10.0001H6.50036C6.22434 10.0001 6.00061 9.77612 6.00041 9.50015C6.00041 9.22401 6.22422 9.00021 6.50036 9.00021H8.0002ZM14.5002 15.5002C14.7763 15.5002 15.0001 15.724 15.0001 16.0001V17.5C15 17.776 14.7763 17.9999 14.5002 17.9999C14.2241 17.9999 14.0004 17.776 14.0002 17.5V16.0001C14.0002 15.724 14.2241 15.5002 14.5002 15.5002ZM9.50073 5.99984C9.77664 6.00011 10.0007 6.22381 10.0007 6.49978V7.99962C10.0007 8.2756 9.77664 8.4993 9.50073 8.49957C9.22459 8.49957 9.00078 8.27576 9.00078 7.99962V6.49978C9.00078 6.22364 9.22459 5.99984 9.50073 5.99984ZM17.5006 13.9997C17.7765 13.9998 18.0004 14.2237 18.0005 14.4996C18.0005 14.7757 17.7766 14.9994 17.5006 14.9996H16.0007C15.7246 14.9996 15.5008 14.7758 15.5008 14.4996C15.5009 14.2235 15.7246 13.9997 16.0007 13.9997H17.5006ZM16.3543 7.64676C17.3774 8.67043 17.3776 10.33 16.3543 11.3535L15.3544 12.3534C15.1592 12.5486 14.8426 12.5484 14.6473 12.3534C14.452 12.1582 14.452 11.8416 14.6473 11.6463L15.6472 10.6464C16.28 10.0134 16.2798 8.98702 15.6472 8.35387C15.0141 7.72075 13.9871 7.72018 13.3539 8.35317L12.354 9.35307C12.1588 9.54825 11.8422 9.54808 11.6469 9.35307C11.4519 9.15779 11.4517 8.84114 11.6469 8.64596L12.6468 7.64607C13.6705 6.62254 15.3306 6.62312 16.3543 7.64676Z", fill: "currentColor", fillOpacity: 0.9 }) }) }) }),
      pickerOpen && pickerAnchor && portalTarget && createPortal(
        /* @__PURE__ */ jsx(
          VariableDialog,
          {
            property: property || prop,
            currentVariable: variableMatch.variable,
            onSelect: handleVariableSelectInternal,
            onUnlink: onVariableUnlink ? () => {
              onVariableUnlink();
              closeVariablePicker();
            } : void 0,
            onClose: closeVariablePicker,
            anchorRect: pickerAnchor
          }
        ),
        portalTarget
      )
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "retune-combo", ref: containerRef, children: [
    /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isChanged ?? false, onReset: onReset ?? (() => {
    }) }),
    label && /* @__PURE__ */ jsx(
      "span",
      {
        ref: labelRef,
        className: "retune-combo-label",
        onPointerDown: handleLabelPointerDown,
        onPointerMove: handleLabelPointerMove,
        onPointerUp: handleLabelPointerUp,
        children: label
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: comboInputRef,
        className: "retune-combo-input",
        style: label ? void 0 : { paddingLeft: 8 },
        value: displayValue,
        placeholder: "\u2013",
        onPointerDown: !label ? handleInputPointerDown : void 0,
        onPointerMove: !label ? handleInputPointerMove : void 0,
        onPointerUp: !label ? handleInputPointerUp : void 0,
        onFocus: handleFocus,
        onChange: handleInputChange,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        spellCheck: false
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "retune-combo-trigger",
        onClick: () => {
          open ? closeDropdown() : openDropdown();
        },
        "aria-label": "Toggle options",
        children: /* @__PURE__ */ jsx(ChevronDown, {})
      }
    ),
    open && menuPos && /* @__PURE__ */ jsx(
      "div",
      {
        className: "retune-combo-dropdown-anchor",
        style: { top: menuPos.top, left: menuPos.left, width: menuPos.width },
        children: /* @__PURE__ */ jsx(
          DropdownMenu,
          {
            options: allOptions,
            value: localValue,
            highlightedIndex,
            onSelect: handleOptionSelect,
            onHighlight: setHighlightedIndex,
            initialScrollTop: menuPos.scrollTop,
            showCheckmark: true
          }
        )
      }
    ),
    pickerOpen && pickerAnchor && portalTarget && createPortal(
      /* @__PURE__ */ jsx(
        VariableDialog,
        {
          property: property || prop,
          currentVariable: variableMatch?.variable,
          onSelect: handleVariableSelectInternal,
          onClose: closeVariablePicker,
          anchorRect: pickerAnchor
        }
      ),
      portalTarget
    )
  ] });
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}
function rgbToHex(r, g, b) {
  const toHex = (n4) => {
    const hex = Math.max(0, Math.min(255, Math.round(n4))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s5 = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s5 * 100, v: v * 100 };
}
function hsvToRgb(h, s5, v) {
  s5 /= 100;
  v /= 100;
  if (s5 === 0) {
    const val = Math.round(v * 255);
    return { r: val, g: val, b: val };
  }
  h = h >= 360 ? 0 : h;
  h /= 60;
  const i3 = Math.floor(h);
  const f = h - i3;
  const p4 = v * (1 - s5);
  const q = v * (1 - s5 * f);
  const t2 = v * (1 - s5 * (1 - f));
  let r, g, b;
  switch (i3) {
    case 0:
      r = v;
      g = t2;
      b = p4;
      break;
    case 1:
      r = q;
      g = v;
      b = p4;
      break;
    case 2:
      r = p4;
      g = v;
      b = t2;
      break;
    case 3:
      r = p4;
      g = q;
      b = v;
      break;
    case 4:
      r = t2;
      g = p4;
      b = v;
      break;
    default:
      r = v;
      g = p4;
      b = q;
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}
function hsvToHex(h, s5, v) {
  const { r, g, b } = hsvToRgb(h, s5, v);
  return rgbToHex(r, g, b);
}
function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsv(r, g, b);
}
function hexToHsva(hex, alpha = 100) {
  const { h, s: s5, v } = hexToHsv(hex);
  return { h, s: s5, v, a: alpha };
}
function hsvaToHex(hsva) {
  return hsvToHex(hsva.h, hsva.s, hsva.v);
}
function parseCssColor(color) {
  if (!color) return { hex: "#000000", opacity: 100 };
  if (color.startsWith("#")) {
    const h = color.replace("#", "");
    const fullHex = h.length === 3 ? `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : `#${h}`;
    return { hex: fullHex, opacity: 100 };
  }
  const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    const hex = rgbToHex(parseInt(rgbaMatch[1]), parseInt(rgbaMatch[2]), parseInt(rgbaMatch[3]));
    const alpha = parseFloat(rgbaMatch[4]);
    return { hex, opacity: Math.round(alpha * 100) };
  }
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    const hex = rgbToHex(parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3]));
    return { hex, opacity: 100 };
  }
  if (color === "transparent") {
    return { hex: "#000000", opacity: 0 };
  }
  return { hex: "#000000", opacity: 100 };
}
function hexToRgba(hex, opacity) {
  const { r, g, b } = hexToRgb(hex);
  if (opacity >= 100) return hex;
  return `rgba(${r}, ${g}, ${b}, ${(opacity / 100).toFixed(2)})`;
}
var PROPERTY_PREFIXES = ["bg-", "text-", "border-", "fill-", "stroke-", "outline-", "ring-"];
function stripPropertyPrefix(className) {
  for (const prefix of PROPERTY_PREFIXES) {
    if (className.startsWith(prefix)) return className.slice(prefix.length);
  }
  return className;
}
function getDisplayName(className) {
  if (className.startsWith("var(--") && className.endsWith(")")) return className.slice(6, -1);
  return stripPropertyPrefix(className);
}
function extractColorGroup(name) {
  const m = name.match(/^(.+)-(\d+)$/);
  if (m) return { group: m[1], shade: m[2] };
  return { group: name, shade: "" };
}
function groupByRamp(items) {
  const groups = /* @__PURE__ */ new Map();
  for (const t2 of items) {
    const displayName = getDisplayName(t2.className);
    const { group } = extractColorGroup(displayName);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(t2);
  }
  return groups;
}
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
function getSwatchColor2(variable) {
  for (const [prop, val] of Object.entries(variable.values)) {
    if (prop.includes("color") || prop === "background-color" || prop === "fill" || prop === "stroke") {
      return val;
    }
    const v = val.trim().toLowerCase();
    if (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl") || v.startsWith("oklch") || v.startsWith("oklab")) {
      return val;
    }
  }
  return null;
}
function ColorPicker({
  value,
  alpha = 100,
  onChange,
  onAlphaChange,
  onClose,
  anchorRect,
  property,
  currentVariable,
  onVariableSelect,
  onVariableApply,
  onVariableUnlink,
  initialTab
}) {
  const [hsva, setHsva] = useState(() => hexToHsva(value || "#000000"));
  const lastSentRef = useRef("");
  const dragCleanupRef = useRef(null);
  const allVariables = useMemo(() => property ? getVariablesForProperty(property) : [], [property]);
  property ? getCategoryForProperty(property.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`)) : null;
  const hasVariables = allVariables.length > 0;
  const [activeTab, setActiveTab] = useState(initialTab || "custom");
  const [tokenSearch, setTokenSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const tokenListRef = useRef(null);
  const prevInitialTab = useRef(initialTab);
  if (initialTab !== prevInitialTab.current) {
    prevInitialTab.current = initialTab;
    if (initialTab) setActiveTab(initialTab);
  }
  const filteredVariables = useMemo(() => {
    if (!tokenSearch) return allVariables;
    const q = tokenSearch.toLowerCase();
    return allVariables.filter(
      (t2) => t2.className.toLowerCase().includes(q) || Object.values(t2.values).some((v) => v.toLowerCase().includes(q))
    );
  }, [allVariables, tokenSearch]);
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredVariables]);
  useEffect(() => {
    if (highlightedIndex < 0) return;
    const list = tokenListRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-token-index="${highlightedIndex}"]`);
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);
  useEffect(() => {
    if (activeTab !== "tokens") return;
    const list = tokenListRef.current;
    if (!list) return;
    requestAnimationFrame(() => {
      const active = list.querySelector(".retune-variable-dialog-item-active");
      if (active) active.scrollIntoView({ block: "center" });
    });
  }, [activeTab]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onVariableSelectRef = useRef(onVariableSelect);
  onVariableSelectRef.current = onVariableSelect;
  const onVariableApplyRef = useRef(onVariableApply);
  onVariableApplyRef.current = onVariableApply;
  const currentVariableRef = useRef(currentVariable);
  currentVariableRef.current = currentVariable;
  const filteredVariablesRef = useRef(filteredVariables);
  filteredVariablesRef.current = filteredVariables;
  const propertyRef = useRef(property);
  propertyRef.current = property;
  const handleTokenSearchKeyDown = useCallback((e2) => {
    const count = filteredVariablesRef.current.length;
    if (count === 0) return;
    if (e2.key === "ArrowDown") {
      e2.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % count);
    } else if (e2.key === "ArrowUp") {
      e2.preventDefault();
      setHighlightedIndex((prev) => prev <= 0 ? count - 1 : prev - 1);
    } else if (e2.key === "Enter") {
      e2.preventDefault();
      setHighlightedIndex((curr) => {
        if (curr >= 0 && curr < count) {
          const v = filteredVariablesRef.current[curr];
          if (v) {
            const props = propertyRef.current ? [propertyRef.current] : [];
            if (currentVariableRef.current) {
              onVariableSelectRef.current?.(currentVariableRef.current, v, props);
            } else {
              onVariableApplyRef.current?.(v, props);
            }
            onCloseRef.current();
          }
        }
        return curr;
      });
    }
  }, []);
  useEffect(() => {
    const list = tokenListRef.current;
    if (!list) return;
    const handleClick = (e2) => {
      const target = e2.target;
      const item = target.closest("[data-token-index]");
      if (!item) return;
      e2.preventDefault();
      e2.stopPropagation();
      const idx = parseInt(item.dataset.tokenIndex, 10);
      const v = filteredVariablesRef.current[idx];
      if (v) {
        const props = propertyRef.current ? [propertyRef.current] : [];
        if (currentVariableRef.current) {
          onVariableSelectRef.current?.(currentVariableRef.current, v, props);
        } else {
          onVariableApplyRef.current?.(v, props);
        }
        onCloseRef.current();
      }
    };
    list.addEventListener("pointerdown", handleClick);
    return () => list.removeEventListener("pointerdown", handleClick);
  }, [activeTab]);
  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== lastSentRef.current) {
      setHsva(hexToHsva(value || "#000000"));
    }
  }
  const [hexInput, setHexInput] = useState(
    () => hsvToHex(hsva.h, hsva.s, hsva.v).replace("#", "").toUpperCase()
  );
  const [rgbInputs, setRgbInputs] = useState(() => {
    const { r, g, b } = hsvToRgb(hsva.h, hsva.s, hsva.v);
    return { r: String(r), g: String(g), b: String(b) };
  });
  const focusedRef = useRef(null);
  const [prevHsva, setPrevHsva] = useState(hsva);
  if (hsva !== prevHsva) {
    setPrevHsva(hsva);
    if (!focusedRef.current) {
      setHexInput(hsvToHex(hsva.h, hsva.s, hsva.v).replace("#", "").toUpperCase());
      const { r, g, b } = hsvToRgb(hsva.h, hsva.s, hsva.v);
      setRgbInputs({ r: String(r), g: String(g), b: String(b) });
    }
  }
  const emitChange = useCallback((newHsva) => {
    setHsva(newHsva);
    const hex = hsvaToHex(newHsva);
    lastSentRef.current = hex;
    onChange(hex);
    if (currentVariable) onVariableUnlink?.();
  }, [onChange, currentVariable, onVariableUnlink]);
  const svRef = useRef(null);
  const getSV = useCallback((clientX, clientY) => {
    if (!svRef.current) return null;
    const rect = svRef.current.getBoundingClientRect();
    const s5 = clamp((clientX - rect.left) / rect.width * 100, 0, 100);
    const v = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
    return { s: s5, v };
  }, []);
  const hsvaRef = useRef(hsva);
  hsvaRef.current = hsva;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const handleSVPointerDown = useCallback((e2) => {
    e2.preventDefault();
    const result = getSV(e2.clientX, e2.clientY);
    if (result) emitChange({ ...hsvaRef.current, s: result.s, v: result.v });
    const handleMove = (me) => {
      const r = getSV(me.clientX, me.clientY);
      if (r) {
        const next = { ...hsvaRef.current, s: r.s, v: r.v };
        const hex = hsvaToHex(next);
        lastSentRef.current = hex;
        setHsva(next);
        onChangeRef.current(hex);
      }
    };
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      dragCleanupRef.current = null;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    dragCleanupRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [getSV, emitChange]);
  const hueRef = useRef(null);
  const getHue = useCallback((clientX) => {
    if (!hueRef.current) return 0;
    const rect = hueRef.current.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width * 360, 0, 360);
  }, []);
  const handleHuePointerDown = useCallback((e2) => {
    e2.preventDefault();
    emitChange({ ...hsvaRef.current, h: getHue(e2.clientX) });
    const handleMove = (me) => {
      const h = getHue(me.clientX);
      const next = { ...hsvaRef.current, h };
      const hex = hsvaToHex(next);
      lastSentRef.current = hex;
      setHsva(next);
      onChangeRef.current(hex);
    };
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      dragCleanupRef.current = null;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    dragCleanupRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [getHue, emitChange]);
  const alphaSliderRef = useRef(null);
  const [localAlpha, setLocalAlpha] = useState(alpha);
  const onAlphaChangeRef = useRef(onAlphaChange);
  onAlphaChangeRef.current = onAlphaChange;
  const [prevAlpha, setPrevAlpha] = useState(alpha);
  if (alpha !== prevAlpha) {
    setPrevAlpha(alpha);
    setLocalAlpha(alpha);
  }
  const getAlpha = useCallback((clientX) => {
    if (!alphaSliderRef.current) return 100;
    const rect = alphaSliderRef.current.getBoundingClientRect();
    return clamp(Math.round((clientX - rect.left) / rect.width * 100), 0, 100);
  }, []);
  const handleAlphaPointerDown = useCallback((e2) => {
    e2.preventDefault();
    const a4 = getAlpha(e2.clientX);
    setLocalAlpha(a4);
    onAlphaChangeRef.current?.(a4);
    const handleMove = (me) => {
      const a5 = getAlpha(me.clientX);
      setLocalAlpha(a5);
      onAlphaChangeRef.current?.(a5);
    };
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      dragCleanupRef.current = null;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    dragCleanupRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [getAlpha]);
  const commitHex = useCallback(() => {
    focusedRef.current = null;
    let cleaned = hexInput.replace(/^#/, "").trim();
    if (cleaned.length === 3) {
      cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
    }
    if (/^[a-fA-F0-9]{6}$/.test(cleaned)) {
      const newHsva = hexToHsva(`#${cleaned}`, hsva.a);
      emitChange(newHsva);
      setHexInput(cleaned.toUpperCase());
    } else {
      setHexInput(hsvToHex(hsva.h, hsva.s, hsva.v).replace("#", "").toUpperCase());
    }
  }, [hexInput, hsva, emitChange]);
  const commitRgb = useCallback(() => {
    focusedRef.current = null;
    const r = clamp(Math.round(Number(rgbInputs.r) || 0), 0, 255);
    const g = clamp(Math.round(Number(rgbInputs.g) || 0), 0, 255);
    const b = clamp(Math.round(Number(rgbInputs.b) || 0), 0, 255);
    const { h, s: s5, v } = rgbToHsv(r, g, b);
    emitChange({ h, s: s5, v, a: hsva.a });
    setRgbInputs({ r: String(r), g: String(g), b: String(b) });
  }, [rgbInputs, hsva.a, emitChange]);
  const handleInputKeyDown = useCallback(
    (commitFn) => (e2) => {
      if (e2.key === "Enter") {
        e2.currentTarget.blur();
        commitFn();
      }
    },
    []
  );
  const currentHex = hsvToHex(hsva.h, hsva.s, hsva.v);
  const handleLeft = hsva.s;
  const handleTop = 100 - hsva.v;
  const categoryLabel = "Variables";
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;
  const handleEyeDropper = useCallback(async () => {
    if (!hasEyeDropper) return;
    try {
      const dropper = new window.EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        const hex = result.sRGBHex;
        onChange(hex);
        setHsva(hexToHsva(hex));
        if (currentVariable) onVariableUnlink?.();
      }
    } catch {
    }
  }, [hasEyeDropper, onChange]);
  const handleHeaderAction = useCallback((action) => {
    if (action === "unlink") {
      onVariableUnlink?.();
      onClose();
    }
  }, [onVariableUnlink, onClose]);
  const isUnlinkDisabled = !currentVariable;
  const unlinkButton = /* @__PURE__ */ jsx(Tooltip, { content: currentVariable ? "Unlink variable" : "No variable linked", side: "bottom", delay: 300, children: /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      className: "retune-floating-dialog-close",
      "data-dialog-action": isUnlinkDisabled ? void 0 : "unlink",
      style: isUnlinkDisabled ? { opacity: 0.3, cursor: "default" } : void 0,
      children: /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8.14694 12.1475C8.3422 11.9522 8.65871 11.9522 8.85397 12.1475C9.04903 12.3427 9.04916 12.6593 8.85397 12.8545L7.35397 14.3545C6.72133 14.9876 6.72123 16.0134 7.35397 16.6465C7.98708 17.2796 9.01376 17.2795 9.64694 16.6465L11.1469 15.1465C11.3421 14.9517 11.6588 14.9517 11.854 15.1465C12.0491 15.3416 12.0488 15.6582 11.854 15.8535L10.354 17.3535C9.33027 18.377 7.67057 18.3771 6.64694 17.3535C5.62359 16.3299 5.6235 14.6701 6.64694 13.6465L8.14694 12.1475ZM14.5005 15.5C14.7764 15.5001 15.0004 15.724 15.0005 16V17.5C15.0005 17.7761 14.7765 17.9999 14.5005 18C14.2243 18 14.0005 17.7761 14.0005 17.5V16C14.0005 15.7239 14.2244 15.5 14.5005 15.5ZM17.5005 14C17.7764 14.0001 18.0004 14.224 18.0005 14.5C18.0005 14.7761 17.7765 14.9999 17.5005 15H16.0005C15.7243 15 15.5005 14.7761 15.5005 14.5C15.5005 14.2239 15.7244 14 16.0005 14H17.5005ZM13.6469 6.64648C14.6706 5.62308 16.3303 5.62301 17.354 6.64648C18.3774 7.6701 18.3774 9.32986 17.354 10.3535L15.854 11.8535C15.6587 12.0487 15.3422 12.0487 15.1469 11.8535C14.9517 11.6583 14.9518 11.3417 15.1469 11.1465L16.6469 9.64648C17.2798 9.01335 17.2799 7.98661 16.6469 7.35351C16.0138 6.72057 14.9871 6.72064 14.354 7.35351L12.854 8.85351C12.6588 9.04859 12.3422 9.04843 12.1469 8.85351C11.952 8.65825 11.9519 8.34165 12.1469 8.14648L13.6469 6.64648ZM8.00045 9C8.27642 9.00014 8.50036 9.22402 8.50045 9.5C8.50045 9.77605 8.27647 9.99985 8.00045 10H6.50045C6.22431 10 6.00045 9.77614 6.00045 9.5C6.00054 9.22393 6.22437 9 6.50045 9H8.00045ZM9.50045 6C9.77642 6.00014 10.0004 6.22402 10.0005 6.5V8C10.0005 8.27605 9.77647 8.49985 9.50045 8.5C9.22431 8.5 9.00045 8.27614 9.00045 8V6.5C9.00054 6.22393 9.22437 6 9.50045 6Z", fill: "currentColor" }) })
    }
  ) });
  const pickerContent = /* @__PURE__ */ jsxs(Fragment$1, { children: [
    /* @__PURE__ */ jsx("div", { className: "retune-cp-sv-wrap", children: /* @__PURE__ */ jsxs(
      "div",
      {
        ref: svRef,
        className: "retune-cp-sv",
        style: { backgroundColor: `hsl(${hsva.h}, 100%, 50%)` },
        onPointerDown: handleSVPointerDown,
        children: [
          /* @__PURE__ */ jsx("div", { className: "retune-cp-sv-white" }),
          /* @__PURE__ */ jsx("div", { className: "retune-cp-sv-black" }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "retune-cp-handle",
              style: { left: `${handleLeft}%`, top: `${handleTop}%` },
              children: /* @__PURE__ */ jsx("div", { className: "retune-cp-handle-inner", style: { backgroundColor: currentHex } })
            }
          )
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs("div", { className: "retune-cp-sliders", children: [
      hasEyeDropper && /* @__PURE__ */ jsx(Tooltip, { content: "Pick color from screen", side: "bottom", delay: 300, children: /* @__PURE__ */ jsx("button", { type: "button", className: "retune-cp-eyedropper", onClick: handleEyeDropper, children: /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M14.5156 5.76709C15.5386 4.73901 17.203 4.7367 18.2285 5.76221C19.25 6.78399 19.2513 8.43996 18.2324 9.46436L16.6602 11.0435C17.0848 11.771 16.9869 12.7196 16.3633 13.3433L16.3438 13.3638C15.6018 14.1055 14.3982 14.1054 13.6562 13.3638L13.5 13.2075L8.43945 18.2642C7.97069 18.7324 7.33447 18.9956 6.67188 18.9956L5.50391 18.9946C5.22841 18.9944 5.00451 18.7712 5.00391 18.4956L5.00195 17.3315C5.00057 16.6668 5.26346 16.0282 5.7334 15.5581L10.792 10.4995L10.6367 10.3433C9.89467 9.60127 9.8947 8.39778 10.6367 7.65576L10.6562 7.63623C11.2789 7.01362 12.2251 6.91514 12.9521 7.3374L14.5156 5.76709ZM6.44043 16.2661C6.15876 16.5481 6.00112 16.931 6.00195 17.3296L6.00391 17.9937L6.67188 17.9956C7.06948 17.9956 7.45115 17.8372 7.73242 17.5562L12.793 12.5005L11.499 11.2065L6.44043 16.2661ZM17.5205 6.46924C16.8863 5.8355 15.8572 5.83673 15.2246 6.47217L13.3545 8.35205L13.001 8.70752L12.6367 8.34326C12.2852 7.99183 11.7147 7.99181 11.3633 8.34326L11.3438 8.36279C10.9923 8.71427 10.9923 9.28476 11.3438 9.63623L14.3633 12.6558C14.7147 13.0073 15.2852 13.0072 15.6367 12.6558L15.6562 12.6362C16.0077 12.2848 16.0077 11.7143 15.6562 11.3628L15.2939 11.0005L15.6455 10.647L17.5234 8.75928C18.1538 8.12571 18.1523 7.10128 17.5205 6.46924Z", fill: "currentColor" }) }) }) }),
      /* @__PURE__ */ jsxs("div", { className: "retune-cp-slider-tracks", children: [
        /* @__PURE__ */ jsx("div", { ref: hueRef, className: "retune-cp-hue", onPointerDown: handleHuePointerDown, children: /* @__PURE__ */ jsx("div", { className: "retune-cp-handle", style: { left: `${hsva.h / 360 * 100}%`, top: "50%" }, children: /* @__PURE__ */ jsx("div", { className: "retune-cp-handle-inner", style: { backgroundColor: `hsl(${hsva.h}, 100%, 50%)` } }) }) }),
        /* @__PURE__ */ jsxs("div", { ref: alphaSliderRef, className: "retune-cp-alpha", onPointerDown: handleAlphaPointerDown, children: [
          /* @__PURE__ */ jsx("div", { className: "retune-cp-alpha-checker" }),
          /* @__PURE__ */ jsx("div", { className: "retune-cp-alpha-gradient", style: { background: `linear-gradient(to right, transparent, ${currentHex})` } }),
          /* @__PURE__ */ jsx("div", { className: "retune-cp-handle", style: { left: `${localAlpha}%`, top: "50%" }, children: /* @__PURE__ */ jsx("div", { className: "retune-cp-handle-inner", style: {
            backgroundColor: localAlpha < 100 ? `rgba(${hsvToRgb(hsva.h, hsva.s, hsva.v).r}, ${hsvToRgb(hsva.h, hsva.s, hsva.v).g}, ${hsvToRgb(hsva.h, hsva.s, hsva.v).b}, ${localAlpha / 100})` : currentHex
          } }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "retune-cp-inputs", children: [
      /* @__PURE__ */ jsxs("div", { className: "retune-cp-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "retune-cp-label", children: "Hex" }),
        /* @__PURE__ */ jsx("input", { className: "retune-cp-input", value: hexInput, onChange: (e2) => setHexInput(e2.target.value), onFocus: (e2) => {
          focusedRef.current = "hex";
          e2.target.select();
        }, onBlur: commitHex, onKeyDown: handleInputKeyDown(commitHex), spellCheck: false })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "retune-cp-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "retune-cp-label", children: "R" }),
        /* @__PURE__ */ jsx("input", { className: "retune-cp-input", inputMode: "numeric", value: rgbInputs.r, onChange: (e2) => setRgbInputs((prev) => ({ ...prev, r: e2.target.value })), onFocus: (e2) => {
          focusedRef.current = "r";
          e2.target.select();
        }, onBlur: commitRgb, onKeyDown: handleInputKeyDown(commitRgb) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "retune-cp-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "retune-cp-label", children: "G" }),
        /* @__PURE__ */ jsx("input", { className: "retune-cp-input", inputMode: "numeric", value: rgbInputs.g, onChange: (e2) => setRgbInputs((prev) => ({ ...prev, g: e2.target.value })), onFocus: (e2) => {
          focusedRef.current = "g";
          e2.target.select();
        }, onBlur: commitRgb, onKeyDown: handleInputKeyDown(commitRgb) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "retune-cp-input-group", children: [
        /* @__PURE__ */ jsx("label", { className: "retune-cp-label", children: "B" }),
        /* @__PURE__ */ jsx("input", { className: "retune-cp-input", inputMode: "numeric", value: rgbInputs.b, onChange: (e2) => setRgbInputs((prev) => ({ ...prev, b: e2.target.value })), onFocus: (e2) => {
          focusedRef.current = "b";
          e2.target.select();
        }, onBlur: commitRgb, onKeyDown: handleInputKeyDown(commitRgb) })
      ] })
    ] })
  ] });
  const rampGroups = useMemo(() => groupByRamp(filteredVariables), [filteredVariables]);
  const { ramps, standalone } = useMemo(() => {
    const ramps2 = [];
    const standalone2 = [];
    for (const [name, items] of rampGroups) {
      if (items.length > 1) {
        items.sort((a4, b) => {
          const aShade = parseInt(extractColorGroup(getDisplayName(a4.className)).shade) || 0;
          const bShade = parseInt(extractColorGroup(getDisplayName(b.className)).shade) || 0;
          return aShade - bShade;
        });
        ramps2.push([name, items]);
      } else standalone2.push(...items);
    }
    standalone2.sort((a4, b) => getDisplayName(a4.className).localeCompare(getDisplayName(b.className)));
    ramps2.sort((a4, b) => a4[0].localeCompare(b[0]));
    return { ramps: ramps2, standalone: standalone2 };
  }, [rampGroups]);
  const orderedVariables = useMemo(() => {
    const ordered = [...standalone];
    for (const [, items] of ramps) ordered.push(...items);
    return ordered;
  }, [standalone, ramps]);
  filteredVariablesRef.current = orderedVariables;
  const tokenContent = (() => {
    let globalIndex = 0;
    const renderItem = (v) => {
      const idx = globalIndex++;
      const isActive = currentVariable?.className === v.className;
      const isHighlighted = idx === highlightedIndex;
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: `retune-variable-dialog-item${isActive ? " retune-variable-dialog-item-active" : ""}${isHighlighted ? " retune-variable-dialog-item-highlighted" : ""}`,
          "data-token-index": idx,
          children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "retune-variable-dialog-swatch",
                style: { backgroundColor: getSwatchColor2(v) || "transparent" }
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "retune-variable-dialog-name", children: getDisplayName(v.className) })
          ]
        },
        v.className
      );
    };
    return /* @__PURE__ */ jsxs("div", { ref: tokenListRef, className: "retune-variable-dialog-list", children: [
      filteredVariables.length === 0 && /* @__PURE__ */ jsx("div", { className: "retune-variable-dialog-empty", children: "No variables found" }),
      standalone.map(renderItem),
      ramps.map(([groupName, items]) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "retune-variable-dialog-group-title", children: groupName.replace(/-/g, " ") }),
        items.map(renderItem)
      ] }, groupName))
    ] });
  })();
  if (hasVariables) {
    return /* @__PURE__ */ jsx(
      FloatingDialog,
      {
        tabs: [
          { value: "custom", label: "Custom" },
          { value: "tokens", label: categoryLabel }
        ],
        activeTab,
        onTabChange: setActiveTab,
        onClose,
        anchorRect,
        search: activeTab === "tokens" ? { value: tokenSearch, onChange: setTokenSearch, placeholder: "Search", onKeyDown: handleTokenSearchKeyDown } : void 0,
        headerActions: unlinkButton,
        onHeaderAction: handleHeaderAction,
        minHeight: activeTab === "custom" ? void 0 : 400,
        children: activeTab === "tokens" ? tokenContent : pickerContent
      }
    );
  }
  return /* @__PURE__ */ jsx(FloatingDialog, { title: "Color", onClose, anchorRect, children: pickerContent });
}
function formatVarName(className) {
  if (className.startsWith("var(--") && className.endsWith(")")) {
    return className.slice(6, -1);
  }
  return className;
}
function ColorInput({ prop, value, onChange, variableMatch, property, onVariableSelect, onVariableApply, onVariableUnlink, isChanged, onReset }) {
  const parsed = parseCssColor(value || "");
  const [hexLocal, setHexLocal] = useState(parsed.hex.replace("#", "").toUpperCase());
  const [opacityLocal, setOpacityLocal] = useState(String(parsed.opacity));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("custom");
  const [anchorRect, setAnchorRect] = useState(null);
  const swatchRef = useRef(null);
  const hexFocusedRef = useRef(false);
  const opacityFocusedRef = useRef(false);
  const stableCloseRef = useRef(() => setPickerOpen(false));
  const currentHexRef = useRef(parsed.hex);
  const currentOpacityRef = useRef(parsed.opacity);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const p4 = parseCssColor(value || "");
    currentHexRef.current = p4.hex;
    currentOpacityRef.current = p4.opacity;
    if (!hexFocusedRef.current) {
      setHexLocal(p4.hex.replace("#", "").toUpperCase());
    }
    if (!opacityFocusedRef.current) {
      setOpacityLocal(String(p4.opacity));
    }
  }
  const emitColor = useCallback((hex, opacity) => {
    currentHexRef.current = hex;
    currentOpacityRef.current = opacity;
    onChange(prop, hexToRgba(hex, opacity));
  }, [prop, onChange]);
  const handleSwatchClick = useCallback(() => {
    if (pickerOpen) {
      releaseDialog(stableCloseRef.current);
      setPickerOpen(false);
      return;
    }
    openPicker("custom");
  }, [pickerOpen]);
  const openPicker = useCallback((tab) => {
    const el = swatchRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const row = el.closest(".retune-row");
    if (row) {
      const rowRect = row.getBoundingClientRect();
      setAnchorRect({ top: rect.top, left: rowRect.left, width: rowRect.width, height: rect.height });
    } else {
      setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    }
    setInitialTab(tab);
    setPickerOpen(true);
    claimDialog(stableCloseRef.current);
  }, []);
  const handleTokenDotOpen = useCallback(() => {
    if (pickerOpen) {
      releaseDialog(stableCloseRef.current);
      setPickerOpen(false);
      return;
    }
    openPicker("tokens");
  }, [pickerOpen, openPicker]);
  const handlePickerChange = useCallback((hex) => {
    setHexLocal(hex.replace("#", "").toUpperCase());
    emitColor(hex, currentOpacityRef.current);
  }, [emitColor]);
  const handlePickerAlphaChange = useCallback((alpha) => {
    setOpacityLocal(String(alpha));
    emitColor(currentHexRef.current, alpha);
  }, [emitColor]);
  const handlePickerClose = useCallback(() => {
    releaseDialog(stableCloseRef.current);
    setPickerOpen(false);
  }, []);
  const handlePickerVariableApply = useCallback((variable, properties) => {
    onVariableApply?.(variable, properties);
    releaseDialog(stableCloseRef.current);
    setPickerOpen(false);
  }, [onVariableApply]);
  const handlePickerTokenSelect = useCallback((oldToken, newToken, properties) => {
    onVariableSelect?.(oldToken, newToken, properties);
    releaseDialog(stableCloseRef.current);
    setPickerOpen(false);
  }, [onVariableSelect]);
  const commitHex = useCallback(() => {
    hexFocusedRef.current = false;
    let cleaned = hexLocal.replace(/^#/, "").trim();
    if (cleaned.length === 3) {
      cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
    }
    if (/^[a-fA-F0-9]{6}$/.test(cleaned)) {
      setHexLocal(cleaned.toUpperCase());
      emitColor(`#${cleaned}`, currentOpacityRef.current);
    } else {
      setHexLocal(currentHexRef.current.replace("#", "").toUpperCase());
    }
  }, [hexLocal, emitColor]);
  const commitOpacity = useCallback(() => {
    opacityFocusedRef.current = false;
    const val = Math.max(0, Math.min(100, Math.round(Number(opacityLocal) || 0)));
    setOpacityLocal(String(val));
    emitColor(currentHexRef.current, val);
  }, [opacityLocal, emitColor]);
  const handleOpacityKeyDown = useCallback((e2) => {
    if (e2.key === "Enter") {
      e2.currentTarget.blur();
    } else if (e2.key === "ArrowUp" || e2.key === "ArrowDown") {
      e2.preventDefault();
      const current = Math.round(Number(e2.currentTarget.value) || 0);
      const step = e2.shiftKey ? 10 : 1;
      const delta = e2.key === "ArrowUp" ? step : -step;
      const newVal = Math.max(0, Math.min(100, current + delta));
      setOpacityLocal(String(newVal));
      emitColor(currentHexRef.current, newVal);
    }
  }, [emitColor]);
  const swatchStyle = (() => {
    const hex = currentHexRef.current;
    const op = currentOpacityRef.current;
    if (op >= 100) {
      return { backgroundColor: hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" };
    }
    const checkerboard = "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)";
    const transparentColor = hexToRgba(hex, op);
    return {
      backgroundImage: `linear-gradient(to right, ${hex} 50%, ${transparentColor} 50%), ${checkerboard}`,
      backgroundSize: "100% 100%, 4px 4px, 4px 4px",
      backgroundPosition: "0 0, 0 0, 2px 2px",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)"
    };
  })();
  return /* @__PURE__ */ jsxs("div", { className: "retune-color-row", children: [
    /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isChanged ?? false, onReset: onReset ?? (() => {
    }) }),
    /* @__PURE__ */ jsxs("div", { className: `retune-color-hex-section${variableMatch ? " retune-color-variable-applied" : ""}`, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          ref: swatchRef,
          className: "retune-color-swatch",
          onClick: variableMatch ? handleTokenDotOpen : handleSwatchClick,
          children: /* @__PURE__ */ jsx("div", { className: "retune-color-swatch-inner", style: swatchStyle })
        }
      ),
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "retune-color-hex-input",
          value: variableMatch ? formatVarName(variableMatch.variable.className) : hexLocal,
          readOnly: !!variableMatch,
          onClick: variableMatch ? handleTokenDotOpen : void 0,
          onChange: variableMatch ? void 0 : (e2) => setHexLocal(e2.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 6)),
          onFocus: variableMatch ? void 0 : (e2) => {
            hexFocusedRef.current = true;
            e2.target.select();
          },
          onBlur: variableMatch ? void 0 : commitHex,
          onKeyDown: variableMatch ? void 0 : (e2) => {
            if (e2.key === "Enter") e2.currentTarget.blur();
          },
          spellCheck: false
        }
      ),
      /* @__PURE__ */ jsx(
        VariableAction,
        {
          match: variableMatch,
          property: property || prop,
          onVariableSelect,
          onVariableApply,
          onVariableUnlink,
          onRequestOpen: handleTokenDotOpen
        }
      )
    ] }),
    !variableMatch && /* @__PURE__ */ jsxs("div", { className: "retune-color-opacity-section", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "retune-color-opacity-input",
          inputMode: "numeric",
          value: opacityLocal,
          onChange: (e2) => setOpacityLocal(e2.target.value),
          onFocus: (e2) => {
            opacityFocusedRef.current = true;
            e2.target.select();
          },
          onBlur: commitOpacity,
          onKeyDown: handleOpacityKeyDown
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "retune-color-opacity-unit", children: "%" })
    ] }),
    pickerOpen && anchorRect && /* @__PURE__ */ jsx(
      ColorPicker,
      {
        value: currentHexRef.current,
        alpha: currentOpacityRef.current,
        onChange: handlePickerChange,
        onAlphaChange: handlePickerAlphaChange,
        onClose: handlePickerClose,
        anchorRect,
        property: property || prop,
        currentVariable: variableMatch?.variable,
        onVariableSelect: handlePickerTokenSelect,
        onVariableApply: handlePickerVariableApply,
        onVariableUnlink,
        initialTab
      }
    )
  ] });
}
function sentenceCase(s5) {
  return s5.charAt(0).toUpperCase() + s5.slice(1).replace(/-/g, " ");
}
function SelectInput({ label, prop, value, options, onChange, isChanged, onReset }) {
  const [localValue, setLocalValue] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState(null);
  const containerRef = useRef(null);
  useScrollLock(open);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value || "");
  }
  const openDropdown = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const selectedIndex = Math.max(0, options.indexOf(localValue));
    const pos = calcMenuPosition(rect, selectedIndex, options.length);
    setMenuPos(pos);
    setOpen(true);
    setHighlightedIndex(selectedIndex);
  }, [options, localValue]);
  const closeDropdown = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
    setMenuPos(null);
  }, []);
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e2) => {
      const container = containerRef.current;
      if (!container) return;
      const path = e2.composedPath();
      if (!path.includes(container)) {
        closeDropdown();
      }
    };
    const root = containerRef.current?.getRootNode();
    root.addEventListener("pointerdown", handlePointerDown);
    return () => root.removeEventListener("pointerdown", handlePointerDown);
  }, [open, closeDropdown]);
  const menuOptions = options.map((opt) => ({
    value: opt,
    label: sentenceCase(opt)
  }));
  const handleSelect = (option) => {
    setLocalValue(option.value);
    onChange(prop, option.value);
    closeDropdown();
  };
  const handleKeyDown = (e2) => {
    if (e2.key === "Enter" || e2.key === " ") {
      e2.preventDefault();
      if (open && highlightedIndex >= 0) {
        handleSelect(menuOptions[highlightedIndex]);
      } else {
        open ? closeDropdown() : openDropdown();
      }
    } else if (e2.key === "Escape") {
      closeDropdown();
    } else if (e2.key === "ArrowDown") {
      e2.preventDefault();
      if (open) {
        setHighlightedIndex((prev) => prev < options.length - 1 ? prev + 1 : prev);
      } else {
        openDropdown();
      }
    } else if (e2.key === "ArrowUp") {
      e2.preventDefault();
      if (open) {
        setHighlightedIndex((prev) => prev > 0 ? prev - 1 : prev);
      }
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "retune-select", ref: containerRef, children: [
    /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isChanged ?? false, onReset: onReset ?? (() => {
    }) }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "retune-select-button",
        onClick: () => {
          open ? closeDropdown() : openDropdown();
        },
        onKeyDown: handleKeyDown,
        children: [
          label && /* @__PURE__ */ jsx("span", { className: "retune-select-label", children: label }),
          /* @__PURE__ */ jsx("span", { className: "retune-select-value", style: label ? void 0 : { paddingLeft: 8 }, children: sentenceCase(localValue) }),
          /* @__PURE__ */ jsx("span", { className: "retune-select-chevron", children: /* @__PURE__ */ jsx(ChevronDown, {}) })
        ]
      }
    ),
    open && menuPos && /* @__PURE__ */ jsx(
      "div",
      {
        className: "retune-select-dropdown-anchor",
        style: { top: menuPos.top, right: window.innerWidth - menuPos.left - menuPos.width, minWidth: menuPos.width },
        children: /* @__PURE__ */ jsx(
          DropdownMenu,
          {
            options: menuOptions,
            value: localValue,
            highlightedIndex,
            onSelect: handleSelect,
            onHighlight: setHighlightedIndex,
            initialScrollTop: menuPos.scrollTop,
            showCheckmark: true
          }
        )
      }
    )
  ] });
}
function SliderInput({
  label,
  prop,
  value,
  min,
  max,
  step = 0.01,
  onChange
}) {
  const [localValue, setLocalValue] = useState(value || "0");
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value || "0");
  }
  const numValue = parseFloat(localValue) || 0;
  const range = max - min;
  const fillPercent = range > 0 ? Math.max(0, Math.min(1, (numValue - min) / range)) * 100 : 0;
  const precision = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const computeFromX = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track) return numValue;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let raw = min + ratio * range;
    raw = Math.round(raw / step) * step;
    raw = Math.max(min, Math.min(max, raw));
    return Number(raw.toFixed(precision));
  }, [min, max, range, step, precision, numValue]);
  const updateValue = useCallback((newNum) => {
    const str = String(newNum);
    setLocalValue(str);
    onChange(prop, str);
  }, [prop, onChange]);
  const handlePointerDown = (e2) => {
    e2.preventDefault();
    setIsDragging(true);
    e2.target.setPointerCapture(e2.pointerId);
    updateValue(computeFromX(e2.clientX));
  };
  const handlePointerMove = (e2) => {
    if (!isDragging) return;
    updateValue(computeFromX(e2.clientX));
  };
  const handlePointerUp = () => setIsDragging(false);
  const handleKeyDown = (e2) => {
    if (e2.key === "ArrowLeft" || e2.key === "ArrowDown") {
      e2.preventDefault();
      updateValue(Number(Math.max(min, numValue - step).toFixed(precision)));
    } else if (e2.key === "ArrowRight" || e2.key === "ArrowUp") {
      e2.preventDefault();
      updateValue(Number(Math.min(max, numValue + step).toFixed(precision)));
    }
  };
  const showDetails = isHovered || isDragging;
  const displayValue = step >= 1 ? String(Math.round(numValue)) : numValue.toFixed(precision);
  const indicators = useMemo(() => {
    if (range <= 0) return [];
    const rawInterval = range / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalized = rawInterval / mag;
    const nice = normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10;
    const interval = nice * mag;
    const positions = [];
    let v = Math.ceil(min / interval) * interval;
    while (v <= max + interval * 1e-3) {
      const frac = (v - min) / range;
      if (frac > 0.03 && frac < 0.97) positions.push(frac);
      v = +(v + interval).toFixed(10);
    }
    return positions;
  }, [min, max, range]);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: trackRef,
      className: "retune-slider",
      tabIndex: 0,
      role: "slider",
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": numValue,
      "aria-label": label,
      onPointerEnter: () => setIsHovered(true),
      onPointerLeave: () => {
        if (!isDragging) setIsHovered(false);
      },
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onKeyDown: handleKeyDown,
      children: [
        /* @__PURE__ */ jsx("div", { className: "retune-slider-fill", style: { width: `${fillPercent}%` } }),
        showDetails && indicators.map((pos, i3) => /* @__PURE__ */ jsx("div", { className: "retune-slider-indicator", style: { left: `${pos * 100}%` } }, i3)),
        showDetails && /* @__PURE__ */ jsx("div", { className: "retune-slider-handle", style: { left: `max(4px, calc(${fillPercent}% - 4px))` } }),
        /* @__PURE__ */ jsxs("div", { className: "retune-slider-labels", children: [
          /* @__PURE__ */ jsx("span", { className: "retune-slider-label", children: label }),
          /* @__PURE__ */ jsx("span", { className: "retune-slider-value", children: displayValue })
        ] })
      ]
    }
  );
}
var FALLBACK_FONTS = [
  "system-ui",
  "sans-serif",
  "serif",
  "monospace"
];
function detectProjectFonts() {
  const fonts = /* @__PURE__ */ new Set();
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (!(rule instanceof CSSStyleRule)) continue;
          const ff = rule.style.getPropertyValue("font-family");
          if (!ff || ff.trim().startsWith("var(")) continue;
          for (const part of ff.split(",")) {
            const name = part.trim().replace(/^["']|["']$/g, "");
            if (name.startsWith("var(")) continue;
            if (name && !FALLBACK_FONTS.includes(name)) {
              fonts.add(name);
            }
          }
        }
      } catch {
      }
    }
  } catch {
  }
  return Array.from(fonts).sort();
}
var projectFontsCache = null;
function getProjectFonts() {
  if (!projectFontsCache) {
    projectFontsCache = detectProjectFonts();
    setTimeout(() => {
      projectFontsCache = null;
    }, 1e4);
  }
  return projectFontsCache;
}
async function queryLocalFonts() {
  try {
    if (!("queryLocalFonts" in window)) return [];
    const fonts = await window.queryLocalFonts();
    const families = /* @__PURE__ */ new Set();
    for (const font of fonts) {
      families.add(font.family);
    }
    return Array.from(families).sort();
  } catch {
    return [];
  }
}
function extractPrimaryFont(fontFamily) {
  if (!fontFamily) return "";
  const first = fontFamily.split(",")[0].trim();
  return first.replace(/^["']|["']$/g, "");
}
function FontInput({ prop, value, onChange, isChanged, onReset }) {
  const primaryFont = extractPrimaryFont(value || "");
  const [localValue, setLocalValue] = useState(primaryFont);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const [search, setSearch] = useState("");
  const [systemFonts, setSystemFonts] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [fontCategory, setFontCategory] = useState("all");
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const stableCloseRef = useRef(() => setPickerOpen(false));
  const [fontPermissionDenied, setFontPermissionDenied] = useState(false);
  useEffect(() => {
    if (systemFonts !== null) return;
    if (!("queryLocalFonts" in window)) return;
    try {
      navigator.permissions.query({ name: "local-fonts" }).then((result) => {
        if (result.state === "granted") {
          queryLocalFonts().then((fonts) => setSystemFonts(fonts));
        } else if (result.state === "denied") {
          setSystemFonts([]);
          setFontPermissionDenied(true);
        }
      }).catch(() => {
      });
    } catch {
    }
  }, [systemFonts]);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(extractPrimaryFont(value || ""));
  }
  const projectFonts = useMemo(() => getProjectFonts(), []);
  const deduplicatedSystem = useMemo(
    () => (systemFonts || []).filter((f) => !projectFonts.some((p4) => p4.toLowerCase() === f.toLowerCase())),
    [systemFonts, projectFonts]
  );
  const matchesSearch = (f) => !search || f.toLowerCase().includes(search.toLowerCase());
  const filteredProject = fontCategory === "all" || fontCategory === "project" ? projectFonts.filter(matchesSearch) : [];
  const filteredSystem = fontCategory === "all" || fontCategory === "system" ? deduplicatedSystem.filter(matchesSearch) : [];
  const filteredFallbacks = fontCategory === "all" || fontCategory === "generic" ? FALLBACK_FONTS.filter(matchesSearch) : [];
  const allFiltered = [...filteredProject, ...filteredSystem, ...filteredFallbacks];
  const openPicker = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (pickerOpen) {
      releaseDialog(stableCloseRef.current);
      setPickerOpen(false);
      return;
    }
    const row = el.closest(".retune-row");
    const rect = row ? row.getBoundingClientRect() : el.getBoundingClientRect();
    setAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setPickerOpen(true);
    setSearch("");
    setHighlightedIndex(-1);
    claimDialog(stableCloseRef.current);
  }, [pickerOpen]);
  const closePicker = useCallback(() => {
    releaseDialog(stableCloseRef.current);
    setPickerOpen(false);
    setSearch("");
  }, []);
  const handleSelect = useCallback((fontName) => {
    setLocalValue(fontName);
    onChange(prop, fontName);
    closePicker();
  }, [prop, onChange, closePicker]);
  const loadSystemFonts = useCallback(async () => {
    if (systemFonts !== null) return;
    try {
      const fonts = await queryLocalFonts();
      setSystemFonts(fonts);
    } catch {
      setSystemFonts([]);
      setFontPermissionDenied(true);
    }
  }, [systemFonts]);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const handleClick = (e2) => {
      const target = e2.target;
      const item = target.closest("[data-font-name]");
      if (!item) return;
      e2.preventDefault();
      e2.stopPropagation();
      const name = item.dataset.fontName;
      if (name === "__load_system") {
        loadSystemFonts();
        return;
      }
      if (name) handleSelect(name);
    };
    list.addEventListener("pointerdown", handleClick);
    return () => list.removeEventListener("pointerdown", handleClick);
  }, [pickerOpen, handleSelect, loadSystemFonts]);
  const handleSearchKeyDown = useCallback((e2) => {
    const count = allFiltered.length;
    if (count === 0) return;
    if (e2.key === "ArrowDown") {
      e2.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % count);
    } else if (e2.key === "ArrowUp") {
      e2.preventDefault();
      setHighlightedIndex((prev) => prev <= 0 ? count - 1 : prev - 1);
    } else if (e2.key === "Enter") {
      e2.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < count) {
        handleSelect(allFiltered[highlightedIndex]);
      }
    }
  }, [allFiltered, highlightedIndex, handleSelect]);
  useEffect(() => {
    if (highlightedIndex < 0) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector(`[data-font-index="${highlightedIndex}"]`);
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);
  const portalTarget = containerRef.current?.getRootNode() instanceof ShadowRoot ? containerRef.current.getRootNode().querySelector("[data-retune-container]") : null;
  let flatIndex = 0;
  return /* @__PURE__ */ jsxs("div", { className: "retune-font-input", ref: containerRef, children: [
    /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isChanged ?? false, onReset: onReset ?? (() => {
    }) }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "retune-font-input-trigger",
        onClick: openPicker,
        children: [
          /* @__PURE__ */ jsx("span", { className: "retune-font-input-value", style: { fontFamily: primaryFont || void 0 }, children: primaryFont || "\u2013" }),
          /* @__PURE__ */ jsx(ChevronDown, {})
        ]
      }
    ),
    pickerOpen && anchorRect && portalTarget && createPortal(
      /* @__PURE__ */ jsxs(
        FloatingDialog,
        {
          title: "Fonts",
          onClose: closePicker,
          anchorRect,
          search: {
            value: search,
            onChange: setSearch,
            placeholder: "Search fonts...",
            onKeyDown: handleSearchKeyDown
          },
          maxHeight: 400,
          minHeight: 400,
          children: [
            /* @__PURE__ */ jsx("div", { className: "retune-font-filter", children: /* @__PURE__ */ jsx(
              SelectInput,
              {
                prop: "__fontCategory",
                value: fontCategory,
                options: ["all", "project", "system", "generic"],
                onChange: (_, val) => setFontCategory(val)
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { ref: listRef, className: "retune-font-list", children: [
              filteredProject.length > 0 && /* @__PURE__ */ jsxs(Fragment$1, { children: [
                /* @__PURE__ */ jsx("div", { className: "retune-font-section-title", children: "Project fonts" }),
                filteredProject.map((font) => {
                  const idx = flatIndex++;
                  return /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `retune-font-item${font === primaryFont ? " retune-font-item-active" : ""}${idx === highlightedIndex ? " retune-font-item-highlighted" : ""}`,
                      "data-font-name": font,
                      "data-font-index": idx,
                      style: { fontFamily: font },
                      children: font
                    },
                    font
                  );
                })
              ] }),
              filteredSystem.length > 0 && /* @__PURE__ */ jsxs(Fragment$1, { children: [
                /* @__PURE__ */ jsx("div", { className: "retune-font-section-title", children: "System fonts" }),
                filteredSystem.map((font) => {
                  const idx = flatIndex++;
                  return /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `retune-font-item${font === primaryFont ? " retune-font-item-active" : ""}${idx === highlightedIndex ? " retune-font-item-highlighted" : ""}`,
                      "data-font-name": font,
                      "data-font-index": idx,
                      style: { fontFamily: font },
                      children: font
                    },
                    font
                  );
                })
              ] }),
              filteredFallbacks.length > 0 && /* @__PURE__ */ jsxs(Fragment$1, { children: [
                /* @__PURE__ */ jsx("div", { className: "retune-font-section-title", children: "Generic" }),
                filteredFallbacks.map((font) => {
                  const idx = flatIndex++;
                  return /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `retune-font-item${font === primaryFont ? " retune-font-item-active" : ""}${idx === highlightedIndex ? " retune-font-item-highlighted" : ""}`,
                      "data-font-name": font,
                      "data-font-index": idx,
                      style: { fontFamily: font },
                      children: font
                    },
                    font
                  );
                })
              ] }),
              allFiltered.length === 0 && /* @__PURE__ */ jsx("div", { className: "retune-font-empty", children: "No fonts found" }),
              (fontCategory === "all" || fontCategory === "system") && (systemFonts === null ? /* @__PURE__ */ jsx("div", { className: "retune-font-system-prompt", children: /* @__PURE__ */ jsx(
                "button",
                {
                  className: "retune-font-system-btn",
                  "data-font-name": "__load_system",
                  children: "Load system fonts"
                }
              ) }) : fontPermissionDenied ? /* @__PURE__ */ jsx("div", { className: "retune-font-system-prompt", children: /* @__PURE__ */ jsx("p", { className: "retune-font-denied", children: "Font access denied. Allow in site settings to try again." }) }) : null)
            ] })
          ]
        }
      ),
      portalTarget
    )
  ] });
}
function PinLine({ side, pinned, onClick }) {
  const isVertical = side === "top" || side === "bottom";
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick,
      className: `retune-pin-line ${side}`,
      "aria-label": `${pinned ? "Unpin" : "Pin"} ${side}`,
      children: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: isVertical ? /* @__PURE__ */ jsx("line", { x1: "8", y1: "3", x2: "8", y2: "13", stroke: pinned ? "#3b82f6" : "#d6d3d1", strokeWidth: "2", strokeLinecap: "round" }) : /* @__PURE__ */ jsx("line", { x1: "3", y1: "8", x2: "13", y2: "8", stroke: pinned ? "#3b82f6" : "#d6d3d1", strokeWidth: "2", strokeLinecap: "round" }) })
    }
  );
}
function ConstraintsInput({
  top,
  right,
  bottom,
  left,
  pins,
  centered,
  onChange,
  onPinChange,
  onCenterChange
}) {
  const allPinned = pins.top && pins.right && pins.bottom && pins.left;
  const togglePin = (side) => {
    const wasPinned = pins[side];
    onPinChange(side, !wasPinned);
    if (centered) {
      onCenterChange(false);
      onChange("transform", "none");
    }
    if (wasPinned) {
      onChange(side, "auto");
    } else {
      const values = { top, right, bottom, left };
      const current = values[side];
      if (!current || current === "auto") {
        onChange(side, "0px");
      }
    }
  };
  const handleCenterClick = () => {
    if (centered) {
      onCenterChange(false);
      onPinChange("top", false);
      onPinChange("right", false);
      onPinChange("bottom", false);
      onPinChange("left", false);
      onChange("top", "auto");
      onChange("right", "auto");
      onChange("bottom", "auto");
      onChange("left", "auto");
      onChange("transform", "none");
    } else if (allPinned) {
      onCenterChange(true);
      onChange("top", "50%");
      onChange("right", "auto");
      onChange("bottom", "auto");
      onChange("left", "50%");
      onChange("transform", "translate(-50%, -50%)");
    } else {
      ["top", "right", "bottom", "left"].forEach((s5) => {
        if (!pins[s5]) {
          onPinChange(s5, true);
          const values = { top, right, bottom, left };
          if (!values[s5] || values[s5] === "auto") {
            onChange(s5, "0px");
          }
        }
      });
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "retune-constraints", children: [
    /* @__PURE__ */ jsx("div", { className: "retune-constraints-side", children: /* @__PURE__ */ jsx(NumberInput, { label: "L", prop: "left", value: left, onChange }) }),
    /* @__PURE__ */ jsxs("div", { className: "retune-constraints-center", children: [
      /* @__PURE__ */ jsx(NumberInput, { label: "T", prop: "top", value: top, onChange }),
      /* @__PURE__ */ jsxs("div", { className: "retune-pin-box", children: [
        /* @__PURE__ */ jsx(PinLine, { side: "top", pinned: !centered && pins.top, onClick: () => togglePin("top") }),
        /* @__PURE__ */ jsx(PinLine, { side: "right", pinned: !centered && pins.right, onClick: () => togglePin("right") }),
        /* @__PURE__ */ jsx(PinLine, { side: "bottom", pinned: !centered && pins.bottom, onClick: () => togglePin("bottom") }),
        /* @__PURE__ */ jsx(PinLine, { side: "left", pinned: !centered && pins.left, onClick: () => togglePin("left") }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: handleCenterClick,
            className: "retune-pin-center-btn",
            "aria-label": centered ? "Clear center alignment" : allPinned ? "Align to center" : "Pin all sides",
            children: centered && /* @__PURE__ */ jsx("span", { className: "retune-pin-center-dot" })
          }
        )
      ] }),
      /* @__PURE__ */ jsx(NumberInput, { label: "B", prop: "bottom", value: bottom, onChange })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "retune-constraints-side", children: /* @__PURE__ */ jsx(NumberInput, { label: "R", prop: "right", value: right, onChange }) })
  ] });
}
var COORDS_TO_POSITION = [
  ["top-left", "top-center", "top-right"],
  ["center-left", "center-center", "center-right"],
  ["bottom-left", "bottom-center", "bottom-right"]
];
var POSITION_TO_COORDS = {
  "top-left": { row: 0, col: 0 },
  "top-center": { row: 0, col: 1 },
  "top-right": { row: 0, col: 2 },
  "center-left": { row: 1, col: 0 },
  "center-center": { row: 1, col: 1 },
  "center-right": { row: 1, col: 2 },
  "bottom-left": { row: 2, col: 0 },
  "bottom-center": { row: 2, col: 1 },
  "bottom-right": { row: 2, col: 2 }
};
var SB_VERTICAL_CANONICAL = ["center-left", "center-center", "center-right"];
var SB_HORIZONTAL_CANONICAL = ["top-center", "center-center", "bottom-center"];
var JUSTIFY_VALUES = ["flex-start", "center", "flex-end"];
var ALIGN_VALUES = ["flex-start", "center", "flex-end"];
function toJustifyIdx(v) {
  if (v === "center") return 1;
  if (v === "flex-end" || v === "end") return 2;
  return 0;
}
function toAlignIdx(v) {
  if (v === "center") return 1;
  if (v === "flex-end" || v === "end") return 2;
  return 0;
}
function cssToPosition(justifyContent, alignItems, flow) {
  const jIdx = toJustifyIdx(justifyContent);
  const aIdx = toAlignIdx(alignItems);
  if (flow === "vertical") return COORDS_TO_POSITION[jIdx][aIdx];
  return COORDS_TO_POSITION[aIdx][jIdx];
}
function positionToCss(row, col, flow) {
  if (flow === "vertical") {
    return { justifyContent: JUSTIFY_VALUES[row], alignItems: ALIGN_VALUES[col] };
  }
  return { justifyContent: JUSTIFY_VALUES[col], alignItems: ALIGN_VALUES[row] };
}
function getFlow(flexDirection) {
  return flexDirection.startsWith("column") ? "vertical" : "horizontal";
}
function IconDot({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M8 7C8.55228 7 9 7.44772 9 8C9 8.55228 8.55228 9 8 9C7.44772 9 7 8.55228 7 8C7 7.44772 7.44772 7 8 7Z", fill: color, fillOpacity: 0.3 }) });
}
function IconPositionLeft({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M4 3C3.44772 3 3 3.44772 3 4C3 4.55228 3.44772 5 4 5L9 5C9.55228 5 10 4.55229 10 4C10 3.44772 9.55228 3 9 3L4 3ZM4 7C3.44772 7 3 7.44772 3 8C3 8.55228 3.44772 9 4 9L12 9C12.5523 9 13 8.55229 13 8C13 7.44772 12.5523 7 12 7L4 7ZM3 12C3 11.4477 3.44771 11 4 11L7 11C7.55228 11 8 11.4477 8 12C8 12.5523 7.55228 13 7 13L4 13C3.44771 13 3 12.5523 3 12Z", fill: color }) });
}
function IconPositionCenterH({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M10 3C10.5523 3 11 3.44772 11 4C11 4.55228 10.5523 5 10 5L6 5C5.44772 5 5 4.55228 5 4C5 3.44772 5.44772 3 6 3H10ZM12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9L4 9C3.44772 9 3 8.55228 3 8C3 7.44771 3.44772 7 4 7L12 7ZM10 12C10 11.4477 9.55228 11 9 11H7C6.44772 11 6 11.4477 6 12C6 12.5523 6.44772 13 7 13H9C9.55228 13 10 12.5523 10 12Z", fill: color }) });
}
function IconPositionRight({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M4 7C3.44772 7 3 7.44772 3 8C3 8.55228 3.44772 9 4 9L12 9C12.5523 9 13 8.55229 13 8C13 7.44772 12.5523 7 12 7L4 7ZM7 3C6.44772 3 6 3.44772 6 4C6 4.55228 6.44772 5 7 5L12 5C12.5523 5 13 4.55229 13 4C13 3.44772 12.5523 3 12 3L7 3ZM8 12C8 11.4477 8.44771 11 9 11L12 11C12.5523 11 13 11.4477 13 12C13 12.5523 12.5523 13 12 13L9 13C8.44771 13 8 12.5523 8 12Z", fill: color }) });
}
function IconPositionTop({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M3 4C3 3.44772 3.44772 3 4 3C4.55228 3 5 3.44772 5 4V9C5 9.55228 4.55228 10 4 10C3.44772 10 3 9.55228 3 9V4ZM7 4C7 3.44772 7.44772 3 8 3C8.55228 3 9 3.44772 9 4V12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12V4ZM12 3C11.4477 3 11 3.44772 11 4V7C11 7.55228 11.4477 8 12 8C12.5523 8 13 7.55228 13 7V4C13 3.44772 12.5523 3 12 3Z", fill: color }) });
}
function IconPositionCenterV({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M7 4C7 3.44772 7.44772 3 8 3C8.55228 3 9 3.44772 9 4V12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12V4ZM3 6C3 5.44772 3.44772 5 4 5C4.55228 5 5 5.44772 5 6V10C5 10.5523 4.55228 11 4 11C3.44772 11 3 10.5523 3 10V6ZM12 6C11.4477 6 11 6.44772 11 7V9C11 9.55228 11.4477 10 12 10C12.5523 10 13 9.55228 13 9V7C13 6.44772 12.5523 6 12 6Z", fill: color }) });
}
function IconPositionBottom({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M7 4C7 3.44772 7.44772 3 8 3C8.55228 3 9 3.44772 9 4V12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12V4ZM3 7C3 6.44772 3.44772 6 4 6C4.55228 6 5 6.44772 5 7V12C5 12.5523 4.55228 13 4 13C3.44772 13 3 12.5523 3 12V7ZM12 8C11.4477 8 11 8.44772 11 9V12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12V9C13 8.44772 12.5523 8 12 8Z", fill: color }) });
}
function IconSBBarH({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M12 7C12.5523 7 13 7.44772 13 8C13 8.55229 12.5523 9 12 9L4 9C3.44772 9 3 8.55228 3 8C3 7.44772 3.44771 7 4 7L12 7Z", fill: color }) });
}
function IconSBBarHLeft({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M4 7C3.44772 7 3 7.44772 3 8C3 8.55228 3.44772 9 4 9L8 9C8.55228 9 9 8.55229 9 8C9 7.44772 8.55228 7 8 7L4 7Z", fill: color }) });
}
function IconSBBarHCenter({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M6 7C5.44772 7 5 7.44772 5 8C5 8.55228 5.44772 9 6 9L10 9C10.5523 9 11 8.55228 11 8C11 7.44772 10.5523 7 10 7L6 7Z", fill: color }) });
}
function IconSBBarHRight({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9L12 9C12.5523 9 13 8.55229 13 8C13 7.44772 12.5523 7 12 7L8 7Z", fill: color }) });
}
function IconSBBarV({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M7 4C7 3.44772 7.44772 3 8 3C8.55228 3 9 3.44772 9 4V12C9 12.5523 8.55228 13 8 13C7.44772 13 7 12.5523 7 12V4Z", fill: color }) });
}
function IconSBBarVTop({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 3C7.44772 3 7 3.44772 7 4V8C7 8.55228 7.44772 9 8 9C8.55228 9 9 8.55228 9 8V4C9 3.44772 8.55228 3 8 3Z", fill: color }) });
}
function IconSBBarVCenter({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 5C7.44772 5 7 5.44772 7 6V10C7 10.5523 7.44772 11 8 11C8.55228 11 9 10.5523 9 10V6C9 5.44772 8.55228 5 8 5Z", fill: color }) });
}
function IconSBBarVBottom({ color }) {
  return /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M8 7C7.44772 7 7 7.44772 7 8V12C7 12.5523 7.44772 13 8 13C8.55228 13 9 12.5523 9 12V8C9 7.44772 8.55228 7 8 7Z", fill: color }) });
}
var BLUE = "#0D99FF";
var GRAY = "#a8a29e";
var CELL_TOOLTIPS = {
  "0-0": "Align top left",
  "0-1": "Align top center",
  "0-2": "Align top right",
  "1-0": "Align center left",
  "1-1": "Align center",
  "1-2": "Align center right",
  "2-0": "Align bottom left",
  "2-1": "Align bottom center",
  "2-2": "Align bottom right"
};
function getSelectedIcon(position, flow) {
  const { row, col } = POSITION_TO_COORDS[position];
  if (flow === "vertical") {
    return col === 0 ? IconPositionLeft : col === 1 ? IconPositionCenterH : IconPositionRight;
  }
  return row === 0 ? IconPositionTop : row === 1 ? IconPositionCenterV : IconPositionBottom;
}
function getSpaceBetweenIcon(row, col, activeGroup, flow) {
  if (flow === "vertical") {
    if (col !== activeGroup) return null;
    const isEdge = row === 0 || row === 2;
    if (isEdge) return IconSBBarH;
    return activeGroup === 0 ? IconSBBarHLeft : activeGroup === 1 ? IconSBBarHCenter : IconSBBarHRight;
  } else {
    if (row !== activeGroup) return null;
    const isEdge = col === 0 || col === 2;
    if (isEdge) return IconSBBarV;
    return activeGroup === 0 ? IconSBBarVTop : activeGroup === 1 ? IconSBBarVCenter : IconSBBarVBottom;
  }
}
function AlignmentGrid({ justifyContent, alignItems, flexDirection, onChange }) {
  const flow = getFlow(flexDirection);
  const isSpaceBetween = justifyContent === "space-between";
  const position = isSpaceBetween ? flow === "vertical" ? SB_VERTICAL_CANONICAL[toAlignIdx(alignItems)] : SB_HORIZONTAL_CANONICAL[toAlignIdx(alignItems)] : cssToPosition(justifyContent, alignItems, flow);
  const selectedCoords = POSITION_TO_COORDS[position];
  const activeGroup = isSpaceBetween ? flow === "vertical" ? selectedCoords.col : selectedCoords.row : -1;
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const handleClick = useCallback((row, col) => {
    if (isSpaceBetween) {
      const crossIdx = flow === "vertical" ? col : row;
      onChange("alignItems", ALIGN_VALUES[crossIdx]);
    } else {
      const css = positionToCss(row, col, flow);
      onChange("justifyContent", css.justifyContent);
      onChange("alignItems", css.alignItems);
    }
  }, [flow, isSpaceBetween, onChange]);
  const handleDoubleClick = useCallback(() => {
    if (isSpaceBetween) {
      const css = positionToCss(selectedCoords.row, selectedCoords.col, flow);
      onChange("justifyContent", css.justifyContent);
    } else {
      onChange("justifyContent", "space-between");
    }
  }, [isSpaceBetween, selectedCoords, flow, onChange]);
  const handleKeyDown = useCallback((e2) => {
    const { row, col } = selectedCoords;
    let newRow = row;
    let newCol = col;
    if (isSpaceBetween) {
      if (flow === "vertical") {
        if (e2.key === "ArrowLeft") {
          newCol = Math.max(0, col - 1);
          e2.preventDefault();
        } else if (e2.key === "ArrowRight") {
          newCol = Math.min(2, col + 1);
          e2.preventDefault();
        } else return;
      } else {
        if (e2.key === "ArrowUp") {
          newRow = Math.max(0, row - 1);
          e2.preventDefault();
        } else if (e2.key === "ArrowDown") {
          newRow = Math.min(2, row + 1);
          e2.preventDefault();
        } else return;
      }
    } else {
      switch (e2.key) {
        case "ArrowUp":
          newRow = Math.max(0, row - 1);
          e2.preventDefault();
          break;
        case "ArrowDown":
          newRow = Math.min(2, row + 1);
          e2.preventDefault();
          break;
        case "ArrowLeft":
          newCol = Math.max(0, col - 1);
          e2.preventDefault();
          break;
        case "ArrowRight":
          newCol = Math.min(2, col + 1);
          e2.preventDefault();
          break;
        default:
          return;
      }
    }
    if (newRow !== row || newCol !== col) {
      if (isSpaceBetween) {
        const crossIdx = flow === "vertical" ? newCol : newRow;
        onChange("alignItems", ALIGN_VALUES[crossIdx]);
      } else {
        const css = positionToCss(newRow, newCol, flow);
        onChange("justifyContent", css.justifyContent);
        onChange("alignItems", css.alignItems);
      }
    }
  }, [selectedCoords, isSpaceBetween, flow, onChange]);
  const handleMouseEnter = useCallback((row, col) => {
    if (isSpaceBetween) {
      setHoveredGroup(flow === "vertical" ? col : row);
    } else {
      setHoveredPosition(COORDS_TO_POSITION[row][col]);
    }
  }, [isSpaceBetween, flow]);
  const handleMouseLeave = useCallback(() => {
    setHoveredGroup(null);
    setHoveredPosition(null);
  }, []);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "retune-alignment-grid",
      tabIndex: 0,
      role: "grid",
      "aria-label": "Alignment grid",
      onKeyDown: handleKeyDown,
      onDoubleClick: handleDoubleClick,
      children: [0, 1, 2].map(
        (row) => [0, 1, 2].map((col) => {
          const pos = COORDS_TO_POSITION[row][col];
          return /* @__PURE__ */ jsx(Tooltip, { content: CELL_TOOLTIPS[`${row}-${col}`], side: "bottom", delay: 600, children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "retune-alignment-cell",
              onClick: () => handleClick(row, col),
              onMouseEnter: () => handleMouseEnter(row, col),
              onMouseLeave: handleMouseLeave,
              tabIndex: -1,
              "aria-label": pos.replace("-", " "),
              children: isSpaceBetween ? renderSpaceBetweenCell(row, col, activeGroup, hoveredGroup, flow) : renderNormalCell(row, col, selectedCoords, hoveredPosition, pos, flow)
            }
          ) }, `${row}-${col}`);
        })
      )
    }
  );
}
function renderNormalCell(row, col, selectedCoords, hoveredPosition, position, flow) {
  const isSelected = row === selectedCoords.row && col === selectedCoords.col;
  if (isSelected) {
    const Icon = getSelectedIcon(position, flow);
    return /* @__PURE__ */ jsx(Icon, { color: BLUE });
  }
  if (hoveredPosition === position) {
    const Icon = getSelectedIcon(position, flow);
    return /* @__PURE__ */ jsx(Icon, { color: GRAY });
  }
  return /* @__PURE__ */ jsx(IconDot, { color: GRAY });
}
function renderSpaceBetweenCell(row, col, activeGroup, hoveredGroup, flow) {
  const cellGroup = flow === "vertical" ? col : row;
  const isActive = cellGroup === activeGroup;
  const isHovered = hoveredGroup !== null && cellGroup === hoveredGroup && !isActive;
  if (isActive) {
    const Icon = getSpaceBetweenIcon(row, col, activeGroup, flow);
    if (Icon) return /* @__PURE__ */ jsx(Icon, { color: BLUE });
  }
  if (isHovered) {
    const Icon = getSpaceBetweenIcon(row, col, cellGroup, flow);
    if (Icon) return /* @__PURE__ */ jsx(Icon, { color: GRAY });
  }
  return /* @__PURE__ */ jsx(IconDot, { color: GRAY });
}
var MAX_COLS = 10;
var MAX_ROWS = 10;
function parseGridCount(template) {
  if (!template || template === "none") return 0;
  const repeatMatch = template.match(/repeat\((\d+)/);
  if (repeatMatch) return parseInt(repeatMatch[1], 10);
  const tracks = template.trim().split(/\s+/).filter((t2) => t2 && t2 !== "none");
  return tracks.length;
}
function GridPicker({ columns, rows, onChange }) {
  const [open, setOpen] = useState(false);
  const [hoverCol, setHoverCol] = useState(0);
  const [hoverRow, setHoverRow] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef(null);
  useScrollLock(open);
  const displayCols = Math.max(1, columns || 1);
  const displayRows = Math.max(1, rows || 1);
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e2) => {
      const container = containerRef.current;
      if (!container) return;
      if (!e2.composedPath().includes(container)) {
        setOpen(false);
      }
    };
    const root = containerRef.current?.getRootNode();
    root.addEventListener("pointerdown", handlePointerDown);
    return () => root.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);
  const handleSelect = useCallback(() => {
    if (hoverCol > 0 && hoverRow > 0) {
      onChange("gridTemplateColumns", `repeat(${hoverCol}, 1fr)`);
      onChange("gridTemplateRows", `repeat(${hoverRow}, 1fr)`);
      setOpen(false);
    }
  }, [hoverCol, hoverRow, onChange]);
  const previewCols = isHovering ? hoverCol : columns;
  const previewRows = isHovering ? hoverRow : rows;
  return /* @__PURE__ */ jsxs("div", { className: "retune-grid-picker-wrap", ref: containerRef, children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "retune-grid-picker-preview",
        onClick: () => setOpen(!open),
        "aria-label": `Grid: ${displayCols} \xD7 ${displayRows}`,
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            className: "retune-grid-picker-mini",
            style: {
              gridTemplateColumns: `repeat(${displayCols}, 1fr)`,
              gridTemplateRows: `repeat(${displayRows}, 1fr)`
            },
            children: [
              Array.from({ length: displayCols * displayRows }, (_, i3) => /* @__PURE__ */ jsx("div", { className: "retune-grid-picker-mini-cell" }, i3)),
              /* @__PURE__ */ jsxs("span", { className: "retune-grid-picker-label", children: [
                displayCols,
                " \xD7 ",
                displayRows
              ] })
            ]
          }
        )
      }
    ),
    open && /* @__PURE__ */ jsxs("div", { className: "retune-grid-picker-dialog", children: [
      /* @__PURE__ */ jsx("div", { className: "retune-grid-picker-dialog-header", children: previewCols > 0 && previewRows > 0 ? `${previewCols} \xD7 ${previewRows}` : "Select grid size" }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "retune-grid-picker-grid",
          onMouseLeave: () => setIsHovering(false),
          onClick: handleSelect,
          children: Array.from(
            { length: MAX_ROWS },
            (_, r) => Array.from({ length: MAX_COLS }, (_2, c3) => {
              const col = c3 + 1;
              const row = r + 1;
              const isSelected = !isHovering && col <= columns && row <= rows;
              const isPreview = isHovering && col <= hoverCol && row <= hoverRow;
              return /* @__PURE__ */ jsx(
                "div",
                {
                  className: `retune-grid-picker-cell${isSelected ? " selected" : ""}${isPreview ? " preview" : ""}`,
                  onMouseEnter: () => {
                    setIsHovering(true);
                    setHoverCol(col);
                    setHoverRow(row);
                  }
                },
                `${r}-${c3}`
              );
            })
          )
        }
      )
    ] })
  ] });
}
function defaultGradient() {
  return {
    type: "linear",
    angle: 180,
    stops: [
      { color: "#ffffff", position: 0, opacity: 100 },
      { color: "#000000", position: 1, opacity: 100 }
    ]
  };
}
function gradientToCss(gradient) {
  if (gradient.stops.length < 2) return "none";
  const sorted = [...gradient.stops].sort((a4, b) => a4.position - b.position);
  const stopsCss = sorted.map((s5) => {
    const alpha = (s5.opacity ?? 100) / 100;
    const color = alpha < 1 ? hexToRgba(s5.color, Math.round(alpha * 100)) : s5.color;
    return `${color} ${Math.round(s5.position * 100)}%`;
  }).join(", ");
  switch (gradient.type) {
    case "linear":
      return `linear-gradient(${gradient.angle}deg, ${stopsCss})`;
    case "radial":
      return `radial-gradient(circle, ${stopsCss})`;
    case "conic":
      return `conic-gradient(from ${gradient.angle}deg, ${stopsCss})`;
  }
}
function gradientBarCss(stops) {
  const sorted = [...stops].sort((a4, b) => a4.position - b.position);
  const stopsCss = sorted.map((s5) => {
    const alpha = (s5.opacity ?? 100) / 100;
    const color = alpha < 1 ? hexToRgba(s5.color, Math.round(alpha * 100)) : s5.color;
    return `${color} ${Math.round(s5.position * 100)}%`;
  }).join(", ");
  return `linear-gradient(to right, ${stopsCss})`;
}
function parseCssGradient(css) {
  if (!css || css === "none") return null;
  const linearMatch = css.match(/^linear-gradient\((.+)\)$/);
  const radialMatch = css.match(/^radial-gradient\((.+)\)$/);
  const conicMatch = css.match(/^conic-gradient\((.+)\)$/);
  let type = "linear";
  let angle = 180;
  let stopsStr = "";
  if (linearMatch) {
    type = "linear";
    const inner = linearMatch[1];
    const angleMatch = inner.match(/^(\d+(?:\.\d+)?)deg\s*,\s*(.+)$/);
    if (angleMatch) {
      angle = parseFloat(angleMatch[1]);
      stopsStr = angleMatch[2];
    } else {
      const dirMatch = inner.match(/^to\s+([\w\s]+)\s*,\s*(.+)$/);
      if (dirMatch) {
        angle = directionToAngle(dirMatch[1].trim());
        stopsStr = dirMatch[2];
      } else {
        stopsStr = inner;
      }
    }
  } else if (radialMatch) {
    type = "radial";
    const inner = radialMatch[1];
    const shapeMatch = inner.match(/^(?:circle|ellipse)(?:\s+[^,]*)?\s*,\s*(.+)$/);
    stopsStr = shapeMatch ? shapeMatch[1] : inner;
  } else if (conicMatch) {
    type = "conic";
    const inner = conicMatch[1];
    const fromMatch = inner.match(/^from\s+(\d+(?:\.\d+)?)deg\s*,\s*(.+)$/);
    if (fromMatch) {
      angle = parseFloat(fromMatch[1]);
      stopsStr = fromMatch[2];
    } else {
      stopsStr = inner;
    }
  } else {
    return null;
  }
  const stops = parseStopsString(stopsStr);
  if (stops.length < 2) return null;
  return { type, angle, stops };
}
function parseStopsString(str) {
  const stops = [];
  const parts = splitGradientStops(str);
  for (let i3 = 0; i3 < parts.length; i3++) {
    const part = parts[i3].trim();
    if (!part) continue;
    const posMatch = part.match(/^(.+?)\s+(\d+(?:\.\d+)?)%$/);
    let colorStr;
    let position;
    if (posMatch) {
      colorStr = posMatch[1].trim();
      position = parseFloat(posMatch[2]) / 100;
    } else {
      colorStr = part;
      position = parts.length > 1 ? i3 / (parts.length - 1) : 0;
    }
    const { hex, opacity } = parseCssColor(colorStr);
    stops.push({ color: hex, position, opacity });
  }
  return stops;
}
function splitGradientStops(str) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}
function directionToAngle(dir) {
  const map = {
    "top": 0,
    "top right": 45,
    "right": 90,
    "bottom right": 135,
    "bottom": 180,
    "bottom left": 225,
    "left": 270,
    "top left": 315
  };
  return map[dir] ?? 180;
}
function interpolateColor(stops, position) {
  const sorted = [...stops].sort((a4, b) => a4.position - b.position);
  let left = sorted[0];
  let right = sorted[sorted.length - 1];
  for (let i3 = 0; i3 < sorted.length - 1; i3++) {
    if (sorted[i3].position <= position && sorted[i3 + 1].position >= position) {
      left = sorted[i3];
      right = sorted[i3 + 1];
      break;
    }
  }
  const range = right.position - left.position;
  const t2 = range === 0 ? 0 : (position - left.position) / range;
  const lRgb = hexToRgb(left.color);
  const rRgb = hexToRgb(right.color);
  return rgbToHex(
    Math.round(lRgb.r + (rRgb.r - lRgb.r) * t2),
    Math.round(lRgb.g + (rRgb.g - lRgb.g) * t2),
    Math.round(lRgb.b + (rRgb.b - lRgb.b) * t2)
  );
}
function detectFillMode(backgroundColor, backgroundImage) {
  if (backgroundImage && backgroundImage !== "none") {
    const gradient = parseCssGradient(backgroundImage);
    if (gradient) return gradient.type;
  }
  return "solid";
}
function GradientStopBar({
  stops,
  selectedIndex,
  onSelectStop,
  onStopPositionChange,
  onAddStop,
  gradientCss
}) {
  const barRef = useRef(null);
  const isDraggingRef = useRef(false);
  const draggingIndexRef = useRef(null);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  const onStopPositionChangeRef = useRef(onStopPositionChange);
  onStopPositionChangeRef.current = onStopPositionChange;
  const onSelectStopRef = useRef(onSelectStop);
  onSelectStopRef.current = onSelectStop;
  const getPosition = useCallback((clientX) => {
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);
  const findClosestStop = useCallback((clientX) => {
    const pos = getPosition(clientX);
    let closest = 0;
    let minDist = Infinity;
    for (let i3 = 0; i3 < stopsRef.current.length; i3++) {
      const dist = Math.abs(stopsRef.current[i3].position - pos);
      if (dist < minDist) {
        minDist = dist;
        closest = i3;
      }
    }
    const rect = barRef.current.getBoundingClientRect();
    const pxDist = minDist * rect.width;
    return pxDist < 20 ? closest : null;
  }, [getPosition]);
  const handlePointerDown = useCallback(
    (e2) => {
      const index2 = findClosestStop(e2.clientX);
      if (index2 === null) return;
      e2.stopPropagation();
      e2.preventDefault();
      isDraggingRef.current = true;
      draggingIndexRef.current = index2;
      onSelectStopRef.current(index2);
      const handleMove = (me) => {
        if (draggingIndexRef.current === null) return;
        onStopPositionChangeRef.current(draggingIndexRef.current, getPosition(me.clientX));
      };
      const handleUp = () => {
        isDraggingRef.current = false;
        draggingIndexRef.current = null;
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUp);
      };
      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
    },
    [findClosestStop, getPosition]
  );
  const handleBarClick = useCallback(
    (e2) => {
      if (isDraggingRef.current) return;
      const index2 = findClosestStop(e2.clientX);
      if (index2 !== null) return;
      const position = getPosition(e2.clientX);
      const color = interpolateColor(stops, position);
      onAddStop(position, color);
    },
    [stops, onAddStop, getPosition, findClosestStop]
  );
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "retune-gradient-bar-wrap",
      onClick: handleBarClick,
      onPointerDown: handlePointerDown,
      children: [
        /* @__PURE__ */ jsxs("div", { ref: barRef, className: "retune-gradient-bar", children: [
          /* @__PURE__ */ jsx("div", { className: "retune-gradient-bar-checker" }),
          /* @__PURE__ */ jsx("div", { className: "retune-gradient-bar-fill", style: { backgroundImage: gradientCss } })
        ] }),
        stops.map((stop, index2) => /* @__PURE__ */ jsx(
          "div",
          {
            className: "retune-gradient-stop-handle",
            style: { left: `${stop.position * 100}%`, pointerEvents: "none" },
            children: /* @__PURE__ */ jsxs("div", { className: "retune-gradient-stop-indicator", children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "retune-gradient-stop-chit",
                  style: {
                    backgroundColor: selectedIndex === index2 ? "#0d99ff" : "white"
                  },
                  children: /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "retune-gradient-stop-chit-color",
                      style: { backgroundColor: stop.color }
                    }
                  )
                }
              ),
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "retune-gradient-stop-caret",
                  style: {
                    backgroundColor: selectedIndex === index2 ? "#0d99ff" : "white"
                  }
                }
              )
            ] })
          },
          index2
        ))
      ]
    }
  );
}
function GradientEditor({ gradient, onChange, originalGradient, isNewGradient }) {
  const [selectedStop, setSelectedStop] = useState(0);
  const [angleInput, setAngleInput] = useState(`${gradient.angle}\xB0`);
  const [isEditingAngle, setIsEditingAngle] = useState(false);
  const [stopVariables, setStopVariables] = useState(/* @__PURE__ */ new Map());
  const isStopColorChanged = useCallback((index2) => {
    if (isNewGradient || !originalGradient) return false;
    const origStop = originalGradient.stops[index2];
    if (!origStop) return true;
    const curStop = gradient.stops[index2];
    if (!curStop) return false;
    return curStop.color !== origStop.color || (curStop.opacity ?? 100) !== (origStop.opacity ?? 100);
  }, [gradient.stops, originalGradient, isNewGradient]);
  const isStopPositionChanged = useCallback((index2) => {
    if (isNewGradient || !originalGradient) return false;
    const origStop = originalGradient.stops[index2];
    if (!origStop) return true;
    const curStop = gradient.stops[index2];
    if (!curStop) return false;
    return curStop.position !== origStop.position;
  }, [gradient.stops, originalGradient, isNewGradient]);
  const resetStopColor = useCallback((index2) => {
    if (!originalGradient) return;
    const origStop = originalGradient.stops[index2];
    if (!origStop) {
      const newStops = gradient.stops.filter((_, i3) => i3 !== index2);
      onChange({ ...gradient, stops: newStops });
    } else {
      const newStops = [...gradient.stops];
      newStops[index2] = { ...newStops[index2], color: origStop.color, opacity: origStop.opacity };
      onChange({ ...gradient, stops: newStops });
    }
  }, [gradient, originalGradient, onChange]);
  const resetStopPosition = useCallback((index2) => {
    if (!originalGradient) return;
    const origStop = originalGradient.stops[index2];
    if (!origStop) return;
    const newStops = [...gradient.stops];
    newStops[index2] = { ...newStops[index2], position: origStop.position };
    onChange({ ...gradient, stops: newStops });
  }, [gradient, originalGradient, onChange]);
  const [prevAngle, setPrevAngle] = useState(gradient.angle);
  if (gradient.angle !== prevAngle) {
    setPrevAngle(gradient.angle);
    if (!isEditingAngle) setAngleInput(`${gradient.angle}\xB0`);
  }
  const handleStopPositionDrag = useCallback(
    (index2, position) => {
      const newStops = gradient.stops.map(
        (s5, i3) => i3 === index2 ? { ...s5, position } : s5
      );
      onChange({ ...gradient, stops: newStops });
    },
    [gradient, onChange]
  );
  const handleBarAddStop = useCallback(
    (position, color) => {
      const newStops = [...gradient.stops, { color, position, opacity: 100 }];
      onChange({ ...gradient, stops: newStops });
      setSelectedStop(newStops.length - 1);
    },
    [gradient, onChange]
  );
  const handleAngleInputChange = useCallback(
    (e2) => {
      setIsEditingAngle(true);
      const raw = e2.target.value;
      setAngleInput(raw);
      const cleaned = raw.replace(/°/g, "").trim();
      const val = parseInt(cleaned, 10);
      if (!isNaN(val)) {
        onChange({ ...gradient, angle: (val % 360 + 360) % 360 });
      }
    },
    [gradient, onChange]
  );
  const handleAngleBlur = useCallback(() => {
    setIsEditingAngle(false);
    const cleaned = angleInput.replace(/°/g, "").trim();
    const val = parseInt(cleaned, 10);
    const finalAngle = isNaN(val) ? gradient.angle : (val % 360 + 360) % 360;
    onChange({ ...gradient, angle: finalAngle });
    setAngleInput(`${finalAngle}\xB0`);
  }, [angleInput, gradient, onChange]);
  const handleReverse = useCallback(() => {
    const reversed = gradient.stops.map((s5) => ({
      ...s5,
      position: 1 - s5.position
    }));
    reversed.reverse();
    onChange({ ...gradient, stops: reversed });
  }, [gradient, onChange]);
  const handleRotate = useCallback(() => {
    onChange({ ...gradient, angle: (gradient.angle + 45) % 360 });
  }, [gradient, onChange]);
  const handleAddStop = useCallback(() => {
    const color = interpolateColor(gradient.stops, 0.5);
    const newStops = [...gradient.stops, { color, position: 0.5, opacity: 100 }];
    onChange({ ...gradient, stops: newStops });
    setSelectedStop(newStops.length - 1);
  }, [gradient, onChange]);
  const handleRemoveStop = useCallback(
    (index2) => {
      if (gradient.stops.length <= 2) return;
      const newStops = gradient.stops.filter((_, i3) => i3 !== index2);
      onChange({ ...gradient, stops: newStops });
      if (selectedStop >= newStops.length) setSelectedStop(newStops.length - 1);
      else if (selectedStop === index2 && selectedStop > 0) setSelectedStop(selectedStop - 1);
    },
    [gradient, onChange, selectedStop]
  );
  const handleStopPositionInput = useCallback(
    (index2, value) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) return;
      const clamped = Math.max(0, Math.min(100, parsed));
      const newStops = gradient.stops.map(
        (s5, i3) => i3 === index2 ? { ...s5, position: clamped / 100 } : s5
      );
      onChange({ ...gradient, stops: newStops });
    },
    [gradient, onChange]
  );
  const handleStopColorChange = useCallback(
    (index2, _prop, cssValue) => {
      const { hex, opacity } = parseCssColor(cssValue);
      const newStops = gradient.stops.map(
        (s5, i3) => i3 === index2 ? { ...s5, color: hex, opacity } : s5
      );
      onChange({ ...gradient, stops: newStops });
    },
    [gradient, onChange]
  );
  const showAngle = gradient.type !== "radial";
  const sortedStops = gradient.stops.map((stop, index2) => ({ stop, index: index2 })).sort((a4, b) => a4.stop.position - b.stop.position);
  return /* @__PURE__ */ jsxs("div", { className: "retune-gradient-editor", children: [
    /* @__PURE__ */ jsx(
      GradientStopBar,
      {
        stops: gradient.stops,
        selectedIndex: selectedStop,
        onSelectStop: setSelectedStop,
        onStopPositionChange: handleStopPositionDrag,
        onAddStop: handleBarAddStop,
        gradientCss: gradientBarCss(gradient.stops)
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "retune-gradient-controls", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "retune-gradient-angle-input",
          type: "text",
          value: showAngle ? isEditingAngle ? angleInput : `${gradient.angle}\xB0` : "\u2013",
          readOnly: !showAngle,
          disabled: !showAngle,
          onFocus: showAngle ? (e2) => {
            setIsEditingAngle(true);
            setAngleInput(String(gradient.angle));
            requestAnimationFrame(() => e2.target.select());
          } : void 0,
          onBlur: showAngle ? handleAngleBlur : void 0,
          onKeyDown: showAngle ? (e2) => {
            if (e2.key === "Enter") e2.currentTarget.blur();
            if (e2.key === "ArrowUp" || e2.key === "ArrowDown") {
              e2.preventDefault();
              const step = e2.shiftKey ? 15 : 1;
              const delta = e2.key === "ArrowUp" ? step : -step;
              const newAngle = ((gradient.angle + delta) % 360 + 360) % 360;
              onChange({ ...gradient, angle: newAngle });
            }
          } : void 0,
          onChange: showAngle ? handleAngleInputChange : void 0
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "retune-gradient-actions", children: [
        /* @__PURE__ */ jsx(Tooltip, { content: "Reverse gradient direction", children: /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "retune-gradient-action-btn",
            onClick: handleReverse,
            children: /* @__PURE__ */ jsx(FlipHorizontalSmall, {})
          }
        ) }),
        /* @__PURE__ */ jsx(Tooltip, { content: "Rotate gradient 45\xB0", children: /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "retune-gradient-action-btn",
            disabled: !showAngle,
            onClick: handleRotate,
            children: /* @__PURE__ */ jsx(Rotate, {})
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "retune-gradient-stops-header", children: [
      /* @__PURE__ */ jsx("span", { className: "retune-gradient-stops-label", children: "Stops" }),
      /* @__PURE__ */ jsx(Tooltip, { content: "Add color stop", children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "retune-gradient-action-btn",
          onClick: handleAddStop,
          children: /* @__PURE__ */ jsx(Plus, {})
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "retune-gradient-stops-list", children: sortedStops.map(({ stop, index: index2 }) => /* @__PURE__ */ jsxs("div", { className: "retune-gradient-stop-row", children: [
      /* @__PURE__ */ jsxs("div", { className: "retune-gradient-stop-pos", children: [
        /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isStopPositionChanged(index2), onReset: () => resetStopPosition(index2) }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "retune-gradient-stop-pos-input",
            type: "text",
            inputMode: "numeric",
            defaultValue: Math.round(stop.position * 100),
            onBlur: (e2) => handleStopPositionInput(index2, e2.target.value),
            onKeyDown: (e2) => {
              if (e2.key === "Enter") e2.currentTarget.blur();
            }
          },
          `${index2}-${Math.round(stop.position * 100)}`
        ),
        /* @__PURE__ */ jsx("span", { className: "retune-gradient-stop-pos-unit", children: "%" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "retune-gradient-stop-color", children: /* @__PURE__ */ jsx(
        ColorInput,
        {
          prop: `stop-${index2}`,
          value: hexToRgba(stop.color, stop.opacity ?? 100),
          onChange: (_prop, val) => {
            handleStopColorChange(index2, _prop, val);
            if (stopVariables.has(index2)) {
              setStopVariables((prev) => {
                const next = new Map(prev);
                next.delete(index2);
                return next;
              });
            }
          },
          property: "backgroundColor",
          variableMatch: stopVariables.get(index2),
          onVariableApply: (v) => {
            const val = Object.values(v.values)[0];
            if (val) handleStopColorChange(index2, `stop-${index2}`, val);
            setStopVariables((prev) => new Map(prev).set(index2, { variable: v, property: "background-color" }));
          },
          onVariableSelect: (oldV, newV) => {
            const val = Object.values(newV.values)[0];
            if (val) handleStopColorChange(index2, `stop-${index2}`, val);
            setStopVariables((prev) => new Map(prev).set(index2, { variable: newV, property: "background-color" }));
          },
          onVariableUnlink: () => {
            setStopVariables((prev) => {
              const next = new Map(prev);
              next.delete(index2);
              return next;
            });
          },
          isChanged: isStopColorChanged(index2),
          onReset: () => resetStopColor(index2)
        }
      ) }),
      /* @__PURE__ */ jsx(Tooltip, { content: "Remove color stop", children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "retune-gradient-action-btn remove",
          disabled: gradient.stops.length <= 2,
          onClick: () => handleRemoveStop(index2),
          children: /* @__PURE__ */ jsx(Minus, {})
        }
      ) })
    ] }, index2)) })
  ] });
}
function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false
}) {
  const [localValue, setLocalValue] = useState(value);
  const [prevPropValue, setPrevPropValue] = useState(value);
  const containerRef = useRef(null);
  const pillRef = useRef(null);
  const isFirstRender = useRef(true);
  if (value !== prevPropValue) {
    setPrevPropValue(value);
    setLocalValue(value);
  }
  const updatePill = useCallback(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;
    const idx = options.findIndex((o2) => o2.value === localValue);
    if (idx < 0) {
      pill.style.opacity = "0";
      return;
    }
    const buttons = container.querySelectorAll(".retune-segmented-item");
    const btn = buttons[idx];
    if (!btn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const offsetX = btnRect.left - containerRect.left;
    pill.style.opacity = "1";
    pill.style.width = `${btnRect.width}px`;
    if (isFirstRender.current) {
      pill.style.transition = "none";
      pill.style.transform = `translateX(${offsetX}px)`;
      pill.offsetHeight;
      pill.style.transition = "";
      isFirstRender.current = false;
    } else {
      pill.style.transform = `translateX(${offsetX}px)`;
    }
  }, [options, localValue]);
  useLayoutEffect(() => {
    updatePill();
  }, [updatePill]);
  const handleClick = (optValue) => {
    setLocalValue(optValue);
    onChange(optValue);
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: containerRef,
      className: "retune-segmented",
      style: disabled ? { opacity: 0.4, pointerEvents: "none" } : void 0,
      children: [
        /* @__PURE__ */ jsx("div", { ref: pillRef, className: "retune-segmented-pill" }),
        options.map((opt) => {
          const isSelected = localValue === opt.value;
          const button = /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: `retune-segmented-item${isSelected ? " selected" : ""}${opt.disabled ? " disabled" : ""}`,
              onClick: () => handleClick(opt.value),
              disabled: opt.disabled || disabled,
              "aria-label": opt.label,
              "aria-pressed": isSelected,
              children: opt.icon || /* @__PURE__ */ jsx("span", { className: "retune-segmented-text", children: opt.label })
            },
            opt.value
          );
          return opt.icon && opt.label ? /* @__PURE__ */ jsx(Tooltip, { content: opt.label, children: button }, opt.value) : button;
        })
      ]
    }
  );
}
function detectTruncation(styles) {
  const lineClamp = styles.webkitLineClamp;
  const hasClamp = !!lineClamp && lineClamp !== "none" && lineClamp !== "unset";
  if (hasClamp) {
    return { enabled: true, lines: parseInt(lineClamp, 10) || 2 };
  }
  const hasSingleLine = styles.textOverflow === "ellipsis" && styles.whiteSpace === "nowrap";
  if (hasSingleLine) {
    return { enabled: true, lines: 1 };
  }
  return { enabled: false, lines: 1 };
}
function computeTruncationChanges(state, ctx) {
  const changes = {};
  if (!state.enabled) {
    changes.textOverflow = "clip";
    changes.overflow = "visible";
    changes.whiteSpace = "normal";
    changes.webkitLineClamp = "unset";
    changes.webkitBoxOrient = "unset";
    changes.minWidth = "0px";
    if (ctx.currentDisplay === "-webkit-box") {
      changes.display = "block";
    }
    return changes;
  }
  changes.display = "-webkit-box";
  changes.webkitBoxOrient = "vertical";
  changes.webkitLineClamp = String(state.lines);
  changes.overflow = "hidden";
  changes.textOverflow = "ellipsis";
  changes.whiteSpace = "normal";
  changes.minWidth = "0px";
  return changes;
}
function clampNum2(val, min, max) {
  if (min !== void 0 && val < min) return min;
  if (max !== void 0 && val > max) return max;
  return val;
}
function clampCssValue2(val, min, max) {
  if (min === void 0 && max === void 0) return val;
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  const clamped = clampNum2(num, min, max);
  if (clamped === num) return val;
  const unit = val.match(/[a-z%]+$/i)?.[0] || "";
  return `${clamped}${unit}`;
}
function computeDisplay(values) {
  const rounded = values.map((v) => roundCssValue(v || ""));
  if (rounded.every((v) => v === rounded[0])) return rounded[0];
  return rounded.join(", ");
}
function ShorthandInput({ label, props, values, onChange, placeholder, min, max, variableMatch, property, onVariableSelect, onVariableApply, onVariableUnlink, isChanged, onReset }) {
  const [localValue, setLocalValue] = useState(() => computeDisplay(values));
  const [prevValues, setPrevValues] = useState(values);
  const varPickerRef = useRef(null);
  const handleInputClick = useCallback(() => {
    if (variableMatch) varPickerRef.current?.();
  }, [variableMatch]);
  if (values.join("\0") !== prevValues.join("\0")) {
    setPrevValues(values);
    setLocalValue(computeDisplay(values));
  }
  const scrubRef = useRef({ startX: 0, startVals: [], active: false });
  const handleLabelPointerDown = (e2) => {
    const nums = values.map((v) => parseFloat(v));
    if (nums.some(isNaN)) return;
    scrubRef.current = { startX: e2.clientX, startVals: nums, active: true };
    e2.target.setPointerCapture(e2.pointerId);
  };
  const handleLabelPointerMove = (e2) => {
    if (!scrubRef.current.active) return;
    const delta = Math.round(e2.clientX - scrubRef.current.startX);
    const unit = values[0]?.match(/[a-z%]+$/i)?.[0] || "px";
    const newVals = scrubRef.current.startVals.map((v) => `${clampNum2(v + delta, min, max)}${unit}`);
    setLocalValue(computeDisplay(newVals));
    props.forEach((prop, i3) => onChange(prop, newVals[i3]));
  };
  const handleLabelPointerUp = () => {
    scrubRef.current.active = false;
  };
  const SCRUB_ZONE = 16;
  const handleInputPointerDown = (e2) => {
    if (label) return;
    const rect = e2.currentTarget.getBoundingClientRect();
    if (e2.clientX - rect.left > SCRUB_ZONE) return;
    const nums = values.map((v) => parseFloat(v));
    if (nums.some(isNaN)) return;
    e2.preventDefault();
    scrubRef.current = { startX: e2.clientX, startVals: nums, active: true };
    e2.currentTarget.setPointerCapture(e2.pointerId);
  };
  const handleInputPointerMove = (e2) => {
    if (scrubRef.current.active) {
      const delta = Math.round(e2.clientX - scrubRef.current.startX);
      const unit = values[0]?.match(/[a-z%]+$/i)?.[0] || "px";
      const newVals = scrubRef.current.startVals.map((v) => `${clampNum2(v + delta, min, max)}${unit}`);
      setLocalValue(computeDisplay(newVals));
      props.forEach((prop, i3) => onChange(prop, newVals[i3]));
      return;
    }
    const rect = e2.currentTarget.getBoundingClientRect();
    const inZone = e2.clientX - rect.left <= SCRUB_ZONE;
    e2.currentTarget.style.cursor = inZone ? "ew-resize" : "";
  };
  const handleInputPointerUp = () => {
    scrubRef.current.active = false;
  };
  const commitValue = (val) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setLocalValue(computeDisplay(values));
      return;
    }
    const parts = trimmed.includes(",") ? trimmed.split(",").map((s5) => s5.trim()).filter(Boolean) : trimmed.split(/\s+/);
    if (parts.length === 1) {
      const resolved = clampCssValue2(inferCssUnit(parts[0], values[0] || "", props[0]), min, max);
      props.forEach((prop) => onChange(prop, resolved));
      setLocalValue(roundCssValue(resolved));
    } else {
      const resolved = props.map(
        (prop, i3) => clampCssValue2(inferCssUnit(parts[i3 % parts.length], values[i3] || "", prop), min, max)
      );
      props.forEach((prop, i3) => onChange(prop, resolved[i3]));
      setLocalValue(computeDisplay(resolved));
    }
  };
  const handleKeyDown = (e2) => {
    if (e2.key === "Enter") {
      commitValue(localValue);
      e2.target.blur();
    }
    if (e2.key === "ArrowUp" || e2.key === "ArrowDown") {
      e2.preventDefault();
      const step = e2.shiftKey ? 10 : 1;
      const delta = e2.key === "ArrowUp" ? step : -step;
      const parts = localValue.includes(",") ? localValue.split(",").map((s5) => s5.trim()) : props.map(() => localValue.trim());
      const newVals = props.map((_, i3) => {
        const part = parts[i3] || parts[0];
        const num = parseFloat(part);
        if (isNaN(num)) return part;
        const unit = part.match(/[a-z%]+$/i)?.[0] || "px";
        return `${clampNum2(num + delta, min, max)}${unit}`;
      });
      setLocalValue(computeDisplay(newVals));
      props.forEach((prop, i3) => onChange(prop, newVals[i3]));
    }
  };
  const wrapperRef = useRef(null);
  return /* @__PURE__ */ jsxs("div", { ref: wrapperRef, className: `retune-prop${variableMatch ? " retune-prop-variable-applied" : ""}`, children: [
    /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: isChanged ?? false, onReset: onReset ?? (() => {
    }) }),
    label && /* @__PURE__ */ jsx(
      "span",
      {
        className: "retune-prop-label",
        onClick: handleInputClick,
        onPointerDown: variableMatch ? void 0 : handleLabelPointerDown,
        onPointerMove: variableMatch ? void 0 : handleLabelPointerMove,
        onPointerUp: variableMatch ? void 0 : handleLabelPointerUp,
        children: label
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        className: "retune-prop-input",
        value: localValue,
        placeholder: placeholder || "\u2013",
        readOnly: !!variableMatch,
        onClick: handleInputClick,
        onPointerDown: !label && !variableMatch ? handleInputPointerDown : void 0,
        onPointerMove: !label && !variableMatch ? handleInputPointerMove : void 0,
        onPointerUp: !label && !variableMatch ? handleInputPointerUp : void 0,
        onFocus: variableMatch ? void 0 : (e2) => e2.target.select(),
        onChange: variableMatch ? void 0 : (e2) => setLocalValue(e2.target.value),
        onBlur: variableMatch ? void 0 : () => {
          if (localValue !== computeDisplay(values)) commitValue(localValue);
        },
        onKeyDown: variableMatch ? void 0 : handleKeyDown,
        spellCheck: false
      }
    ),
    /* @__PURE__ */ jsx(
      VariableAction,
      {
        match: variableMatch,
        property: property || props[0],
        relatedProperties: props,
        onVariableSelect,
        onVariableApply,
        onVariableUnlink,
        openPickerRef: varPickerRef
      }
    )
  ] });
}
function parseShadow(raw) {
  if (!raw || raw === "none") return null;
  const trimmed = raw.trim();
  const inset = trimmed.startsWith("inset");
  let rest = inset ? trimmed.slice(5).trim() : trimmed;
  let color = "rgba(0, 0, 0, 1)";
  const colorFnMatch = rest.match(/(?:rgba?|hsla?)\([^)]+\)/);
  if (colorFnMatch) {
    color = colorFnMatch[0];
    rest = rest.replace(color, "").trim();
  } else {
    const hexMatch = rest.match(/^(#[0-9a-fA-F]{3,8})\s/);
    if (hexMatch) {
      color = hexMatch[1];
      rest = rest.slice(hexMatch[0].length).trim();
    } else {
      const endMatch = rest.match(/\s+(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/);
      if (endMatch) {
        color = endMatch[1];
        rest = rest.slice(0, -endMatch[0].length).trim();
      }
    }
  }
  const nums = rest.match(/-?[\d.]+/g);
  if (!nums || nums.length < 2) return null;
  return {
    inset,
    offsetX: parseFloat(nums[0]) || 0,
    offsetY: parseFloat(nums[1]) || 0,
    blur: parseFloat(nums[2]) || 0,
    spread: parseFloat(nums[3]) || 0,
    color
  };
}
function parseBoxShadow(raw) {
  if (!raw || raw === "none") return null;
  let depth = 0;
  let start2 = 0;
  for (let i3 = 0; i3 < raw.length; i3++) {
    if (raw[i3] === "(") depth++;
    else if (raw[i3] === ")") depth--;
    else if (raw[i3] === "," && depth === 0) {
      return parseShadow(raw.slice(start2, i3));
    }
  }
  return parseShadow(raw.slice(start2));
}
function shadowToCss(s5) {
  const parts = [];
  if (s5.inset) parts.push("inset");
  parts.push(`${s5.offsetX}px`);
  parts.push(`${s5.offsetY}px`);
  parts.push(`${s5.blur}px`);
  parts.push(`${s5.spread}px`);
  parts.push(s5.color);
  return parts.join(" ");
}
function defaultShadow() {
  return {
    inset: false,
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    spread: 0,
    color: "rgba(0, 0, 0, 0.15)"
  };
}
var FILTER_TYPES = [
  "blur",
  "brightness",
  "contrast",
  "hue-rotate",
  "invert",
  "saturate",
  "sepia"
];
var FILTER_CONFIG = {
  blur: { label: "Blur", unit: "px", defaultValue: 4, min: 0, max: 50, step: 1 },
  brightness: { label: "Brightness", unit: "%", defaultValue: 100, min: 0, max: 300, step: 1 },
  contrast: { label: "Contrast", unit: "%", defaultValue: 100, min: 0, max: 200, step: 1 },
  "hue-rotate": { label: "Hue rotate", unit: "deg", defaultValue: 0, min: 0, max: 360, step: 1 },
  invert: { label: "Invert", unit: "%", defaultValue: 0, min: 0, max: 100, step: 1 },
  saturate: { label: "Saturate", unit: "%", defaultValue: 100, min: 0, max: 300, step: 1 },
  sepia: { label: "Sepia", unit: "%", defaultValue: 0, min: 0, max: 100, step: 1 }
};
var nextId = 1;
function genId() {
  return `f${nextId++}`;
}
function parseFilterString(raw, target) {
  if (!raw || raw === "none") return [];
  const items = [];
  const re = /(blur|brightness|contrast|hue-rotate|invert|saturate|sepia)\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const type = m[1];
    const val = parseFloat(m[2]) || 0;
    items.push({ id: genId(), type, value: val, target });
  }
  return items;
}
function parseFilters(filter, backdropFilter) {
  return [
    ...parseFilterString(filter, "layer"),
    ...parseFilterString(backdropFilter, "backdrop")
  ];
}
function filterToCssFunction(item) {
  const config2 = FILTER_CONFIG[item.type];
  return `${item.type}(${item.value}${config2.unit})`;
}
function filtersToCss(items) {
  const layerParts = items.filter((f) => f.target === "layer").map(filterToCssFunction);
  const backdropParts = items.filter((f) => f.target === "backdrop").map(filterToCssFunction);
  return {
    filter: layerParts.length ? layerParts.join(" ") : "none",
    backdropFilter: backdropParts.length ? backdropParts.join(" ") : "none"
  };
}
function defaultFilter(type, target) {
  return {
    id: genId(),
    type,
    value: FILTER_CONFIG[type].defaultValue,
    target
  };
}
function middleTruncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  const keep = maxLen - 1;
  const start2 = Math.ceil(keep * 0.4);
  const end = Math.floor(keep * 0.6);
  return str.slice(0, start2) + "\u2026" + str.slice(-end);
}
var TEXT_ALIGN_OPTIONS = [
  { value: "left", icon: /* @__PURE__ */ jsx(TextAlignLeft, {}), label: "Left" },
  { value: "center", icon: /* @__PURE__ */ jsx(TextAlignCenter, {}), label: "Center" },
  { value: "right", icon: /* @__PURE__ */ jsx(TextAlignRight, {}), label: "Right" }
];
var VERTICAL_ALIGN_OPTIONS = [
  { value: "top", icon: /* @__PURE__ */ jsx(TextAlignTop, {}), label: "Top" },
  { value: "middle", icon: /* @__PURE__ */ jsx(TextAlignMiddle, {}), label: "Middle" },
  { value: "bottom", icon: /* @__PURE__ */ jsx(TextAlignBottom, {}), label: "Bottom" }
];
function mapTextAlign(value) {
  if (!value) return "left";
  if (value === "start") return "left";
  if (value === "end") return "right";
  return value;
}
function mapVerticalAlign(value) {
  if (!value) return "top";
  if (value === "middle" || value === "center") return "middle";
  if (value === "bottom") return "bottom";
  if (value === "top" || value === "baseline" || value === "text-top") return "top";
  if (value === "text-bottom" || value === "sub") return "bottom";
  if (value === "super") return "top";
  return "top";
}
var SIZE_OPTIONS = [
  { value: "__fill", label: "Fill" },
  { value: "__hug", label: "Hug" },
  { value: "auto", label: "Auto" }
];
var FONT_WEIGHT_OPTIONS = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" }
];
var LINE_HEIGHT_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "1", label: "1" },
  { value: "1.25", label: "1.25" },
  { value: "1.5", label: "1.5" },
  { value: "1.75", label: "1.75" },
  { value: "2", label: "2" }
];
var LETTER_SPACING_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "-0.05em", label: "Tight" },
  { value: "0.05em", label: "Wide" },
  { value: "0.1em", label: "Wider" }
];
var DISPLAY_OPTIONS = [
  { value: "block", icon: /* @__PURE__ */ jsx(RectangleSmall, {}), label: "Block" },
  { value: "flex-row", icon: /* @__PURE__ */ jsx(AutolayoutAddHorizontal, {}), label: "Flex \u2192" },
  { value: "flex-column", icon: /* @__PURE__ */ jsx(AutolayoutAddVertical, {}), label: "Flex \u2193" },
  { value: "grid", icon: /* @__PURE__ */ jsx(GridView, {}), label: "Grid" }
];
var LIST_STYLE_OPTIONS = [
  { value: "none", icon: /* @__PURE__ */ jsx(Minus, {}), label: "None" },
  { value: "disc", icon: /* @__PURE__ */ jsx(ListView, {}), label: "Bullet" },
  { value: "decimal", icon: /* @__PURE__ */ jsx(NumberList, {}), label: "Numbered" }
];
function PropertyPanel({
  element,
  position,
  onPropertyChange,
  onPropertyHover,
  onApplyToElement,
  onVariableSwap,
  onVariableAssociate,
  onVariableUnlink,
  variableAssociations = {},
  unlinkedVariables,
  changedProperties,
  onPropertyReset,
  selectorCandidates = [],
  activeSelector = null,
  scopeLevels = [],
  activeLevelIndex = 0,
  onScopeLevelChange,
  onScopeLevelHover,
  ownedProperties,
  styleSources = {},
  forcedState = null,
  onForcedStateChange,
  onPinLinesChange
}) {
  const rawStyles = element.computedStyles;
  const s5 = rawStyles;
  const variableMatches = useMemo(() => {
    if (!element.element) return /* @__PURE__ */ new Map();
    return resolveVariablesForElement(element.element, s5, activeSelector ?? void 0);
  }, [element.element, s5, activeSelector]);
  const getVariableMatch = useCallback((camelProp) => {
    if (unlinkedVariables?.has(camelProp)) return void 0;
    const kebab = camelProp.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
    const assoc = variableAssociations[camelProp];
    if (assoc) return { variable: assoc, property: kebab };
    const match = variableMatches.get(kebab);
    if (match && !isRawUtility(match.variable)) return match;
    return void 0;
  }, [variableMatches, variableAssociations, unlinkedVariables]);
  const handleVariableSelect = useCallback((oldToken, newToken, fallbackProperties) => {
    const el = element.element;
    if (!el) return;
    const isClassBased = el.classList.contains(oldToken.className);
    const newIsVariable = newToken.className.startsWith("var(");
    if (isClassBased && !newIsVariable) {
      el.classList.remove(oldToken.className);
      el.classList.add(newToken.className);
      onVariableSwap?.(oldToken.className, newToken.className);
      for (const [prop, val] of Object.entries(newToken.values)) {
        const camelProp = prop.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
        onPropertyChange(camelProp, val);
      }
    } else {
      const affectedProps = [];
      for (const [prop, ref] of Object.entries(variableAssociations)) {
        if (ref.className === oldToken.className) {
          affectedProps.push(prop);
        }
      }
      if (affectedProps.length === 0 && fallbackProperties) {
        affectedProps.push(...fallbackProperties);
      }
      const value = Object.values(newToken.values)[0];
      if (!value) return;
      for (const prop of affectedProps) {
        onPropertyChange(prop, value);
      }
      onVariableAssociate?.(affectedProps, { className: newToken.className, values: newToken.values });
    }
  }, [element.element, onVariableSwap, onPropertyChange, variableAssociations, onVariableAssociate]);
  const handleVariableApply = useCallback((newToken, properties) => {
    const el = element.element;
    if (!el) return;
    const value = Object.values(newToken.values)[0];
    if (!value) return;
    for (const prop of properties) {
      onPropertyChange(prop, value);
    }
    onVariableAssociate?.(properties, { className: newToken.className, values: newToken.values });
  }, [element.element, onPropertyChange, onVariableAssociate]);
  const handleVariableUnlink = useCallback((camelProp) => {
    onVariableUnlink?.([camelProp]);
  }, [onVariableUnlink]);
  const variableProps = useCallback((camelProp) => {
    const match = getVariableMatch(camelProp);
    return {
      ...match ? { variableMatch: match, onVariableSelect: handleVariableSelect, onVariableUnlink: () => handleVariableUnlink(camelProp) } : {},
      property: camelProp,
      onVariableApply: handleVariableApply
    };
  }, [getVariableMatch, handleVariableSelect, handleVariableApply, handleVariableUnlink]);
  const shorthandVariableProps = useCallback((camelProps) => {
    const allMatches = camelProps.map((p4) => getVariableMatch(p4));
    const firstMatch = allMatches.find((m) => m !== void 0);
    if (!firstMatch) return { property: camelProps[0], onVariableApply: handleVariableApply };
    const allSameVar = allMatches.every(
      (m) => m !== void 0 && m.variable.className === firstMatch.variable.className
    );
    if (allSameVar) {
      return {
        variableMatch: firstMatch,
        property: camelProps[0],
        onVariableSelect: handleVariableSelect,
        onVariableApply: handleVariableApply,
        onVariableUnlink: () => onVariableUnlink?.(camelProps)
      };
    }
    return { property: camelProps[0], onVariableApply: handleVariableApply };
  }, [getVariableMatch, handleVariableSelect, handleVariableApply, onVariableUnlink]);
  const changeProps = useCallback((camelProp) => ({
    isChanged: changedProperties?.has(camelProp) ?? false,
    onReset: () => onPropertyReset?.(camelProp)
  }), [changedProperties, onPropertyReset]);
  const shorthandChangeProps = useCallback((camelProps) => ({
    isChanged: camelProps.some((p4) => changedProperties?.has(p4)) ?? false,
    onReset: () => {
      for (const p4 of camelProps) onPropertyReset?.(p4);
    }
  }), [changedProperties, onPropertyReset]);
  const TEXT_TAGS = ["P", "H1", "H2", "H3", "H4", "H5", "H6", "SPAN", "A", "BUTTON", "LABEL", "LI", "TD", "TH", "FIGCAPTION", "BLOCKQUOTE", "CITE", "EM", "STRONG", "SMALL"];
  const hasDirectText = element.element ? Array.from(element.element.childNodes).some(
    (n4) => n4.nodeType === Node.TEXT_NODE && n4.textContent?.trim()
  ) : false;
  const isText = TEXT_TAGS.includes(element.tagName) || hasDirectText;
  const displayValue = s5.display || "block";
  const isFlex = displayValue.includes("flex");
  const isGrid = displayValue.includes("grid");
  const positionType = s5.position || "static";
  const isSticky = positionType === "sticky";
  const hasVerticalAlign = isText || ["IMG", "INPUT", "SELECT", "TEXTAREA"].includes(element.tagName) || isFlex || isGrid;
  const parentDisplay = element.element?.parentElement ? getComputedStyle(element.element.parentElement).display : "";
  const isFlexChild = parentDisplay.includes("flex");
  const isGridChild = parentDisplay.includes("grid");
  const parentFlexDir = isFlexChild && element.element?.parentElement ? getComputedStyle(element.element.parentElement).flexDirection || "row" : "row";
  const hasShadow = s5.boxShadow && s5.boxShadow !== "none";
  const filterSelfUpdate = useRef(false);
  const [filters, setFilters] = useState(() => parseFilters(s5.filter, s5.backdropFilter));
  const [prevFilter, setPrevFilter] = useState(s5.filter);
  const [prevBackdropFilter, setPrevBackdropFilter] = useState(s5.backdropFilter);
  if (s5.filter !== prevFilter || s5.backdropFilter !== prevBackdropFilter) {
    setPrevFilter(s5.filter);
    setPrevBackdropFilter(s5.backdropFilter);
    if (filterSelfUpdate.current) {
      filterSelfUpdate.current = false;
    } else {
      setFilters(parseFilters(s5.filter, s5.backdropFilter));
    }
  }
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [filterMenuPos, setFilterMenuPos] = useState(null);
  const filterMenuBtnRef = useRef(null);
  const filterMenuRef = useRef(null);
  const filterSectionRef = useRef(null);
  const [paddingExpanded, setPaddingExpanded] = useState(false);
  const [marginExpanded, setMarginExpanded] = useState(false);
  const [radiusExpanded, setRadiusExpanded] = useState(false);
  const [typoExpanded, setTypoExpanded] = useState(false);
  const [sizeExtras, setSizeExtras] = useState(/* @__PURE__ */ new Set());
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [sizeMenuPos, setSizeMenuPos] = useState(null);
  const sizeMenuRef = useRef(null);
  const sizeMenuBtnRef = useRef(null);
  useEffect(() => {
    if (!sizeMenuOpen) return;
    const handleClick = (e2) => {
      const btn = sizeMenuBtnRef.current;
      const menu = sizeMenuRef.current;
      if (btn && btn.contains(e2.target)) return;
      if (menu && menu.contains(e2.target)) return;
      setSizeMenuOpen(false);
    };
    const root = sizeMenuBtnRef.current?.getRootNode();
    root.addEventListener("pointerdown", handleClick);
    return () => root.removeEventListener("pointerdown", handleClick);
  }, [sizeMenuOpen]);
  useEffect(() => {
    if (!filterMenuOpen) return;
    const handleClick = (e2) => {
      const btn = filterMenuBtnRef.current;
      const menu = filterMenuRef.current;
      if (btn && btn.contains(e2.target)) return;
      if (menu && menu.contains(e2.target)) return;
      setFilterMenuOpen(false);
    };
    const root = filterMenuBtnRef.current?.getRootNode();
    root.addEventListener("pointerdown", handleClick);
    return () => root.removeEventListener("pointerdown", handleClick);
  }, [filterMenuOpen]);
  const sizingCtx = { isFlexChild, isGridChild, parentFlexDir, currentStyles: s5 };
  const widthMode = detectSizingMode("width", sizingCtx);
  const heightMode = detectSizingMode("height", sizingCtx);
  const heightCanFill = canFill("height", sizingCtx);
  const heightSizeOptions = heightCanFill ? SIZE_OPTIONS : SIZE_OPTIONS.filter((o2) => o2.value !== "__fill");
  const widthDisplayValue = widthMode === "fill" ? "__fill" : widthMode === "hug" ? "__hug" : s5.width;
  const heightDisplayValue = heightMode === "fill" ? "__fill" : heightMode === "hug" ? "__hug" : s5.height;
  const visibleSizeExtras = new Set(sizeExtras);
  if (s5.minWidth && s5.minWidth !== "0px" && s5.minWidth !== "auto" || s5.minHeight && s5.minHeight !== "0px" && s5.minHeight !== "auto") visibleSizeExtras.add("min");
  if (s5.maxWidth && s5.maxWidth !== "none" || s5.maxHeight && s5.maxHeight !== "none") visibleSizeExtras.add("max");
  const [pins, setPins] = useState(() => {
    const el = element.element;
    const cs = element.computedStyles;
    const pos = cs.position;
    if (pos !== "absolute" && pos !== "fixed") return { top: true, right: false, bottom: false, left: true };
    function isAuthored(prop) {
      if (el.style[prop] !== "") return true;
      try {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSStyleRule && el.matches(rule.selectorText)) {
                const val = rule.style.getPropertyValue(prop);
                if (val && val !== "auto") return true;
              }
            }
          } catch {
          }
        }
      } catch {
      }
      return false;
    }
    const hasTop = isAuthored("top");
    const hasBottom = isAuthored("bottom");
    const hasLeft = isAuthored("left");
    const hasRight = isAuthored("right");
    return {
      top: hasTop || !hasTop && !hasBottom,
      right: hasRight && !hasLeft,
      bottom: hasBottom && !hasTop,
      left: hasLeft || !hasLeft && !hasRight
    };
  });
  const [centered, setCentered] = useState(false);
  const centeredAxes = useRef({ h: false, v: false });
  const detectedFillMode = detectFillMode(s5.backgroundColor, s5.backgroundImage);
  const [fillMode, setFillMode] = useState(detectedFillMode);
  const [initialFillMode] = useState(detectedFillMode);
  const [initialGradient] = useState(() => {
    if (s5.backgroundImage && s5.backgroundImage !== "none") {
      return parseCssGradient(s5.backgroundImage) ?? null;
    }
    return null;
  });
  const [gradient, setGradient] = useState(() => {
    if (s5.backgroundImage && s5.backgroundImage !== "none") {
      const parsed = parseCssGradient(s5.backgroundImage);
      if (parsed) return parsed;
    }
    return defaultGradient();
  });
  const gradientEditingRef = useRef(false);
  const [prevBgImage, setPrevBgImage] = useState(s5.backgroundImage);
  if (s5.backgroundImage !== prevBgImage) {
    setPrevBgImage(s5.backgroundImage);
    if (!gradientEditingRef.current) {
      const newMode = detectFillMode(s5.backgroundColor, s5.backgroundImage);
      setFillMode(newMode);
      if (newMode !== "solid") {
        const parsed = parseCssGradient(s5.backgroundImage || "");
        if (parsed) setGradient(parsed);
      }
    }
    gradientEditingRef.current = false;
  }
  const hasFill = (() => {
    const bg = s5.backgroundColor;
    const bgImg = s5.backgroundImage;
    if (bgImg && bgImg !== "none") return true;
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return false;
    return true;
  })();
  const handleAddFill = useCallback(() => {
    onPropertyChange("backgroundColor", "#ffffff");
  }, [onPropertyChange]);
  const handleRemoveFill = useCallback(() => {
    onPropertyChange("backgroundColor", "transparent");
    onPropertyChange("backgroundImage", "none");
    setFillMode("solid");
  }, [onPropertyChange]);
  const borderSides = [
    { width: s5.borderTopWidth, style: s5.borderTopStyle },
    { width: s5.borderRightWidth, style: s5.borderRightStyle },
    { width: s5.borderBottomWidth, style: s5.borderBottomStyle },
    { width: s5.borderLeftWidth, style: s5.borderLeftStyle }
  ];
  const hasBorder = borderSides.some((side) => side.style !== "none" && parseFloat(side.width) > 0);
  hasBorder && new Set(borderSides.map((b) => `${b.width}|${b.style}`)).size === 1 && (/* @__PURE__ */ new Set([s5.borderTopColor, s5.borderRightColor, s5.borderBottomColor, s5.borderLeftColor])).size === 1;
  const borderColors = [s5.borderTopColor, s5.borderRightColor, s5.borderBottomColor, s5.borderLeftColor];
  const activeBorderColor = borderSides.reduce((found, side, i3) => {
    if (found) return found;
    return side.style !== "none" && parseFloat(side.width) > 0 ? borderColors[i3] : null;
  }, null) || s5.borderTopColor;
  const [borderExpanded, setBorderExpanded] = useState(false);
  const handleAddBorder = useCallback(() => {
    onPropertyChange("borderWidth", "1px");
    onPropertyChange("borderStyle", "solid");
    onPropertyChange("borderColor", "#000000");
  }, [onPropertyChange]);
  const handleRemoveBorder = useCallback(() => {
    onPropertyChange("borderTopWidth", "0px");
    onPropertyChange("borderRightWidth", "0px");
    onPropertyChange("borderBottomWidth", "0px");
    onPropertyChange("borderLeftWidth", "0px");
    onPropertyChange("borderTopStyle", "none");
    onPropertyChange("borderRightStyle", "none");
    onPropertyChange("borderBottomStyle", "none");
    onPropertyChange("borderLeftStyle", "none");
  }, [onPropertyChange]);
  const handleFillModeChange = useCallback((prop, value) => {
    const mode = value;
    setFillMode(mode);
    if (mode === "solid") {
      onPropertyChange("backgroundImage", "none");
      onPropertyChange("backgroundColor", "#ffffff");
    } else {
      const newGradient = { ...gradient, type: mode };
      setGradient(newGradient);
      onPropertyChange("backgroundImage", gradientToCss(newGradient));
      onPropertyChange("backgroundColor", "transparent");
    }
  }, [gradient, onPropertyChange]);
  const handleGradientChange = useCallback((newGradient) => {
    gradientEditingRef.current = true;
    setGradient(newGradient);
    onPropertyChange("backgroundImage", gradientToCss(newGradient));
  }, [onPropertyChange]);
  const handleSizingModeChange = useCallback((axis, mode) => {
    const rect = element.element?.getBoundingClientRect();
    const changes = computeSizingChanges(axis, mode, {
      isFlexChild,
      isGridChild,
      parentFlexDir,
      currentStyles: s5,
      elementRect: rect ? { width: rect.width, height: rect.height } : void 0
    });
    for (const [prop, value] of Object.entries(changes)) {
      onPropertyChange(prop, value);
    }
  }, [isFlexChild, isGridChild, parentFlexDir, s5, element.element, onPropertyChange]);
  const handleAddShadow = useCallback(() => {
    onPropertyChange("boxShadow", shadowToCss(defaultShadow()));
  }, [onPropertyChange]);
  const handleRemoveShadow = useCallback(() => {
    onPropertyChange("boxShadow", "none");
  }, [onPropertyChange]);
  const handleShadowFieldChange = useCallback((field, value) => {
    const parsed = parseBoxShadow(s5.boxShadow) || defaultShadow();
    const updated = { ...parsed, [field]: value };
    onPropertyChange("boxShadow", shadowToCss(updated));
  }, [s5.boxShadow, onPropertyChange]);
  const applyFilters = useCallback((updated) => {
    filterSelfUpdate.current = true;
    setFilters(updated);
    const css = filtersToCss(updated);
    onPropertyChange("filter", css.filter);
    onPropertyChange("backdropFilter", css.backdropFilter);
  }, [onPropertyChange]);
  const handleAddFilter = useCallback((type, target) => {
    applyFilters([...filters, defaultFilter(type, target)]);
    setFilterMenuOpen(false);
    requestAnimationFrame(() => {
      filterSectionRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }, [filters, applyFilters]);
  const handleRemoveFilter = useCallback((id2) => {
    applyFilters(filters.filter((f) => f.id !== id2));
  }, [filters, applyFilters]);
  const handleFilterValueChange = useCallback((id2, value) => {
    applyFilters(filters.map((f) => f.id === id2 ? { ...f, value } : f));
  }, [filters, applyFilters]);
  const handlePinChange = useCallback((side, pinned) => {
    setPins((prev) => {
      const next = { ...prev, [side]: pinned };
      onPinLinesChange?.(next);
      return next;
    });
  }, [onPinLinesChange]);
  const applyTransform = useCallback(() => {
    const { h, v } = centeredAxes.current;
    if (h && v) {
      setCentered(true);
      onPropertyChange("transform", "translate(-50%, -50%)");
    } else {
      setCentered(false);
      if (h) {
        onPropertyChange("transform", "translateX(-50%)");
      } else if (v) {
        onPropertyChange("transform", "translateY(-50%)");
      } else {
        onPropertyChange("transform", "none");
      }
    }
  }, [onPropertyChange]);
  const alignLeft = useCallback(() => {
    setPins((p4) => ({ ...p4, left: true, right: false }));
    centeredAxes.current.h = false;
    onPropertyChange("left", "0px");
    onPropertyChange("right", "auto");
    applyTransform();
  }, [onPropertyChange, applyTransform]);
  const alignCenterH = useCallback(() => {
    setPins((p4) => ({ ...p4, left: true, right: false }));
    centeredAxes.current.h = true;
    onPropertyChange("left", "50%");
    onPropertyChange("right", "auto");
    applyTransform();
  }, [onPropertyChange, applyTransform]);
  const alignRight = useCallback(() => {
    setPins((p4) => ({ ...p4, right: true, left: false }));
    centeredAxes.current.h = false;
    onPropertyChange("right", "0px");
    onPropertyChange("left", "auto");
    applyTransform();
  }, [onPropertyChange, applyTransform]);
  const alignTop = useCallback(() => {
    setPins((p4) => ({ ...p4, top: true, bottom: false }));
    centeredAxes.current.v = false;
    onPropertyChange("top", "0px");
    onPropertyChange("bottom", "auto");
    applyTransform();
  }, [onPropertyChange, applyTransform]);
  const alignCenterV = useCallback(() => {
    setPins((p4) => ({ ...p4, top: true, bottom: false }));
    centeredAxes.current.v = true;
    onPropertyChange("top", "50%");
    onPropertyChange("bottom", "auto");
    applyTransform();
  }, [onPropertyChange, applyTransform]);
  const alignBottom = useCallback(() => {
    setPins((p4) => ({ ...p4, bottom: true, top: false }));
    centeredAxes.current.v = false;
    onPropertyChange("bottom", "0px");
    onPropertyChange("top", "auto");
    applyTransform();
  }, [onPropertyChange, applyTransform]);
  return /* @__PURE__ */ jsxs(Fragment$1, { children: [
    /* @__PURE__ */ jsxs(Section, { label: element.tagName.toLowerCase(), children: [
      scopeLevels.length > 1 && onScopeLevelChange && (() => {
        const prevLevelRef = useRef(activeLevelIndex);
        const fieldRef = useRef(null);
        const computeBridgesForLevel = (level) => {
          if (scopeLevels[level]?.selector === null) return /* @__PURE__ */ new Set();
          const bridges = /* @__PURE__ */ new Set();
          for (let i3 = 0; i3 < scopeLevels.length - 1; i3++) {
            const cur = scopeLevels[i3];
            const nxt = scopeLevels[i3 + 1];
            if (cur.selector !== null && nxt && nxt.selector !== null && i3 < level && i3 + 1 <= level) {
              bridges.add(i3);
            }
          }
          return bridges;
        };
        const [bridgeVisible, setBridgeVisible] = useState(() => computeBridgesForLevel(activeLevelIndex));
        const pillColorsRef = useRef(/* @__PURE__ */ new Map());
        useEffect(() => {
          const f = fieldRef.current;
          if (!f) return;
          const colors = /* @__PURE__ */ new Map();
          f.querySelectorAll("[data-level-index]").forEach((pill) => {
            const idx = parseInt(pill.dataset.levelIndex || "0", 10);
            const style = getComputedStyle(pill);
            colors.set(idx, { bg: style.backgroundColor, color: style.color });
          });
          pillColorsRef.current = colors;
        });
        useEffect(() => {
          const prev = prevLevelRef.current;
          prevLevelRef.current = activeLevelIndex;
          if (prev === activeLevelIndex) return;
          const oldBridges = computeBridgesForLevel(prev);
          const newBridges = computeBridgesForLevel(activeLevelIndex);
          const appearing = [];
          const disappearing = [];
          newBridges.forEach((b) => {
            if (!oldBridges.has(b)) appearing.push(b);
          });
          oldBridges.forEach((b) => {
            if (!newBridges.has(b)) disappearing.push(b);
          });
          if (appearing.length === 0 && disappearing.length === 0) {
            setBridgeVisible(newBridges);
            return;
          }
          const field = fieldRef.current;
          if (!field) {
            setBridgeVisible(newBridges);
            return;
          }
          const DURATION = 320;
          const EASING = "cubic-bezier(0.77, 0, 0.175, 1)";
          const EXTEND = 6;
          const getPill = (idx) => field.querySelector(`[data-level-index="${idx}"]`);
          const allBridges = [...appearing, ...disappearing];
          const pillSides = /* @__PURE__ */ new Map();
          for (const bridgeIdx of allBridges) {
            if (!pillSides.has(bridgeIdx)) pillSides.set(bridgeIdx, /* @__PURE__ */ new Set());
            pillSides.get(bridgeIdx).add("right");
            if (!pillSides.has(bridgeIdx + 1)) pillSides.set(bridgeIdx + 1, /* @__PURE__ */ new Set());
            pillSides.get(bridgeIdx + 1).add("left");
          }
          const snapshotColors = pillColorsRef.current;
          const frozenPills = [];
          for (const [pillIdx] of pillSides) {
            const pill = getPill(pillIdx);
            if (!pill) continue;
            const old = snapshotColors.get(pillIdx);
            if (old) {
              pill.style.backgroundColor = old.bg;
              pill.style.color = old.color;
              frozenPills.push(pill);
            }
          }
          for (const [pillIdx, sides] of pillSides) {
            const pill = getPill(pillIdx);
            if (!pill) continue;
            const bg = snapshotColors.get(pillIdx)?.bg || "#f5f5f4";
            const shadows = [];
            if (sides.has("right")) shadows.push(`${EXTEND}px 0 0 0 ${bg}`);
            if (sides.has("left")) shadows.push(`-${EXTEND}px 0 0 0 ${bg}`);
            const peakShadow = shadows.join(", ");
            const zeroShadows = shadows.map(() => `0px 0 0 0 ${bg}`).join(", ");
            const R = "8px";
            const Z = "0px";
            const peakRadius = `${sides.has("left") ? Z : R} ${sides.has("right") ? Z : R} ${sides.has("right") ? Z : R} ${sides.has("left") ? Z : R}`;
            pill.animate([
              { boxShadow: zeroShadows, borderRadius: `${R} ${R} ${R} ${R}` },
              { boxShadow: peakShadow, borderRadius: peakRadius },
              { boxShadow: zeroShadows, borderRadius: `${R} ${R} ${R} ${R}` }
            ], { duration: DURATION, easing: EASING });
          }
          const timer = setTimeout(() => {
            for (const pill of frozenPills) {
              pill.style.removeProperty("background-color");
              pill.style.removeProperty("color");
            }
            setBridgeVisible(newBridges);
          }, DURATION / 2);
          return () => clearTimeout(timer);
        }, [activeLevelIndex, scopeLevels]);
        return /* @__PURE__ */ jsx(RowGroup, { label: "Target", children: /* @__PURE__ */ jsx("div", { className: "retune-selector-field", ref: fieldRef, children: scopeLevels.map((level, index2) => {
          const isActive = index2 === activeLevelIndex;
          const isElementLevel = level.selector === null;
          const activeIsElementLevel = scopeLevels[activeLevelIndex]?.selector === null;
          const isIncluded = index2 < activeLevelIndex && !activeIsElementLevel;
          const showBridge = bridgeVisible.has(index2);
          return /* @__PURE__ */ jsxs(Fragment, { children: [
            isElementLevel && scopeLevels.length > 1 && /* @__PURE__ */ jsx("span", { className: "retune-selector-divider" }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: `retune-selector-tag${isActive ? " active" : ""}${isIncluded ? " included" : ""}`,
                "data-level-index": index2,
                onClick: () => onScopeLevelChange(index2),
                onPointerEnter: () => onScopeLevelHover?.(index2),
                onPointerLeave: () => onScopeLevelHover?.(null),
                children: [
                  level.label.length > 24 ? /* @__PURE__ */ jsx(Tooltip, { content: level.label, side: "bottom", delay: 300, children: /* @__PURE__ */ jsx("span", { className: "retune-selector-tag-name", children: middleTruncate(level.label, 24) }) }) : /* @__PURE__ */ jsx("span", { className: "retune-selector-tag-name", children: level.label }),
                  level.count > 1 && /* @__PURE__ */ jsx(Tooltip, { content: `${level.count} elements match this selector`, side: "bottom", delay: 300, children: /* @__PURE__ */ jsx("span", { className: "retune-selector-tag-count", children: level.count }) })
                ]
              }
            ),
            showBridge && /* @__PURE__ */ jsx("span", { className: "retune-selector-bridge filled" })
          ] }, level.selector ?? "__element");
        }) }) });
      })(),
      onForcedStateChange && /* @__PURE__ */ jsx(RowGroup, { label: "State", children: /* @__PURE__ */ jsx("div", { className: "retune-row", children: /* @__PURE__ */ jsx(
        SelectInput,
        {
          prop: "__state",
          value: forcedState ?? "none",
          options: ["none", ":hover", ":focus", ":active"],
          onChange: (_, val) => onForcedStateChange(val === "none" ? null : val)
        }
      ) }) })
    ] }),
    /* @__PURE__ */ jsxs(Section, { label: "Position", children: [
      (() => {
        const isAbsoluteOrFixed = positionType === "absolute" || positionType === "fixed";
        const isFlexColumn = isFlexChild && parentFlexDir.startsWith("column");
        const isFlexRow = isFlexChild && !parentFlexDir.startsWith("column");
        const hEnabled = isAbsoluteOrFixed || isGridChild || isFlexColumn;
        const vEnabled = isAbsoluteOrFixed || isGridChild || isFlexRow;
        const alignSelf = s5.alignSelf || "auto";
        const justifySelf = s5.justifySelf || "auto";
        const getHActive = () => {
          if (isFlexColumn) {
            if (alignSelf === "flex-start" || alignSelf === "start") return "start";
            if (alignSelf === "center") return "center";
            if (alignSelf === "flex-end" || alignSelf === "end") return "end";
          } else if (isGridChild) {
            if (justifySelf === "start") return "start";
            if (justifySelf === "center") return "center";
            if (justifySelf === "end") return "end";
          }
          return null;
        };
        const getVActive = () => {
          if (isFlexRow) {
            if (alignSelf === "flex-start" || alignSelf === "start") return "start";
            if (alignSelf === "center") return "center";
            if (alignSelf === "flex-end" || alignSelf === "end") return "end";
          } else if (isGridChild) {
            if (alignSelf === "start") return "start";
            if (alignSelf === "center") return "center";
            if (alignSelf === "end") return "end";
          }
          return null;
        };
        const hActive = getHActive();
        const vActive = getVActive();
        const onHClick = (alignment) => {
          if (isAbsoluteOrFixed) {
            if (alignment === "start") alignLeft();
            else if (alignment === "center") alignCenterH();
            else alignRight();
          } else if (isGridChild) {
            onPropertyChange("justifySelf", hActive === alignment ? "auto" : alignment);
          } else if (isFlexColumn) {
            const flexVal = alignment === "start" ? "flex-start" : alignment === "end" ? "flex-end" : "center";
            onPropertyChange("alignSelf", hActive === alignment ? "auto" : flexVal);
          }
        };
        const onVClick = (alignment) => {
          if (isAbsoluteOrFixed) {
            if (alignment === "start") alignTop();
            else if (alignment === "center") alignCenterV();
            else alignBottom();
          } else if (isGridChild) {
            onPropertyChange("alignSelf", vActive === alignment ? "auto" : alignment);
          } else if (isFlexRow) {
            const flexVal = alignment === "start" ? "flex-start" : alignment === "end" ? "flex-end" : "center";
            onPropertyChange("alignSelf", vActive === alignment ? "auto" : flexVal);
          }
        };
        return /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsxs("div", { className: "retune-field", children: [
          /* @__PURE__ */ jsx("span", { className: "retune-field-label", children: "Alignment" }),
          /* @__PURE__ */ jsxs("div", { className: "retune-align-row", children: [
            /* @__PURE__ */ jsxs("div", { className: "retune-btn-group", style: !hEnabled ? { opacity: 0.3, pointerEvents: "none" } : void 0, children: [
              /* @__PURE__ */ jsx(Tooltip, { content: "Align left", side: "top", children: /* @__PURE__ */ jsx("button", { type: "button", className: `retune-align-btn${hActive === "start" ? " active" : ""}`, onClick: () => onHClick("start"), children: /* @__PURE__ */ jsx(LayoutAlignLeft, {}) }) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Align center horizontally", side: "top", children: /* @__PURE__ */ jsx("button", { type: "button", className: `retune-align-btn${hActive === "center" ? " active" : ""}`, onClick: () => onHClick("center"), children: /* @__PURE__ */ jsx(LayoutAlignHorizontalCenter, {}) }) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Align right", side: "top", children: /* @__PURE__ */ jsx("button", { type: "button", className: `retune-align-btn${hActive === "end" ? " active" : ""}`, onClick: () => onHClick("end"), children: /* @__PURE__ */ jsx(LayoutAlignRight, {}) }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "retune-btn-group", style: !vEnabled ? { opacity: 0.3, pointerEvents: "none" } : void 0, children: [
              /* @__PURE__ */ jsx(Tooltip, { content: "Align top", side: "top", children: /* @__PURE__ */ jsx("button", { type: "button", className: `retune-align-btn${vActive === "start" ? " active" : ""}`, onClick: () => onVClick("start"), children: /* @__PURE__ */ jsx(LayoutAlignTop, {}) }) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Align center vertically", side: "top", children: /* @__PURE__ */ jsx("button", { type: "button", className: `retune-align-btn${vActive === "center" ? " active" : ""}`, onClick: () => onVClick("center"), children: /* @__PURE__ */ jsx(LayoutAlignVerticalCenter, {}) }) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Align bottom", side: "top", children: /* @__PURE__ */ jsx("button", { type: "button", className: `retune-align-btn${vActive === "end" ? " active" : ""}`, onClick: () => onVClick("end"), children: /* @__PURE__ */ jsx(LayoutAlignBottom, {}) }) })
            ] })
          ] })
        ] }) });
      })(),
      /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Type", children: /* @__PURE__ */ jsx(SelectInput, { prop: "position", value: positionType, options: ["static", "relative", "absolute", "fixed", "sticky"], onChange: onPropertyChange }) }) }),
      (positionType === "absolute" || positionType === "fixed") && /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(
        ConstraintsInput,
        {
          top: s5.top,
          right: s5.right,
          bottom: s5.bottom,
          left: s5.left,
          pins,
          centered,
          onChange: onPropertyChange,
          onPinChange: handlePinChange,
          onCenterChange: setCentered
        }
      ) }),
      positionType === "relative" && /* @__PURE__ */ jsxs(RowGroup, { label: "Offsets", children: [
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx(NumberInput, { label: "T", prop: "top", value: s5.top, onChange: onPropertyChange, ...changeProps("top") }),
          /* @__PURE__ */ jsx(NumberInput, { label: "R", prop: "right", value: s5.right, onChange: onPropertyChange, ...changeProps("right") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx(NumberInput, { label: "B", prop: "bottom", value: s5.bottom, onChange: onPropertyChange, ...changeProps("bottom") }),
          /* @__PURE__ */ jsx(NumberInput, { label: "L", prop: "left", value: s5.left, onChange: onPropertyChange, ...changeProps("left") })
        ] })
      ] }),
      isSticky && /* @__PURE__ */ jsx(RowGroup, { label: "Sticky offset", children: /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
        /* @__PURE__ */ jsx(NumberInput, { label: "T", prop: "top", value: s5.top, onChange: onPropertyChange, ...changeProps("top") }),
        /* @__PURE__ */ jsx(NumberInput, { label: "B", prop: "bottom", value: s5.bottom, onChange: onPropertyChange, ...changeProps("bottom") })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Section, { label: "Layout", children: [
      /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Display", children: /* @__PURE__ */ jsx(
        SegmentedControl,
        {
          options: DISPLAY_OPTIONS,
          value: displayValue.includes("flex") ? (s5.flexDirection || "row").startsWith("column") ? "flex-column" : "flex-row" : displayValue.includes("grid") ? "grid" : "block",
          onChange: (v) => {
            if (v === "flex-row") {
              onPropertyChange("display", "flex");
              onPropertyChange("flexDirection", "row");
            } else if (v === "flex-column") {
              onPropertyChange("display", "flex");
              onPropertyChange("flexDirection", "column");
            } else {
              onPropertyChange("display", v);
            }
          }
        }
      ) }) }),
      isFlex && /* @__PURE__ */ jsxs(Fragment$1, { children: [
        /* @__PURE__ */ jsx("div", { className: "retune-section-row", children: /* @__PURE__ */ jsxs("div", { className: "retune-row", style: { alignItems: "flex-start" }, children: [
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(Field, { label: "Alignment", children: /* @__PURE__ */ jsx(
            AlignmentGrid,
            {
              justifyContent: s5.justifyContent || "flex-start",
              alignItems: s5.alignItems || "stretch",
              flexDirection: s5.flexDirection || "row",
              onChange: onPropertyChange
            }
          ) }) }),
          /* @__PURE__ */ jsx("div", { style: { flex: 1 }, onPointerEnter: () => onPropertyHover?.("gap"), onPointerLeave: () => onPropertyHover?.(null), children: /* @__PURE__ */ jsx(Field, { label: "Gap", children: /* @__PURE__ */ jsx(
            NumberInput,
            {
              label: /* @__PURE__ */ jsx(Tooltip, { content: (s5.flexDirection || "row").startsWith("column") ? "Vertical gap between items" : "Horizontal gap between items", side: "top", sideOffset: 14, children: (s5.flexDirection || "row").startsWith("column") ? /* @__PURE__ */ jsx(AlSpacingVertical, {}) : /* @__PURE__ */ jsx(AlSpacingHorizontal, {}) }),
              prop: "gap",
              value: s5.gap,
              onChange: onPropertyChange,
              min: 0,
              ...changeProps("gap")
            }
          ) }) })
        ] }) }),
        /* @__PURE__ */ jsxs(Row, { children: [
          /* @__PURE__ */ jsx(Field, { label: "Reverse", children: /* @__PURE__ */ jsx(
            SelectInput,
            {
              prop: "flexDirection",
              value: (s5.flexDirection || "row").includes("reverse") ? "yes" : "no",
              options: ["no", "yes"],
              onChange: (_, v) => {
                const base = (s5.flexDirection || "row").startsWith("column") ? "column" : "row";
                onPropertyChange("flexDirection", v === "yes" ? `${base}-reverse` : base);
              }
            }
          ) }),
          /* @__PURE__ */ jsx(Field, { label: "Wrap", children: /* @__PURE__ */ jsx(SelectInput, { prop: "flexWrap", value: s5.flexWrap, options: ["nowrap", "wrap", "wrap-reverse"], onChange: onPropertyChange }) })
        ] })
      ] }),
      isGrid && /* @__PURE__ */ jsxs(Row, { children: [
        /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx(Field, { label: "Grid", children: /* @__PURE__ */ jsx(
          GridPicker,
          {
            columns: parseGridCount(s5.gridTemplateColumns),
            rows: parseGridCount(s5.gridTemplateRows),
            onChange: onPropertyChange
          }
        ) }) }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1 }, onPointerEnter: () => onPropertyHover?.("gap"), onPointerLeave: () => onPropertyHover?.(null), children: /* @__PURE__ */ jsx(Field, { label: "Gap", children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
          /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Horizontal gap between columns", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlSpacingHorizontal, {}) }), prop: "columnGap", value: s5.columnGap, onChange: onPropertyChange, min: 0, ...variableProps("columnGap"), ...changeProps("columnGap") }),
          /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Vertical gap between rows", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlSpacingVertical, {}) }), prop: "rowGap", value: s5.rowGap, onChange: onPropertyChange, min: 0, ...variableProps("rowGap"), ...changeProps("rowGap") })
        ] }) }) })
      ] }),
      /* @__PURE__ */ jsx(RowGroup, { label: "Padding", children: paddingExpanded ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("paddingLeft"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Padding left", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingLeft, {}) }), prop: "paddingLeft", value: s5.paddingLeft, onChange: onPropertyChange, min: 0, ...variableProps("paddingLeft"), ...changeProps("paddingLeft") }) }),
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("paddingTop"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Padding top", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingTop, {}) }), prop: "paddingTop", value: s5.paddingTop, onChange: onPropertyChange, min: 0, ...variableProps("paddingTop"), ...changeProps("paddingTop") }) }),
          /* @__PURE__ */ jsx(Tooltip, { content: "Collapse to axes", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn active", onClick: () => setPaddingExpanded(false), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("paddingRight"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Padding right", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingRight, {}) }), prop: "paddingRight", value: s5.paddingRight, onChange: onPropertyChange, min: 0, ...variableProps("paddingRight"), ...changeProps("paddingRight") }) }),
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("paddingBottom"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Padding bottom", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingBottom, {}) }), prop: "paddingBottom", value: s5.paddingBottom, onChange: onPropertyChange, min: 0, ...variableProps("paddingBottom"), ...changeProps("paddingBottom") }) }),
          /* @__PURE__ */ jsx("div", { style: { width: 32 } })
        ] })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
        /* @__PURE__ */ jsx("div", { style: { flex: 1 }, onPointerEnter: () => onPropertyHover?.("paddingInline"), onPointerLeave: () => onPropertyHover?.(null), children: /* @__PURE__ */ jsx(
          ShorthandInput,
          {
            label: /* @__PURE__ */ jsx(Tooltip, { content: "Horizontal padding (left, right)", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingHorizontal, {}) }),
            props: ["paddingLeft", "paddingRight"],
            values: [s5.paddingLeft, s5.paddingRight],
            onChange: onPropertyChange,
            min: 0,
            ...shorthandVariableProps(["paddingLeft", "paddingRight"]),
            ...shorthandChangeProps(["paddingLeft", "paddingRight"])
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1 }, onPointerEnter: () => onPropertyHover?.("paddingBlock"), onPointerLeave: () => onPropertyHover?.(null), children: /* @__PURE__ */ jsx(
          ShorthandInput,
          {
            label: /* @__PURE__ */ jsx(Tooltip, { content: "Vertical padding (top, bottom)", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingVertical, {}) }),
            props: ["paddingTop", "paddingBottom"],
            values: [s5.paddingTop, s5.paddingBottom],
            onChange: onPropertyChange,
            min: 0,
            ...shorthandVariableProps(["paddingTop", "paddingBottom"]),
            ...shorthandChangeProps(["paddingTop", "paddingBottom"])
          }
        ) }),
        /* @__PURE__ */ jsx(Tooltip, { content: "Edit individual sides", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn", onClick: () => setPaddingExpanded(true), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
      ] }) }),
      /* @__PURE__ */ jsx(RowGroup, { label: "Margin", children: marginExpanded ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("marginLeft"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Margin left", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingLeft, {}) }), prop: "marginLeft", value: s5.marginLeft, onChange: onPropertyChange, ...variableProps("marginLeft"), ...changeProps("marginLeft") }) }),
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("marginTop"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Margin top", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingTop, {}) }), prop: "marginTop", value: s5.marginTop, onChange: onPropertyChange, ...variableProps("marginTop"), ...changeProps("marginTop") }) }),
          /* @__PURE__ */ jsx(Tooltip, { content: "Collapse to axes", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn active", onClick: () => setMarginExpanded(false), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("marginRight"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Margin right", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingRight, {}) }), prop: "marginRight", value: s5.marginRight, onChange: onPropertyChange, ...variableProps("marginRight"), ...changeProps("marginRight") }) }),
          /* @__PURE__ */ jsx("div", { onPointerEnter: () => onPropertyHover?.("marginBottom"), onPointerLeave: () => onPropertyHover?.(null), style: { flex: 1 }, children: /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Margin bottom", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingBottom, {}) }), prop: "marginBottom", value: s5.marginBottom, onChange: onPropertyChange, ...variableProps("marginBottom"), ...changeProps("marginBottom") }) }),
          /* @__PURE__ */ jsx("div", { style: { width: 32 } })
        ] })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
        /* @__PURE__ */ jsx("div", { style: { flex: 1 }, onPointerEnter: () => onPropertyHover?.("marginInline"), onPointerLeave: () => onPropertyHover?.(null), children: /* @__PURE__ */ jsx(
          ShorthandInput,
          {
            label: /* @__PURE__ */ jsx(Tooltip, { content: "Horizontal margin (left, right)", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingHorizontal, {}) }),
            props: ["marginLeft", "marginRight"],
            values: [s5.marginLeft, s5.marginRight],
            onChange: onPropertyChange,
            ...shorthandVariableProps(["marginLeft", "marginRight"]),
            ...shorthandChangeProps(["marginLeft", "marginRight"])
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1 }, onPointerEnter: () => onPropertyHover?.("marginBlock"), onPointerLeave: () => onPropertyHover?.(null), children: /* @__PURE__ */ jsx(
          ShorthandInput,
          {
            label: /* @__PURE__ */ jsx(Tooltip, { content: "Vertical margin (top, bottom)", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(AlPaddingVertical, {}) }),
            props: ["marginTop", "marginBottom"],
            values: [s5.marginTop, s5.marginBottom],
            onChange: onPropertyChange,
            ...shorthandVariableProps(["marginTop", "marginBottom"]),
            ...shorthandChangeProps(["marginTop", "marginBottom"])
          }
        ) }),
        /* @__PURE__ */ jsx(Tooltip, { content: "Edit individual sides", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn", onClick: () => setMarginExpanded(true), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(
      Section,
      {
        label: "Size",
        action: /* @__PURE__ */ jsxs(Fragment$1, { children: [
          /* @__PURE__ */ jsx(Tooltip, { content: "Add constraint", side: "top", children: /* @__PURE__ */ jsx(
            "button",
            {
              ref: sizeMenuBtnRef,
              className: "retune-section-action",
              onClick: () => {
                if (sizeMenuOpen) {
                  setSizeMenuOpen(false);
                  return;
                }
                const el = sizeMenuBtnRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                setSizeMenuPos({ top: rect.bottom + 4, left: rect.right });
                setSizeMenuOpen(true);
              },
              children: /* @__PURE__ */ jsx(Plus, {})
            }
          ) }),
          sizeMenuOpen && sizeMenuPos && /* @__PURE__ */ jsx(
            "div",
            {
              ref: sizeMenuRef,
              style: { position: "fixed", top: sizeMenuPos.top, left: sizeMenuPos.left, transform: "translateX(-100%)", zIndex: 2147483647 },
              children: /* @__PURE__ */ jsx(
                DropdownMenu,
                {
                  options: [
                    { value: "min", label: visibleSizeExtras.has("min") ? "Remove min size" : "Add min size" },
                    { value: "max", label: visibleSizeExtras.has("max") ? "Remove max size" : "Add max size" }
                  ],
                  value: void 0,
                  showCheckmark: false,
                  onSelect: (option) => {
                    const key = option.value;
                    if (visibleSizeExtras.has(key)) {
                      if (key === "min") {
                        onPropertyChange("minWidth", "0px");
                        onPropertyChange("minHeight", "0px");
                      } else {
                        onPropertyChange("maxWidth", "none");
                        onPropertyChange("maxHeight", "none");
                      }
                      setSizeExtras((prev) => {
                        const next = new Set(prev);
                        next.delete(key);
                        return next;
                      });
                    } else {
                      setSizeExtras((prev) => {
                        const next = new Set(prev);
                        next.add(key);
                        return next;
                      });
                    }
                    setSizeMenuOpen(false);
                  }
                }
              )
            }
          )
        ] }),
        children: [
          /* @__PURE__ */ jsxs(Row, { children: [
            /* @__PURE__ */ jsx(Field, { label: "Width", children: /* @__PURE__ */ jsx(
              ComboInput,
              {
                prop: "width",
                value: widthDisplayValue,
                options: SIZE_OPTIONS,
                onChange: (prop, val) => {
                  if (val === "__fill") handleSizingModeChange("width", "fill");
                  else if (val === "__hug") handleSizingModeChange("width", "hug");
                  else {
                    if (isFlexChild) handleSizingModeChange("width", "fixed");
                    onPropertyChange(prop, val);
                  }
                },
                ...changeProps("width")
              }
            ) }),
            /* @__PURE__ */ jsx(Field, { label: "Height", children: /* @__PURE__ */ jsx(
              ComboInput,
              {
                prop: "height",
                value: heightDisplayValue,
                options: heightSizeOptions,
                onChange: (prop, val) => {
                  if (val === "__fill") handleSizingModeChange("height", "fill");
                  else if (val === "__hug") handleSizingModeChange("height", "hug");
                  else {
                    if (isFlexChild) handleSizingModeChange("height", "fixed");
                    onPropertyChange(prop, val);
                  }
                },
                ...changeProps("height")
              }
            ) })
          ] }),
          visibleSizeExtras.has("min") && /* @__PURE__ */ jsx("div", { className: "retune-section-row", children: /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
            /* @__PURE__ */ jsx(Field, { label: "Min W", children: /* @__PURE__ */ jsx(NumberInput, { prop: "minWidth", value: s5.minWidth === "0px" || s5.minWidth === "auto" ? "" : s5.minWidth, placeholder: "\u2013", onChange: (p4, v) => {
              if (!v) onPropertyChange(p4, "0px");
              else onPropertyChange(p4, v);
            }, ...changeProps("minWidth") }) }),
            /* @__PURE__ */ jsx(Field, { label: "Min H", children: /* @__PURE__ */ jsx(NumberInput, { prop: "minHeight", value: s5.minHeight === "0px" || s5.minHeight === "auto" ? "" : s5.minHeight, placeholder: "\u2013", onChange: (p4, v) => {
              if (!v) onPropertyChange(p4, "0px");
              else onPropertyChange(p4, v);
            }, ...changeProps("minHeight") }) }),
            /* @__PURE__ */ jsx(Tooltip, { content: "Remove min size", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn", onClick: () => {
              onPropertyChange("minWidth", "0px");
              onPropertyChange("minHeight", "0px");
              setSizeExtras((prev) => {
                const next = new Set(prev);
                next.delete("min");
                return next;
              });
            }, children: /* @__PURE__ */ jsx(Minus, {}) }) })
          ] }) }),
          visibleSizeExtras.has("max") && /* @__PURE__ */ jsx("div", { className: "retune-section-row", children: /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
            /* @__PURE__ */ jsx(Field, { label: "Max W", children: /* @__PURE__ */ jsx(NumberInput, { prop: "maxWidth", value: s5.maxWidth === "none" ? "" : s5.maxWidth, placeholder: "\u2013", onChange: (p4, v) => {
              if (!v) onPropertyChange(p4, "none");
              else onPropertyChange(p4, v);
            }, ...changeProps("maxWidth") }) }),
            /* @__PURE__ */ jsx(Field, { label: "Max H", children: /* @__PURE__ */ jsx(NumberInput, { prop: "maxHeight", value: s5.maxHeight === "none" ? "" : s5.maxHeight, placeholder: "\u2013", onChange: (p4, v) => {
              if (!v) onPropertyChange(p4, "none");
              else onPropertyChange(p4, v);
            }, ...changeProps("maxHeight") }) }),
            /* @__PURE__ */ jsx(Tooltip, { content: "Remove max size", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn", onClick: () => {
              onPropertyChange("maxWidth", "none");
              onPropertyChange("maxHeight", "none");
              setSizeExtras((prev) => {
                const next = new Set(prev);
                next.delete("max");
                return next;
              });
            }, children: /* @__PURE__ */ jsx(Minus, {}) }) })
          ] }) })
        ]
      }
    ),
    isText && /* @__PURE__ */ jsxs(Section, { label: "Typography", children: [
      /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Font", children: /* @__PURE__ */ jsx(FontInput, { prop: "fontFamily", value: s5.fontFamily, onChange: onPropertyChange, ...changeProps("fontFamily") }) }) }),
      /* @__PURE__ */ jsxs(Row, { children: [
        /* @__PURE__ */ jsx(Field, { label: "Size", children: /* @__PURE__ */ jsx(NumberInput, { prop: "fontSize", value: s5.fontSize, onChange: onPropertyChange, min: 1, ...variableProps("fontSize"), ...changeProps("fontSize") }) }),
        /* @__PURE__ */ jsx(Field, { label: "Weight", children: /* @__PURE__ */ jsx(ComboInput, { prop: "fontWeight", value: s5.fontWeight, options: FONT_WEIGHT_OPTIONS, onChange: onPropertyChange, ...variableProps("fontWeight"), ...changeProps("fontWeight") }) })
      ] }),
      /* @__PURE__ */ jsxs(Row, { children: [
        /* @__PURE__ */ jsx(Field, { label: "Line height", children: /* @__PURE__ */ jsx(ComboInput, { prop: "lineHeight", value: s5.lineHeight, options: LINE_HEIGHT_OPTIONS, onChange: onPropertyChange, ...variableProps("lineHeight"), ...changeProps("lineHeight") }) }),
        /* @__PURE__ */ jsx(Field, { label: "Letter spacing", children: /* @__PURE__ */ jsx(ComboInput, { prop: "letterSpacing", value: s5.letterSpacing, options: LETTER_SPACING_OPTIONS, onChange: onPropertyChange, ...variableProps("letterSpacing"), ...changeProps("letterSpacing") }) })
      ] }),
      /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Color", children: /* @__PURE__ */ jsx(ColorInput, { prop: "color", value: s5.color, onChange: onPropertyChange, ...variableProps("color"), ...changeProps("color") }) }) }),
      /* @__PURE__ */ jsxs(Row, { children: [
        /* @__PURE__ */ jsx(Field, { label: "Align", children: /* @__PURE__ */ jsx(
          SegmentedControl,
          {
            options: TEXT_ALIGN_OPTIONS,
            value: mapTextAlign(s5.textAlign),
            onChange: (v) => onPropertyChange("textAlign", v)
          }
        ) }),
        /* @__PURE__ */ jsx(Field, { label: "Vertical", children: /* @__PURE__ */ jsx(
          SegmentedControl,
          {
            options: VERTICAL_ALIGN_OPTIONS,
            value: mapVerticalAlign(s5.verticalAlign),
            onChange: (v) => onPropertyChange("verticalAlign", v),
            disabled: !hasVerticalAlign
          }
        ) }),
        /* @__PURE__ */ jsx("div", { style: { alignSelf: "flex-end" }, children: /* @__PURE__ */ jsx(Tooltip, { content: typoExpanded ? "Show less" : "More options", side: "top", children: /* @__PURE__ */ jsx("button", { className: `retune-split-btn${typoExpanded ? " active" : ""}`, onClick: () => setTypoExpanded((v) => !v), children: /* @__PURE__ */ jsx(AdjustSmall, {}) }) }) })
      ] }),
      typoExpanded && /* @__PURE__ */ jsxs(Fragment$1, { children: [
        /* @__PURE__ */ jsxs(Row, { children: [
          /* @__PURE__ */ jsx(Field, { label: "Style", children: /* @__PURE__ */ jsx(SelectInput, { prop: "fontStyle", value: s5.fontStyle, options: ["normal", "italic", "oblique"], onChange: onPropertyChange }) }),
          /* @__PURE__ */ jsx(Field, { label: "Decoration", children: /* @__PURE__ */ jsx(SelectInput, { prop: "textDecoration", value: s5.textDecoration, options: ["none", "underline", "line-through", "overline"], onChange: onPropertyChange }) })
        ] }),
        /* @__PURE__ */ jsxs(Row, { children: [
          /* @__PURE__ */ jsx(Field, { label: "Transform", children: /* @__PURE__ */ jsx(SelectInput, { prop: "textTransform", value: s5.textTransform, options: ["none", "uppercase", "lowercase", "capitalize"], onChange: onPropertyChange }) }),
          /* @__PURE__ */ jsx(Field, { label: "White space", children: /* @__PURE__ */ jsx(SelectInput, { prop: "whiteSpace", value: s5.whiteSpace, options: ["normal", "nowrap", "pre", "pre-wrap", "pre-line", "break-spaces"], onChange: onPropertyChange }) })
        ] }),
        (() => {
          const truncation = detectTruncation(s5);
          const ctx = { currentDisplay: s5.display };
          const applyChanges = (changes) => {
            for (const [prop, value] of Object.entries(changes)) {
              onPropertyChange(prop, value);
            }
          };
          const fixAncestorMinWidth = (enabled) => {
            if (!onApplyToElement) return;
            let el = element.element?.parentElement;
            while (el && el !== document.body) {
              const parentDisplay2 = getComputedStyle(el.parentElement || el).display;
              const isGridOrFlexChild = parentDisplay2.includes("grid") || parentDisplay2.includes("flex");
              if (isGridOrFlexChild) {
                onApplyToElement(el, "minWidth", enabled ? "0px" : "");
              }
              el = el.parentElement;
            }
          };
          return /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsxs(Row, { children: [
              /* @__PURE__ */ jsx(Field, { label: "Truncate", children: /* @__PURE__ */ jsx(
                SelectInput,
                {
                  prop: "truncate",
                  value: truncation.enabled ? "ellipsis" : "none",
                  options: ["none", "ellipsis"],
                  onChange: (_p, val) => {
                    const enabled = val === "ellipsis";
                    const changes = computeTruncationChanges(
                      { enabled, lines: 1 },
                      ctx
                    );
                    applyChanges(changes);
                    fixAncestorMinWidth(enabled);
                  }
                }
              ) }),
              truncation.enabled && /* @__PURE__ */ jsx(Field, { label: "Max lines", children: /* @__PURE__ */ jsx(
                NumberInput,
                {
                  prop: "lineClamp",
                  value: String(truncation.lines),
                  onChange: (_p, val) => {
                    const n4 = parseInt(val) || 1;
                    const changes = computeTruncationChanges(
                      { enabled: true, lines: n4 },
                      ctx
                    );
                    applyChanges(changes);
                  },
                  ...changeProps("lineClamp")
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs(Row, { children: [
              /* @__PURE__ */ jsx(Field, { label: "Word break", children: /* @__PURE__ */ jsx(SelectInput, { prop: "overflowWrap", value: s5.overflowWrap, options: ["normal", "break-word", "anywhere"], onChange: onPropertyChange }) }),
              ["UL", "OL", "LI"].includes(element.tagName) && /* @__PURE__ */ jsx(Field, { label: "List style", children: /* @__PURE__ */ jsx(
                SegmentedControl,
                {
                  options: LIST_STYLE_OPTIONS,
                  value: s5.listStyleType || "none",
                  onChange: (val) => onPropertyChange("listStyleType", val)
                }
              ) })
            ] })
          ] });
        })()
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Section, { label: "Appearance", children: [
      /* @__PURE__ */ jsxs(Row, { children: [
        /* @__PURE__ */ jsx(Field, { label: "Opacity", children: /* @__PURE__ */ jsx(NumberInput, { prop: "opacity", value: s5.opacity, onChange: onPropertyChange, min: 0, max: 1, step: 0.01, ...variableProps("opacity"), ...changeProps("opacity") }) }),
        /* @__PURE__ */ jsx(Field, { label: "Z index", children: /* @__PURE__ */ jsx(NumberInput, { prop: "zIndex", value: s5.zIndex, onChange: onPropertyChange, ...changeProps("zIndex") }) })
      ] }),
      /* @__PURE__ */ jsx(RowGroup, { label: "Corner radius", children: radiusExpanded ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Top left corner radius", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(RadiusTopLeft, {}) }), prop: "borderTopLeftRadius", value: s5.borderTopLeftRadius, onChange: onPropertyChange, min: 0, ...variableProps("borderTopLeftRadius"), ...changeProps("borderTopLeftRadius") }),
          /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Top right corner radius", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(RadiusTopRight, {}) }), prop: "borderTopRightRadius", value: s5.borderTopRightRadius, onChange: onPropertyChange, min: 0, ...variableProps("borderTopRightRadius"), ...changeProps("borderTopRightRadius") }),
          /* @__PURE__ */ jsx(Tooltip, { content: "Collapse to single", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn active", onClick: () => setRadiusExpanded(false), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
          /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Bottom left corner radius", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(RadiusBottomLeft, {}) }), prop: "borderBottomLeftRadius", value: s5.borderBottomLeftRadius, onChange: onPropertyChange, min: 0, ...variableProps("borderBottomLeftRadius"), ...changeProps("borderBottomLeftRadius") }),
          /* @__PURE__ */ jsx(NumberInput, { label: /* @__PURE__ */ jsx(Tooltip, { content: "Bottom right corner radius", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(RadiusBottomRight, {}) }), prop: "borderBottomRightRadius", value: s5.borderBottomRightRadius, onChange: onPropertyChange, min: 0, ...variableProps("borderBottomRightRadius"), ...changeProps("borderBottomRightRadius") }),
          /* @__PURE__ */ jsx("div", { style: { width: 32 } })
        ] })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
        /* @__PURE__ */ jsx(
          ShorthandInput,
          {
            label: /* @__PURE__ */ jsx(Tooltip, { content: "Corner radius (TL, TR, BR, BL)", side: "top", sideOffset: 14, children: /* @__PURE__ */ jsx(RadiusTopLeft, {}) }),
            props: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
            values: [s5.borderTopLeftRadius, s5.borderTopRightRadius, s5.borderBottomRightRadius, s5.borderBottomLeftRadius],
            onChange: onPropertyChange,
            min: 0,
            ...shorthandVariableProps(["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"]),
            ...shorthandChangeProps(["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"])
          }
        ),
        /* @__PURE__ */ jsx(Tooltip, { content: "Edit individual corners", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn", onClick: () => setRadiusExpanded(true), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
      ] }) }),
      /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Overflow", children: /* @__PURE__ */ jsx(SelectInput, { prop: "overflow", value: s5.overflow, options: ["visible", "hidden", "auto", "scroll"], onChange: onPropertyChange }) }) })
    ] }),
    (() => {
      const fillVarMatch = getVariableMatch("backgroundColor");
      const fillHasVariable = !!fillVarMatch;
      return /* @__PURE__ */ jsx(
        Section,
        {
          label: "Fill",
          gap: 8,
          action: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 2, alignItems: "center" }, children: [
            !fillHasVariable && /* @__PURE__ */ jsx(
              VariableAction,
              {
                property: "backgroundColor",
                onVariableSelect: handleVariableSelect,
                onVariableApply: (v, props) => {
                  const val = Object.values(v.values)[0];
                  if (val) onPropertyChange("backgroundColor", val);
                  onVariableAssociate?.(props, { className: v.className, values: v.values });
                }
              }
            ),
            hasFill || fillHasVariable ? /* @__PURE__ */ jsx(Tooltip, { content: "Remove fill", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-section-action", onClick: handleRemoveFill, children: /* @__PURE__ */ jsx(Minus, {}) }) }) : /* @__PURE__ */ jsx(Tooltip, { content: "Add fill", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-section-action", onClick: handleAddFill, children: /* @__PURE__ */ jsx(Plus, {}) }) })
          ] }),
          children: hasFill || fillHasVariable ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(
              SelectInput,
              {
                prop: "fillMode",
                value: fillMode === "solid" ? "solid" : gradient.type,
                options: ["solid", "linear", "radial", "conic"],
                onChange: handleFillModeChange,
                isChanged: changeProps("backgroundImage").isChanged,
                onReset: () => {
                  onPropertyReset?.("backgroundImage");
                  onPropertyReset?.("backgroundColor");
                }
              }
            ) }),
            fillMode === "solid" ? /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(ColorInput, { prop: "backgroundColor", value: s5.backgroundColor, onChange: onPropertyChange, ...variableProps("backgroundColor"), ...changeProps("backgroundColor") }) }) : /* @__PURE__ */ jsx(
              GradientEditor,
              {
                gradient,
                onChange: handleGradientChange,
                originalGradient: initialGradient ?? void 0,
                isNewGradient: initialFillMode === "solid"
              }
            )
          ] }) : null
        }
      );
    })(),
    /* @__PURE__ */ jsx(
      Section,
      {
        label: "Border",
        action: hasBorder ? /* @__PURE__ */ jsx(Tooltip, { content: "Remove border", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-section-action", onClick: handleRemoveBorder, children: /* @__PURE__ */ jsx(Minus, {}) }) }) : /* @__PURE__ */ jsx(Tooltip, { content: "Add border", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-section-action", onClick: handleAddBorder, children: /* @__PURE__ */ jsx(Plus, {}) }) }),
        children: hasBorder && /* @__PURE__ */ jsxs(Fragment$1, { children: [
          /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Color", children: /* @__PURE__ */ jsx(ColorInput, { prop: "borderColor", value: activeBorderColor, onChange: onPropertyChange, ...variableProps("borderColor"), ...changeProps("borderColor") }) }) }),
          /* @__PURE__ */ jsx(RowGroup, { label: borderExpanded ? void 0 : "Width", children: borderExpanded ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
              /* @__PURE__ */ jsx(Field, { label: "Top", children: /* @__PURE__ */ jsx(NumberInput, { prop: "borderTopWidth", value: s5.borderTopWidth, onChange: (p4, v) => {
                onPropertyChange(p4, v);
                if (parseFloat(v) > 0 && s5.borderTopStyle === "none") onPropertyChange("borderTopStyle", "solid");
              }, min: 0, ...changeProps("borderTopWidth") }) }),
              /* @__PURE__ */ jsx(Field, { label: "Right", children: /* @__PURE__ */ jsx(NumberInput, { prop: "borderRightWidth", value: s5.borderRightWidth, onChange: (p4, v) => {
                onPropertyChange(p4, v);
                if (parseFloat(v) > 0 && s5.borderRightStyle === "none") onPropertyChange("borderRightStyle", "solid");
              }, min: 0, ...changeProps("borderRightWidth") }) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Collapse to shorthand", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn active", onClick: () => setBorderExpanded(false), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
              /* @__PURE__ */ jsx(Field, { label: "Bottom", children: /* @__PURE__ */ jsx(NumberInput, { prop: "borderBottomWidth", value: s5.borderBottomWidth, onChange: (p4, v) => {
                onPropertyChange(p4, v);
                if (parseFloat(v) > 0 && s5.borderBottomStyle === "none") onPropertyChange("borderBottomStyle", "solid");
              }, min: 0, ...changeProps("borderBottomWidth") }) }),
              /* @__PURE__ */ jsx(Field, { label: "Left", children: /* @__PURE__ */ jsx(NumberInput, { prop: "borderLeftWidth", value: s5.borderLeftWidth, onChange: (p4, v) => {
                onPropertyChange(p4, v);
                if (parseFloat(v) > 0 && s5.borderLeftStyle === "none") onPropertyChange("borderLeftStyle", "solid");
              }, min: 0, ...changeProps("borderLeftWidth") }) }),
              /* @__PURE__ */ jsx("div", { style: { width: 32 } })
            ] })
          ] }) : /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
            /* @__PURE__ */ jsx(
              ShorthandInput,
              {
                props: ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"],
                values: [s5.borderTopWidth, s5.borderRightWidth, s5.borderBottomWidth, s5.borderLeftWidth],
                onChange: onPropertyChange,
                min: 0,
                ...shorthandVariableProps(["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"]),
                ...shorthandChangeProps(["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"])
              }
            ),
            /* @__PURE__ */ jsx(Tooltip, { content: "Edit individual sides", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn", onClick: () => setBorderExpanded(true), children: /* @__PURE__ */ jsx(AlPaddingSides, {}) }) })
          ] }) }),
          /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Style", children: /* @__PURE__ */ jsx(SelectInput, { prop: "borderStyle", value: s5.borderTopStyle !== "none" ? s5.borderTopStyle : s5.borderRightStyle !== "none" ? s5.borderRightStyle : s5.borderBottomStyle !== "none" ? s5.borderBottomStyle : s5.borderLeftStyle, options: ["solid", "dashed", "dotted", "double", "groove", "ridge"], onChange: onPropertyChange }) }) })
        ] })
      }
    ),
    (() => {
      const shadowVarMatch = getVariableMatch("boxShadow");
      const shadowHasVariable = !!shadowVarMatch;
      return /* @__PURE__ */ jsx(
        Section,
        {
          label: "Shadow",
          action: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 2, alignItems: "center" }, children: [
            !shadowHasVariable && /* @__PURE__ */ jsx(
              VariableAction,
              {
                property: "boxShadow",
                onVariableSelect: handleVariableSelect,
                onVariableApply: (v, props) => {
                  const val = Object.values(v.values)[0];
                  if (val) onPropertyChange("boxShadow", val);
                  onVariableAssociate?.(props, { className: v.className, values: v.values });
                }
              }
            ),
            hasShadow || shadowHasVariable ? /* @__PURE__ */ jsx(Tooltip, { content: "Remove shadow", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-section-action", onClick: handleRemoveShadow, children: /* @__PURE__ */ jsx(Minus, {}) }) }) : /* @__PURE__ */ jsx(Tooltip, { content: "Add shadow", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-section-action", onClick: handleAddShadow, children: /* @__PURE__ */ jsx(Plus, {}) }) })
          ] }),
          children: shadowHasVariable ? (() => {
            const shadowPickerRef = { current: null };
            return /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsxs("div", { className: "retune-prop retune-prop-variable-applied", style: { flex: 1, cursor: "pointer" }, onClick: () => shadowPickerRef.current?.(), children: [
              /* @__PURE__ */ jsx(ChangeIndicator, { isChanged: changeProps("boxShadow").isChanged, onReset: changeProps("boxShadow").onReset }),
              /* @__PURE__ */ jsx("span", { className: "retune-prop-input", style: { display: "flex", alignItems: "center", paddingLeft: 12, color: "var(--retune-text)" }, children: shadowVarMatch.variable.className.startsWith("var(--") ? shadowVarMatch.variable.className.slice(6, -1) : shadowVarMatch.variable.className }),
              /* @__PURE__ */ jsx(
                VariableAction,
                {
                  match: shadowVarMatch,
                  property: "boxShadow",
                  onVariableSelect: handleVariableSelect,
                  onVariableApply: handleVariableApply,
                  onVariableUnlink: () => onVariableUnlink?.(["boxShadow"]),
                  openPickerRef: shadowPickerRef
                }
              )
            ] }) });
          })() : hasShadow ? (() => {
            const shadow = parseBoxShadow(s5.boxShadow);
            if (!shadow) return null;
            return /* @__PURE__ */ jsxs(Fragment$1, { children: [
              /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Color", children: /* @__PURE__ */ jsx(
                ColorInput,
                {
                  prop: "shadowColor",
                  value: shadow.color,
                  onChange: (_p, val) => handleShadowFieldChange("color", val),
                  ...changeProps("shadowColor")
                }
              ) }) }),
              /* @__PURE__ */ jsxs(Row, { children: [
                /* @__PURE__ */ jsx(Field, { label: "X offset", children: /* @__PURE__ */ jsx(
                  NumberInput,
                  {
                    prop: "shadowOffsetX",
                    value: `${shadow.offsetX}px`,
                    onChange: (_p, val) => handleShadowFieldChange("offsetX", parseFloat(val) || 0),
                    ...changeProps("shadowOffsetX")
                  }
                ) }),
                /* @__PURE__ */ jsx(Field, { label: "Y offset", children: /* @__PURE__ */ jsx(
                  NumberInput,
                  {
                    prop: "shadowOffsetY",
                    value: `${shadow.offsetY}px`,
                    onChange: (_p, val) => handleShadowFieldChange("offsetY", parseFloat(val) || 0),
                    ...changeProps("shadowOffsetY")
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxs(Row, { children: [
                /* @__PURE__ */ jsx(Field, { label: "Blur", children: /* @__PURE__ */ jsx(
                  NumberInput,
                  {
                    prop: "shadowBlur",
                    value: `${shadow.blur}px`,
                    onChange: (_p, val) => handleShadowFieldChange("blur", Math.max(0, parseFloat(val) || 0)),
                    min: 0,
                    ...changeProps("shadowBlur")
                  }
                ) }),
                /* @__PURE__ */ jsx(Field, { label: "Spread", children: /* @__PURE__ */ jsx(
                  NumberInput,
                  {
                    prop: "shadowSpread",
                    value: `${shadow.spread}px`,
                    onChange: (_p, val) => handleShadowFieldChange("spread", parseFloat(val) || 0),
                    ...changeProps("shadowSpread")
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsx(Field, { label: "Type", children: /* @__PURE__ */ jsx(
                SelectInput,
                {
                  prop: "shadowInset",
                  value: shadow.inset ? "inside" : "outside",
                  options: ["outside", "inside"],
                  onChange: (_p, val) => handleShadowFieldChange("inset", val === "inside")
                }
              ) }) })
            ] });
          })() : null
        }
      );
    })(),
    /* @__PURE__ */ jsx(
      Section,
      {
        label: "Filters",
        action: /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ jsx(Tooltip, { content: "Add filter", side: "top", children: /* @__PURE__ */ jsx(
            "button",
            {
              ref: filterMenuBtnRef,
              className: "retune-section-action",
              onClick: () => {
                if (filterMenuOpen) {
                  setFilterMenuOpen(false);
                  return;
                }
                const btn = filterMenuBtnRef.current;
                if (!btn) return;
                const rect = btn.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom - 8;
                const spaceAbove = rect.top - 8;
                if (spaceBelow >= spaceAbove) {
                  setFilterMenuPos({ top: rect.bottom + 4, left: rect.right });
                } else {
                  setFilterMenuPos({ bottom: window.innerHeight - rect.top + 4, left: rect.right });
                }
                setFilterMenuOpen(true);
              },
              children: /* @__PURE__ */ jsx(Plus, {})
            }
          ) }),
          filterMenuOpen && filterMenuPos && /* @__PURE__ */ jsx(
            "div",
            {
              ref: filterMenuRef,
              style: {
                position: "fixed",
                ...filterMenuPos.top != null ? { top: filterMenuPos.top } : { bottom: filterMenuPos.bottom },
                left: filterMenuPos.left,
                transform: "translateX(-100%)",
                zIndex: 2147483647
              },
              children: /* @__PURE__ */ jsx(
                DropdownMenu,
                {
                  options: (() => {
                    const usedLayer = new Set(filters.filter((f) => f.target === "layer").map((f) => f.type));
                    const usedBackdrop = new Set(filters.filter((f) => f.target === "backdrop").map((f) => f.type));
                    const availLayer = FILTER_TYPES.filter((t2) => !usedLayer.has(t2));
                    const availBackdrop = FILTER_TYPES.filter((t2) => !usedBackdrop.has(t2));
                    const opts = [];
                    availLayer.forEach((t2, i3) => {
                      opts.push({
                        value: `layer:${t2}`,
                        label: FILTER_CONFIG[t2].label,
                        ...i3 === 0 ? { headingBefore: "Layer" } : {}
                      });
                    });
                    availBackdrop.forEach((t2, i3) => {
                      opts.push({
                        value: `backdrop:${t2}`,
                        label: FILTER_CONFIG[t2].label,
                        ...i3 === 0 ? { headingBefore: "Backdrop", ...availLayer.length > 0 ? { separatorBefore: true } : {} } : {}
                      });
                    });
                    return opts;
                  })(),
                  showCheckmark: false,
                  onSelect: (option) => {
                    const [target, type] = option.value.split(":");
                    handleAddFilter(type, target);
                  }
                }
              )
            }
          )
        ] }),
        children: filters.length > 0 && (() => {
          const layerFilters = filters.filter((f) => f.target === "layer");
          const backdropFilters = filters.filter((f) => f.target === "backdrop");
          const renderFilterRow = (f) => {
            const config2 = FILTER_CONFIG[f.type];
            return /* @__PURE__ */ jsxs("div", { className: "retune-row", children: [
              /* @__PURE__ */ jsx(
                SliderInput,
                {
                  label: config2.label,
                  prop: f.id,
                  value: String(f.value),
                  min: config2.min,
                  max: config2.max,
                  step: config2.step,
                  onChange: (_p, val) => handleFilterValueChange(f.id, parseFloat(val) || 0)
                }
              ),
              /* @__PURE__ */ jsx("div", { style: { alignSelf: "center" }, children: /* @__PURE__ */ jsx(Tooltip, { content: "Remove", side: "top", children: /* @__PURE__ */ jsx("button", { className: "retune-split-btn", onClick: () => handleRemoveFilter(f.id), children: /* @__PURE__ */ jsx(Minus, {}) }) }) })
            ] }, f.id);
          };
          return /* @__PURE__ */ jsxs(Fragment$1, { children: [
            layerFilters.length > 0 && /* @__PURE__ */ jsx(RowGroup, { label: backdropFilters.length > 0 ? "Layer" : void 0, children: layerFilters.map(renderFilterRow) }),
            backdropFilters.length > 0 && /* @__PURE__ */ jsx(RowGroup, { label: layerFilters.length > 0 ? "Backdrop" : void 0, children: backdropFilters.map(renderFilterRow) })
          ] });
        })()
      }
    ),
    /* @__PURE__ */ jsx("div", { ref: filterSectionRef })
  ] });
}
var _nextStableId = 0;
var _stableKeys = /* @__PURE__ */ new WeakMap();
var _stableKeyReverse = /* @__PURE__ */ new Map();
function getStableKey(el) {
  let id2 = _stableKeys.get(el);
  if (id2 === void 0) {
    id2 = _nextStableId++;
    _stableKeys.set(el, id2);
    _stableKeyReverse.set(id2, el);
  }
  return id2;
}
var SKIP_TAGS = /* @__PURE__ */ new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "TITLE",
  "HEAD",
  "NOSCRIPT",
  "BR",
  "WBR",
  "COL"
]);
function isRetuneElement(el) {
  if (el.hasAttribute("data-retune-host")) return true;
  if (el.hasAttribute("data-retune-highlight")) return true;
  if (el.hasAttribute("data-retune-selection")) return true;
  if (el.hasAttribute("data-retune-label")) return true;
  if (el.hasAttribute("data-retune-selection-label")) return true;
  return false;
}
function getVisibleChildren(el, visualOrderMap, reparentEntries) {
  const source = visualOrderMap?.get(el) ?? Array.from(el.children);
  const children = [];
  const reparentedAway = reparentEntries ? new Set(reparentEntries.filter((r) => r.element.parentElement === el && r.newParent !== el).map((r) => r.element)) : null;
  for (const child of source) {
    if (SKIP_TAGS.has(child.tagName)) continue;
    if (isRetuneElement(child)) continue;
    if (reparentedAway?.has(child)) continue;
    children.push(child);
  }
  if (reparentEntries) {
    for (const entry of reparentEntries) {
      if (entry.newParent === el && entry.element.parentElement !== el) {
        const idx = Math.min(entry.insertIndex, children.length);
        children.splice(idx, 0, entry.element);
      }
    }
  }
  return children;
}
function formatNodeLabel(el) {
  const tag = el.tagName.toLowerCase();
  let qualifier = "";
  if (el.id) {
    qualifier = `#${el.id}`;
  } else if (el.className && typeof el.className === "string") {
    const first = el.className.trim().split(/\s+/)[0];
    if (first) qualifier = `.${first}`;
  }
  const component = getDirectReactComponent(el);
  return { tag, qualifier, component };
}
function isAncestor(ancestor, descendant) {
  let current = descendant.parentElement;
  while (current) {
    if (current === ancestor) return true;
    current = current.parentElement;
  }
  return false;
}
function getAncestorPath(target) {
  const path = /* @__PURE__ */ new Set();
  let current = target.parentElement;
  while (current) {
    path.add(current);
    current = current.parentElement;
  }
  return path;
}
function computeDropIndex(cursorY, siblingRects) {
  for (let i3 = 0; i3 < siblingRects.length; i3++) {
    const midY = siblingRects[i3].top + siblingRects[i3].height / 2;
    if (cursorY < midY) return i3;
  }
  return siblingRects.length;
}
var DRAG_THRESHOLD = 5;
var AUTO_SCROLL_ZONE = 30;
var AUTO_SCROLL_SPEED = 8;
var TreeNode = memo(function TreeNode2({
  element,
  depth,
  selectedElement,
  expandedSet,
  visualOrderMap,
  reparentEntries,
  onToggle,
  onSelect,
  onHover,
  onDragStart,
  isDragging,
  treeNodeRefs
}) {
  const children = getVisibleChildren(element, visualOrderMap, reparentEntries);
  const isReparented = reparentEntries?.some((r) => r.element === element && r.newParent !== element.parentElement);
  const hasChildren = children.length > 0;
  const isExpanded = expandedSet.has(element);
  const isSelected = element === selectedElement;
  const { tag, qualifier, component } = formatNodeLabel(element);
  return /* @__PURE__ */ jsxs(Fragment$1, { children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        ref: (node) => {
          if (node) treeNodeRefs.set(element, node);
        },
        "data-retune-tree-key": getStableKey(element),
        className: `retune-tree-node${isSelected ? " selected" : ""}`,
        style: { paddingLeft: 12 + depth * 16 },
        onPointerDown: (e2) => {
          if (e2.target.closest(".retune-tree-arrow")) return;
          onDragStart(e2.nativeEvent, element);
        },
        onPointerEnter: () => {
          if (!isDragging) onHover(element);
        },
        onPointerLeave: () => {
          if (!isDragging) onHover(null);
        },
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: `retune-tree-arrow${hasChildren ? "" : " empty"}${isExpanded ? " expanded" : ""}`,
              onClick: (e2) => {
                e2.stopPropagation();
                if (hasChildren) onToggle(element);
              },
              children: hasChildren && /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M9.76754 6.76778C9.9628 6.57252 10.2803 6.57252 10.4755 6.76778C10.6705 6.96298 10.6705 7.27962 10.4755 7.47482L7.99996 9.94942L5.52535 7.47482C5.33009 7.27955 5.33009 6.96305 5.52535 6.76778C5.72061 6.57252 6.03712 6.57252 6.23238 6.76778L7.99996 8.53536L9.76754 6.76778Z", fill: "currentColor", fillOpacity: "0.9" }) })
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "retune-tree-tag", children: tag }),
          qualifier && /* @__PURE__ */ jsx("span", { className: "retune-tree-qualifier", children: qualifier }),
          isReparented && /* @__PURE__ */ jsx("span", { className: "retune-tree-moved", children: "moved" }),
          component && /* @__PURE__ */ jsxs("span", { className: "retune-tree-component", children: [
            "<",
            component,
            ">"
          ] })
        ]
      }
    ),
    isExpanded && children.map((child) => /* @__PURE__ */ jsx(
      TreeNode2,
      {
        element: child,
        depth: depth + 1,
        selectedElement,
        expandedSet,
        visualOrderMap,
        reparentEntries,
        onToggle,
        onSelect,
        onHover,
        onDragStart,
        isDragging,
        treeNodeRefs
      },
      getStableKey(child)
    ))
  ] });
});
function ElementTree({ selectedElement, onSelect, onHover, visualOrderMap, reparentEntries, onTreeReorder, onTreeReparent }) {
  const [expandedSet, setExpandedSet] = useState(() => /* @__PURE__ */ new Set());
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef(null);
  const innerRef = useRef(null);
  const prevSelectedRef = useRef(null);
  const treeNodeRefs = useRef(/* @__PURE__ */ new WeakMap()).current;
  const dragRef = useRef(null);
  useEffect(() => {
    if (!selectedElement || selectedElement === prevSelectedRef.current) return;
    prevSelectedRef.current = selectedElement;
    const ancestors = getAncestorPath(selectedElement);
    setExpandedSet((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const a4 of ancestors) {
        if (!next.has(a4)) {
          next.add(a4);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    requestAnimationFrame(() => {
      const node = scrollRef.current?.querySelector(".retune-tree-node.selected");
      node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [selectedElement]);
  const handleToggle = useCallback((el) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(el)) {
        next.delete(el);
      } else {
        next.add(el);
      }
      return next;
    });
  }, []);
  const snapshotSiblingRects = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.siblingRects = drag.siblings.map((s5) => {
      const node = treeNodeRefs.get(s5);
      return node ? node.getBoundingClientRect() : new DOMRect();
    });
  }, [treeNodeRefs]);
  const createGhost = useCallback((element, x, y) => {
    const { tag, qualifier, component } = formatNodeLabel(element);
    const ghost = document.createElement("div");
    ghost.className = "retune-tree-ghost";
    let label = tag;
    if (qualifier) label += qualifier;
    if (component) label += ` <${component}>`;
    ghost.textContent = label;
    ghost.style.left = `${x + 12}px`;
    ghost.style.top = `${y - 12}px`;
    const root = scrollRef.current?.getRootNode();
    if (root instanceof ShadowRoot) {
      root.appendChild(ghost);
    } else {
      scrollRef.current?.appendChild(ghost);
    }
    return ghost;
  }, []);
  const createIndicator = useCallback(() => {
    const indicator = document.createElement("div");
    indicator.className = "retune-tree-drop-indicator";
    innerRef.current?.appendChild(indicator);
    return indicator;
  }, []);
  const positionIndicator = useCallback((indicator, dropIndex, depth) => {
    const drag = dragRef.current;
    if (!drag || !innerRef.current) return;
    const innerRect = innerRef.current.getBoundingClientRect();
    let y;
    if (drag.siblingRects.length === 0) return;
    if (dropIndex <= 0) {
      y = drag.siblingRects[0].top - innerRect.top - 1;
    } else if (dropIndex >= drag.siblings.length) {
      const last = drag.siblingRects[drag.siblingRects.length - 1];
      y = last.bottom - innerRect.top - 1;
    } else {
      const prev = drag.siblingRects[dropIndex - 1];
      const curr = drag.siblingRects[dropIndex];
      y = (prev.bottom + curr.top) / 2 - innerRect.top - 1;
    }
    const indent = 12 + depth * 16;
    indicator.style.display = "block";
    indicator.style.top = `${y}px`;
    indicator.style.left = `${indent}px`;
  }, []);
  const cleanupDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.ghost) drag.ghost.remove();
    if (drag.indicator) {
      drag.indicator.style.display = "none";
      drag.indicator.remove();
    }
    if (drag.highlightedNode) drag.highlightedNode.classList.remove("reparent-target");
    if (drag.expandTimer) clearTimeout(drag.expandTimer);
    const sourceNode = treeNodeRefs.get(drag.element);
    if (sourceNode) sourceNode.classList.remove("dragging");
    if (drag.scrollRaf) cancelAnimationFrame(drag.scrollRaf);
    dragRef.current = null;
    setIsDragging(false);
  }, [treeNodeRefs]);
  const findTargetElement = useCallback((e2) => {
    const root = scrollRef.current?.getRootNode();
    if (!(root instanceof ShadowRoot)) return null;
    const hit = root.elementFromPoint(e2.clientX, e2.clientY);
    const treeNode = hit?.closest?.("[data-retune-tree-key]");
    if (!treeNode) return null;
    const key = parseInt(treeNode.getAttribute("data-retune-tree-key") || "", 10);
    if (isNaN(key)) return null;
    const element = _stableKeyReverse.get(key);
    if (!element) return null;
    return { element, treeNode };
  }, []);
  const getElementDepth = useCallback((el) => {
    let depth = 0;
    let current = el.parentElement;
    while (current && current !== document.body) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }, []);
  const handlePointerMove = useCallback((e2) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e2.clientX - drag.startX;
    const dy = e2.clientY - drag.startY;
    if (!drag.active) {
      if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      drag.active = true;
      setIsDragging(true);
      onSelect(drag.element);
      const wasExpanded = expandedSet.has(drag.element);
      drag.wasExpanded = wasExpanded;
      if (wasExpanded) {
        setExpandedSet((prev) => {
          const next = new Set(prev);
          next.delete(drag.element);
          return next;
        });
        requestAnimationFrame(() => {
          snapshotSiblingRects();
        });
      } else {
        snapshotSiblingRects();
      }
      const sourceNode = treeNodeRefs.get(drag.element);
      if (sourceNode) sourceNode.classList.add("dragging");
      drag.ghost = createGhost(drag.element, e2.clientX, e2.clientY);
      drag.indicator = createIndicator();
      return;
    }
    if (!drag.element.isConnected) {
      cleanupDrag();
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      return;
    }
    if (drag.ghost) {
      drag.ghost.style.left = `${e2.clientX + 12}px`;
      drag.ghost.style.top = `${e2.clientY - 12}px`;
    }
    if (drag.highlightedNode) {
      drag.highlightedNode.classList.remove("reparent-target");
      drag.highlightedNode = null;
    }
    const target = findTargetElement(e2);
    if (!target || target.element === drag.element || isAncestor(drag.element, target.element)) {
      if (drag.indicator) drag.indicator.style.display = "none";
      drag.mode = null;
      drag.reparentTarget = null;
      if (drag.expandTimer) {
        clearTimeout(drag.expandTimer);
        drag.expandTimer = null;
      }
      drag.lastHoverKey = null;
    } else {
      const targetParent = target.element.parentElement;
      const isSibling = targetParent === drag.parentElement;
      if (isSibling) {
        drag.mode = "reorder";
        drag.reparentTarget = null;
        if (drag.expandTimer) {
          clearTimeout(drag.expandTimer);
          drag.expandTimer = null;
        }
        drag.lastHoverKey = null;
        const newDropIndex = computeDropIndex(e2.clientY, drag.siblingRects);
        drag.dropIndex = newDropIndex;
        if (drag.indicator) {
          const visualDrop = newDropIndex > drag.dragIndex ? newDropIndex + 1 : newDropIndex;
          positionIndicator(drag.indicator, visualDrop, drag.siblingDepth);
        }
      } else {
        const rect = target.treeNode.getBoundingClientRect();
        const relY = (e2.clientY - rect.top) / rect.height;
        const targetDepth = getElementDepth(target.element);
        if (relY < 0.25 && targetParent) {
          drag.mode = "reparent";
          drag.reparentTarget = targetParent;
          const targetSiblings = getVisibleChildren(targetParent, visualOrderMap);
          drag.reparentIndex = targetSiblings.indexOf(target.element);
          if (drag.reparentIndex === -1) drag.reparentIndex = 0;
          if (drag.indicator) {
            const innerRect = innerRef.current?.getBoundingClientRect();
            if (innerRect) {
              const indent = 12 + targetDepth * 16;
              drag.indicator.style.display = "block";
              drag.indicator.style.top = `${rect.top - innerRect.top - 1}px`;
              drag.indicator.style.left = `${indent}px`;
            }
          }
        } else if (relY > 0.75 && targetParent) {
          drag.mode = "reparent";
          drag.reparentTarget = targetParent;
          const targetSiblings = getVisibleChildren(targetParent, visualOrderMap);
          drag.reparentIndex = targetSiblings.indexOf(target.element) + 1;
          if (drag.indicator) {
            const innerRect = innerRef.current?.getBoundingClientRect();
            if (innerRect) {
              const indent = 12 + targetDepth * 16;
              drag.indicator.style.display = "block";
              drag.indicator.style.top = `${rect.bottom - innerRect.top - 1}px`;
              drag.indicator.style.left = `${indent}px`;
            }
          }
        } else {
          drag.mode = "reparent";
          drag.reparentTarget = target.element;
          drag.reparentIndex = getVisibleChildren(target.element, visualOrderMap).length;
          if (drag.indicator) drag.indicator.style.display = "none";
          target.treeNode.classList.add("reparent-target");
          drag.highlightedNode = target.treeNode;
        }
        const targetKey = getStableKey(target.element);
        if (targetKey !== drag.lastHoverKey) {
          if (drag.expandTimer) clearTimeout(drag.expandTimer);
          drag.lastHoverKey = targetKey;
          const hasChildren = getVisibleChildren(target.element, visualOrderMap).length > 0;
          if (hasChildren && !expandedSet.has(target.element)) {
            drag.expandTimer = setTimeout(() => {
              setExpandedSet((prev) => {
                const next = new Set(prev);
                next.add(target.element);
                return next;
              });
            }, 500);
          }
        }
      }
    }
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      const scrollRect = scrollEl.getBoundingClientRect();
      const distFromTop = e2.clientY - scrollRect.top;
      const distFromBottom = scrollRect.bottom - e2.clientY;
      if (distFromTop < AUTO_SCROLL_ZONE && scrollEl.scrollTop > 0) {
        scrollEl.scrollTop -= AUTO_SCROLL_SPEED * (1 - distFromTop / AUTO_SCROLL_ZONE);
        snapshotSiblingRects();
      } else if (distFromBottom < AUTO_SCROLL_ZONE) {
        scrollEl.scrollTop += AUTO_SCROLL_SPEED * (1 - distFromBottom / AUTO_SCROLL_ZONE);
        snapshotSiblingRects();
      }
    }
  }, [expandedSet, treeNodeRefs, snapshotSiblingRects, createGhost, createIndicator, positionIndicator, cleanupDrag, findTargetElement, getElementDepth, visualOrderMap]);
  const handlePointerUp = useCallback((e2) => {
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.active) {
      onSelect(drag.element);
      dragRef.current = null;
      return;
    }
    const { element, dragIndex, dropIndex, mode, reparentTarget, reparentIndex, wasExpanded } = drag;
    cleanupDrag();
    if (mode === "reparent" && reparentTarget && onTreeReparent) {
      onTreeReparent(element, reparentTarget, reparentIndex);
    } else if (mode === "reorder" && dropIndex !== dragIndex && onTreeReorder) {
      onTreeReorder(element, dragIndex, dropIndex);
    } else if (wasExpanded) {
      setExpandedSet((prev) => {
        const next = new Set(prev);
        next.add(element);
        return next;
      });
    }
  }, [onSelect, onTreeReorder, onTreeReparent, cleanupDrag, handlePointerMove]);
  const handleDragStart = useCallback((e2, element) => {
    if (!onTreeReorder && !onTreeReparent) return;
    const parent = element.parentElement;
    if (!parent) return;
    const siblings = getVisibleChildren(parent, visualOrderMap);
    const dragIndex = siblings.indexOf(element);
    if (dragIndex === -1) return;
    e2.preventDefault();
    e2.stopPropagation();
    let depth = 0;
    let ancestor = parent;
    while (ancestor && ancestor !== document.body) {
      depth++;
      ancestor = ancestor.parentElement;
    }
    dragRef.current = {
      element,
      parentElement: parent,
      siblings,
      siblingRects: [],
      siblingDepth: depth,
      dragIndex,
      dropIndex: dragIndex,
      startX: e2.clientX,
      startY: e2.clientY,
      active: false,
      wasExpanded: false,
      ghost: null,
      indicator: null,
      scrollRaf: null,
      mode: null,
      reparentTarget: null,
      reparentIndex: 0,
      expandTimer: null,
      lastHoverKey: null,
      highlightedNode: null
    };
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
  }, [onTreeReorder, onTreeReparent, visualOrderMap, handlePointerMove, handlePointerUp]);
  const bodyChildren = typeof document !== "undefined" ? getVisibleChildren(document.body, void 0, reparentEntries) : [];
  return /* @__PURE__ */ jsx("div", { className: "retune-tree", ref: scrollRef, children: /* @__PURE__ */ jsx("div", { className: "retune-tree-inner", ref: innerRef, children: bodyChildren.map((child) => /* @__PURE__ */ jsx(
    TreeNode,
    {
      element: child,
      depth: 0,
      selectedElement,
      expandedSet,
      visualOrderMap,
      reparentEntries,
      onToggle: handleToggle,
      onSelect,
      onHover,
      onDragStart: handleDragStart,
      isDragging,
      treeNodeRefs
    },
    getStableKey(child)
  )) }) });
}
var isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
var MOD = isMac ? "\u2318" : "Ctrl";
var ALT = isMac ? "\u2325" : "Alt";
var DEL = isMac ? "\u232B" : "Del";
var SHORTCUTS = [
  { label: "Undo", keys: [MOD, "Z"] },
  { label: "Redo", keys: [MOD, "\u21E7", "Z"] },
  { label: "Select Child", keys: ["Enter"] },
  { label: "Select Parent", keys: ["\u21E7", "Enter"] },
  { label: "Select Next Sibling", keys: ["Tab"] },
  { label: "Select Previous Sibling", keys: ["\u21E7", "Tab"] },
  { label: "Reorder", keys: ["\u2191", "\u2193", "\u2190", "\u2192"] },
  { label: "Delete Element", keys: [DEL] },
  { label: "Measure Spacing", keys: [ALT, "Hover"] }
];
function KeyBadge({ children }) {
  const isWide = children.length > 1;
  return /* @__PURE__ */ jsx("span", { className: `retune-key${isWide ? " wide" : ""}`, children });
}
var ChevronRight = () => /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M10 8L14 12L10 16", stroke: "currentColor", strokeOpacity: "0.35", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) });
var ChevronLeft = () => /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M14 8L10 12L14 16", stroke: "currentColor", strokeOpacity: "0.5", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) });
var EASE_IN_OUT = "130ms cubic-bezier(0.645, 0.045, 0.355, 1)";
var EASE_OUT = "130ms cubic-bezier(0.215, 0.61, 0.355, 1)";
function SettingsPanel({
  side,
  theme,
  onThemeChange,
  fidelity,
  onFidelityChange,
  onHide,
  exiting
}) {
  const [view, setView] = useState("main");
  const panelRef = useRef(null);
  const animateHeight = useCallback((nextView) => {
    const panel = panelRef.current;
    if (!panel) {
      setView(nextView);
      return;
    }
    const fromHeight = panel.offsetHeight;
    panel.style.height = `${fromHeight}px`;
    panel.style.transition = "none";
    setView(nextView);
    requestAnimationFrame(() => {
      panel.style.height = "auto";
      const toHeight = panel.offsetHeight;
      panel.style.height = `${fromHeight}px`;
      requestAnimationFrame(() => {
        panel.style.transition = `height ${EASE_IN_OUT}`;
        panel.style.height = `${toHeight}px`;
        const cleanup = () => {
          panel.removeEventListener("transitionend", cleanup);
          panel.style.transition = "";
          panel.style.height = "";
        };
        panel.addEventListener("transitionend", cleanup, { once: true });
      });
    });
  }, []);
  const handleThemeChange = useCallback((_prop, value) => {
    onThemeChange(value);
  }, [onThemeChange]);
  const handleFidelityChange = useCallback((_prop, value) => {
    onFidelityChange(value);
  }, [onFidelityChange]);
  const isMain = view === "main";
  return /* @__PURE__ */ jsx("div", { ref: panelRef, className: `retune-settings-panel ${side}${exiting ? " exiting" : ""}`, children: /* @__PURE__ */ jsxs("div", { className: "retune-settings-clip", children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "retune-settings-view-container",
        style: {
          opacity: isMain ? 1 : 0,
          transition: `opacity ${isMain ? EASE_OUT : EASE_IN_OUT}${isMain ? " 30ms" : ""}`,
          pointerEvents: isMain ? "auto" : "none",
          position: isMain ? "relative" : "absolute",
          top: 0,
          left: 0,
          right: 0
        },
        children: [
          /* @__PURE__ */ jsx("div", { className: "retune-settings-header", children: /* @__PURE__ */ jsx("span", { className: "retune-settings-title", children: "Settings" }) }),
          /* @__PURE__ */ jsxs("div", { className: "retune-settings-body", children: [
            /* @__PURE__ */ jsxs("div", { className: "retune-settings-row", children: [
              /* @__PURE__ */ jsx("span", { className: "retune-settings-label", children: "Theme" }),
              /* @__PURE__ */ jsx("div", { style: { width: 96 }, children: /* @__PURE__ */ jsx(
                SelectInput,
                {
                  prop: "theme",
                  value: theme,
                  options: ["system", "light", "dark"],
                  onChange: handleThemeChange
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "retune-settings-row", children: [
              /* @__PURE__ */ jsx("span", { className: "retune-settings-label", children: "Output Detail" }),
              /* @__PURE__ */ jsx("div", { style: { width: 96 }, children: /* @__PURE__ */ jsx(
                SelectInput,
                {
                  prop: "fidelity",
                  value: fidelity,
                  options: ["minimal", "standard", "full"],
                  onChange: handleFidelityChange
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "retune-settings-row", children: [
              /* @__PURE__ */ jsx("span", { className: "retune-settings-label", children: "Hide Retune for this session" }),
              /* @__PURE__ */ jsx("div", { className: "retune-switch-wrap", children: /* @__PURE__ */ jsx("button", { className: "retune-switch", onClick: onHide, children: /* @__PURE__ */ jsx("span", { className: "retune-switch-knob" }) }) })
            ] }),
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: "retune-settings-row clickable",
                onClick: () => animateHeight("shortcuts"),
                children: [
                  /* @__PURE__ */ jsx("span", { className: "retune-settings-label", children: "Keyboard shortcuts" }),
                  /* @__PURE__ */ jsx(ChevronRight, {})
                ]
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "retune-settings-view-container",
        style: {
          opacity: !isMain ? 1 : 0,
          transition: `opacity ${!isMain ? EASE_OUT : EASE_IN_OUT}${!isMain ? " 30ms" : ""}`,
          pointerEvents: !isMain ? "auto" : "none",
          position: !isMain ? "relative" : "absolute",
          top: 0,
          left: 0,
          right: 0
        },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "retune-settings-header retune-settings-back", onClick: () => animateHeight("main"), children: [
            /* @__PURE__ */ jsx(ChevronLeft, {}),
            /* @__PURE__ */ jsx("span", { className: "retune-settings-title", style: { padding: "8px 0" }, children: "Keyboard shortcuts" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "retune-settings-body", children: SHORTCUTS.map((s5) => /* @__PURE__ */ jsxs("div", { className: "retune-settings-row", children: [
            /* @__PURE__ */ jsx("span", { className: "retune-settings-label", children: s5.label }),
            /* @__PURE__ */ jsx("div", { className: "retune-key-group", children: s5.keys.map((k, i3) => /* @__PURE__ */ jsx(KeyBadge, { children: k }, i3)) })
          ] }, s5.label)) })
        ]
      }
    )
  ] }) });
}
var a = ({ children: o2, size: r = 24, ariaLabel: t2, color: s5, ariaHidden: e2 = true, style: l2, ...c3 }) => e.createElement("svg", { ...c3, "aria-hidden": e2, role: e2 ? void 0 : "img", width: typeof r == "number" ? `${r}px` : r, height: typeof r == "number" ? `${r}px` : r, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { color: s5, ...l2 } }, t2 && !e2 && e.createElement("title", null, t2), o2);
var i = (o2) => e.createElement(a, { ...o2, ariaLabel: "cursor-click, arrow, clickbait" }, e.createElement("path", { d: "M11 2.75V4.5M16.9069 5.09326L15.5962 6.40392M6.40381 15.5962L5.09315 16.9069M4.5 11H2.75M6.40381 6.40381L5.09315 5.09315M14.1323 20.999L10.3851 10.7984C10.2362 10.3929 10.6368 10.0021 11.0385 10.1611L21.0397 14.1199C21.4283 14.2737 21.4679 14.8081 21.1062 15.0175L17.3654 17.1832C17.2898 17.227 17.227 17.2898 17.1832 17.3654L15.0343 21.0771C14.822 21.4438 14.2784 21.3967 14.1323 20.999Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }));
var a2 = ({ children: r, size: e2 = 24, ariaLabel: t2, color: s5, ariaHidden: o2 = true, style: l2, ...i3 }) => e.createElement("svg", { ...i3, "aria-hidden": o2, role: o2 ? void 0 : "img", width: typeof e2 == "number" ? `${e2}px` : e2, height: typeof e2 == "number" ? `${e2}px` : e2, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { color: s5, ...l2 } }, t2 && !o2 && e.createElement("title", null, t2), r);
var C = (r) => e.createElement(a2, { ...r, ariaLabel: "square-behind-square-1, copy 1, layers, pages" }, e.createElement("path", { d: "M15.25 8.75V4C15.25 3.30964 14.6904 2.75 14 2.75H4C3.30964 2.75 2.75 3.30964 2.75 4V14C2.75 14.6904 3.30964 15.25 4 15.25H8.75M10 8.75H20C20.6904 8.75 21.25 9.30964 21.25 10V20C21.25 20.6904 20.6904 21.25 20 21.25H10C9.30964 21.25 8.75 20.6904 8.75 20V10C8.75 9.30964 9.30964 8.75 10 8.75Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }));
var s = ({ children: r, size: e2 = 24, ariaLabel: t2, color: a4, ariaHidden: o2 = true, style: l2, ...m }) => e.createElement("svg", { ...m, "aria-hidden": o2, role: o2 ? void 0 : "img", width: typeof e2 == "number" ? `${e2}px` : e2, height: typeof e2 == "number" ? `${e2}px` : e2, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { color: a4, ...l2 } }, t2 && !o2 && e.createElement("title", null, t2), r);
var c = (r) => e.createElement(s, { ...r, ariaLabel: "cross-medium, crossed medium, close" }, e.createElement("path", { d: "M6.25 6.25L17.75 17.75M17.75 6.25L6.25 17.75", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }));
var a3 = ({ children: o2, size: r = 24, ariaLabel: n4, color: p4, ariaHidden: t2 = true, style: i3, ...l2 }) => e.createElement("svg", { ...l2, "aria-hidden": t2, role: t2 ? void 0 : "img", width: typeof r == "number" ? `${r}px` : r, height: typeof r == "number" ? `${r}px` : r, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { color: p4, ...i3 } }, n4 && !t2 && e.createElement("title", null, n4), o2);
var C2 = (o2) => e.createElement(a3, { ...o2, ariaLabel: "broom, brush, clear, clean" }, e.createElement("path", { d: "M11.3819 8.76362C10.4178 8.23201 9.20537 8.57956 8.66923 9.54116C8.4097 10.0066 8.15016 10.4721 7.89062 10.9376L18.1482 16.5903C18.405 16.1299 18.6618 15.6695 18.9184 15.2091C19.4571 14.2425 19.1063 13.0228 18.1372 12.4885L11.3819 8.76362Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "square", strokeLinejoin: "round" }), e.createElement("path", { d: "M12.9883 9.00512L15.8934 3.92207C16.5242 2.81843 17.9311 2.42534 19.0478 3.04074C20.1729 3.66076 20.5795 5.07016 19.9558 6.18872L17.0911 11.3267", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "square", strokeLinejoin: "round" }), e.createElement("path", { d: "M8.92867 11.8184C7.2347 13.8083 5.31367 14.409 2.75 13.8659C3.77941 20.6894 15.6222 25.1274 16.652 16.4253", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "square", strokeLinejoin: "round" }));
var c2 = ({ children: e2, size: r = 24, ariaLabel: n4, color: p4, ariaHidden: o2 = true, style: a4, ...i3 }) => e.createElement("svg", { ...i3, "aria-hidden": o2, role: o2 ? void 0 : "img", width: typeof r == "number" ? `${r}px` : r, height: typeof r == "number" ? `${r}px` : r, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { color: p4, ...a4 } }, n4 && !o2 && e.createElement("title", null, n4), e2);
var l = (e2) => e.createElement(c2, { ...e2, ariaLabel: "check-circle-2, done, confirm, save, success" }, e.createElement("circle", { cx: "12", cy: "12", r: "9.25", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }), e.createElement("path", { d: "M7.75 12.9231L10.5625 15.75L15.25 8.75", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }));
var s4 = ({ children: r, size: e2 = 24, ariaLabel: n4, color: p4, ariaHidden: t2 = true, style: a4, ...l2 }) => e.createElement("svg", { ...l2, "aria-hidden": t2, role: t2 ? void 0 : "img", width: typeof e2 == "number" ? `${e2}px` : e2, height: typeof e2 == "number" ? `${e2}px` : e2, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", style: { color: p4, ...a4 } }, n4 && !t2 && e.createElement("title", null, n4), r);
var i2 = (r) => e.createElement(s4, { ...r, ariaLabel: "settings-gear-2, preferences" }, e.createElement("path", { d: "M7.878 5.21415L7.17474 5.05186C6.58003 4.91462 5.95657 5.09343 5.525 5.525C5.09343 5.95657 4.91462 6.58003 5.05186 7.17474L5.21415 7.878C5.40122 8.6886 5.06696 9.53036 4.37477 9.99182L3.51965 10.5619C3.03881 10.8825 2.75 11.4221 2.75 12C2.75 12.5779 3.03881 13.1175 3.51965 13.4381L4.37477 14.0082C5.06696 14.4696 5.40122 15.3114 5.21415 16.122L5.05186 16.8253C4.91462 17.42 5.09343 18.0434 5.525 18.475C5.95657 18.9066 6.58003 19.0854 7.17474 18.9481L7.878 18.7858C8.6886 18.5988 9.53036 18.933 9.99182 19.6252L10.5619 20.4804C10.8825 20.9612 11.4221 21.25 12 21.25C12.5779 21.25 13.1175 20.9612 13.4381 20.4804L14.0082 19.6252C14.4696 18.933 15.3114 18.5988 16.122 18.7858L16.8253 18.9481C17.42 19.0854 18.0434 18.9066 18.475 18.475C18.9066 18.0434 19.0854 17.42 18.9481 16.8253L18.7858 16.122C18.5988 15.3114 18.933 14.4696 19.6252 14.0082L20.4804 13.4381C20.9612 13.1175 21.25 12.5779 21.25 12C21.25 11.4221 20.9612 10.8825 20.4804 10.5619L19.6252 9.99182C18.933 9.53036 18.5988 8.6886 18.7858 7.878L18.9481 7.17473C19.0854 6.58003 18.9066 5.95657 18.475 5.525C18.0434 5.09343 17.42 4.91462 16.8253 5.05186L16.122 5.21415C15.3114 5.40122 14.4696 5.06696 14.0082 4.37477L13.4381 3.51965C13.1175 3.03881 12.5779 2.75 12 2.75C11.4221 2.75 10.8825 3.03881 10.5619 3.51965L9.99182 4.37477C9.53036 5.06696 8.6886 5.40122 7.878 5.21415Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" }), e.createElement("path", { d: "M14.75 12C14.75 13.5188 13.5188 14.75 12 14.75C10.4812 14.75 9.25 13.5188 9.25 12C9.25 10.4812 10.4812 9.25 12 9.25C13.5188 9.25 14.75 10.4812 14.75 12Z", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" }));
function diagonalPattern(r, g, b) {
  const line = `rgba(${r}, ${g}, ${b}, 0.5)`;
  return `repeating-linear-gradient(-45deg, transparent, transparent 3px, ${line} 3px, ${line} 4px)`;
}
var PADDING_COLOR = diagonalPattern(13, 153, 255);
var MARGIN_COLOR = diagonalPattern(255, 168, 36);
var GAP_COLOR = diagonalPattern(255, 77, 157);
function computePaddingRect(side, computed, elRect) {
  const pt = parseFloat(computed.paddingTop) || 0;
  const pr = parseFloat(computed.paddingRight) || 0;
  const pb = parseFloat(computed.paddingBottom) || 0;
  const pl = parseFloat(computed.paddingLeft) || 0;
  switch (side) {
    case "Top":
      return pt > 0 ? { top: elRect.top, left: elRect.left, width: elRect.width, height: pt } : null;
    case "Bottom":
      return pb > 0 ? { top: elRect.bottom - pb, left: elRect.left, width: elRect.width, height: pb } : null;
    case "Left":
      return pl > 0 ? { top: elRect.top, left: elRect.left, width: pl, height: elRect.height } : null;
    case "Right":
      return pr > 0 ? { top: elRect.top, left: elRect.right - pr, width: pr, height: elRect.height } : null;
  }
}
function computeMarginRect(side, computed, elRect) {
  const mt = parseFloat(computed.marginTop) || 0;
  const mr = parseFloat(computed.marginRight) || 0;
  const mb = parseFloat(computed.marginBottom) || 0;
  const ml = parseFloat(computed.marginLeft) || 0;
  switch (side) {
    case "Top":
      return mt > 0 ? { top: elRect.top - mt, left: elRect.left - ml, width: elRect.width + ml + mr, height: mt } : null;
    case "Bottom":
      return mb > 0 ? { top: elRect.bottom, left: elRect.left - ml, width: elRect.width + ml + mr, height: mb } : null;
    case "Left":
      return ml > 0 ? { top: elRect.top, left: elRect.left - ml, width: ml, height: elRect.height } : null;
    case "Right":
      return mr > 0 ? { top: elRect.top, left: elRect.right, width: mr, height: elRect.height } : null;
  }
}
function computeGapRects(element, computed) {
  const newRects = [];
  const display = computed.display;
  const isFlex = display.includes("flex");
  const isGrid = display.includes("grid");
  if (!isFlex && !isGrid) return newRects;
  const children = Array.from(element.children).filter((child) => {
    const cs = getComputedStyle(child);
    return cs.position === "static" || cs.position === "relative";
  });
  if (children.length <= 1) return newRects;
  const parentRect = element.getBoundingClientRect();
  if (isFlex) {
    const isVertical = (computed.flexDirection || "row").startsWith("column");
    for (let i3 = 0; i3 < children.length - 1; i3++) {
      const curr = children[i3].getBoundingClientRect();
      const next = children[i3 + 1].getBoundingClientRect();
      const currCS = getComputedStyle(children[i3]);
      const nextCS = getComputedStyle(children[i3 + 1]);
      if (isVertical) {
        const currMarginBottom = parseFloat(currCS.marginBottom) || 0;
        const nextMarginTop = parseFloat(nextCS.marginTop) || 0;
        const gapTop = curr.bottom + currMarginBottom;
        const gapBottom = next.top - nextMarginTop;
        if (gapBottom > gapTop + 0.5) {
          newRects.push({
            top: gapTop,
            left: parentRect.left,
            width: parentRect.width,
            height: gapBottom - gapTop
          });
        }
      } else {
        const currMarginRight = parseFloat(currCS.marginRight) || 0;
        const nextMarginLeft = parseFloat(nextCS.marginLeft) || 0;
        const gapLeft = curr.right + currMarginRight;
        const gapRight = next.left - nextMarginLeft;
        if (gapRight > gapLeft + 0.5) {
          newRects.push({
            top: parentRect.top,
            left: gapLeft,
            width: gapRight - gapLeft,
            height: parentRect.height
          });
        }
      }
    }
    return newRects;
  }
  const sorted = [...children].sort((a4, b) => {
    const ar = a4.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return ar.top - br.top || ar.left - br.left;
  });
  const rows = [];
  let currentRow = [];
  let lastTop = -Infinity;
  for (const child of sorted) {
    const r = child.getBoundingClientRect();
    if (r.top > lastTop + 5) {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [child];
      lastTop = r.top;
    } else {
      currentRow.push(child);
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  for (const row of rows) {
    for (let i3 = 0; i3 < row.length - 1; i3++) {
      const curr = row[i3].getBoundingClientRect();
      const next = row[i3 + 1].getBoundingClientRect();
      const currMR = parseFloat(getComputedStyle(row[i3]).marginRight) || 0;
      const nextML = parseFloat(getComputedStyle(row[i3 + 1]).marginLeft) || 0;
      const gapLeft = curr.right + currMR;
      const gapRight = next.left - nextML;
      if (gapRight > gapLeft + 0.5) {
        newRects.push({
          top: parentRect.top,
          left: gapLeft,
          width: gapRight - gapLeft,
          height: parentRect.height
        });
      }
    }
  }
  for (let i3 = 0; i3 < rows.length - 1; i3++) {
    const currRow = rows[i3];
    const nextRow = rows[i3 + 1];
    const currBottom = Math.max(...currRow.map((c3) => {
      const r = c3.getBoundingClientRect();
      return r.bottom + (parseFloat(getComputedStyle(c3).marginBottom) || 0);
    }));
    const nextTop = Math.min(...nextRow.map((c3) => {
      const r = c3.getBoundingClientRect();
      return r.top - (parseFloat(getComputedStyle(c3).marginTop) || 0);
    }));
    if (nextTop > currBottom + 0.5) {
      newRects.push({
        top: currBottom,
        left: parentRect.left,
        width: parentRect.width,
        height: nextTop - currBottom
      });
    }
  }
  return newRects.filter((r, i3) => {
    for (let j = 0; j < i3; j++) {
      const o2 = newRects[j];
      if (Math.abs(r.top - o2.top) < 1 && Math.abs(r.left - o2.left) < 1 && Math.abs(r.width - o2.width) < 1 && Math.abs(r.height - o2.height) < 1) return false;
    }
    return true;
  });
}
function BoxModelOverlay({ element, hoveredProperty, revision }) {
  const { rects, color } = useMemo(() => {
    if (!hoveredProperty || !element) {
      return { rects: [], color: PADDING_COLOR };
    }
    const computed = getComputedStyle(element);
    const elRect = element.getBoundingClientRect();
    if (hoveredProperty === "paddingBlock" || hoveredProperty === "paddingInline") {
      const sides = hoveredProperty === "paddingBlock" ? ["Top", "Bottom"] : ["Left", "Right"];
      const rects2 = sides.map((s5) => computePaddingRect(s5, computed, elRect)).filter(Boolean);
      return { rects: rects2, color: PADDING_COLOR };
    } else if (hoveredProperty === "marginBlock" || hoveredProperty === "marginInline") {
      const sides = hoveredProperty === "marginBlock" ? ["Top", "Bottom"] : ["Left", "Right"];
      const rects2 = sides.map((s5) => computeMarginRect(s5, computed, elRect)).filter(Boolean);
      return { rects: rects2, color: MARGIN_COLOR };
    } else if (hoveredProperty.startsWith("padding")) {
      const side = hoveredProperty.replace("padding", "");
      const rect = computePaddingRect(side, computed, elRect);
      return { rects: rect ? [rect] : [], color: PADDING_COLOR };
    } else if (hoveredProperty.startsWith("margin")) {
      const side = hoveredProperty.replace("margin", "");
      const rect = computeMarginRect(side, computed, elRect);
      return { rects: rect ? [rect] : [], color: MARGIN_COLOR };
    } else {
      const allGaps = computeGapRects(element, computed);
      let filteredRects;
      if (hoveredProperty === "gap") {
        filteredRects = allGaps;
      } else if (hoveredProperty === "columnGap") {
        const isVerticalLayout = (computed.flexDirection || "row").startsWith("column");
        filteredRects = isVerticalLayout ? allGaps.filter((r) => r.width >= r.height) : allGaps.filter((r) => r.height >= r.width);
      } else {
        const isVerticalLayout = (computed.flexDirection || "row").startsWith("column");
        filteredRects = isVerticalLayout ? allGaps.filter((r) => r.height >= r.width) : allGaps.filter((r) => r.width >= r.height);
      }
      return { rects: filteredRects, color: GAP_COLOR };
    }
  }, [element, hoveredProperty, revision]);
  if (rects.length === 0) return null;
  return /* @__PURE__ */ jsx(Fragment$1, { children: rects.map((r, i3) => /* @__PURE__ */ jsx(
    "div",
    {
      className: "retune-box-model-rect",
      style: {
        position: "fixed",
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        background: color,
        pointerEvents: "none",
        zIndex: 2147483645
      }
    },
    i3
  )) });
}
var DEFAULT_CONFIG = {
  port: 9223,
  hotkey: "alt+d",
  fidelity: "standard",
  position: "bottom-right",
  force: false
};
var BRIDGE_KEY = "__retune_bridge";
function getOrCreateBridge(port) {
  const existing = window[BRIDGE_KEY];
  if (existing) {
    return existing;
  }
  const bridge = new BridgeClient(port);
  window[BRIDGE_KEY] = bridge;
  return bridge;
}
var PANEL_ANIMATION_MS = 150;
function AnimatedPanel({ visible, children }) {
  const [state, setState] = useState("hidden");
  const prevVisibleRef = useRef(false);
  const childrenRef = useRef(children);
  if (visible) childrenRef.current = children;
  if (visible && !prevVisibleRef.current) {
    prevVisibleRef.current = true;
    setState("entering");
  } else if (!visible && prevVisibleRef.current) {
    prevVisibleRef.current = false;
    setState("exiting");
  }
  useEffect(() => {
    if (state === "entering") {
      const timer = setTimeout(() => setState("visible"), PANEL_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
    if (state === "exiting") {
      const timer = setTimeout(() => setState("hidden"), PANEL_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
  }, [state]);
  if (state === "hidden") return null;
  const animClass = state === "entering" ? "entering" : state === "exiting" ? "exiting" : "";
  return /* @__PURE__ */ jsx("div", { className: `retune-panel-anim ${animClass}`, children: childrenRef.current });
}
var MIN_VIEWPORT_WIDTH = 768;
var CLASS_ABBREVIATIONS = {
  btn: "Button",
  nav: "Navigation",
  col: "Column",
  img: "Image",
  sm: "Small",
  md: "Medium",
  lg: "Large",
  xs: "Extra Small",
  xl: "Extra Large",
  hdr: "Header",
  ftr: "Footer",
  cta: "Call to Action",
  desc: "Description",
  msg: "Message",
  info: "Information",
  bg: "Background",
  txt: "Text",
  pg: "Page",
  sec: "Section",
  el: "Element",
  opt: "Option",
  val: "Value",
  err: "Error",
  warn: "Warning",
  num: "Number",
  prev: "Previous",
  curr: "Current",
  temp: "Temporary"
};
function humanizeSegment(segment) {
  return segment.split("-").map((word) => CLASS_ABBREVIATIONS[word] || word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function humanizeScopeLabel(className, previousClassName) {
  if (className.includes("--")) {
    const modifier = className.split("--").pop();
    return humanizeSegment(modifier);
  }
  if (className.includes("__")) {
    const element = className.split("__").pop();
    return humanizeSegment(element);
  }
  if (previousClassName && className.startsWith(previousClassName + "-")) {
    const suffix = className.slice(previousClassName.length + 1);
    return humanizeSegment(suffix);
  }
  return humanizeSegment(className);
}
function buildCompoundFingerprint(element) {
  const el = element;
  if (!el.classList || el.classList.length === 0) return null;
  const classes = [];
  for (const cls of el.classList) {
    if (!isHashedClass(cls)) classes.push(cls);
  }
  if (classes.length === 0) return null;
  const selector2 = classes.sort().map((c3) => `.${CSS.escape(c3)}`).join("");
  let count;
  try {
    count = document.querySelectorAll(selector2).length;
  } catch {
    count = 0;
  }
  if (count <= 1) return null;
  return { label: `All instances`, selector: selector2, count };
}
function buildParentScopeLevel(element) {
  const tag = element.tagName.toLowerCase();
  let current = element.parentElement;
  while (current && current !== document.body) {
    for (const cls of current.classList) {
      if (isHashedClass(cls)) continue;
      const { score } = scoreNamePattern(cls);
      if (score >= 0.65) continue;
      const selector2 = `.${CSS.escape(cls)} ${tag}`;
      let count;
      try {
        count = document.querySelectorAll(selector2).length;
      } catch {
        count = 0;
      }
      if (count > 1 && count <= 20) {
        return { label: "All instances", selector: selector2, count };
      }
    }
    current = current.parentElement;
  }
  return null;
}
function buildScopeLevels(candidates, element, ancestorScopes = []) {
  const meaningful = candidates.filter((c3) => c3.verdict === "semantic");
  if (meaningful.length === 0) {
    const fingerprint = buildCompoundFingerprint(element);
    if (fingerprint) {
      const levels2 = [fingerprint];
      appendAncestorLevels(levels2, ancestorScopes);
      levels2.push({ label: "This instance", selector: null, count: 1, kind: "element" });
      return levels2;
    }
    const parentLevel = buildParentScopeLevel(element);
    if (parentLevel) {
      const levels2 = [parentLevel];
      appendAncestorLevels(levels2, ancestorScopes);
      levels2.push({ label: "This instance", selector: null, count: 1, kind: "element" });
      return levels2;
    }
    if (ancestorScopes.length > 0) {
      const levels2 = [];
      appendAncestorLevels(levels2, ancestorScopes);
      levels2.push({ label: "This instance", selector: null, count: 1, kind: "element" });
      return levels2;
    }
    return [{ label: "This instance", selector: null, count: 1, kind: "element" }];
  }
  const levels = [];
  const parts = [];
  for (const candidate of meaningful) {
    const className = candidate.selector.replace(/^\./, "");
    const prevClassName = parts.length > 0 ? parts[parts.length - 1] : void 0;
    parts.push(className);
    const compound = parts.slice().sort().map((c3) => `.${CSS.escape(c3)}`).join("");
    let count;
    try {
      count = document.querySelectorAll(compound).length;
    } catch {
      count = 0;
    }
    levels.push({ label: humanizeScopeLabel(className, prevClassName), selector: compound, count, kind: "class" });
  }
  appendAncestorLevels(levels, ancestorScopes);
  levels.push({ label: "This instance", selector: null, count: 1, kind: "element" });
  return levels;
}
function appendAncestorLevels(levels, ancestorScopes) {
  const narrowestClassCount = levels.length > 0 ? levels[levels.length - 1].count : Infinity;
  for (const scope of ancestorScopes) {
    if (scope.count >= narrowestClassCount) continue;
    if (scope.count <= 1) continue;
    if (levels.some((l2) => l2.count === scope.count && l2.selector === scope.fullSelector)) continue;
    levels.push({
      label: scope.label,
      selector: scope.fullSelector,
      count: scope.count,
      kind: "ancestor"
    });
  }
}
function Retune(props = {}) {
  const isDev = typeof process !== "undefined" && true;
  if (!isDev && !props.force) return null;
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" ? window.innerWidth >= MIN_VIEWPORT_WIDTH : true
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MIN_VIEWPORT_WIDTH}px)`);
    const handler = (e2) => setWide(e2.matches);
    setWide(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  if (!wide) return null;
  return /* @__PURE__ */ jsx(RetuneInner, { ...props });
}
function RetuneInner(props) {
  const config2 = { ...DEFAULT_CONFIG, ...props };
  const [active, setActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [changeCount, setChangeCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fidelity, setFidelityState] = useState(() => {
    try {
      const saved = localStorage.getItem("retune-fidelity");
      if (saved === "minimal" || saved === "standard" || saved === "full") return saved;
    } catch {
    }
    return config2.fidelity;
  });
  const setFidelity = useCallback((f) => {
    setFidelityState(f);
    try {
      localStorage.setItem("retune-fidelity", f);
    } catch {
    }
  }, []);
  const fidelityRef = useRef(fidelity);
  fidelityRef.current = fidelity;
  const [copied, setCopied] = useState(false);
  const [hoveredBoxModel, setHoveredBoxModel] = useState(null);
  const [changeRevision, setChangeRevision] = useState(0);
  const [ownedProperties, setOwnedProperties] = useState(void 0);
  const [portalTarget, setPortalTarget] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateDismissing, setUpdateDismissing] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateCopied, setUpdateCopied] = useState(false);
  const copyBtnRef = useRef(null);
  const copiedTimerRef = useRef(null);
  const [panelTab, setPanelTab] = useState("design");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsExiting, setSettingsExiting] = useState(false);
  const settingsTimerRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("retune-theme");
      if (saved === "system" || saved === "light" || saved === "dark") return saved;
    } catch {
    }
    return "system";
  });
  const handleThemeChange = useCallback((t2) => {
    setTheme(t2);
    try {
      localStorage.setItem("retune-theme", t2);
    } catch {
    }
  }, []);
  useEffect(() => {
    if (!portalTarget) return;
    const root = portalTarget.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : null;
    if (!host) return;
    const isDark = theme === "dark" || theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    host.classList.toggle("dark", isDark);
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e2) => host.classList.toggle("dark", e2.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme, portalTarget]);
  const [side, setSide] = useState(() => {
    try {
      const saved = localStorage.getItem("retune-panel-side");
      if (saved === "left" || saved === "right") return saved;
    } catch {
    }
    return config2.position.includes("right") ? "right" : "left";
  });
  const tabBarRef = useRef(null);
  const tabPillRef = useRef(null);
  const toolbarRef = useRef(null);
  const dragRef = useRef(null);
  const [toolbarDragging, setToolbarDragging] = useState(false);
  const [sessionHidden, setSessionHidden] = useState(false);
  const [reparentEntries, setReparentEntries] = useState([]);
  const reparentDOMRef = useRef([]);
  const reparentBatchSizeRef = useRef([]);
  const tabPillFirstRender = useRef(true);
  const [selectorCandidates, setSelectorCandidates] = useState([]);
  const [scopeLevels, setScopeLevels] = useState([]);
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const activeLevelIndexRef = useRef(0);
  activeLevelIndexRef.current = activeLevelIndex;
  const scopeLevelsRef = useRef([]);
  scopeLevelsRef.current = scopeLevels;
  const activeSelector = scopeLevels[activeLevelIndex]?.selector ?? null;
  const activeSelectorRef = useRef(null);
  activeSelectorRef.current = activeSelector;
  const [styleSources, setStyleSources] = useState({});
  const [forcedState, setForcedState] = useState(null);
  const forcedStateRef = useRef(null);
  forcedStateRef.current = forcedState;
  const mountRef = useRef(null);
  const pickerRef = useRef(null);
  const previewRef = useRef(null);
  const trackerRef = useRef(null);
  const previewBridgeRef = useRef(new PreviewBridge());
  const bridgeRef = useRef(null);
  const selectedElementRef = useRef(null);
  selectedElementRef.current = selectedElement;
  const syncTrackerStateRef = useRef(() => {
  });
  const refreshSelectedElementRef = useRef(() => {
  });
  useEffect(() => {
    const mount = mountOverlay();
    mountRef.current = mount;
    setPortalTarget(mount.container);
    const preview = new LivePreviewEngine();
    previewRef.current = preview;
    const tracker = new ChangeTracker();
    trackerRef.current = tracker;
    const bridge = getOrCreateBridge(config2.port);
    bridgeRef.current = bridge;
    bridge.onRequest(async (method, params) => {
      const t2 = trackerRef.current;
      const p4 = previewRef.current;
      switch (method) {
        case "getSelection": {
          const sel = selectedElementRef.current;
          if (!sel) return null;
          const { element, rect, reactProps, ...serializable } = sel;
          return {
            ...serializable,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
          };
        }
        case "getPendingChanges":
          return t2.getPendingChanges();
        case "getCollapsedChanges":
          return t2.getPendingChanges().map((c3) => ({
            ...c3,
            changes: collapseShorthands(c3.changes)
          }));
        case "getEnrichedChanges": {
          const { scanDesignTokens: scanDesignTokens2 } = await Promise.resolve().then(() => (init_tokens_JIHAQ2SJ(), tokens_JIHAQ2SJ_exports));
          const { enrichPropertyChanges: enrichPropertyChanges2 } = await Promise.resolve().then(() => (init_candidates_UBMLY2KQ(), candidates_UBMLY2KQ_exports));
          const tokenMap = scanDesignTokens2();
          return t2.getPendingChanges().map((c3) => ({
            ...c3,
            changes: enrichPropertyChanges2(collapseShorthands(c3.changes), tokenMap, c3.selector)
          }));
        }
        case "getFormattedChanges":
          return formatChanges(t2.getPendingChanges(), params?.fidelity || fidelityRef.current);
        case "clearChanges": {
          deleteStackRef.current = [];
          deleteRedoStackRef.current = [];
          textStackRef.current = [];
          textRedoStackRef.current = [];
          reorderStackRef.current = [];
          reorderRedoStackRef.current = [];
          reorderOriginRef.current = /* @__PURE__ */ new WeakMap();
          for (const [, originals] of reorderOriginalOrderRef.current) {
            for (const [child, originalOrder] of originals) {
              const el = child;
              if (originalOrder) {
                el.style.order = originalOrder;
              } else {
                el.style.removeProperty("order");
              }
            }
          }
          reorderOriginalOrderRef.current.clear();
          for (const [, rects] of reorderOriginalRectsRef.current) {
            for (const [child] of rects) {
              const el = child;
              el.style.removeProperty("translate");
              el.style.removeProperty("transition");
              if (el.getAttribute("style")?.trim() === "") el.removeAttribute("style");
            }
          }
          reorderOriginalRectsRef.current.clear();
          reorderModeRef.current = /* @__PURE__ */ new WeakMap();
          if (forcedStateRef.current) {
            const f = forcedStylesRef.current;
            const domEl = selectedElementRef.current?.element;
            if (domEl?.style && f.props.length > 0) {
              for (const p5 of f.props) {
                const k = p5.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
                domEl.style.removeProperty(k);
              }
              if (domEl.getAttribute("style")?.trim() === "") {
                domEl.removeAttribute("style");
              }
            }
            forcedStylesRef.current = { selector: "", props: [] };
            setForcedState(null);
            forcedStateRef.current = null;
          }
          p4.clearAll();
          t2.clear();
          setSelectedElement(null);
          selectedElementRef.current = null;
          pickerRef.current?.clearSelection();
          syncTrackerStateRef.current();
          setChangeRevision((r) => r + 1);
          return { ok: true };
        }
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    });
    bridge.onUpdate((info) => setUpdateInfo(info));
    bridge.connect();
    if (tracker.restore()) {
      preview.attach();
      const pendingReparentEntries = [];
      for (const change of tracker.getPendingChanges()) {
        for (const c3 of change.changes) {
          if (c3.property === "__delete") {
            try {
              const el = document.querySelector(change.selector);
              if (el) {
                const parent = el.parentNode;
                if (parent) {
                  deleteStackRef.current.push({ element: el, parent, nextSibling: el.nextSibling });
                  el.remove();
                }
              }
            } catch {
            }
          } else if (c3.property === "__reorder") {
            try {
              const el = document.querySelector(change.selector);
              if (el?.parentElement) {
                const parent = el.parentElement;
                const children = Array.from(parent.children);
                const domIndex = children.indexOf(el);
                const targetIndex = parseInt(c3.to);
                if (!isNaN(targetIndex) && domIndex !== targetIndex) {
                  const parentDisplay = getComputedStyle(parent).display;
                  const isFlex = parentDisplay === "flex" || parentDisplay === "inline-flex";
                  const isGrid = parentDisplay === "grid" || parentDisplay === "inline-grid";
                  const mode = isFlex || isGrid ? "order" : "translate";
                  if (!reorderModeRef.current.has(parent)) {
                    reorderModeRef.current.set(parent, mode);
                  }
                  if (mode === "order") {
                    ensureExplicitOrder(parent);
                    const visualOrder = getVisualOrder(parent);
                    const fromIdx = visualOrder.indexOf(el);
                    if (fromIdx !== -1) {
                      const [moved] = visualOrder.splice(fromIdx, 1);
                      visualOrder.splice(Math.min(targetIndex, visualOrder.length), 0, moved);
                      const undoEntry = children.map((ch) => ({
                        element: ch,
                        prevOrder: ch.style.order,
                        prevTranslate: ""
                      }));
                      for (let i3 = 0; i3 < visualOrder.length; i3++) {
                        visualOrder[i3].style.order = String(i3);
                      }
                      reorderStackRef.current.push(undoEntry);
                    }
                  } else {
                    ensureOriginalRects(parent);
                    if (!reorderVisualOrderRef.current.has(parent)) {
                      reorderVisualOrderRef.current.set(parent, [...children]);
                    }
                    const desired = reorderVisualOrderRef.current.get(parent);
                    const fromIdx = desired.indexOf(el);
                    if (fromIdx !== -1) {
                      const undoEntry = children.map((ch) => ({
                        element: ch,
                        prevOrder: "",
                        prevTranslate: ch.style.translate || ""
                      }));
                      const [moved] = desired.splice(fromIdx, 1);
                      desired.splice(Math.min(targetIndex, desired.length), 0, moved);
                      applyTranslateOrder(parent);
                      reorderStackRef.current.push(undoEntry);
                    }
                  }
                }
              }
            } catch {
            }
          } else if (c3.property === "__text") {
            try {
              const el = document.querySelector(change.selector);
              if (el) {
                const originalHTML = el.innerHTML;
                const hasChildElements = el.querySelector("*") !== null;
                if (!hasChildElements) {
                  el.innerHTML = c3.to.replace(/\n/g, "<br>");
                  textStackRef.current.push({ element: el, originalHTML, newHTML: el.innerHTML });
                }
              }
            } catch {
            }
          } else if (c3.property === "__reparent") {
            try {
              const el = document.querySelector(change.selector);
              if (!el) continue;
              const toAtIdx = c3.to.lastIndexOf("@");
              if (toAtIdx === -1) continue;
              const newParentSelector = c3.to.slice(0, toAtIdx);
              const insertIndex = parseInt(c3.to.slice(toAtIdx + 1), 10);
              const newParent = document.querySelector(newParentSelector);
              if (!newParent || el.parentElement === newParent) continue;
              const oldParent = el.parentElement;
              if (!oldParent) continue;
              const oldNextSibling = el.nextElementSibling;
              const newChildren = Array.from(newParent.children);
              const refChild = insertIndex < newChildren.length ? newChildren[insertIndex] : null;
              if (refChild) {
                newParent.insertBefore(el, refChild);
              } else {
                newParent.appendChild(el);
              }
              const movedEl = el;
              const observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                  if (m.type !== "childList") continue;
                  if (m.target === oldParent) {
                    for (const added of m.addedNodes) {
                      if (!(added instanceof Element)) continue;
                      if (added !== movedEl && added.tagName === movedEl.tagName && added.className === movedEl.className && added.textContent === movedEl.textContent) {
                        try {
                          oldParent.removeChild(added);
                        } catch {
                        }
                      }
                    }
                  }
                  if (m.target === newParent) {
                    for (const removed of m.removedNodes) {
                      if (removed === movedEl && !movedEl.parentElement) {
                        try {
                          const cur = Array.from(newParent.children);
                          const ref = insertIndex < cur.length ? cur[insertIndex] : null;
                          if (ref) {
                            newParent.insertBefore(movedEl, ref);
                          } else {
                            newParent.appendChild(movedEl);
                          }
                        } catch {
                        }
                      }
                    }
                  }
                }
              });
              observer.observe(oldParent, { childList: true });
              observer.observe(newParent, { childList: true });
              reparentDOMRef.current.push({ element: el, oldParent, oldNextSibling, newParent, observer });
              pendingReparentEntries.push({ element: el, newParent, insertIndex });
            } catch {
            }
          } else {
            preview.applyChange(change.selector, c3.property, c3.to);
          }
        }
      }
      if (pendingReparentEntries.length > 0) {
        setReparentEntries(pendingReparentEntries);
      }
      const restored = tracker.getPendingChanges();
      setChangeCount(restored.filter((c3) => !c3.changes.some((p4) => p4.property === "__bulkOf")).length);
      setCanUndo(tracker.canUndo);
      setCanRedo(tracker.canRedo);
    }
    const picker = createPicker(mount.root, {
      onHover: () => {
      },
      onSelect: (element) => {
        const inspected = inspectElement(element);
        if (forcedStateRef.current) {
          clearForcedInlineStyles();
        }
        setStyleSources(getStyleSources(element));
        const candidates = getSelectorCandidates(element);
        setSelectorCandidates(candidates);
        const ancestors = getAncestorScopes(element);
        const levels = buildScopeLevels(candidates, element, ancestors);
        setScopeLevels(levels);
        scopeLevelsRef.current = levels;
        const defaultIndex = levels.length >= 2 ? levels.length - 2 : 0;
        setActiveLevelIndex(defaultIndex);
        activeLevelIndexRef.current = defaultIndex;
        const newActiveSelector = levels[defaultIndex]?.selector ?? null;
        activeSelectorRef.current = newActiveSelector;
        const defaultLevel = levels[defaultIndex];
        if (defaultLevel?.selector && pickerRef.current) {
          pickerRef.current.showScopeHighlights(defaultLevel.selector, element);
        }
        const isParentScoped = newActiveSelector && newActiveSelector.includes(" ");
        if (newActiveSelector && !isParentScoped) {
          const scoped = getScopedStyles(element, newActiveSelector);
          inspected.computedStyles = scoped.styles;
          setOwnedProperties(scoped.ownedProperties);
        } else {
          setOwnedProperties(void 0);
        }
        if (preview) {
          for (const change of preview.getChanges()) {
            if (/:(hover|focus|active)$/.test(change.selector)) continue;
            const baseSel = change.selector;
            try {
              if (element.matches(baseSel)) {
                inspected.computedStyles[change.property] = change.value;
              }
            } catch {
            }
          }
        }
        setSelectedElement(inspected);
        setSettingsOpen(false);
        setSettingsVisible(false);
        setSettingsExiting(false);
        selectedElementRef.current = inspected;
        tracker.track(
          inspected.selector,
          inspected.tagName,
          inspected.textContent,
          inspected.classes,
          inspected.reactComponents,
          inspected.computedStyles,
          inspected.sourceFile,
          inspected.stylingApproach,
          inspected.inlineStyles,
          inspected.elementId,
          inspected.accessibleName,
          inspected.parentContext,
          inspected.childSummary,
          inspected.domPath,
          inspected.nearbySiblings,
          inspected.position
        );
        for (const level of levels) {
          if (level.selector) {
            tracker.track(
              level.selector,
              inspected.tagName,
              inspected.textContent,
              inspected.classes,
              inspected.reactComponents,
              inspected.computedStyles,
              inspected.sourceFile,
              inspected.stylingApproach,
              inspected.inlineStyles,
              inspected.elementId,
              inspected.accessibleName,
              inspected.parentContext,
              inspected.childSummary,
              inspected.domPath,
              inspected.nearbySiblings,
              inspected.position
            );
          }
        }
      },
      onDoubleClick: (element) => {
        const el = element;
        if (!el.textContent?.trim()) return;
        if (el.closest("[data-retune-host]") || el.hasAttribute("data-retune-host")) return;
        pickerRef.current?.suspend();
        const originalText = el.textContent;
        const originalHTML = el.innerHTML;
        el.contentEditable = "true";
        el.style.outline = "none";
        el.style.cursor = "text";
        el.focus();
        const cleanup = () => {
          el.contentEditable = "false";
          el.style.removeProperty("outline");
          el.style.removeProperty("cursor");
          el.removeEventListener("keydown", onKeyDown);
          el.removeEventListener("blur", onBlur);
          pickerRef.current?.resume();
          pickerRef.current?.refreshSelection();
        };
        const save = () => {
          el.style.removeProperty("outline");
          el.style.removeProperty("cursor");
          if (el.getAttribute("style")?.trim() === "") el.removeAttribute("style");
          const newText = el.innerHTML.replace(/<br\s*\/?>/gi, "\n").replace(/<\/div><div>/gi, "\n").replace(/<\/p><p>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
          if (newText !== originalText) {
            const editSelector = getSelector(el);
            const tracker2 = trackerRef.current;
            if (tracker2) {
              const inspected = selectedElementRef.current;
              tracker2.track(
                editSelector,
                el.tagName.toLowerCase(),
                originalText,
                Array.from(el.classList),
                inspected?.reactComponents ?? [],
                { "__text": originalText || "" },
                inspected?.sourceFile ?? null,
                inspected?.stylingApproach ?? void 0,
                null,
                el.id || null,
                null,
                null,
                null,
                inspected?.domPath ?? "",
                null,
                { x: 0, y: 0, width: 0, height: 0 }
              );
              tracker2.ensureOriginalValue(editSelector, "__text", originalText || "");
              tracker2.breakCoalescing();
              tracker2.recordChange(editSelector, "__text", newText);
              tracker2.persist();
            }
            textStackRef.current.push({ element: el, originalHTML, newHTML: el.innerHTML });
            textRedoStackRef.current = [];
            syncTrackerStateRef.current();
            setChangeRevision((r) => r + 1);
          }
          cleanup();
        };
        const cancel = () => {
          el.innerHTML = originalHTML;
          cleanup();
        };
        const onKeyDown = (e2) => {
          e2.stopPropagation();
          if (e2.key === "Escape") {
            e2.preventDefault();
            cancel();
          } else if (e2.key === "Enter") {
            e2.preventDefault();
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              const br = document.createElement("br");
              range.insertNode(br);
              range.setStartAfter(br);
              range.setEndAfter(br);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        };
        const onBlur = () => {
          setTimeout(save, 100);
        };
        el.addEventListener("keydown", onKeyDown);
        el.addEventListener("blur", onBlur);
      },
      onResizePreview: (element, property, value) => {
        const preview2 = previewRef.current;
        if (!preview2) return;
        const selector2 = activeSelectorRef.current ?? getSelector(element);
        preview2.applyChange(selector2, property, value);
        const bridge2 = previewBridgeRef.current;
        if (!bridge2.active) bridge2.start();
        bridge2.set(property, value);
      },
      onResize: (element, property, value) => {
        const tracker2 = trackerRef.current;
        const preview2 = previewRef.current;
        if (!tracker2 || !preview2) return;
        const selector2 = activeSelectorRef.current ?? getSelector(element);
        const inspected = selectedElementRef.current;
        if (inspected) {
          tracker2.track(
            selector2,
            inspected.tagName,
            inspected.textContent,
            inspected.classes,
            inspected.reactComponents,
            inspected.computedStyles,
            inspected.sourceFile,
            inspected.stylingApproach,
            inspected.inlineStyles,
            inspected.elementId,
            inspected.accessibleName,
            inspected.parentContext,
            inspected.childSummary,
            inspected.domPath,
            inspected.nearbySiblings,
            inspected.position
          );
        }
        tracker2.recordChange(selector2, property, value);
        preview2.applyChange(selector2, property, value);
        previewBridgeRef.current.end();
        syncTrackerStateRef.current();
        refreshSelectedElementRef.current();
        setChangeRevision((r) => r + 1);
      },
      onRepositionPreview: (element, property, value) => {
        const preview2 = previewRef.current;
        if (!preview2) return;
        const selector2 = activeSelectorRef.current ?? getSelector(element);
        preview2.applyChange(selector2, property, value);
        const bridge2 = previewBridgeRef.current;
        if (!bridge2.active) bridge2.start();
        bridge2.set(property, value);
      },
      onReposition: (element, property, value) => {
        const tracker2 = trackerRef.current;
        const preview2 = previewRef.current;
        if (!tracker2 || !preview2) return;
        const selector2 = activeSelectorRef.current ?? getSelector(element);
        const inspected = selectedElementRef.current;
        if (inspected) {
          tracker2.track(
            selector2,
            inspected.tagName,
            inspected.textContent,
            inspected.classes,
            inspected.reactComponents,
            inspected.computedStyles,
            inspected.sourceFile,
            inspected.stylingApproach,
            inspected.inlineStyles,
            inspected.elementId,
            inspected.accessibleName,
            inspected.parentContext,
            inspected.childSummary,
            inspected.domPath,
            inspected.nearbySiblings,
            inspected.position
          );
        }
        tracker2.recordChange(selector2, property, value);
        preview2.applyChange(selector2, property, value);
        previewBridgeRef.current.end();
        syncTrackerStateRef.current();
        refreshSelectedElementRef.current();
        setChangeRevision((r) => r + 1);
      },
      onCanvasReorder: (element, fromIndex, toIndex) => {
        handleTreeReorder(element, fromIndex, toIndex);
      },
      onCanvasReparent: (element, newParent, insertIndex) => {
        handleTreeReparent(element, newParent, insertIndex);
      },
      onCancel: () => {
        deactivateOverlay();
      }
    });
    pickerRef.current = picker;
    return () => {
      picker.destroy();
      preview.destroy();
      unmountOverlay(mount.host);
    };
  }, []);
  const forcedStylesRef = useRef({ selector: "", props: [] });
  const clearForcedInlineStyles = useCallback(() => {
    const el = selectedElementRef.current?.element;
    const prev = forcedStylesRef.current;
    if (el?.style && prev.props.length > 0) {
      for (const prop of prev.props) {
        const kebab = prop.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
        el.style.removeProperty(kebab);
      }
      if (el.getAttribute("style")?.trim() === "") {
        el.removeAttribute("style");
      }
    }
    forcedStylesRef.current = { selector: "", props: [] };
    setForcedState(null);
    forcedStateRef.current = null;
  }, []);
  const activateOverlay = useCallback(() => {
    setActive(true);
    pickerRef.current?.activate();
    previewRef.current?.attach();
  }, []);
  const deactivateOverlay = useCallback(() => {
    if (forcedStateRef.current) clearForcedInlineStyles();
    setActive(false);
    setSelectedElement(null);
    selectedElementRef.current = null;
    setSettingsOpen(false);
    setSettingsVisible(false);
    setSettingsExiting(false);
    pickerRef.current?.deactivate();
  }, [clearForcedInlineStyles]);
  const toggleOverlay = useCallback(() => {
    setActive((prev) => {
      if (prev) {
        if (forcedStateRef.current) clearForcedInlineStyles();
        setSelectedElement(null);
        selectedElementRef.current = null;
        setSettingsOpen(false);
        setSettingsVisible(false);
        setSettingsExiting(false);
        pickerRef.current?.deactivate();
      } else {
        pickerRef.current?.activate();
        previewRef.current?.attach();
      }
      return !prev;
    });
  }, [clearForcedInlineStyles]);
  const syncTrackerState = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    const pending = tracker.getPendingChanges();
    const primaryCount = pending.filter((c3) => !c3.changes.some((p4) => p4.property === "__bulkOf")).length;
    setChangeCount(primaryCount);
    setCanUndo(tracker.canUndo);
    setCanRedo(tracker.canRedo);
    tracker.persist();
  }, []);
  syncTrackerStateRef.current = syncTrackerState;
  const skipOwnedUpdateRef = useRef(false);
  const refreshSelectedElement = useCallback(() => {
    const el = selectedElementRef.current?.element;
    const scope = activeSelectorRef.current;
    const scopedResult = el && scope ? getScopedStyles(el, scope) : null;
    if (!skipOwnedUpdateRef.current) {
      setOwnedProperties(scopedResult?.ownedProperties);
    }
    skipOwnedUpdateRef.current = false;
    setSelectedElement((prev) => {
      if (!prev?.element) return prev;
      const inspected = inspectElement(prev.element);
      if (scopedResult) {
        inspected.computedStyles = scopedResult.styles;
      }
      const preview = previewRef.current;
      if (preview) {
        const currentState = forcedStateRef.current;
        forcedStylesRef.current;
        if (currentState && prev.element) {
          const pseudoStyles = getPseudoStateStyles(prev.element, currentState);
          for (const [prop, value] of Object.entries(pseudoStyles)) {
            const camelProp = prop.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
            inspected.computedStyles[camelProp] = value;
          }
        }
        for (const change of preview.getChanges()) {
          const pseudoMatch = change.selector.match(/:(hover|focus|active)$/);
          const changePseudo = pseudoMatch ? pseudoMatch[0] : null;
          const baseSel = change.selector.replace(/:(hover|focus|active)$/g, "");
          if (!currentState && changePseudo) continue;
          if (currentState && changePseudo && changePseudo !== currentState) continue;
          try {
            if (prev.element.matches(baseSel)) {
              inspected.computedStyles[change.property] = change.value;
            }
          } catch {
          }
        }
      }
      selectedElementRef.current = inspected;
      return inspected;
    });
  }, []);
  refreshSelectedElementRef.current = refreshSelectedElement;
  const handlePropertyChange = useCallback((property, value) => {
    const el = selectedElementRef.current;
    const preview = previewRef.current;
    const tracker = trackerRef.current;
    if (!el || !preview || !tracker) return;
    const baseSelector = activeSelectorRef.current ?? el.selector;
    const selector2 = forcedStateRef.current ? baseSelector + forcedStateRef.current : baseSelector;
    preview.applyChange(selector2, property, value);
    if (forcedStateRef.current) {
      const domEl = el.element;
      if (domEl?.style) {
        const kebab = property.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
        domEl.style.setProperty(kebab, value, "important");
      }
      const forced = forcedStylesRef.current;
      if (forced.selector === baseSelector && !forced.props.includes(property)) {
        forced.props.push(property);
      }
    }
    tracker.track(
      selector2,
      el.tagName,
      el.textContent,
      el.classes,
      el.reactComponents,
      el.computedStyles,
      el.sourceFile,
      el.stylingApproach,
      el.inlineStyles,
      el.elementId,
      el.accessibleName,
      el.parentContext,
      el.childSummary,
      el.domPath,
      el.nearbySiblings,
      el.position
    );
    tracker.recordChange(selector2, property, value);
    syncTrackerStateRef.current();
    refreshSelectedElementRef.current();
    pickerRef.current?.refreshSelection();
    setChangeRevision((r) => r + 1);
  }, []);
  const handleForcedStateChange = useCallback((state) => {
    const preview = previewRef.current;
    const el = selectedElementRef.current;
    if (!preview || !el?.element) return;
    const selector2 = activeSelectorRef.current ?? el.selector;
    const domEl = el.element;
    clearForcedInlineStyles();
    setForcedState(state);
    forcedStateRef.current = state;
    if (state) {
      const pseudoStyles = getPseudoStateStyles(el.element, state);
      const appliedProps = [];
      const pseudoSelector = selector2 + state;
      const userEdits = /* @__PURE__ */ new Map();
      for (const change of preview.getChanges()) {
        if (change.selector === pseudoSelector) {
          userEdits.set(change.property, change.value);
        }
      }
      const applied = /* @__PURE__ */ new Set();
      for (const [prop, value] of Object.entries(pseudoStyles)) {
        const camelProp = prop.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
        const finalValue = userEdits.get(camelProp) ?? value;
        if (domEl.style) {
          domEl.style.setProperty(prop, finalValue, "important");
        }
        appliedProps.push(camelProp);
        applied.add(camelProp);
      }
      for (const [camelProp, value] of userEdits) {
        if (applied.has(camelProp)) continue;
        const kebab = camelProp.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
        if (domEl.style) {
          domEl.style.setProperty(kebab, value, "important");
        }
        appliedProps.push(camelProp);
      }
      forcedStylesRef.current = { selector: selector2, props: appliedProps };
    }
    refreshSelectedElementRef.current();
  }, []);
  const handleApplyToElement = useCallback((el, property, value) => {
    const preview = previewRef.current;
    if (!preview) return;
    const selector2 = getSelector(el);
    if (value) {
      preview.applyChange(selector2, property, value);
    } else {
      preview.removeChange(selector2, property);
    }
  }, []);
  const handleVariableSwap = useCallback((oldClassName, newClassName) => {
    const el = selectedElementRef.current;
    const tracker = trackerRef.current;
    if (!el || !tracker) return;
    const selector2 = activeSelectorRef.current ?? el.selector;
    tracker.track(
      selector2,
      el.tagName,
      el.textContent,
      el.classes,
      el.reactComponents,
      el.computedStyles,
      el.sourceFile,
      el.stylingApproach,
      el.inlineStyles,
      el.elementId,
      el.accessibleName,
      el.parentContext,
      el.childSummary,
      el.domPath,
      el.nearbySiblings,
      el.position
    );
    tracker.recordChange(selector2, `class:${oldClassName}`, newClassName);
    syncTrackerStateRef.current();
    refreshSelectedElementRef.current();
    pickerRef.current?.refreshSelection();
    setChangeRevision((r) => r + 1);
  }, []);
  const handleVariableAssociate = useCallback((properties, token) => {
    const tracker = trackerRef.current;
    const el = selectedElementRef.current;
    if (!tracker || !el) return;
    const selector2 = activeSelectorRef.current ?? el.selector;
    tracker.setVariableAssociation(selector2, properties, token);
    tracker.relinkVariable(selector2, properties);
    tracker.persist();
    setChangeRevision((r) => r + 1);
  }, []);
  const handleVariableUnlink = useCallback((properties) => {
    const tracker = trackerRef.current;
    const el = selectedElementRef.current;
    if (!tracker || !el) return;
    const selector2 = activeSelectorRef.current ?? el.selector;
    tracker.recordUnlink(selector2, properties);
    syncTrackerStateRef.current();
    setChangeRevision((r) => r + 1);
  }, []);
  const selectedVariableAssociations = useMemo(() => {
    const tracker = trackerRef.current;
    if (!tracker || !selectedElement) return {};
    const selector2 = activeSelector ?? selectedElement.selector;
    return { ...tracker.getVariableAssociations(selector2) ?? {} };
  }, [selectedElement, activeSelector, changeRevision]);
  const selectedUnlinkedVariables = useMemo(() => {
    const tracker = trackerRef.current;
    if (!tracker || !selectedElement) return /* @__PURE__ */ new Set();
    const selector2 = activeSelector ?? selectedElement.selector;
    return new Set(tracker.getUnlinkedVariables(selector2));
  }, [selectedElement, activeSelector, changeRevision]);
  const selectedChangedProperties = useMemo(() => {
    const tracker = trackerRef.current;
    if (!tracker || !selectedElement) return /* @__PURE__ */ new Set();
    const selector2 = activeSelector ?? selectedElement.selector;
    return tracker.getChangedProperties(selector2);
  }, [selectedElement, activeSelector, changeRevision]);
  const handleTreeSelect = useCallback((el) => {
    const picker = pickerRef.current;
    if (picker) {
      picker.selectElement(el);
    }
  }, []);
  const handleTreeHover = useCallback((el) => {
    const picker = pickerRef.current;
    if (picker) {
      picker.highlightElement(el);
    }
  }, []);
  useEffect(() => {
    const bar = tabBarRef.current;
    const pill = tabPillRef.current;
    if (!bar || !pill) return;
    const buttons = bar.querySelectorAll(".retune-tab");
    const idx = panelTab === "elements" ? 0 : 1;
    const btn = buttons[idx];
    if (!btn) return;
    const barRect = bar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const offsetX = btnRect.left - barRect.left;
    pill.style.width = `${btnRect.width}px`;
    if (tabPillFirstRender.current) {
      pill.style.transition = "none";
      pill.style.transform = `translateX(${offsetX}px)`;
      pill.offsetHeight;
      pill.style.transition = "";
      tabPillFirstRender.current = false;
    } else {
      pill.style.transform = `translateX(${offsetX}px)`;
    }
  }, [panelTab, selectedElement]);
  useCallback(() => {
    setSide((s5) => {
      const next = s5 === "right" ? "left" : "right";
      try {
        localStorage.setItem("retune-panel-side", next);
      } catch {
      }
      return next;
    });
  }, []);
  const handleToolbarPointerDown = useCallback((e2) => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    dragRef.current = { startX: e2.clientX, startY: e2.clientY, originX: 0, dragging: false, lastX: e2.clientX, lastT: e2.timeStamp, velocity: 0 };
  }, []);
  const handleToolbarPointerMove = useCallback((e2) => {
    const drag = dragRef.current;
    const toolbar = toolbarRef.current;
    if (!drag || !toolbar) return;
    const dx = e2.clientX - drag.startX;
    const dy = e2.clientY - drag.startY;
    if (!drag.dragging && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    if (!drag.dragging) {
      const rect = toolbar.getBoundingClientRect();
      drag.originX = rect.left + rect.width / 2;
      drag.dragging = true;
      toolbar.setPointerCapture(e2.pointerId);
      setToolbarDragging(true);
    }
    const dt = e2.timeStamp - drag.lastT;
    if (dt > 0) {
      drag.velocity = (e2.clientX - drag.lastX) / dt;
    }
    drag.lastX = e2.clientX;
    drag.lastT = e2.timeStamp;
    const offset = e2.clientX - drag.startX;
    toolbar.style.transition = "none";
    toolbar.style.transform = `translateX(${offset}px)`;
  }, []);
  const handleToolbarPointerUp = useCallback((e2) => {
    const drag = dragRef.current;
    const toolbar = toolbarRef.current;
    if (!drag || !toolbar) return;
    dragRef.current = null;
    if (!drag.dragging) {
      return;
    }
    const beforeRect = toolbar.getBoundingClientRect();
    const FLICK_THRESHOLD = 0.4;
    const newSide = Math.abs(drag.velocity) > FLICK_THRESHOLD ? drag.velocity < 0 ? "left" : "right" : e2.clientX < window.innerWidth / 2 ? "left" : "right";
    setSide(newSide);
    try {
      localStorage.setItem("retune-panel-side", newSide);
    } catch {
    }
    requestAnimationFrame(() => {
      toolbar.style.transition = "none";
      toolbar.style.transform = "";
      const afterRect = toolbar.getBoundingClientRect();
      const dx = beforeRect.left - afterRect.left;
      toolbar.style.transform = `translateX(${dx}px)`;
      requestAnimationFrame(() => {
        toolbar.style.transition = "transform 200ms cubic-bezier(0.77, 0, 0.175, 1)";
        toolbar.style.transform = "";
        const cleanup = () => {
          toolbar.removeEventListener("transitionend", cleanup);
          toolbar.style.transition = "";
          setToolbarDragging(false);
        };
        toolbar.addEventListener("transitionend", cleanup, { once: true });
      });
    });
  }, []);
  const syncForcedInlineStyles = useCallback(() => {
    const state = forcedStateRef.current;
    if (!state) return;
    const el = selectedElementRef.current;
    const preview = previewRef.current;
    if (!el?.element || !preview) return;
    const domEl = el.element;
    if (!domEl.style) return;
    const selector2 = activeSelectorRef.current ?? el.selector;
    const pseudoSelector = selector2 + state;
    const pseudoStyles = getPseudoStateStyles(el.element, state);
    const userEdits = /* @__PURE__ */ new Map();
    for (const change of preview.getChanges()) {
      if (change.selector === pseudoSelector) {
        userEdits.set(change.property, change.value);
      }
    }
    const prev = forcedStylesRef.current;
    for (const prop of prev.props) {
      const kebab = prop.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
      domEl.style.removeProperty(kebab);
    }
    const appliedProps = [];
    const applied = /* @__PURE__ */ new Set();
    for (const [prop, value] of Object.entries(pseudoStyles)) {
      const camelProp = prop.replace(/-([a-z])/g, (_, c3) => c3.toUpperCase());
      const finalValue = userEdits.get(camelProp) ?? value;
      domEl.style.setProperty(prop, finalValue, "important");
      appliedProps.push(camelProp);
      applied.add(camelProp);
    }
    for (const [camelProp, value] of userEdits) {
      if (applied.has(camelProp)) continue;
      const kebab = camelProp.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
      domEl.style.setProperty(kebab, value, "important");
      appliedProps.push(camelProp);
    }
    forcedStylesRef.current = { selector: selector2, props: appliedProps };
  }, []);
  const deleteStackRef = useRef([]);
  const deleteRedoStackRef = useRef([]);
  const textStackRef = useRef([]);
  const textRedoStackRef = useRef([]);
  const handleDelete = useCallback(() => {
    const el = selectedElementRef.current;
    if (!el?.element) return;
    const tag = el.element.tagName.toLowerCase();
    if (tag === "body" || tag === "html" || tag === "head") return;
    if (el.element.hasAttribute("data-retune-host")) return;
    const parent = el.element.parentNode;
    if (!parent) return;
    const tracker = trackerRef.current;
    if (tracker) {
      const selector2 = activeSelectorRef.current ?? el.selector;
      tracker.track(
        selector2,
        el.tagName,
        el.textContent,
        el.classes,
        el.reactComponents,
        el.computedStyles,
        el.sourceFile,
        el.stylingApproach,
        el.inlineStyles,
        el.elementId,
        el.accessibleName,
        el.parentContext,
        el.childSummary,
        el.domPath,
        el.nearbySiblings,
        el.position
      );
      tracker.recordChange(selector2, "__delete", "true");
      tracker.persist();
    }
    deleteStackRef.current.push({
      element: el.element,
      parent,
      nextSibling: el.element.nextSibling
    });
    deleteRedoStackRef.current = [];
    el.element.remove();
    setSelectedElement(null);
    selectedElementRef.current = null;
    pickerRef.current?.refreshSelection();
    syncTrackerStateRef.current();
    setChangeRevision((r) => r + 1);
  }, []);
  const undoDelete = useCallback(() => {
    const entry = deleteStackRef.current.pop();
    if (!entry) return;
    if (entry.nextSibling) {
      entry.parent.insertBefore(entry.element, entry.nextSibling);
    } else {
      entry.parent.appendChild(entry.element);
    }
    deleteRedoStackRef.current.push(entry);
    syncTrackerStateRef.current();
    setChangeRevision((r) => r + 1);
  }, []);
  function revertBulkTrackerEntries(tracker, property) {
    const pending = tracker.getPendingChanges();
    for (const change of pending) {
      if (change.changes.some((c3) => c3.property === "__bulkOf")) {
        tracker.removeProperty(change.selector, property);
        tracker.removeProperty(change.selector, "__bulkOf");
      }
    }
    tracker.persist();
  }
  const handleUndo = useCallback(() => {
    const tracker = trackerRef.current;
    const preview = previewRef.current;
    if (!tracker || !preview) return;
    const entries = tracker.popUndo();
    if (!entries) return;
    if (entries.some((e2) => e2.property === "__delete")) {
      undoDelete();
      return;
    }
    if (entries.some((e2) => e2.property === "__reorder")) {
      const undoEntry = reorderStackRef.current.pop();
      if (undoEntry) {
        const redoEntry = undoEntry.map((s5) => ({
          element: s5.element,
          prevOrder: s5.element.style.order,
          prevTranslate: s5.element.style.translate
        }));
        for (const s5 of undoEntry) {
          if (s5.prevOrder) s5.element.style.order = s5.prevOrder;
          else s5.element.style.removeProperty("order");
          s5.element.style.removeProperty("transition");
          if (s5.prevTranslate) s5.element.style.translate = s5.prevTranslate;
          else s5.element.style.removeProperty("translate");
          if (s5.element.getAttribute("style")?.trim() === "") s5.element.removeAttribute("style");
        }
        reorderRedoStackRef.current.push(redoEntry);
      }
      revertBulkTrackerEntries(tracker, "__reorder");
      syncTrackerStateRef.current();
      refreshSelectedElementRef.current();
      pickerRef.current?.refreshSelection();
      setChangeRevision((r) => r + 1);
      return;
    }
    if (entries.some((e2) => e2.property === "__reparent")) {
      const batchSize = reparentBatchSizeRef.current.pop() || 1;
      const undoneElements = [];
      for (let i3 = 0; i3 < batchSize; i3++) {
        const entry = reparentDOMRef.current.pop();
        if (!entry) break;
        entry.observer.disconnect();
        try {
          if (entry.oldNextSibling && entry.oldNextSibling.parentElement === entry.oldParent) {
            entry.oldParent.insertBefore(entry.element, entry.oldNextSibling);
          } else {
            entry.oldParent.appendChild(entry.element);
          }
        } catch {
        }
        undoneElements.push(entry.element);
      }
      revertBulkTrackerEntries(tracker, "__reparent");
      setReparentEntries((prev) => prev.filter((r) => !undoneElements.includes(r.element)));
      syncTrackerStateRef.current();
      refreshSelectedElementRef.current();
      pickerRef.current?.refreshSelection();
      setChangeRevision((r) => r + 1);
      return;
    }
    if (entries.some((e2) => e2.property === "__text")) {
      const entry = textStackRef.current.pop();
      if (entry) {
        entry.element.innerHTML = entry.originalHTML;
        textRedoStackRef.current.push(entry);
      }
      syncTrackerStateRef.current();
      setChangeRevision((r) => r + 1);
      return;
    }
    {
      const valueEntries = entries.filter((e2) => !e2.action);
      for (const entry of valueEntries) {
        if (entry.value) preview.applyChange(entry.selector, entry.property, entry.value);
        else preview.removeChange(entry.selector, entry.property);
      }
      const pending = tracker.getPendingChanges();
      const activeProps = /* @__PURE__ */ new Set();
      for (const el of pending) {
        for (const c3 of el.changes) {
          activeProps.add(`${el.selector}::${c3.property}`);
        }
      }
      for (const entry of valueEntries) {
        const key = `${entry.selector}::${entry.property}`;
        if (!activeProps.has(key)) {
          preview.removeChange(entry.selector, entry.property);
        }
      }
      syncForcedInlineStyles();
      syncTrackerStateRef.current();
      refreshSelectedElementRef.current();
      pickerRef.current?.refreshSelection();
      setChangeRevision((r) => r + 1);
    }
  }, [syncForcedInlineStyles, undoDelete]);
  const handleRedo = useCallback(() => {
    const tracker = trackerRef.current;
    const preview = previewRef.current;
    if (!tracker || !preview) return;
    const entries = tracker.popRedo();
    if (!entries) return;
    if (entries.some((e2) => e2.property === "__reorder")) {
      const redoEntry = reorderRedoStackRef.current.pop();
      if (redoEntry) {
        const undoEntry = redoEntry.map((s5) => ({
          element: s5.element,
          prevOrder: s5.element.style.order,
          prevTranslate: s5.element.style.translate
        }));
        for (const s5 of redoEntry) {
          s5.element.style.order = s5.prevOrder;
          s5.element.style.transition = "";
          s5.element.style.translate = s5.prevTranslate;
        }
        reorderStackRef.current.push(undoEntry);
      }
      syncTrackerStateRef.current();
      refreshSelectedElementRef.current();
      pickerRef.current?.refreshSelection();
      setChangeRevision((r) => r + 1);
      return;
    }
    if (entries.some((e2) => e2.property === "__text")) {
      const entry = textRedoStackRef.current.pop();
      if (entry) {
        entry.element.innerHTML = entry.newHTML;
        textStackRef.current.push(entry);
      }
      syncTrackerStateRef.current();
      setChangeRevision((r) => r + 1);
      return;
    }
    if (entries.some((e2) => e2.property === "__delete")) {
      const entry = deleteRedoStackRef.current.pop();
      if (entry) {
        deleteStackRef.current.push({
          element: entry.element,
          parent: entry.element.parentNode,
          nextSibling: entry.element.nextSibling
        });
        entry.element.remove();
        setSelectedElement(null);
        selectedElementRef.current = null;
        pickerRef.current?.refreshSelection();
      }
      syncTrackerStateRef.current();
      setChangeRevision((r) => r + 1);
      return;
    }
    for (const entry of entries) {
      if (!entry.action) {
        preview.applyChange(entry.selector, entry.property, entry.value);
      }
    }
    syncForcedInlineStyles();
    syncTrackerStateRef.current();
    refreshSelectedElementRef.current();
    pickerRef.current?.refreshSelection();
    setChangeRevision((r) => r + 1);
  }, [syncForcedInlineStyles]);
  const handlePropertyReset = useCallback((property) => {
    const tracker = trackerRef.current;
    const preview = previewRef.current;
    const el = selectedElementRef.current;
    if (!tracker || !preview || !el) return;
    const selector2 = activeSelectorRef.current ?? el.selector;
    const result = tracker.resetProperty(selector2, property);
    if (!result) return;
    if (result.to) {
      preview.applyChange(selector2, property, result.to);
    } else {
      preview.removeChange(selector2, property);
    }
    const pending = tracker.getPendingChanges();
    const activeProps = /* @__PURE__ */ new Set();
    for (const c3 of pending) {
      for (const p4 of c3.changes) {
        activeProps.add(`${c3.selector}::${p4.property}`);
      }
    }
    if (!activeProps.has(`${selector2}::${property}`)) {
      preview.removeChange(selector2, property);
    }
    syncForcedInlineStyles();
    syncTrackerStateRef.current();
    refreshSelectedElementRef.current();
    pickerRef.current?.refreshSelection();
    setChangeRevision((r) => r + 1);
  }, [syncForcedInlineStyles]);
  const reorderStackRef = useRef([]);
  const reorderRedoStackRef = useRef([]);
  const reorderOriginRef = useRef(/* @__PURE__ */ new WeakMap());
  const reorderOriginalOrderRef = useRef(/* @__PURE__ */ new Map());
  const reorderModeRef = useRef(/* @__PURE__ */ new WeakMap());
  const reorderOriginalRectsRef = useRef(/* @__PURE__ */ new Map());
  const reorderVisualOrderRef = useRef(/* @__PURE__ */ new Map());
  const reorderObserverRef = useRef(null);
  function getVisualOrder(parent) {
    const children = Array.from(parent.children);
    const mode = reorderModeRef.current.get(parent);
    if (mode === "translate") {
      const desired = reorderVisualOrderRef.current.get(parent);
      if (desired) return [...desired];
    }
    return [...children].sort((a4, b) => {
      const orderA = parseInt(a4.style.order) || 0;
      const orderB = parseInt(b.style.order) || 0;
      if (orderA !== orderB) return orderA - orderB;
      return children.indexOf(a4) - children.indexOf(b);
    });
  }
  const visualOrderMap = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const parent of reorderOriginalOrderRef.current.keys()) {
      if (parent.isConnected) map.set(parent, getVisualOrder(parent));
    }
    for (const parent of reorderVisualOrderRef.current.keys()) {
      if (parent.isConnected && !map.has(parent)) map.set(parent, getVisualOrder(parent));
    }
    return map;
  }, [changeRevision]);
  function ensureExplicitOrder(parent) {
    if (reorderOriginalOrderRef.current.has(parent)) return;
    const children = Array.from(parent.children);
    const originals = /* @__PURE__ */ new Map();
    for (const child of children) {
      originals.set(child, child.style.order || "");
    }
    reorderOriginalOrderRef.current.set(parent, originals);
    children.forEach((c3, i3) => {
      c3.style.order = String(i3);
    });
  }
  function ensureOriginalRects(parent) {
    if (reorderOriginalRectsRef.current.has(parent)) return;
    const children = Array.from(parent.children);
    const rects = /* @__PURE__ */ new Map();
    for (const child of children) {
      rects.set(child, child.getBoundingClientRect());
    }
    reorderOriginalRectsRef.current.set(parent, rects);
    reorderVisualOrderRef.current.set(parent, [...children]);
    if (!reorderObserverRef.current) {
      reorderObserverRef.current = new MutationObserver((mutations) => {
        for (const m of mutations) {
          const target = m.target;
          if (m.type === "childList" && reorderOriginalRectsRef.current.has(target)) {
            const rects2 = reorderOriginalRectsRef.current.get(target);
            if (rects2) {
              for (const [child] of rects2) {
                const el = child;
                el.style.removeProperty("translate");
                if (el.getAttribute("style")?.trim() === "") el.removeAttribute("style");
              }
            }
            reorderOriginalRectsRef.current.delete(target);
            reorderVisualOrderRef.current.delete(target);
            reorderModeRef.current.delete(target);
          }
        }
      });
    }
    reorderObserverRef.current.observe(parent, { childList: true });
  }
  function applyTranslateOrder(parent) {
    const rects = reorderOriginalRectsRef.current.get(parent);
    const desiredOrder = reorderVisualOrderRef.current.get(parent);
    if (!rects || !desiredOrder) return;
    const originalChildren = Array.from(parent.children);
    let totalGap = 0;
    let gapCount = 0;
    for (let i3 = 0; i3 < originalChildren.length - 1; i3++) {
      const curr = rects.get(originalChildren[i3]);
      const next = rects.get(originalChildren[i3 + 1]);
      totalGap += next.top - curr.bottom;
      gapCount++;
    }
    const gap = gapCount > 0 ? totalGap / gapCount : 0;
    let currentTop = rects.get(originalChildren[0]).top;
    for (let i3 = 0; i3 < desiredOrder.length; i3++) {
      const child = desiredOrder[i3];
      const originalTop = rects.get(child).top;
      const translateY = currentTop - originalTop;
      if (Math.abs(translateY) < 0.5) {
        child.style.removeProperty("translate");
      } else {
        child.style.translate = `0 ${translateY}px`;
      }
      currentTop += rects.get(child).height + gap;
    }
  }
  function applyBulkReorder(primaryParent, newVisualOrder) {
    const activeLevel = scopeLevelsRef.current[activeLevelIndexRef.current];
    if (!activeLevel?.selector || activeLevel.count <= 1) return [];
    const parentShared = getSharedSelector(primaryParent);
    if (!parentShared || parentShared.count <= 1) return [];
    let otherParents;
    try {
      otherParents = Array.from(document.querySelectorAll(parentShared.selector)).filter((p4) => p4 !== primaryParent && p4.isConnected);
    } catch {
      return [];
    }
    if (otherParents.length === 0) return [];
    if (detectChildrenType(primaryParent) === "array") return [];
    const childSelectors = newVisualOrder.map((child) => {
      const classes = Array.from(child.classList).filter((c3) => !isHashedClass(c3));
      if (classes.length > 0) return `.${classes[0]}`;
      return child.tagName.toLowerCase();
    });
    const uniqueSelectors = new Set(childSelectors);
    if (uniqueSelectors.size < childSelectors.length * 0.5) return [];
    const bulkUndoEntries = [];
    for (const otherParent of otherParents) {
      const otherChildren = Array.from(otherParent.children);
      if (otherChildren.length < 2) continue;
      const otherChildSelectors = otherChildren.map((child) => {
        const classes = Array.from(child.classList).filter((c3) => !isHashedClass(c3));
        if (classes.length > 0) return `.${classes[0]}`;
        return child.tagName.toLowerCase();
      });
      const primarySet = new Set(childSelectors);
      const otherSet = new Set(otherChildSelectors);
      const matchCount = otherChildSelectors.filter((s5) => primarySet.has(s5)).length;
      const reverseMatchCount = childSelectors.filter((s5) => otherSet.has(s5)).length;
      if (matchCount < otherChildSelectors.length * 0.7 || reverseMatchCount < childSelectors.length * 0.7) continue;
      const display = getComputedStyle(otherParent).display;
      const isFlex = display === "flex" || display === "inline-flex";
      const isGrid = display === "grid" || display === "inline-grid";
      const mode = isFlex || isGrid ? "order" : "translate";
      const undoEntry = otherChildren.map((c3) => ({
        element: c3,
        prevOrder: c3.style.order,
        prevTranslate: c3.style.translate || ""
      }));
      bulkUndoEntries.push(undoEntry);
      const tracker = trackerRef.current;
      if (tracker) {
        for (let i3 = 0; i3 < otherChildren.length; i3++) {
          const child = otherChildren[i3];
          const cls = Array.from(child.classList).filter((cl) => !isHashedClass(cl));
          const childSel = cls.length > 0 ? `.${cls[0]}` : child.tagName.toLowerCase();
          const targetIdx = childSelectors.indexOf(childSel);
          if (targetIdx !== -1 && targetIdx !== i3) {
            const bulkSelector = getSelector(child);
            tracker.track(
              bulkSelector,
              child.tagName.toLowerCase(),
              child.textContent?.slice(0, 40) || null,
              Array.from(child.classList),
              [],
              { "__reorder": String(i3) },
              null,
              void 0,
              null,
              child.id || null,
              null,
              null,
              null,
              "",
              null,
              { x: 0, y: 0, width: 0, height: 0 }
            );
            tracker.ensureOriginalValue(bulkSelector, "__reorder", String(i3));
            tracker.recordChangeSilent(bulkSelector, "__reorder", String(targetIdx));
            tracker.ensureOriginalValue(bulkSelector, "__bulkOf", "");
            tracker.recordChangeSilent(bulkSelector, "__bulkOf", "reorder");
            break;
          }
        }
        tracker.persist();
      }
      if (mode === "order") {
        let orderIdx = 0;
        const assigned = /* @__PURE__ */ new Set();
        for (const selector2 of childSelectors) {
          const match = otherChildren.find((c3) => {
            if (assigned.has(c3)) return false;
            const classes = Array.from(c3.classList).filter((cl) => !isHashedClass(cl));
            const childSel = classes.length > 0 ? `.${classes[0]}` : c3.tagName.toLowerCase();
            return childSel === selector2;
          });
          if (match) {
            match.style.order = String(orderIdx);
            assigned.add(match);
          }
          orderIdx++;
        }
        for (const child of otherChildren) {
          if (!assigned.has(child)) {
            child.style.order = String(orderIdx++);
          }
        }
        if (!reorderModeRef.current.has(otherParent)) {
          reorderModeRef.current.set(otherParent, "order");
        }
        if (!reorderOriginalOrderRef.current.has(otherParent)) {
          const originals = /* @__PURE__ */ new Map();
          for (const child of otherChildren) {
            originals.set(child, undoEntry.find((u) => u.element === child)?.prevOrder || "");
          }
          reorderOriginalOrderRef.current.set(otherParent, originals);
        }
      } else {
        ensureOriginalRects(otherParent);
        const desiredOrder = [];
        const assigned = /* @__PURE__ */ new Set();
        for (const selector2 of childSelectors) {
          const match = otherChildren.find((c3) => {
            if (assigned.has(c3)) return false;
            const classes = Array.from(c3.classList).filter((cl) => !isHashedClass(cl));
            const childSel = classes.length > 0 ? `.${classes[0]}` : c3.tagName.toLowerCase();
            return childSel === selector2;
          });
          if (match) {
            desiredOrder.push(match);
            assigned.add(match);
          }
        }
        for (const child of otherChildren) {
          if (!assigned.has(child)) desiredOrder.push(child);
        }
        reorderVisualOrderRef.current.set(otherParent, desiredOrder);
        if (!reorderModeRef.current.has(otherParent)) {
          reorderModeRef.current.set(otherParent, "translate");
        }
        applyTranslateOrder(otherParent);
      }
    }
    return bulkUndoEntries;
  }
  function applyBulkReparent(primaryElement, primaryOldParent, primaryNewParent, insertIndex) {
    const activeLevel = scopeLevelsRef.current[activeLevelIndexRef.current];
    if (!activeLevel?.selector || activeLevel.count <= 1) return;
    const elementClasses = Array.from(primaryElement.classList).filter((c3) => !isHashedClass(c3));
    if (elementClasses.length === 0) return;
    const elementClassName = elementClasses[0];
    const oldParentShared = getSharedSelector(primaryOldParent);
    if (!oldParentShared || oldParentShared.count <= 1) return;
    if (detectChildrenType(primaryOldParent) === "array") return;
    const newParentClasses = Array.from(primaryNewParent.classList).filter((c3) => !isHashedClass(c3));
    if (newParentClasses.length === 0) return;
    const newParentClassName = newParentClasses[0];
    const oldParentParent = primaryOldParent.parentElement;
    if (!oldParentParent) return;
    const instanceRootShared = getSharedSelector(oldParentParent);
    const instanceRootSelector = instanceRootShared?.selector;
    let otherInstanceRoots;
    if (instanceRootSelector && instanceRootShared.count > 1) {
      try {
        otherInstanceRoots = Array.from(document.querySelectorAll(instanceRootSelector)).filter((r) => r !== oldParentParent && r.isConnected);
      } catch {
        return;
      }
    } else {
      try {
        otherInstanceRoots = Array.from(document.querySelectorAll(oldParentShared.selector)).filter((p4) => p4 !== primaryOldParent && p4.isConnected).map((p4) => p4.parentElement).filter(Boolean);
      } catch {
        return;
      }
    }
    for (const instanceRoot of otherInstanceRoots) {
      const matchingOldParent = instanceRoot.querySelector(oldParentShared.selector);
      if (!matchingOldParent) continue;
      const matchingChild = Array.from(matchingOldParent.children).find(
        (c3) => c3.classList.contains(elementClassName)
      );
      if (!matchingChild) continue;
      const newParentEscaped = `.${CSS.escape(newParentClassName)}`;
      const matchingNewParent = instanceRoot.matches(newParentEscaped) ? instanceRoot : instanceRoot.querySelector(newParentEscaped);
      if (!matchingNewParent || matchingNewParent === matchingOldParent) continue;
      const tracker = trackerRef.current;
      if (tracker) {
        const bulkSelector = getSelector(matchingChild);
        const bulkOldParentSelector = getSelector(matchingOldParent);
        const bulkNewParentSelector = getSelector(matchingNewParent);
        const bulkOldIndex = Array.from(matchingOldParent.children).indexOf(matchingChild);
        tracker.track(
          bulkSelector,
          matchingChild.tagName.toLowerCase(),
          matchingChild.textContent?.slice(0, 40) || null,
          Array.from(matchingChild.classList),
          [],
          { "__reparent": `${bulkOldParentSelector}@${bulkOldIndex}` },
          null,
          void 0,
          null,
          matchingChild.id || null,
          null,
          null,
          null,
          "",
          null,
          { x: 0, y: 0, width: 0, height: 0 }
        );
        tracker.ensureOriginalValue(bulkSelector, "__reparent", `${bulkOldParentSelector}@${bulkOldIndex}`);
        tracker.recordChangeSilent(bulkSelector, "__reparent", `${bulkNewParentSelector}@${insertIndex}`);
        tracker.ensureOriginalValue(bulkSelector, "__bulkOf", "");
        tracker.recordChangeSilent(bulkSelector, "__bulkOf", "reparent");
      }
      const oldNextSibling = matchingChild.nextElementSibling;
      const newChildren = Array.from(matchingNewParent.children);
      const refChild = insertIndex < newChildren.length ? newChildren[insertIndex] : null;
      if (refChild) {
        matchingNewParent.insertBefore(matchingChild, refChild);
      } else {
        matchingNewParent.appendChild(matchingChild);
      }
      const movedEl = matchingChild;
      const capturedOldParent = matchingOldParent;
      const capturedNewParent = matchingNewParent;
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type !== "childList") continue;
          if (m.target === capturedOldParent) {
            for (const added of m.addedNodes) {
              if (!(added instanceof Element)) continue;
              if (added !== movedEl && added.tagName === movedEl.tagName && added.className === movedEl.className && added.textContent === movedEl.textContent) {
                try {
                  capturedOldParent.removeChild(added);
                } catch {
                }
              }
            }
          }
          if (m.target === capturedNewParent) {
            for (const removed of m.removedNodes) {
              if (removed === movedEl && !movedEl.parentElement) {
                try {
                  const cur = Array.from(capturedNewParent.children);
                  const ref = insertIndex < cur.length ? cur[insertIndex] : null;
                  if (ref) capturedNewParent.insertBefore(movedEl, ref);
                  else capturedNewParent.appendChild(movedEl);
                } catch {
                }
              }
            }
          }
        }
      });
      observer.observe(matchingOldParent, { childList: true });
      observer.observe(matchingNewParent, { childList: true });
      reparentDOMRef.current.push({
        element: matchingChild,
        oldParent: matchingOldParent,
        oldNextSibling,
        newParent: matchingNewParent,
        observer
      });
      setReparentEntries((prev) => [
        ...prev.filter((r) => r.element !== matchingChild),
        { element: matchingChild, newParent: matchingNewParent, insertIndex }
      ]);
    }
  }
  function findReorderProxy(start2) {
    let current = start2;
    while (current) {
      const p4 = current.parentElement;
      if (!p4) return null;
      const siblings = Array.from(p4.children);
      if (siblings.length >= 2) {
        return { proxy: current, parent: p4 };
      }
      current = p4;
    }
    return null;
  }
  const handleReorderByKey = useCallback((direction) => {
    const el = selectedElementRef.current?.element;
    if (!el?.parentElement) return;
    const context = findReorderProxy(el);
    if (!context) return;
    const { proxy, parent } = context;
    const children = Array.from(parent.children);
    const parentDisplay = getComputedStyle(parent).display;
    const isFlex = parentDisplay === "flex" || parentDisplay === "inline-flex";
    const isGrid = parentDisplay === "grid" || parentDisplay === "inline-grid";
    const mode = isFlex || isGrid ? "order" : "translate";
    if (!reorderModeRef.current.has(parent)) {
      reorderModeRef.current.set(parent, mode);
    }
    if (mode === "order") {
      ensureExplicitOrder(parent);
    } else {
      ensureOriginalRects(parent);
    }
    const visualOrder = getVisualOrder(parent);
    const visualIndex = visualOrder.indexOf(proxy);
    if (visualIndex === -1) return;
    const newVisualIndex = direction === "up" ? visualIndex - 1 : visualIndex + 1;
    if (newVisualIndex < 0 || newVisualIndex >= visualOrder.length) return;
    const neighbor = visualOrder[newVisualIndex];
    const domIndex = children.indexOf(proxy);
    const tracker = trackerRef.current;
    if (tracker) {
      const origin = reorderOriginRef.current.get(proxy);
      const proxySelector = origin?.selector ?? getSelector(proxy);
      const originalIndex = origin?.originalIndex ?? domIndex;
      if (!origin) {
        reorderOriginRef.current.set(proxy, { selector: proxySelector, originalIndex: domIndex });
      }
      const inspected = selectedElementRef.current;
      tracker.track(
        proxySelector,
        proxy.tagName.toLowerCase(),
        proxy.textContent?.slice(0, 40) || null,
        Array.from(proxy.classList),
        inspected?.reactComponents ?? [],
        { "__reorder": String(originalIndex) },
        inspected?.sourceFile ?? null,
        inspected?.stylingApproach ?? void 0,
        null,
        proxy.id || null,
        null,
        null,
        null,
        inspected?.domPath ?? "",
        null,
        { x: 0, y: 0, width: 0, height: 0 }
      );
      tracker.ensureOriginalValue(proxySelector, "__reorder", String(originalIndex));
      tracker.breakCoalescing();
      tracker.recordChange(proxySelector, "__reorder", String(newVisualIndex));
      tracker.persist();
    }
    const undoEntry = [
      { element: proxy, prevOrder: proxy.style.order, prevTranslate: proxy.style.translate },
      { element: neighbor, prevOrder: neighbor.style.order, prevTranslate: neighbor.style.translate }
    ];
    reorderStackRef.current.push(undoEntry);
    reorderRedoStackRef.current = [];
    let newVisualOrder;
    if (mode === "order") {
      const temp = proxy.style.order;
      proxy.style.order = neighbor.style.order;
      neighbor.style.order = temp;
      newVisualOrder = getVisualOrder(parent);
    } else {
      const desired = reorderVisualOrderRef.current.get(parent);
      if (desired) {
        const idx = desired.indexOf(proxy);
        const neighborIdx = desired.indexOf(neighbor);
        if (idx !== -1 && neighborIdx !== -1) {
          [desired[idx], desired[neighborIdx]] = [desired[neighborIdx], desired[idx]];
          applyTranslateOrder(parent);
        }
        newVisualOrder = [...desired];
      } else {
        newVisualOrder = children;
      }
    }
    const bulkUndo = applyBulkReorder(parent, newVisualOrder);
    if (bulkUndo.length > 0) {
      for (const entry of bulkUndo) {
        undoEntry.push(...entry);
      }
    }
    if (proxy instanceof HTMLElement) proxy.blur();
    syncTrackerStateRef.current();
    refreshSelectedElementRef.current();
    pickerRef.current?.refreshSelection();
    setChangeRevision((r) => r + 1);
  }, []);
  const handleTreeReorder = useCallback((element, fromIndex, toIndex) => {
    const parent = element.parentElement;
    if (!parent) return;
    const children = Array.from(parent.children);
    const el = element;
    const parentDisplay = getComputedStyle(parent).display;
    const isFlex = parentDisplay === "flex" || parentDisplay === "inline-flex";
    const isGrid = parentDisplay === "grid" || parentDisplay === "inline-grid";
    const mode = isFlex || isGrid ? "order" : "translate";
    if (!reorderModeRef.current.has(parent)) {
      reorderModeRef.current.set(parent, mode);
    }
    if (mode === "order") {
      ensureExplicitOrder(parent);
    } else {
      ensureOriginalRects(parent);
    }
    const domIndex = children.indexOf(el);
    const tracker = trackerRef.current;
    if (tracker) {
      const origin = reorderOriginRef.current.get(el);
      const proxySelector = origin?.selector ?? getSelector(el);
      const originalIndex = origin?.originalIndex ?? domIndex;
      if (!origin) {
        reorderOriginRef.current.set(el, { selector: proxySelector, originalIndex: domIndex });
      }
      const inspected = selectedElementRef.current;
      tracker.track(
        proxySelector,
        el.tagName.toLowerCase(),
        el.textContent?.slice(0, 40) || null,
        Array.from(el.classList),
        inspected?.reactComponents ?? [],
        { "__reorder": String(originalIndex) },
        inspected?.sourceFile ?? null,
        inspected?.stylingApproach ?? void 0,
        null,
        el.id || null,
        null,
        null,
        null,
        inspected?.domPath ?? "",
        null,
        { x: 0, y: 0, width: 0, height: 0 }
      );
      tracker.ensureOriginalValue(proxySelector, "__reorder", String(originalIndex));
      tracker.breakCoalescing();
      tracker.recordChange(proxySelector, "__reorder", String(toIndex));
      tracker.persist();
    }
    const undoEntry = children.map((c3) => ({
      element: c3,
      prevOrder: c3.style.order,
      prevTranslate: c3.style.translate
    }));
    reorderStackRef.current.push(undoEntry);
    reorderRedoStackRef.current = [];
    let newVisualOrder;
    if (mode === "order") {
      const visualOrder = getVisualOrder(parent);
      const [moved] = visualOrder.splice(fromIndex, 1);
      visualOrder.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
      for (let i3 = 0; i3 < visualOrder.length; i3++) {
        visualOrder[i3].style.order = String(i3);
      }
      newVisualOrder = visualOrder;
    } else {
      const desired = reorderVisualOrderRef.current.get(parent);
      if (desired) {
        const [moved] = desired.splice(fromIndex, 1);
        desired.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
        applyTranslateOrder(parent);
        newVisualOrder = [...desired];
      } else {
        newVisualOrder = children;
      }
    }
    const bulkUndo = applyBulkReorder(parent, newVisualOrder);
    if (bulkUndo.length > 0) {
      for (const entry of bulkUndo) {
        undoEntry.push(...entry);
      }
    }
    if (el instanceof HTMLElement) el.blur();
    syncTrackerStateRef.current();
    refreshSelectedElementRef.current();
    pickerRef.current?.refreshSelection();
    setChangeRevision((r) => r + 1);
  }, []);
  const handleTreeReparent = useCallback((element, newParent, insertIndex) => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    const el = element;
    const oldParent = el.parentElement;
    if (!oldParent || oldParent === newParent) return;
    const reparentCountBefore = reparentDOMRef.current.length;
    const elementSelector = getSelector(el);
    const oldParentSelector = getSelector(oldParent);
    const newParentSelector = getSelector(newParent);
    const oldNextSibling = el.nextElementSibling;
    const oldSiblings = Array.from(oldParent.children);
    const oldIndex = oldSiblings.indexOf(el);
    const fromValue = `${oldParentSelector}@${oldIndex}`;
    const toValue = `${newParentSelector}@${insertIndex}`;
    const inspected = selectedElementRef.current;
    tracker.track(
      elementSelector,
      el.tagName.toLowerCase(),
      el.textContent?.slice(0, 40) || null,
      Array.from(el.classList),
      inspected?.reactComponents ?? [],
      { "__reparent": fromValue },
      inspected?.sourceFile ?? null,
      inspected?.stylingApproach ?? void 0,
      null,
      el.id || null,
      null,
      null,
      null,
      inspected?.domPath ?? "",
      null,
      { x: 0, y: 0, width: 0, height: 0 }
    );
    tracker.ensureOriginalValue(elementSelector, "__reparent", fromValue);
    tracker.breakCoalescing();
    tracker.recordChange(elementSelector, "__reparent", toValue);
    tracker.persist();
    const newChildren = Array.from(newParent.children);
    const refChild = insertIndex < newChildren.length ? newChildren[insertIndex] : null;
    if (refChild) {
      newParent.insertBefore(el, refChild);
    } else {
      newParent.appendChild(el);
    }
    const movedEl = el;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "childList") continue;
        if (m.target === oldParent) {
          for (const added of m.addedNodes) {
            if (!(added instanceof Element)) continue;
            if (added !== movedEl && added.tagName === movedEl.tagName && added.className === movedEl.className && added.textContent === movedEl.textContent) {
              try {
                oldParent.removeChild(added);
              } catch {
              }
            }
          }
        }
        if (m.target === newParent) {
          for (const removed of m.removedNodes) {
            if (removed === movedEl && !movedEl.parentElement) {
              try {
                const currentChildren = Array.from(newParent.children);
                const ref = insertIndex < currentChildren.length ? currentChildren[insertIndex] : null;
                if (ref) {
                  newParent.insertBefore(movedEl, ref);
                } else {
                  newParent.appendChild(movedEl);
                }
              } catch {
              }
            }
          }
        }
      }
    });
    observer.observe(oldParent, { childList: true });
    observer.observe(newParent, { childList: true });
    reparentDOMRef.current.push({ element: el, oldParent, oldNextSibling, newParent, observer });
    setReparentEntries((prev) => [...prev.filter((r) => r.element !== element), { element, newParent, insertIndex }]);
    applyBulkReparent(el, oldParent, newParent, insertIndex);
    const reparentCountAfter = reparentDOMRef.current.length;
    reparentBatchSizeRef.current.push(reparentCountAfter - reparentCountBefore);
    syncTrackerStateRef.current();
    refreshSelectedElementRef.current();
    pickerRef.current?.refreshSelection();
    setChangeRevision((r) => r + 1);
  }, []);
  useEffect(() => {
    function handleKeyDown(e2) {
      if (matchesHotkey(e2, config2.hotkey)) {
        e2.preventDefault();
        toggleOverlay();
      }
      if (active && (e2.metaKey || e2.ctrlKey) && e2.key === "z" && !e2.shiftKey) {
        e2.preventDefault();
        handleUndo();
      }
      if (active && (e2.metaKey || e2.ctrlKey) && e2.key === "z" && e2.shiftKey) {
        e2.preventDefault();
        handleRedo();
      }
      if (active && selectedElementRef.current && (e2.key === "ArrowUp" || e2.key === "ArrowDown" || e2.key === "ArrowLeft" || e2.key === "ArrowRight")) {
        const path = e2.composedPath();
        const target = path[0];
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
        const el = selectedElementRef.current.element;
        const context = findReorderProxy(el);
        if (!context) return;
        const { parent } = context;
        const parentDisplay = getComputedStyle(parent).display;
        const isFlex = parentDisplay === "flex" || parentDisplay === "inline-flex";
        const isGrid = parentDisplay === "grid" || parentDisplay === "inline-grid";
        const isHorizontalKey = e2.key === "ArrowLeft" || e2.key === "ArrowRight";
        const isVerticalKey = e2.key === "ArrowUp" || e2.key === "ArrowDown";
        const parentDirection = getComputedStyle(parent).flexDirection;
        const isHorizontalLayout = isFlex && (parentDirection === "row" || parentDirection === "row-reverse");
        if (!isFlex && !isGrid && isHorizontalKey) return;
        if (isHorizontalKey && !isHorizontalLayout) return;
        if (isVerticalKey && isHorizontalLayout) return;
        e2.preventDefault();
        e2.stopPropagation();
        const goBack = e2.key === "ArrowUp" || e2.key === "ArrowLeft";
        handleReorderByKey(goBack ? "up" : "down");
      }
      if (active && selectedElementRef.current && (e2.key === "Enter" || e2.key === "Tab")) {
        const path = e2.composedPath();
        const target = path[0];
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
        const el = selectedElementRef.current.element;
        const picker = pickerRef.current;
        if (!picker) return;
        if (e2.key === "Enter" && e2.shiftKey) {
          const parent = el.parentElement;
          if (parent && parent !== document.body) {
            e2.preventDefault();
            e2.stopPropagation();
            picker.selectElement(parent);
          }
        } else if (e2.key === "Enter" && !e2.shiftKey) {
          const children = Array.from(el.children).filter(
            (c3) => !c3.hasAttribute("data-retune-host") && c3.tagName !== "SCRIPT" && c3.tagName !== "STYLE" && c3.tagName !== "LINK"
          );
          if (children.length > 0) {
            e2.preventDefault();
            e2.stopPropagation();
            picker.selectElement(children[0]);
          }
        } else if (e2.key === "Tab") {
          const parent = el.parentElement;
          if (!parent) return;
          const siblings = Array.from(parent.children).filter(
            (c3) => !c3.hasAttribute("data-retune-host") && c3.tagName !== "SCRIPT" && c3.tagName !== "STYLE" && c3.tagName !== "LINK"
          );
          if (siblings.length < 2) return;
          const idx = siblings.indexOf(el);
          if (idx === -1) return;
          const next = e2.shiftKey ? siblings[(idx - 1 + siblings.length) % siblings.length] : siblings[(idx + 1) % siblings.length];
          e2.preventDefault();
          e2.stopPropagation();
          picker.selectElement(next);
        }
        return;
      }
      if (active && selectedElementRef.current && (e2.key === "Delete" || e2.key === "Backspace")) {
        const path = e2.composedPath();
        const target = path[0];
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
        e2.preventDefault();
        e2.stopPropagation();
        handleDelete();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [active, config2.hotkey, toggleOverlay, handleUndo, handleRedo, handleDelete, handleReorderByKey]);
  const handleReset = useCallback(() => {
    const tracker = trackerRef.current;
    const preview = previewRef.current;
    if (!tracker || !preview) return;
    while (deleteStackRef.current.length > 0) {
      const entry = deleteStackRef.current.pop();
      try {
        if (entry.nextSibling) {
          entry.parent.insertBefore(entry.element, entry.nextSibling);
        } else {
          entry.parent.appendChild(entry.element);
        }
      } catch {
      }
    }
    deleteRedoStackRef.current = [];
    while (textStackRef.current.length > 0) {
      const entry = textStackRef.current.pop();
      try {
        entry.element.innerHTML = entry.originalHTML;
      } catch {
      }
    }
    textRedoStackRef.current = [];
    reorderStackRef.current = [];
    reorderRedoStackRef.current = [];
    for (const [, originals] of reorderOriginalOrderRef.current) {
      for (const [child, originalOrder] of originals) {
        const el2 = child;
        if (originalOrder) {
          el2.style.order = originalOrder;
        } else {
          el2.style.removeProperty("order");
        }
      }
    }
    reorderOriginalOrderRef.current.clear();
    for (const [, rects] of reorderOriginalRectsRef.current) {
      for (const [child] of rects) {
        const el2 = child;
        el2.style.removeProperty("translate");
        el2.style.removeProperty("transition");
        if (el2.getAttribute("style")?.trim() === "") el2.removeAttribute("style");
      }
    }
    reorderOriginalRectsRef.current.clear();
    reorderVisualOrderRef.current.clear();
    reorderModeRef.current = /* @__PURE__ */ new WeakMap();
    reorderObserverRef.current?.disconnect();
    reorderOriginRef.current = /* @__PURE__ */ new WeakMap();
    for (const entry of reparentDOMRef.current) {
      entry.observer.disconnect();
      try {
        if (entry.oldNextSibling && entry.oldNextSibling.parentElement === entry.oldParent) {
          entry.oldParent.insertBefore(entry.element, entry.oldNextSibling);
        } else {
          entry.oldParent.appendChild(entry.element);
        }
      } catch {
      }
    }
    reparentDOMRef.current = [];
    setReparentEntries([]);
    if (forcedStateRef.current) clearForcedInlineStyles();
    preview.clearAll();
    tracker.clear();
    const levels = scopeLevelsRef.current;
    const defaultIdx = levels.length >= 2 ? levels.length - 2 : 0;
    setActiveLevelIndex(defaultIdx);
    activeLevelIndexRef.current = defaultIdx;
    syncTrackerState();
    setChangeRevision((r) => r + 1);
    const el = selectedElementRef.current;
    if (el) {
      tracker.track(
        el.selector,
        el.tagName,
        el.textContent,
        el.classes,
        el.reactComponents,
        el.computedStyles,
        el.sourceFile,
        el.stylingApproach,
        el.inlineStyles,
        el.elementId,
        el.accessibleName,
        el.parentContext,
        el.childSummary,
        el.domPath,
        el.nearbySiblings,
        el.position
      );
    }
    requestAnimationFrame(() => {
      refreshSelectedElement();
      pickerRef.current?.refreshSelection();
    });
  }, [syncTrackerState, refreshSelectedElement, clearForcedInlineStyles]);
  const migrateSelector = useCallback((fromSelector, toSelector) => {
    const preview = previewRef.current;
    const tracker = trackerRef.current;
    if (!preview || !tracker || fromSelector === toSelector) return;
    preview.migrateChanges(fromSelector, toSelector);
    tracker.migrateChanges(fromSelector, toSelector);
    const pseudoStates = [":hover", ":focus", ":active"];
    for (const ps of pseudoStates) {
      preview.migrateChanges(fromSelector + ps, toSelector + ps);
      tracker.migrateChanges(fromSelector + ps, toSelector + ps);
    }
    if (forcedStylesRef.current.selector === fromSelector) {
      forcedStylesRef.current.selector = toSelector;
    }
    syncTrackerState();
    setChangeRevision((r) => r + 1);
  }, [syncTrackerState]);
  const handleScopeLevelChange = useCallback((index2) => {
    const tracker = trackerRef.current;
    const el = selectedElementRef.current;
    const levels = scopeLevelsRef.current;
    if (!tracker || !el || index2 < 0 || index2 >= levels.length) return;
    const oldIndex = activeLevelIndexRef.current;
    if (index2 === oldIndex && index2 > 0) {
      index2 = index2 - 1;
    } else if (index2 === oldIndex) {
      return;
    }
    const oldSelector = levels[oldIndex]?.selector ?? el.selector;
    const newSelector = levels[index2]?.selector ?? el.selector;
    tracker.track(
      newSelector,
      el.tagName,
      el.textContent,
      el.classes,
      el.reactComponents,
      el.computedStyles,
      el.sourceFile,
      el.stylingApproach,
      el.inlineStyles,
      el.elementId,
      el.accessibleName,
      el.parentContext,
      el.childSummary,
      el.domPath,
      el.nearbySiblings,
      el.position
    );
    migrateSelector(oldSelector, newSelector);
    activeLevelIndexRef.current = index2;
    setActiveLevelIndex(index2);
    activeSelectorRef.current = newSelector;
    const isParentScoped = newSelector && newSelector.includes(" ");
    if (newSelector && el.element && !isParentScoped) {
      const scoped = getScopedStyles(el.element, newSelector);
      setOwnedProperties(scoped.ownedProperties);
    } else {
      setOwnedProperties(void 0);
    }
    skipOwnedUpdateRef.current = true;
    if (forcedStateRef.current) syncForcedInlineStyles();
    refreshSelectedElement();
    const newLevel = levels[index2];
    if (newLevel?.selector && pickerRef.current) {
      pickerRef.current.showScopeHighlights(
        newLevel.selector,
        el.element ?? null
      );
    } else {
      pickerRef.current?.hideScopeHighlights();
    }
  }, [migrateSelector, syncForcedInlineStyles, refreshSelectedElement]);
  const handleScopeLevelHover = useCallback((index2) => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (index2 === null) {
      const levels2 = scopeLevelsRef.current;
      const activeLevel = levels2[activeLevelIndexRef.current];
      if (activeLevel?.selector) {
        picker.showScopeHighlights(
          activeLevel.selector,
          selectedElementRef.current?.element ?? null
        );
      } else {
        picker.hideScopeHighlights();
      }
      return;
    }
    const levels = scopeLevelsRef.current;
    const level = levels[index2];
    if (!level || level.selector === null) {
      picker.hideScopeHighlights();
      return;
    }
    picker.showScopeHighlights(
      level.selector,
      selectedElementRef.current?.element ?? null
    );
  }, []);
  const handleCopy = useCallback(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    navigator.clipboard.writeText(formatChanges(tracker.getPendingChanges(), fidelity));
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 3e3);
  }, [fidelity]);
  const handleClose = useCallback(() => {
    deactivateOverlay();
  }, [deactivateOverlay]);
  useEffect(() => {
    const api = {
      getChanges: () => trackerRef.current?.getPendingChanges() ?? [],
      getFormattedChanges: (f) => formatChanges(trackerRef.current?.getPendingChanges() ?? [], f ?? fidelityRef.current),
      clearChanges: () => {
        const tracker = trackerRef.current;
        const preview = previewRef.current;
        if (!tracker || !preview) return;
        if (forcedStateRef.current) {
          const f = forcedStylesRef.current;
          const domEl = selectedElementRef.current?.element;
          if (domEl?.style && f.props.length > 0) {
            for (const p4 of f.props) {
              const k = p4.replace(/[A-Z]/g, (c3) => `-${c3.toLowerCase()}`);
              domEl.style.removeProperty(k);
            }
            if (domEl.getAttribute("style")?.trim() === "") {
              domEl.removeAttribute("style");
            }
          }
          forcedStylesRef.current = { selector: "", props: [] };
          setForcedState(null);
          forcedStateRef.current = null;
        }
        preview.clearAll();
        tracker.clear();
        syncTrackerStateRef.current();
        setChangeRevision((r) => r + 1);
        const el = selectedElementRef.current;
        if (el) {
          tracker.track(
            el.selector,
            el.tagName,
            el.textContent,
            el.classes,
            el.reactComponents,
            el.computedStyles,
            el.sourceFile,
            el.stylingApproach,
            el.inlineStyles,
            el.elementId,
            el.accessibleName,
            el.parentContext,
            el.childSummary,
            el.domPath,
            el.nearbySiblings,
            el.position
          );
        }
        refreshSelectedElementRef.current();
      }
    };
    window.__retune = api;
    return () => {
      delete window.__retune;
    };
  }, []);
  if (!portalTarget) return null;
  if (sessionHidden) return null;
  return createPortal(
    /* @__PURE__ */ jsx(PreviewBridgeContext.Provider, { value: previewBridgeRef.current, children: /* @__PURE__ */ jsxs(TooltipPortalContext.Provider, { value: portalTarget, children: [
      /* @__PURE__ */ jsxs(
        "div",
        {
          ref: toolbarRef,
          className: `retune-toolbar bottom ${side} ${active ? "expanded" : "collapsed"}`,
          onPointerDown: handleToolbarPointerDown,
          onPointerMove: handleToolbarPointerMove,
          onPointerUp: handleToolbarPointerUp,
          children: [
            /* @__PURE__ */ jsx(Tooltip, { content: "Toggle edit mode", shortcut: config2.hotkey, side: "top", children: /* @__PURE__ */ jsxs(
              "button",
              {
                className: "retune-toolbar-collapse-btn",
                onClick: activateOverlay,
                children: [
                  /* @__PURE__ */ jsx(i, { size: 20 }),
                  !active && changeCount > 0 && /* @__PURE__ */ jsx("span", { className: "retune-changes-dot" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: "retune-toolbar-expanded", children: [
              changeCount > 0 && /* @__PURE__ */ jsx("div", { className: "retune-edit-count", children: changeCount }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Copy changes", shortcut: "\u2318C", side: "top", children: /* @__PURE__ */ jsx(
                "button",
                {
                  className: `retune-toolbar-btn${changeCount === 0 ? " disabled" : ""}`,
                  onClick: handleCopy,
                  disabled: changeCount === 0,
                  children: /* @__PURE__ */ jsxs("span", { className: "retune-icon-swap", children: [
                    /* @__PURE__ */ jsx("span", { className: `retune-icon-swap-icon ${copied ? "out" : "in"}`, children: /* @__PURE__ */ jsx(C, { size: 20 }) }),
                    /* @__PURE__ */ jsx("span", { className: `retune-icon-swap-icon ${copied ? "in" : "out"}`, children: /* @__PURE__ */ jsx(l, { size: 20 }) })
                  ] })
                }
              ) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Reset all", side: "top", children: /* @__PURE__ */ jsx(
                "button",
                {
                  className: `retune-toolbar-btn${changeCount === 0 ? " disabled" : ""}`,
                  onClick: handleReset,
                  disabled: changeCount === 0,
                  children: /* @__PURE__ */ jsx(C2, { size: 20 })
                }
              ) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Settings", side: "top", children: /* @__PURE__ */ jsx(
                "button",
                {
                  className: "retune-toolbar-btn",
                  onClick: () => {
                    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current);
                    if (!settingsOpen) {
                      setSettingsOpen(true);
                      setSettingsVisible(true);
                      setSettingsExiting(false);
                    } else {
                      setSettingsOpen(false);
                      setSettingsExiting(true);
                      settingsTimerRef.current = setTimeout(() => {
                        setSettingsVisible(false);
                        setSettingsExiting(false);
                      }, 250);
                    }
                  },
                  children: /* @__PURE__ */ jsx(i2, { size: 20 })
                }
              ) }),
              /* @__PURE__ */ jsx(Tooltip, { content: "Close", shortcut: "Esc", side: "top", children: /* @__PURE__ */ jsx(
                "button",
                {
                  className: "retune-toolbar-btn",
                  onClick: handleClose,
                  children: /* @__PURE__ */ jsx(c, { size: 20 })
                }
              ) })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsx(AnimatedPanel, { visible: !!(active && selectedElement && !settingsOpen && !toolbarDragging), children: /* @__PURE__ */ jsxs("div", { className: `retune-panel ${side}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "retune-tab-bar", ref: tabBarRef, children: [
          /* @__PURE__ */ jsx("div", { className: "retune-tab-pill", ref: tabPillRef }),
          /* @__PURE__ */ jsx("button", { className: `retune-tab${panelTab === "elements" ? " active" : ""}`, onClick: () => setPanelTab("elements"), children: "Elements" }),
          /* @__PURE__ */ jsx("button", { className: `retune-tab${panelTab === "design" ? " active" : ""}`, onClick: () => setPanelTab("design"), children: "Design" }),
          /* @__PURE__ */ jsxs(
            "span",
            {
              onClick: () => {
                if (updateInfo && updateDismissed) {
                  setUpdateDismissed(false);
                  setUpdateCopied(false);
                }
              },
              style: { marginLeft: "auto", fontSize: "11px", lineHeight: "16px", color: "var(--retune-text-tertiary)", letterSpacing: "-0.005em", paddingRight: "8px", display: "flex", alignItems: "center", gap: "4px", cursor: updateInfo ? "pointer" : "default" },
              children: [
                updateInfo && /* @__PURE__ */ jsx("span", { style: { width: 4, height: 4, borderRadius: "50%", background: "var(--retune-blue)", flexShrink: 0 } }),
                "v",
                updateInfo?.current || "0.6.2"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "retune-panel-body", children: [
          updateInfo && /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateRows: updateDismissing || updateDismissed ? "0fr" : "1fr",
                opacity: updateDismissing || updateDismissed ? 0 : 1,
                transition: "grid-template-rows 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
              },
              onTransitionEnd: (e2) => {
                if (e2.propertyName === "opacity" && updateDismissing) {
                  setUpdateDismissed(true);
                  setUpdateDismissing(false);
                }
              },
              children: /* @__PURE__ */ jsx("div", { style: { overflow: "hidden", minHeight: 0 }, children: /* @__PURE__ */ jsxs(
                "div",
                {
                  style: {
                    padding: "12px 16px",
                    background: "var(--retune-blue)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    transform: updateDismissing || updateDismissed ? "translateY(-4px)" : "translateY(0)",
                    transition: "transform 150ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                  },
                  children: [
                    /* @__PURE__ */ jsxs("div", { style: { fontFamily: "inherit", fontSize: "12px", fontWeight: 600, lineHeight: "16px", letterSpacing: "-0.06px", color: "var(--retune-white)" }, children: [
                      "Retune v",
                      updateInfo.latest,
                      " is available"
                    ] }),
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: "8px", alignItems: "center" }, children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          ref: copyBtnRef,
                          onClick: () => {
                            if (updateCopied) return;
                            const btn = copyBtnRef.current;
                            if (!btn) return;
                            const oldWidth = btn.getBoundingClientRect().width;
                            navigator.clipboard.writeText("Update Retune to the latest version by running `npm install retune@latest` and `npx retune setup`. After updating, I'll need to restart Claude Code so the new MCP server and skill take effect.");
                            setUpdateCopied(true);
                            requestAnimationFrame(() => {
                              const newWidth = btn.getBoundingClientRect().width;
                              if (Math.abs(newWidth - oldWidth) > 1) {
                                btn.animate(
                                  [{ width: `${oldWidth}px` }, { width: `${newWidth}px` }],
                                  { duration: 200, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" }
                                );
                              }
                            });
                            setTimeout(() => {
                              const b = copyBtnRef.current;
                              if (!b) return;
                              const oldW = b.getBoundingClientRect().width;
                              setUpdateCopied(false);
                              requestAnimationFrame(() => {
                                const newW = b.getBoundingClientRect().width;
                                if (Math.abs(newW - oldW) > 1) {
                                  b.animate(
                                    [{ width: `${oldW}px` }, { width: `${newW}px` }],
                                    { duration: 200, easing: "cubic-bezier(0.215, 0.61, 0.355, 1)" }
                                  );
                                }
                              });
                            }, 3e3);
                          },
                          style: {
                            background: "var(--retune-white)",
                            border: "none",
                            borderRadius: "6px",
                            padding: 0,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: "11px",
                            fontWeight: 500,
                            lineHeight: "16px",
                            letterSpacing: "-0.055px",
                            color: "var(--retune-text)",
                            whiteSpace: "nowrap",
                            position: "relative",
                            overflow: "hidden",
                            flexShrink: 0,
                            transition: "transform 100ms ease"
                          },
                          onPointerDown: (e2) => {
                            e2.currentTarget.style.transform = "scale(0.97)";
                          },
                          onPointerUp: (e2) => {
                            e2.currentTarget.style.transform = "";
                          },
                          onPointerLeave: (e2) => {
                            e2.currentTarget.style.transform = "";
                          },
                          children: [
                            /* @__PURE__ */ jsxs("span", { style: {
                              display: "flex",
                              gap: "2px",
                              alignItems: "center",
                              padding: "6px 8px 6px 4px",
                              visibility: "hidden"
                            }, children: [
                              /* @__PURE__ */ jsx("span", { style: { width: 16, height: 16, flexShrink: 0 } }),
                              updateCopied ? "Paste in your AI agent to update" : "Copy update instructions"
                            ] }),
                            /* @__PURE__ */ jsxs("span", { style: {
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              gap: "2px",
                              alignItems: "center",
                              padding: "6px 8px 6px 4px",
                              opacity: updateCopied ? 0 : 1,
                              filter: updateCopied ? "blur(2px)" : "blur(0)",
                              transition: "opacity 200ms cubic-bezier(0.215, 0.61, 0.355, 1), filter 200ms cubic-bezier(0.215, 0.61, 0.355, 1)"
                            }, children: [
                              /* @__PURE__ */ jsx("span", { style: {
                                width: 16,
                                height: 16,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transform: updateCopied ? "scale(0.95)" : "scale(1)",
                                transition: "transform 200ms cubic-bezier(0.215, 0.61, 0.355, 1)"
                              }, children: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M8.5 3.5C9.32843 3.5 10 4.17157 10 5V6H11C11.8284 6 12.5 6.67157 12.5 7.5V11C12.5 11.8284 11.8284 12.5 11 12.5H7.5C6.67157 12.5 6 11.8284 6 11V10H5C4.17157 10 3.5 9.32843 3.5 8.5V5C3.5 4.17157 4.17157 3.5 5 3.5H8.5ZM10 8.5C10 9.32843 9.32843 10 8.5 10H7V11C7 11.2761 7.22386 11.5 7.5 11.5H11C11.2761 11.5 11.5 11.2761 11.5 11V7.5C11.5 7.22386 11.2761 7 11 7H10V8.5ZM5 4.5C4.72386 4.5 4.5 4.72386 4.5 5V8.5C4.5 8.77614 4.72386 9 5 9H8.5C8.77614 9 9 8.77614 9 8.5V5C9 4.72386 8.77614 4.5 8.5 4.5H5Z", fill: "currentColor", fillOpacity: "0.9" }) }) }),
                              "Copy update instructions"
                            ] }),
                            /* @__PURE__ */ jsxs("span", { style: {
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              gap: "2px",
                              alignItems: "center",
                              padding: "6px 8px 6px 4px",
                              opacity: updateCopied ? 1 : 0,
                              filter: updateCopied ? "blur(0)" : "blur(2px)",
                              transition: "opacity 200ms cubic-bezier(0.215, 0.61, 0.355, 1), filter 200ms cubic-bezier(0.215, 0.61, 0.355, 1)"
                            }, children: [
                              /* @__PURE__ */ jsx("span", { style: {
                                width: 16,
                                height: 16,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transform: updateCopied ? "scale(1)" : "scale(0.95)",
                                transition: "transform 200ms cubic-bezier(0.215, 0.61, 0.355, 1)"
                              }, children: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: /* @__PURE__ */ jsx("path", { d: "M11.0839 4.22268C11.2371 3.99294 11.5475 3.93087 11.7773 4.08401C12.007 4.23718 12.0691 4.5476 11.916 4.77737L7.91596 10.7774C7.83287 10.902 7.69784 10.9833 7.54877 10.9981C7.39988 11.0127 7.25223 10.9593 7.14643 10.8535L4.14643 7.85354C3.9512 7.65827 3.95118 7.34176 4.14643 7.14651C4.34168 6.95126 4.6582 6.95128 4.85346 7.14651L7.42182 9.71487L11.0839 4.22268Z", fill: "currentColor", fillOpacity: "0.9" }) }) }),
                              "Paste in your AI agent to update"
                            ] })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => setUpdateDismissing(true),
                          style: {
                            background: "none",
                            border: "none",
                            borderRadius: "6px",
                            padding: "6px 8px",
                            cursor: updateCopied ? "default" : "pointer",
                            fontFamily: "inherit",
                            fontSize: "11px",
                            fontWeight: 500,
                            lineHeight: "16px",
                            letterSpacing: "-0.055px",
                            color: "var(--retune-white)",
                            whiteSpace: "nowrap",
                            opacity: updateCopied ? 0 : 0.9,
                            filter: updateCopied ? "blur(2px)" : "blur(0)",
                            pointerEvents: updateCopied ? "none" : "auto",
                            transition: "opacity 200ms cubic-bezier(0.215, 0.61, 0.355, 1), filter 200ms cubic-bezier(0.215, 0.61, 0.355, 1)"
                          },
                          onMouseEnter: (e2) => {
                            if (!updateCopied) e2.currentTarget.style.opacity = "1";
                          },
                          onMouseLeave: (e2) => {
                            if (!updateCopied) e2.currentTarget.style.opacity = "0.9";
                          },
                          children: "Maybe later"
                        }
                      )
                    ] })
                  ]
                }
              ) })
            }
          ),
          panelTab === "elements" && /* @__PURE__ */ jsx(
            ElementTree,
            {
              selectedElement: selectedElement?.element ?? null,
              onSelect: handleTreeSelect,
              onHover: handleTreeHover,
              visualOrderMap,
              reparentEntries,
              onTreeReorder: handleTreeReorder,
              onTreeReparent: handleTreeReparent
            }
          ),
          panelTab === "design" && selectedElement && /* @__PURE__ */ jsx(
            PropertyPanel,
            {
              element: selectedElement,
              position: side,
              onPropertyChange: handlePropertyChange,
              onPropertyHover: setHoveredBoxModel,
              onApplyToElement: handleApplyToElement,
              onVariableSwap: handleVariableSwap,
              onVariableAssociate: handleVariableAssociate,
              onVariableUnlink: handleVariableUnlink,
              variableAssociations: selectedVariableAssociations,
              unlinkedVariables: selectedUnlinkedVariables,
              changedProperties: selectedChangedProperties,
              onPropertyReset: handlePropertyReset,
              selectorCandidates,
              activeSelector,
              scopeLevels,
              activeLevelIndex,
              onScopeLevelChange: handleScopeLevelChange,
              onScopeLevelHover: handleScopeLevelHover,
              ownedProperties,
              styleSources,
              forcedState,
              onForcedStateChange: handleForcedStateChange,
              onPinLinesChange: (authored) => pickerRef.current?.updatePinLines(authored)
            },
            selectedElement.selector
          )
        ] })
      ] }) }),
      active && settingsVisible && !toolbarDragging && /* @__PURE__ */ jsx(
        SettingsPanel,
        {
          side,
          theme,
          onThemeChange: handleThemeChange,
          fidelity,
          onFidelityChange: setFidelity,
          onHide: () => {
            setSettingsOpen(false);
            setSettingsVisible(false);
            setSettingsExiting(false);
            deactivateOverlay();
            setSessionHidden(true);
          },
          exiting: settingsExiting
        }
      ),
      active && selectedElement && hoveredBoxModel && /* @__PURE__ */ jsx(
        BoxModelOverlay,
        {
          element: selectedElement.element,
          hoveredProperty: hoveredBoxModel,
          revision: changeRevision
        }
      )
    ] }) }),
    portalTarget
  );
}
export {
  Retune as Composer,
  Retune as DevOverlay,
  Retune,
  overlay_css_default as overlayStyles
};
