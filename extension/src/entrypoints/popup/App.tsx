import { useCallback, useEffect, useReducer, useRef } from "react";
import { browser } from "wxt/browser";
import type { ApiError } from "../../api/types";
import { APP_URL, MAX_DESCRIPTION_CHARS } from "../../config";
import { COPY, SOURCE_CAPTION } from "../../copy";
import { send } from "../../messages/send";
import {
  Body,
  Caption,
  ErrorNote,
  Field,
  Header,
  Note,
  PrimaryButton,
  Spinner,
  TextArea,
  TextButton,
} from "../../popup/components";
import {
  canSave,
  initialState,
  isPartial,
  reducer,
  type Draft,
} from "../../popup/state";

/** How often to re-check health while Render cold starts (Section 4.2). */
const HEALTH_POLL_MS = 5000;

/** Turns a structured error into one of the Section 4.2 sentences. */
function errorMessage(error: ApiError): string {
  switch (error.kind) {
    case "capReached":
      return error.message || COPY.errorCapReached;
    case "offline":
      return COPY.errorOffline;
    case "rateLimited":
      // The server's own message is already user friendly here.
      return error.message || COPY.errorRateLimited(error.retryAfterSeconds);
    case "aiUnavailable":
      return error.message || COPY.errorAiUnavailable;
    case "validation":
      return error.message || COPY.errorGeneric;
    default:
      return error.message || COPY.errorGeneric;
  }
}

/**
 * Lets the e2e suite open the popup as a normal tab against a specific target
 * tab (popup.html?tabId=N). A popup opened by the toolbar has no addressable
 * URL, so there is no way to drive it from Playwright otherwise.
 */
function targetTabIdFromQuery(): number | null {
  const raw = new URLSearchParams(window.location.search).get("tabId");
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  // Guards the health poll so it is only ever running once.
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setField = useCallback(
    (field: keyof Draft) => (value: string) =>
      dispatch({ type: "draft/change", field, value }),
    [],
  );

  // --- Startup: probe the session and extract, in parallel (Section 4.1). ---
  useEffect(() => {
    let cancelled = false;

    async function resolveTabId(): Promise<number | null> {
      const fromQuery = targetTabIdFromQuery();
      if (fromQuery !== null) return fromQuery;
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tab?.id ?? null;
    }

    async function probeSession() {
      const response = await send({ type: "session.probe" });
      if (cancelled) return;

      if (response.ok) {
        dispatch({ type: "session/ok" });
        // Only worth asking once we know who the user is.
        const usage = await send({ type: "ai.usage" });
        if (!cancelled && usage.ok) {
          dispatch({ type: "aiUsage/loaded", usage: usage.data });
        }
        return;
      }

      if (response.error.kind === "unauthorized") {
        dispatch({ type: "session/signedOut" });
        return;
      }

      // No response at all almost always means Render is cold starting.
      dispatch({ type: "session/waking" });
    }

    async function extract() {
      const tabId = await resolveTabId();
      if (tabId === null) {
        if (!cancelled) dispatch({ type: "page/notAWebPage" });
        return;
      }

      const response = await send({ type: "job.extract", tabId });
      if (cancelled) return;

      if (!response.ok || response.data.kind === "failed") {
        dispatch({ type: "extraction/failed" });
        return;
      }
      if (response.data.kind === "notAWebPage") {
        dispatch({ type: "page/notAWebPage" });
        return;
      }

      const payload = response.data.payload;
      if (!payload) {
        dispatch({ type: "extraction/failed" });
        return;
      }

      dispatch({
        type: "extraction/done",
        result: payload.result,
        snapshot: payload.snapshot,
      });

      // The duplicate check needs the URL, so it runs after extraction.
      const lookup = await send({
        type: "application.lookup",
        url: payload.result.url,
      });
      if (!cancelled && lookup.ok && lookup.data.match) {
        dispatch({ type: "lookup/match", match: lookup.data.match });
      }
    }

    void probeSession();
    void extract();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- Cold start: keep polling health until the backend answers. ---
  useEffect(() => {
    if (state.phase !== "waking") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      const health = await send({ type: "health.check" });
      if (!health.ok || !health.data.healthy) return;

      // Awake, but the session still has to be re-checked.
      const session = await send({ type: "session.probe" });
      dispatch(
        session.ok ? { type: "session/awake" } : { type: "session/signedOut" },
      );
    }, HEALTH_POLL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [state.phase]);

  // Escape closes the popup (Section 10.3).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") window.close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSave = useCallback(async () => {
    dispatch({ type: "save/start" });
    const response = await send({
      type: "application.save",
      payload: {
        company: state.draft.company.trim(),
        role: state.draft.role.trim(),
        jobDescriptionText: state.draft.description,
        applicationUrl: state.draft.url,
        dateApplied: state.draft.dateApplied,
      },
    });

    if (response.ok) {
      dispatch({ type: "save/ok", application: response.data });
    } else {
      dispatch({ type: "save/failed", error: response.error });
    }
  }, [state.draft]);

  const openTab = (url: string) => {
    void browser.tabs.create({ url });
  };

  // --- Render ---

  if (state.phase === "checking") {
    return (
      <main>
        <Header />
        <Body>
          <Spinner label={COPY.checking} />
        </Body>
      </main>
    );
  }

  if (state.phase === "notAWebPage") {
    return (
      <main>
        <Header />
        <Body>
          <p>{COPY.notAWebPageTitle}</p>
        </Body>
      </main>
    );
  }

  if (state.phase === "signedOut") {
    return (
      <main>
        <Header />
        <Body>
          <div className="space-y-3">
            <p>{COPY.signedOutTitle}</p>
            <PrimaryButton onClick={() => openTab(`${APP_URL}/login`)}>
              {COPY.signedOutButton}
            </PrimaryButton>
          </div>
        </Body>
      </main>
    );
  }

  if (state.phase === "waking") {
    return (
      <main>
        <Header />
        <Body>
          <div className="space-y-2">
            <Spinner label={COPY.wakingTitle} />
            <Caption>{COPY.wakingBody}</Caption>
          </div>
        </Body>
      </main>
    );
  }

  if (state.phase === "duplicate" && state.duplicate) {
    const match = state.duplicate;
    return (
      <main>
        <Header />
        <Body>
          <div className="space-y-3">
            <p className="font-medium">{COPY.duplicateTitle}</p>
            <div className="rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2">
              <p className="text-[13px] font-medium">{match.company}</p>
              <p className="text-[12px] text-[var(--color-muted)]">{match.role}</p>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                {match.dateApplied} ({match.currentStatus.toLowerCase().replace(/_/g, " ")})
              </p>
            </div>
            <PrimaryButton
              onClick={() => openTab(`${APP_URL}/applications/${match.id}`)}
            >
              {COPY.openInOnTrack}
            </PrimaryButton>
            <div className="text-center">
              <TextButton onClick={() => dispatch({ type: "duplicate/saveAnyway" })}>
                {COPY.saveAnotherCopy}
              </TextButton>
            </div>
          </div>
        </Body>
      </main>
    );
  }

  if (state.phase === "saved" && state.saved) {
    return (
      <main>
        <Header />
        <Body>
          <div className="space-y-3">
            <p className="font-medium">{COPY.savedTitle}</p>
            <PrimaryButton
              onClick={() => openTab(`${APP_URL}/applications/${state.saved?.id}`)}
            >
              {COPY.viewInOnTrack}
            </PrimaryButton>
          </div>
        </Body>
      </main>
    );
  }

  if (state.phase === "unreadable") {
    const remaining = state.aiUsage?.remaining ?? 0;
    return (
      <main>
        <Header />
        <Body>
          <div className="space-y-3">
            <p>{COPY.unreadableTitle}</p>
            <PrimaryButton onClick={() => dispatch({ type: "fillInManually" })}>
              {COPY.fillItInMyself}
            </PrimaryButton>
            <div className="text-center">
              {remaining > 0 ? (
                <TextButton onClick={() => dispatch({ type: "ai/askConsent" })}>
                  {COPY.useAi(remaining)}
                </TextButton>
              ) : (
                <Caption>{COPY.aiExhausted}</Caption>
              )}
            </div>
          </div>
        </Body>
      </main>
    );
  }

  // The editable form: Extracted, Partial and manual all land here.
  const partial = isPartial(state);
  const missingNote =
    state.missing.length === 2
      ? COPY.missingBoth
      : state.missing[0] === "company"
        ? COPY.missingCompany
        : COPY.missingRole;

  return (
    <main>
      <Header />
      <Body>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave(state)) void handleSave();
          }}
        >
          {partial ? <Note>{missingNote}</Note> : null}
          {state.error ? <ErrorNote>{errorMessage(state.error)}</ErrorNote> : null}

          <Field
            id="company"
            label={COPY.companyLabel}
            value={state.draft.company}
            onChange={setField("company")}
            highlight={state.missing.includes("company")}
          />
          <Field
            id="role"
            label={COPY.roleLabel}
            value={state.draft.role}
            onChange={setField("role")}
            highlight={state.missing.includes("role")}
          />
          <TextArea
            id="description"
            label={COPY.descriptionLabel}
            value={state.draft.description}
            onChange={setField("description")}
            caption={COPY.characterCount(
              state.draft.description.length,
              MAX_DESCRIPTION_CHARS,
            )}
          />
          <Field
            id="url"
            label={COPY.linkLabel}
            value={state.draft.url}
            onChange={setField("url")}
          />
          <Field
            id="dateApplied"
            label={COPY.dateAppliedLabel}
            type="date"
            value={state.draft.dateApplied}
            onChange={setField("dateApplied")}
          />

          <PrimaryButton type="submit" disabled={!canSave(state)}>
            {state.phase === "saving" ? COPY.saving : COPY.save}
          </PrimaryButton>

          {state.source ? <Caption>{SOURCE_CAPTION[state.source]}</Caption> : null}
          {state.notes.map((note) => (
            <Caption key={note}>{note}</Caption>
          ))}
        </form>
      </Body>
    </main>
  );
}
