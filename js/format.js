/* Shared by the site and /admin: turns the plain text of an announcement into safe HTML.
   Line breaks are kept (the .news-body style uses white-space: pre-line),
   **text** becomes bold, links and email addresses become clickable. */
window.CMV_FORMAT = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LINK = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  function body(text) {
    const s = String(text ?? '');
    const bold = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    let out = '', last = 0;
    for (const m of s.matchAll(LINK)) {
      out += bold(s.slice(last, m.index));
      out += m[1] ? `<a href="${esc(m[1])}" target="_blank" rel="noopener">${esc(m[1])}</a>` : `<a href="mailto:${esc(m[2])}">${esc(m[2])}</a>`;
      last = m.index + m[0].length;
    }
    return out + bold(s.slice(last));
  }
  const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
  // "2025-08-17" -> "17 August 2025"
  function longDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : String(iso || '');
  }
  // "2025-08-17" -> "17.08.2025"
  const shortDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
  return { esc, body, longDate, shortDate };
})();
