document.querySelectorAll('[data-copy-link]').forEach((button) => {
  const link = button.closest('li').querySelector('a');
  const url = button.dataset.copyUrl || link.href;
  const feedback = button.querySelector('.copy-link-feedback');
  let reset;

  button.hidden = false;
  button.addEventListener('click', async () => {
    clearTimeout(reset);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement('textarea');
        field.value = url;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        try {
          if (!document.execCommand('copy')) throw new Error('Copy failed');
        } finally {
          field.remove();
          button.focus();
        }
      }
      feedback.textContent = 'Copied!';
    } catch {
      feedback.textContent = 'Could not copy. Try again.';
    }
    reset = setTimeout(() => { feedback.textContent = ''; }, 3000);
  });
});
