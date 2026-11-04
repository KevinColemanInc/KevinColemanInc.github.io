(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ids = ['email', 'name', 'iban', 'bic', 'country', 'postcode', 'address'];
  const fields = Object.fromEntries(ids.map(id => [id, $(id)]));
  const status = $('status');
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const base64url = bytes => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function fromBase64url(value) {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  function data() {
    return ids.map(id => {
      const value = fields[id].value.trim();
      return id === 'iban' ? value.replace(/\s+/g, '').toUpperCase() : id === 'bic' ? value.toUpperCase() : value;
    });
  }
  // ISO 13616 check digits catch common IBAN transcription errors.
  function validIbanChecksum(iban) {
    const rearranged = iban.slice(4) + iban.slice(0, 4);
    let remainder = 0;
    for (const character of rearranged) {
      const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
      for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
    }
    return remainder === 1;
  }
  function fieldError(id, value) {
    // Check the original input before uppercasing or removing spaces.
    // Latin letters may include accents; digits and common punctuation remain usable.
    if (!/^[\p{Script=Latin}\u0300-\u036f0-9\x20-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e’–—]*$/u.test(fields[id].value.normalize('NFC'))) {
      return 'Use Latin letters, digits and common punctuation only.';
    }
    switch (id) {
      case 'email':
        return fields.email.validity.valid && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter an email address such as you@example.com.';
      case 'name':
        return value.length >= 2 && /\p{L}/u.test(value) ? '' : 'Enter the account holder’s full name as shown by the bank.';
      case 'iban':
        if (/^\d{1,34}$/.test(value)) return '';
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return 'Enter a numeric account number or an IBAN with 15–34 letters and numbers.';
        return validIbanChecksum(value) ? '' : 'The IBAN check digits do not match. Check the number with your bank.';
      case 'bic':
        return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value) ? '' : 'Use 8 or 11 characters: six letters followed by two or five letters or numbers.';
      case 'country':
        return value.length >= 2 && /\p{L}/u.test(value) ? '' : 'Enter the country name.';
      case 'address':
        return value.length >= 2 && /[\p{Script=Latin}0-9]/u.test(value) ? '' : 'Enter the account holder’s address.';
      case 'postcode':
        return /^[\p{Script=Latin}0-9][\p{Script=Latin}\u0300-\u036f0-9 -]{0,19}$/u.test(value) ? '' : 'Use letters, numbers, spaces or hyphens for the post code.';
    }
  }
  function showError(id, error) {
    fields[id].setAttribute('aria-invalid', String(Boolean(error)));
    $(id + '-error').textContent = error;
  }
  function validate() {
    const values = data();
    const errors = ids.map((id, i) => fieldError(id, values[i]));
    ids.forEach((id, i) => showError(id, errors[i]));
    const first = errors.findIndex(Boolean);
    if (first !== -1) { fields[ids[first]].focus(); status.textContent = 'Please check the highlighted fields.'; return null; }
    return values;
  }
  async function makeLink(values) {
    if (!window.crypto?.subtle) throw new Error('Link encryption requires HTTPS or localhost in a modern browser.');
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(values))));
    const url = new URL(location.href);
    url.search = '';
    url.hash = ['v1', base64url(rawKey), base64url(iv), base64url(ciphertext)].join('.');
    return url.toString();
  }
  function showLink(link, showQr) {
    $('result').hidden = false;
    $('result-title').textContent = showQr ? 'Scan to open the details' : 'Your link';
    $('link').textContent = link;
    const canvas = $('qr');
    canvas.hidden = !showQr;
    if (!showQr) return;
    const qr = new QRCode(0, 1); // Low error correction allows a longer link.
    qr.addData(link);
    qr.make();
    const size = qr.getModuleCount(), quiet = 4, scale = 6;
    canvas.width = canvas.height = (size + quiet * 2) * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) if (qr.isDark(row, col)) ctx.fillRect((col + quiet) * scale, (row + quiet) * scale, scale, scale);
  }
  async function exportLink(action) {
    const values = validate();
    if (!values) return;
    status.textContent = 'Preparing link…';
    try {
      const link = await makeLink(values);
      showLink(link, action === 'qr');
      if (action === 'copy') {
        try { await navigator.clipboard.writeText(link); status.textContent = 'Link copied.'; }
        catch (_) { status.textContent = 'Could not copy automatically. Select and copy the link below.'; }
      } else status.textContent = 'QR code ready to scan.';
    } catch (error) {
      $('qr').hidden = true;
      status.textContent = error.message || 'Could not create the link. Please try again.';
    }
  }
  $('copy').addEventListener('click', () => exportLink('copy'));
  $('show-qr').addEventListener('click', () => exportLink('qr'));
  $('email-export').addEventListener('click', event => {
    const values = validate();
    if (!values) { event.preventDefault(); return; }
    const labels = ['Email', 'Full name of account holder', 'Account number / IBAN', 'SWIFT / BIC code', 'Country', 'Post code / ZIP', 'Address'];
    const body = values.map((value, index) => `${labels[index]}: ${value}`).join('\r\n');
    event.currentTarget.href = 'mailto:kevin@sparkstart.io?subject=' + encodeURIComponent('Wise transfer details') + '&body=' + encodeURIComponent(body);
    status.textContent = 'Opening your email app.';
  });
  $('form').addEventListener('submit', event => event.preventDefault());
  $('form').addEventListener('focusout', event => {
    const id = event.target.id;
    if (fields[id] && fields[id].value.trim()) showError(id, fieldError(id, data()[ids.indexOf(id)]));
  });
  $('form').addEventListener('input', event => {
    if (fields[event.target.id]) { event.target.removeAttribute('aria-invalid'); $(event.target.id + '-error').textContent = ''; }
    $('result').hidden = true; status.textContent = '';
  });
  async function restore() {
    if (!location.hash) return;
    try {
      const parts = location.hash.slice(1).split('.');
      if (parts.length !== 4 || parts[0] !== 'v1' || !crypto.subtle) throw new Error('Invalid link');
      const [rawKey, iv, ciphertext] = parts.slice(1).map(fromBase64url);
      if (rawKey.length !== 32 || iv.length !== 12 || ciphertext.length > 4096) throw new Error('Invalid link');
      const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
      const values = JSON.parse(decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)));
      if (!Array.isArray(values) || ![ids.length, ids.length - 1].includes(values.length) || values.some(value => typeof value !== 'string')) throw new Error('Invalid data');
      ids.forEach((id, index) => { fields[id].value = values[index] ?? ''; });
      status.textContent = 'Shared details opened. Check them before making a transfer.';
    } catch (_) { status.textContent = 'Could not open this link. It may be incomplete or damaged.'; }
  }
  restore();
})();
