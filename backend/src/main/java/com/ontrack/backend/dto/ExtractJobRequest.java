package com.ontrack.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * What the browser extension sends when its own readers could not parse a posting and the
 * user has explicitly agreed to spend one of their daily AI calls on it.
 *
 * <p>The extension truncates pageText to 30,000 characters before sending; the limit is
 * repeated here because a server must not trust a client to have done that.
 */
public record ExtractJobRequest(
        @Size(max = 2048) String url,
        @Size(max = 500) String pageTitle,
        @NotBlank @Size(max = 30000) String pageText
) {
}
