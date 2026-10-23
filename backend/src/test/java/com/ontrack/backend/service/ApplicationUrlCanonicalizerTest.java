package com.ontrack.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Drives the Java canonicalizer from the same table the TypeScript one uses, so the two
 * implementations cannot disagree about whether two links are the same job. If they did, the
 * extension would prefill one URL and the duplicate lookup would compare another, and
 * duplicate detection would silently stop working.
 *
 * <p>The table lives in the extension because that is where it is authored, and the path is
 * resolved relative to the backend module so it works from a plain {@code mvnw test}.
 */
class ApplicationUrlCanonicalizerTest {

    private static final Path SHARED_CASES =
            Path.of("..", "extension", "test", "fixtures", "canonical-url-cases.json");

    private record Case(String name, String input, String expected) {
    }

    private static List<Case> loadSharedCases() throws IOException {
        JsonNode root = new ObjectMapper().readTree(Files.readString(SHARED_CASES));
        List<Case> cases = new ArrayList<>();
        for (JsonNode node : root.get("cases")) {
            cases.add(new Case(
                    node.get("name").asText(),
                    node.get("input").asText(),
                    node.get("expected").asText()));
        }
        return cases;
    }

    /**
     * Fails loudly rather than silently passing zero cases if the shared file ever moves,
     * which would otherwise make this whole suite a no-op.
     */
    @Test
    void theSharedCaseTableIsPresentAndNotEmpty() throws IOException {
        assertThat(SHARED_CASES).exists();
        assertThat(loadSharedCases()).hasSizeGreaterThan(15);
    }

    @TestFactory
    List<DynamicTest> matchesTheSharedTableTheExtensionUses() throws IOException {
        List<DynamicTest> tests = new ArrayList<>();
        for (Case testCase : loadSharedCases()) {
            tests.add(DynamicTest.dynamicTest(testCase.name(), () ->
                    assertThat(ApplicationUrlCanonicalizer.canonicalize(testCase.input()))
                            .isEqualTo(testCase.expected())));
        }
        return tests;
    }

    @TestFactory
    List<DynamicTest> isIdempotent() throws IOException {
        List<DynamicTest> tests = new ArrayList<>();
        for (Case testCase : loadSharedCases()) {
            tests.add(DynamicTest.dynamicTest(testCase.name(), () -> {
                String once = ApplicationUrlCanonicalizer.canonicalize(testCase.input());
                assertThat(ApplicationUrlCanonicalizer.canonicalize(once)).isEqualTo(once);
            }));
        }
        return tests;
    }

    @Test
    void treatsNullAsEmpty() {
        assertThat(ApplicationUrlCanonicalizer.canonicalize(null)).isEmpty();
    }

    /**
     * Canonicalization is only ever used for comparison, so a link with a dangerous scheme
     * must not be "cleaned up" into something that looks acceptable. It comes back untouched
     * and simply fails to match anything.
     */
    @Test
    void leavesANonHttpSchemeAloneRatherThanNormalizingIt() {
        assertThat(ApplicationUrlCanonicalizer.canonicalize("javascript:alert(1)"))
                .isEqualTo("javascript:alert(1)");
        assertThat(ApplicationUrlCanonicalizer.canonicalize("data:text/html,hi"))
                .isEqualTo("data:text/html,hi");
    }
}
