(() => {
  function getComposeWindows() {
    return Array.from(document.querySelectorAll('div[role="dialog"]')).filter(
      (dialog) => dialog.querySelector('[contenteditable="true"]')
    );
  }

  function getComposeElements(compose) {
    const body =
      compose.querySelector(
        '[contenteditable="true"][aria-label="Message Body"]'
      ) || compose.querySelector('[contenteditable="true"]');

    const subject = compose.querySelector('input[name="subjectbox"]');

    const sendButton = compose.querySelector(
      'div[role="button"][data-tooltip^="Send"]'
    );

    return {
      body,
      subject,
      sendButton,
    };
  }

  function getRecipients(compose) {
    const elements = compose.querySelectorAll('input[name="to"], span[email]');

    const emails = new Set();

    elements.forEach((element) => {
      const email = element.getAttribute("email") || element.value;

      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        emails.add(email.trim().toLowerCase());
      }
    });

    return Array.from(emails);
  }

  window.EmailTrackerGmail = {
    getComposeWindows,
    getComposeElements,
    getRecipients,
  };
})();
