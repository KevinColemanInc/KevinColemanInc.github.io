(() => {
  const player = document.querySelector('.blog-audio');
  const body = document.querySelector('.post-content');
  if (!player || !body) return;

  const button = player.querySelector('[data-play]');
  const playLabel = button.querySelector('[data-play-label]');
  const voiceLabel = player.querySelector('[data-voice]');
  const rate = player.querySelector('[data-rate]');
  const status = player.querySelector('[data-status]');
  const audio = new Audio();
  const speech = window.speechSynthesis;
  const canSpeak = Boolean(speech && window.SpeechSynthesisUtterance);
  const blockSelector = 'p, div, li, blockquote, td, th, br, section, h1, h2, h3, h4, h5, h6';
  const skipped = 'pre, script, style, iframe, svg, audio, video, template';
  const interactive = 'a, button, input, select, textarea, label, summary, [contenteditable], [role="button"]';
  const blockTargets = new Map();
  const starts = new Map();
  let blocks;
  let segments;
  let index = 0;
  let playing = false;
  let utterance;
  let playbackId = 0;
  let mode;
  let activeBlock;
  let activeWord;
  let wordFrame;

  function setPlayLabel(label) {
    playLabel.textContent = label;
    button.toggleAttribute('data-playing', label === 'Pause');
  }

  function browserVoice(voice = speech?.getVoices()[0]) {
    return voice?.name ? `Browser voice · ${voice.name}` : 'Browser voice';
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

  function trackWords(id, segment) {
    if (!segment.words?.length || segment.firstWord === undefined || !window.Highlight || !CSS.highlights) return;
    const block = blocks[segment.block];
    const ranges = segment.words.map(([word, start, end]) => {
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
      if (!current(id) || mode !== 'audio') return;
      const time = audio.currentTime;
      highlightWord(ranges.find(([, start, end]) => start <= time && time < end)?.[0]);
      wordFrame = requestAnimationFrame(update);
    }
    update();
  }

  function stopWithError(message) {
    playing = false;
    mode = undefined;
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
      mode = undefined;
      highlight();
      setPlayLabel('Listen to article');
      return;
    }
    playSegment();
  }

  function speak(id, text) {
    if (!current(id) || mode === 'speech') return;
    stopWordTracking();
    audio.pause();
    audio.onerror = null;
    audio.onended = null;
    if (!canSpeak) {
      stopWithError('Audio is unavailable.');
      return;
    }

    mode = 'speech';
    const voice = speech.getVoices()[0];
    voiceLabel.textContent = browserVoice(voice);
    utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || document.documentElement.lang || 'en';
    utterance.rate = Number(rate.value);
    utterance.onstart = () => {
      if (current(id)) highlight(blocks[segments[index].block]);
    };
    utterance.onend = () => finishSegment(id);
    utterance.onerror = () => {
      if (current(id)) stopWithError('Speech is unavailable.');
    };
    speech.speak(utterance);
    if (speech.paused) speech.resume();
  }

  function playAudio(id, segment) {
    mode = 'audio';
    audio.playbackRate = Number(rate.value);
    audio.onended = () => finishSegment(id);
    audio.onerror = () => speak(id, segment.text);
    audio.play().then(() => {
      if (current(id) && mode === 'audio') {
        highlight(blocks[segment.block]);
        trackWords(id, segment);
      }
    }).catch(() => speak(id, segment.text));
  }

  function playSegment() {
    const id = ++playbackId;
    stopWordTracking();
    const segment = segments[index];
    setPlayLabel('Pause');
    status.textContent = '';
    mode = undefined;
    if (activeBlock !== blocks[segment.block]) highlight();

    if (!segment.audio) {
      speak(id, segment.text);
      return;
    }
    voiceLabel.textContent = segment.model;
    audio.src = segment.audio;
    playAudio(id, segment);
  }

  function playFrom(position) {
    ++playbackId;
    audio.pause();
    if (mode === 'speech') speech.cancel();
    index = position;
    playing = true;
    playSegment();
  }

  button.addEventListener('click', () => {
    if (playing) {
      if (mode === 'speech') {
        speech.pause();
      } else {
        ++playbackId;
        audio.pause();
      }
      playing = false;
      stopWordTracking();
      setPlayLabel('Resume');
      return;
    }

    playing = true;
    if (mode === 'speech') {
      setPlayLabel('Pause');
      speech.resume();
    } else if (mode === 'audio' && !audio.error && audio.currentTime > 0) {
      setPlayLabel('Pause');
      playAudio(++playbackId, segments[index]);
    } else {
      playSegment();
    }
  });

  rate.addEventListener('change', () => {
    audio.playbackRate = Number(rate.value);
    if (mode !== 'speech') return;
    if (playing) playFrom(index);
    else {
      ++playbackId;
      speech.cancel();
      mode = undefined;
    }
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

  function browserSegments() {
    if (!canSpeak) return [];
    const segmenter = typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter(document.documentElement.lang || 'en', { granularity: 'sentence' })
      : null;
    return blocks.flatMap(({ text }, block) => {
      const sentences = segmenter
        ? Array.from(segmenter.segment(text), entry => entry.segment)
        : text.split(/(?<=[.!?])\s+/);
      return sentences.flatMap(sentence => (sentence.trim().match(/.{1,350}(?:\s|$)|.{1,350}/gu) || [])
        .map(part => ({ text: part.trim(), block })).filter(segment => segment.text));
    });
  }

  function registerBlockTargets() {
    segments.forEach(({ block }, position) => {
      if (starts.has(block) || !blocks[block]) return;
      starts.set(block, position);
      const { element } = blocks[block];
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
    playFrom(starts.get(block));
  }

  function initialize(manifest) {
    blocks = articleBlocks();
    let previousStart;
    let legacyBlock = -1;
    segments = manifest?.segments.map((segment, position) => {
      const start = segment.blockStart ?? position;
      if (start !== previousStart) legacyBlock += 1;
      previousStart = start;
      return {
        ...segment,
        block: segment.block ?? legacyBlock,
        audio: segment.audio && new URL(segment.audio, page).href,
        model: segment.model || manifest.model || 'Model unknown',
      };
    }) || browserSegments();
    if (!segments.length || (!canSpeak && !segments.some(segment => segment.audio))) return;

    const words = segments.reduce((count, segment) => count + segment.text.split(/\s+/).length, 0);
    const minutes = Math.max(1, Math.ceil(words / 225));
    player.querySelector('[data-reading-time]').textContent = `About ${minutes} min read`;
    voiceLabel.textContent = segments[0].audio ? segments[0].model : browserVoice();
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
    .catch(() => undefined)
    .then(initialize);
})();
