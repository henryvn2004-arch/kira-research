// "Copy citation" button of the cite box on server-rendered pages (markets hubs, market maps).
// Event delegation: works whether the button was in the HTML from the start or added later.
document.addEventListener('click', function (e) {
  var b = e.target && e.target.closest ? e.target.closest('[data-cite-copy]') : null;
  if (!b) return;
  var text = b.getAttribute('data-cite-copy') || '';
  var done = function () { b.textContent = b.getAttribute('data-copied') || 'Copied'; };
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(done, function () { window.prompt('', text); });
});
