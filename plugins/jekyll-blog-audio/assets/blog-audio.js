(() => {
  const player = document.querySelector('.blog-audio');
  const body = document.querySelector('.post-content');
  if (!player || !body) return;

  const button = player.querySelector('[data-play]');
  const playLabel = button.querySelector('[data-play-label]');
  const back = player.querySelector('[data-back]');
  const next = player.querySelector('[data-next]');
  const rate = player.querySelector('[data-rate]');
  const status = player.querySelector('[data-status]');
  const audio = new Audio();
  const blockSelector = 'p, div, li, blockquote, td, th, br, section, h1, h2, h3, h4, h5, h6';
  const skipped = 'pre, script, style, iframe, svg, audio, video, template';
  const interactive = 'a, button, input, select, textarea, label, summary, [contenteditable], [role="button"]';
  const blockTargets = new Map();
  const starts = new Map();
  let blocks;
  let segments;
  let index = 0;
  let playing = false;
  let playbackId = 0;
  let activeBlock;
  let activeWord;
  let wordFrame;
  let followScrollY;

  function adjacentBlockStart(direction) {
    const { block } = segments[index];
    let position = index + direction;
    while (segments[position]?.block === block) position += direction;
    return starts.get(segments[position]?.block);
  }

  function updateNavigation() {
    back.disabled = adjacentBlockStart(-1) === undefined;
    next.disabled = adjacentBlockStart(1) === undefined;
  }

  function setPlayLabel(label) {
    playLabel.textContent = label;
    button.toggleAttribute('data-playing', label === 'Pause');
    back.hidden = next.hidden = !playing;
    if (playing) updateNavigation();
  }

  function highlight(block) {
    if (activeBlock === block) return;
    activeBlock?.element?.removeAttribute('data-audio-active');
    if (window.Highlight && CSS.highlights) {
      if (block) CSS.highlights.set('blog-audio-current', new Highlight(block.range));
      else CSS.highlights.delete('blog-audio-current');
    } else {
      block?.element?.setAttribute('data-audio-active', '');
    }
    activeBlock = block;
  }

  function highlightWord(range) {
    if (activeWord === range) return;
    if (window.Highlight && CSS.highlights) {
      if (range) {
        const word = new Highlight(range);
        word.priority = 1;
        CSS.highlights.set('blog-audio-word', word);
      } else {
        CSS.highlights.delete('blog-audio-word');
      }
    }
    activeWord = range;
  }

  function stopWordTracking() {
    cancelAnimationFrame(wordFrame);
    highlightWord();
  }

  function followText(range) {
    if (window.scrollY !== followScrollY) return;
    const line = range?.getClientRects()[0];
    if (!line) return;

    const visibleTop = player.getBoundingClientRect().height;
    const visibleBottom = document.documentElement.clientHeight;
    const visibleHeight = visibleBottom - visibleTop;
    if (visibleHeight <= 0) return;

    if (line.top < visibleTop || line.bottom > visibleBottom) {
      window.scrollBy({ top: line.top - visibleTop - visibleHeight * 0.25, behavior: 'instant' });
      followScrollY = window.scrollY;
    }
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY !== followScrollY) followScrollY = undefined;
  }, { passive: true });

  function trackWords(id, segment) {
    if (!segment.words?.length) return;
    const block = blocks[segment.block];
    const ranges = segment.firstWord === undefined ? [] : segment.words.map(([word, start, end]) => {
      const token = block.tokens[segment.firstWord + word];
      if (!token) return [null, start, end];
      const range = document.createRange();
      const first = block.nodes.findLast(node => node.offset <= token.index);
      const lastOffset = token.index + token[0].length;
      const last = block.nodes.findLast(node => node.offset < lastOffset);
      range.setStart(first.node, token.index - first.offset);
      range.setEnd(last.node, lastOffset - last.offset);
      return [range, start, end];
    });
    function update() {
      if (!current(id)) return;
      const time = audio.currentTime;
      const word = ranges.find(([, start, end]) => start <= time && time < end)?.[0];
      if (word && word !== activeWord) followText(word);
      highlightWord(word);
      wordFrame = requestAnimationFrame(update);
    }
    update();
  }

  function stopWithError(message) {
    playing = false;
    audio.pause();
    stopWordTracking();
    highlight();
    setPlayLabel('Retry');
    status.textContent = message;
  }

  function current(id) {
    return playing && id === playbackId;
  }

  function finishSegment(id) {
    if (!current(id)) return;
    stopWordTracking();
    index += 1;
    if (index === segments.length) {
      index = 0;
      playing = false;
      highlight();
      setPlayLabel('Listen to article');
      return;
    }
    playSegment();
  }

  function playAudio(id, segment) {
    audio.playbackRate = Number(rate.value);
    audio.onended = () => finishSegment(id);
    const onError = () => {
      if (current(id)) stopWithError('Could not play this narration clip.');
    };
    audio.onerror = onError;
    audio.play().then(() => {
      if (current(id)) {
        const block = blocks[segment.block];
        highlight(block);
        if (segment.firstWord === undefined) followText(block?.range);
        trackWords(id, segment);
      }
    }, onError);
  }

  function playSegment() {
    const id = ++playbackId;
    stopWordTracking();
    const segment = segments[index];
    setPlayLabel('Pause');
    status.textContent = '';
    if (activeBlock !== blocks[segment.block]) highlight();

    if (!segment.audio) {
      stopWithError('This narration clip is unavailable.');
      return;
    }
    audio.src = segment.audio;
    playAudio(id, segment);
  }

  function playFrom(position) {
    ++playbackId;
    audio.pause();
    index = position;
    playing = true;
    playSegment();
  }

  function jumpBlock(direction) {
    if (!playing) return;
    const position = adjacentBlockStart(direction);
    if (position !== undefined) playFrom(position);
  }

  back.addEventListener('click', () => jumpBlock(-1));
  next.addEventListener('click', () => jumpBlock(1));

  button.addEventListener('click', () => {
    if (playing) {
      ++playbackId;
      audio.pause();
      playing = false;
      stopWordTracking();
      setPlayLabel('Resume');
      return;
    }

    playing = true;
    followScrollY = window.scrollY;
    if (playLabel.textContent === 'Resume' && audio.currentTime > 0) {
      setPlayLabel('Pause');
      playAudio(++playbackId, segments[index]);
    } else {
      playSegment();
    }
  });

  rate.addEventListener('change', () => {
    audio.playbackRate = Number(rate.value);
  });

  // Follow the generator's rendered prose boundaries while retaining DOM offsets.
  function articleBlocks() {
    const result = [];
    let nodes = [];
    function finishBlock() {
      const nonblank = nodes.filter(node => node.data.trim());
      const raw = nodes.map(node => node.data).join('');
      let offset = 0;
      const positions = nodes.map(node => {
        const position = { node, offset };
        offset += node.length;
        return position;
      });
      nodes = [];
      if (!nonblank.length) return;
      const first = nonblank[0];
      const last = nonblank.at(-1);
      const range = document.createRange();
      range.setStart(first, first.data.search(/\S/));
      range.setEnd(last, last.data.trimEnd().length);
      const element = first.parentElement.closest(blockSelector);
      const tokens = Array.from(raw.matchAll(/\S+/g));
      result.push({
        text: tokens.map(token => token[0]).join(' '),
        range,
        element: element === body ? first.parentElement : element,
        tokens,
        nodes: positions,
      });
    }
    function collect(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        nodes.push(node);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches(skipped)) return;
      const boundary = node.matches(blockSelector);
      if (boundary) finishBlock();
      node.childNodes.forEach(collect);
      if (boundary) finishBlock();
    }
    collect(body);
    finishBlock();
    return result;
  }

  function registerBlockTargets() {
    segments.forEach(({ block }, position) => {
      if (starts.has(block)) return;
      starts.set(block, position);
      const element = blocks[block]?.element;
      if (!element || element === body || element.matches(interactive)) return;
      if (!blockTargets.has(element)) blockTargets.set(element, []);
      blockTargets.get(element).push(block);
      element.setAttribute('data-audio-block', '');
      if (!element.hasAttribute('tabindex')) element.tabIndex = 0;
    });
  }

  function locateTimedWords() {
    let currentBlock;
    let offset = 0;
    for (const segment of segments) {
      if (segment.block !== currentBlock) {
        currentBlock = segment.block;
        offset = 0;
      }
      const text = blocks[currentBlock]?.text;
      const start = text?.indexOf(segment.text, offset);
      if (start === undefined || start < 0) continue;
      offset = start + segment.text.length;
      if (segment.words?.length && (start === 0 || text[start - 1] === ' ')) {
        segment.firstWord = start === 0 ? 0 : text.slice(0, start).trimEnd().split(' ').length;
      }
    }
  }

  function seekFromEvent(event) {
    if (event.target.closest(interactive) || event.target.closest(skipped)) return;
    const element = event.target.closest('[data-audio-block]');
    const candidates = blockTargets.get(element);
    if (!candidates) return;
    let block = candidates[0];
    if (event.type === 'click') {
      if (!window.getSelection()?.isCollapsed) return;
      const caret = document.caretPositionFromPoint?.(event.clientX, event.clientY);
      const range = caret ? null : document.caretRangeFromPoint?.(event.clientX, event.clientY);
      const node = caret?.offsetNode || range?.startContainer;
      const offset = caret?.offset ?? range?.startOffset;
      block = (node && candidates.find(candidate => blocks[candidate].range.isPointInRange(node, offset))) ?? block;
    } else {
      if (event.target !== element || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (event.repeat) return;
    }
    if (!playing) followScrollY = window.scrollY;
    playFrom(starts.get(block));
  }

  function initialize(manifest) {
    if (!Array.isArray(manifest?.segments) || !manifest.segments.length) {
      throw new Error('Empty narration manifest');
    }
    blocks = articleBlocks();
    let previousStart;
    let legacyBlock = -1;
    segments = manifest.segments.map((segment, position) => {
      const start = segment.blockStart ?? position;
      if (start !== previousStart) legacyBlock += 1;
      previousStart = start;
      return {
        ...segment,
        block: segment.block ?? legacyBlock,
        audio: segment.audio && new URL(segment.audio, page).href,
      };
    });

    const words = segments.reduce((count, segment) => count + segment.text.split(/\s+/).length, 0);
    const minutes = Math.max(1, Math.ceil(words / 225));
    player.querySelector('[data-reading-time]').textContent = `About ${minutes} min read`;
    locateTimedWords();
    registerBlockTargets();
    body.addEventListener('click', seekFromEvent);
    body.addEventListener('keydown', seekFromEvent);
    player.hidden = false;
  }

  const page = new URL(player.dataset.manifest, document.baseURI);
  fetch(page)
    .then(response => {
      if (!response.ok) throw new Error('Missing audio manifest');
      return response.json();
    })
    .then(initialize)
    .catch(() => {
      button.disabled = true;
      status.textContent = 'Article narration is unavailable.';
      player.hidden = false;
    });
})();
