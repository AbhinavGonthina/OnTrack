const REPO_URL = "https://github.com/AbhinavGonthina/OnTrack";
const EXTENSION_README = `${REPO_URL}/blob/main/extension/README.md`;

/**
 * Tells people the browser extension exists and how to load it.
 *
 * Deliberately static: no API call, no check for whether the extension is
 * actually installed. A page cannot see an extension unless the extension
 * chooses to announce itself, and making it announce itself on every page
 * would mean a content script running everywhere, which is exactly what the
 * extension's permissions avoid.
 */
export function BrowserExtensionCard() {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <h2 className="text-sm font-medium text-muted">Browser extension</h2>

      <p className="text-xs text-muted">
        Log a job straight from its posting. Click the OnTrack icon on a job
        page and the company, role, description and link are filled in for you.
      </p>

      <ol className="flex list-decimal flex-col gap-1 pl-4 text-xs text-muted marker:text-brand">
        <li>
          Download the{" "}
          <a
            href={`${REPO_URL}/tree/main/extension`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand hover:underline"
          >
            extension folder
          </a>{" "}
          from GitHub and build it.
        </li>
        <li>
          Open <span className="font-mono">chrome://extensions</span> and turn
          on Developer mode.
        </li>
        <li>
          Choose Load unpacked and pick{" "}
          <span className="font-mono">.output/chrome-mv3</span>.
        </li>
      </ol>

      <a
        href={EXTENSION_README}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-brand hover:underline"
      >
        Full setup instructions
      </a>
    </div>
  );
}
