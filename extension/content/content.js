(() => {
  if (window.__emailTrackerInitialized) {
    return;
  }

  window.__emailTrackerInitialized = true;

  console.log("Email Tracker: Gmail integration initialized.");

  function detectComposeWindows() {
    const composers = EmailTrackerGmail.getComposeWindows();

    composers.forEach((compose) => {
      EmailTrackerCompose.setupCompose(compose);
    });
  }

  const observer = new MutationObserver(() => {
    detectComposeWindows();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  EmailTrackerCompose.observeSendSuccess();

  detectComposeWindows();
})();
