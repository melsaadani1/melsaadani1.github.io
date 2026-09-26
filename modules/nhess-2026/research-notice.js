(() => {
  'use strict';
  const entry = new URL(document.currentScript.dataset.entry, document.baseURI);
  const dialog = document.getElementById('research-notice');
  const acknowledge = document.getElementById('research-acknowledge');
  const title = document.getElementById('research-notice-title');
  const content = [...document.querySelectorAll('[data-research-content]')];
  let accepted = false;

  function showNotice() {
    // Static HTML starts closed to the module even if JavaScript cannot run.
    // Upgrade the visible notice to a native modal for keyboard focus isolation.
    dialog.removeAttribute('open');
    dialog.showModal();
    title.focus({preventScroll: true});
  }
  dialog.addEventListener('cancel', event => event.preventDefault());
  dialog.addEventListener('close', () => {
    if (!accepted && !dialog.open) showNotice();
  });
  showNotice();
  acknowledge.disabled = false;

  acknowledge.addEventListener('click', async () => {
    acknowledge.disabled = true;
    accepted = true;
    dialog.close();
    document.body.removeAttribute('data-research-locked');
    for (const element of content) { element.hidden = false; element.inert = false; }
    try {
      // No film controls, map code, or map keyboard shortcuts run before assent.
      await import(entry.href);
      const main = document.querySelector('main');
      main.tabIndex = -1;
      main.focus({preventScroll: true});
      const destination = document.getElementById(location.hash.slice(1));
      destination?.scrollIntoView({block: 'start', behavior: 'instant'});
    } catch {
      accepted = false;
      document.body.setAttribute('data-research-locked', '');
      for (const element of content) { element.hidden = true; element.inert = true; }
      document.getElementById('research-notice-error').hidden = false;
      acknowledge.disabled = false;
      showNotice();
    }
  });
})();
