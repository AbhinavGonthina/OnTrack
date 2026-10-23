package com.ontrack.backend.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Decides whether two job links mean the same posting, which is the whole basis of the
 * duplicate check behind {@code GET /api/applications/lookup}.
 *
 * <p>This is a deliberate twin of {@code extension/src/extract/canonicalUrl.ts}. Both are
 * driven by the same table of cases, {@code extension/test/fixtures/canonical-url-cases.json},
 * which both test suites read, so the two cannot drift apart without a test failing. If they
 * did drift, the popup would prefill one URL while the backend compared a different one and
 * duplicate detection would quietly stop working.
 *
 * <p>This is used only for comparison. What actually gets stored still goes through
 * {@code ApplicationService.normalizeApplicationUrl}, which is the security-relevant path
 * (it rejects non-http schemes); canonicalization here never widens what is accepted.
 */
public final class ApplicationUrlCanonicalizer {

    private ApplicationUrlCanonicalizer() {
    }

    /** Attribution parameters that never identify which posting you are looking at. */
    private static final Set<String> TRACKING_PARAMS = Set.of(
            "gh_src", "source", "lever-source", "lever-origin", "ref", "refid",
            "trk", "trackingid", "src", "fbclid", "gclid");

    private static final Pattern HAS_SCHEME = Pattern.compile("(?i)^[a-z][a-z0-9+.-]*://");
    private static final Pattern LINKEDIN_HOST = Pattern.compile("(?i)(^|\\.)linkedin\\.com$");
    private static final Pattern LINKEDIN_VIEW = Pattern.compile("^/jobs/view/(?:[^/]*-)?(\\d+)");
    private static final Pattern DIGITS = Pattern.compile("^\\d+$");

    private static final Pattern LEVER_SUFFIX = Pattern.compile("(?i)/(apply|thanks)/?$");
    private static final Pattern ASHBY_SUFFIX = Pattern.compile("(?i)/application/?$");
    private static final Pattern GREENHOUSE_SUFFIX = Pattern.compile("(?i)/confirmation/?$");

    private static boolean isTrackingParam(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.startsWith("utm_") || TRACKING_PARAMS.contains(lower);
    }

    /**
     * Returns a stable form of a posting URL, or the trimmed input when it cannot be parsed.
     * Never throws: an unparseable link simply fails to match anything, which is the right
     * outcome for a lookup.
     */
    public static String canonicalize(String input) {
        if (input == null) {
            return "";
        }
        String trimmed = input.trim();
        if (trimmed.isEmpty()) {
            return "";
        }

        String candidate = HAS_SCHEME.matcher(trimmed).find() ? trimmed : "https://" + trimmed;

        URI uri;
        try {
            uri = new URI(candidate);
        } catch (URISyntaxException e) {
            return trimmed;
        }

        String scheme = uri.getScheme();
        String host = uri.getHost();
        if (scheme == null || host == null || host.isBlank()) {
            return trimmed;
        }
        scheme = scheme.toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) {
            return trimmed;
        }
        host = host.toLowerCase(Locale.ROOT);

        String path = uri.getRawPath() == null ? "" : uri.getRawPath();
        String query = uri.getRawQuery();

        String linkedIn = linkedInCanonical(host, path, query);
        if (linkedIn != null) {
            return linkedIn;
        }

        path = stripPostApplySuffix(path, host);
        // Drop a trailing slash, except on the root path.
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }

        String keptQuery = stripTrackingParams(query);

        StringBuilder out = new StringBuilder(scheme).append("://").append(host);
        if (uri.getPort() != -1 && !isDefaultPort(scheme, uri.getPort())) {
            out.append(':').append(uri.getPort());
        }
        out.append(path.isEmpty() ? "/" : path);
        if (keptQuery != null && !keptQuery.isEmpty()) {
            out.append('?').append(keptQuery);
        }
        // The fragment is dropped entirely, and never rebuilt here.
        return out.toString();
    }

    private static boolean isDefaultPort(String scheme, int port) {
        return (scheme.equals("https") && port == 443) || (scheme.equals("http") && port == 80);
    }

    /** LinkedIn postings are reachable several ways; they all collapse to /jobs/view/{id}/. */
    private static String linkedInCanonical(String host, String path, String query) {
        if (!LINKEDIN_HOST.matcher(host).find()) {
            return null;
        }

        String id = null;
        Matcher viewMatch = LINKEDIN_VIEW.matcher(path);
        if (viewMatch.find()) {
            id = viewMatch.group(1);
        } else if (query != null) {
            id = firstQueryValue(query, "currentJobId");
        }

        if (id == null || !DIGITS.matcher(id).matches()) {
            return null;
        }
        return "https://www.linkedin.com/jobs/view/" + id + "/";
    }

    private static String firstQueryValue(String query, String name) {
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equalsIgnoreCase(name)) {
                return pair.substring(eq + 1);
            }
        }
        return null;
    }

    /** Collapses the page you land on after applying back to the posting itself. */
    private static String stripPostApplySuffix(String path, String host) {
        if (host.endsWith("lever.co")) {
            return LEVER_SUFFIX.matcher(path).replaceAll("");
        }
        if (host.endsWith("ashbyhq.com")) {
            return ASHBY_SUFFIX.matcher(path).replaceAll("");
        }
        if (host.endsWith("greenhouse.io")) {
            return GREENHOUSE_SUFFIX.matcher(path).replaceAll("");
        }
        return path;
    }

    private static String stripTrackingParams(String query) {
        if (query == null || query.isEmpty()) {
            return null;
        }
        List<String> kept = new ArrayList<>();
        for (String pair : query.split("&")) {
            if (pair.isEmpty()) {
                continue;
            }
            int eq = pair.indexOf('=');
            String name = eq >= 0 ? pair.substring(0, eq) : pair;
            if (!isTrackingParam(name)) {
                kept.add(pair);
            }
        }
        return String.join("&", kept);
    }
}
