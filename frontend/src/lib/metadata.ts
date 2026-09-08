/**
 * Shared tab-title template: every page renders as "OnTrack — <page name>".
 *
 * It has to be re-declared by any layout that both sets its own title and has child routes.
 * Next applies a `title.template` to *child* segments only, and a layout that declares
 * `title` as a plain string satisfies its parent's template for itself while leaving its
 * children with no template at all - which is exactly how /applications/new and
 * /applications/[id] ended up rendering as bare "New application" / "Application".
 */
export const TITLE_TEMPLATE = "OnTrack — %s";
