/** Replacement for the claude.ai artifact runtime (window.claude). */

function err(code, message, extra = {}) {
  const e = new Error(message || code);
  e.code = code;
  Object.assign(e, extra);
  return e;
}

const downloads = {
  async save({ filename, data, mimeType }) {
    const type = mimeType || (filename.endsWith('.csv') ? 'text/csv;charset=utf-8'
      : filename.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/octet-stream');
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

window.claude = {
  async use(name) {
    if (name === 'downloads') return downloads;
    if (name === 'sample') throw err('sampling_disabled', 'Local responses are enabled');
    throw err('not_declared', `Capability "${name}" is not available`);
  },
};
