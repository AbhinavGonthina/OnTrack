package com.ontrack.backend.converter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StringListJsonConverterTest {

    private StringListJsonConverter converter;

    @BeforeEach
    void setUp() {
        converter = new StringListJsonConverter();
    }

    @Test
    void roundTripsANonEmptyList() {
        List<String> original = List.of("Kubernetes", "Distributed Systems", "Go");

        String json = converter.convertToDatabaseColumn(original);
        List<String> restored = converter.convertToEntityAttribute(json);

        assertThat(restored).containsExactlyElementsOf(original);
    }

    @Test
    void roundTripsAnEmptyList() {
        String json = converter.convertToDatabaseColumn(List.of());

        assertThat(converter.convertToEntityAttribute(json)).isEmpty();
    }

    @Test
    void nullListSerializesToNullColumn() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
    }

    @Test
    void nullColumnDeserializesToNullList() {
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    @Test
    void malformedJsonThrowsRatherThanSilentlyReturningGarbage() {
        assertThatThrownBy(() -> converter.convertToEntityAttribute("not valid json"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
