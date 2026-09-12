package com.ontrack.backend.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontrack.backend.entity.ResumeStrength;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;

/**
 * Stores the strength breakdown as JSON in a TEXT column, the same approach
 * {@link StringListJsonConverter} takes for fit analysis. The categories are a fixed set of four
 * with a score and a sentence each, only ever read back whole, so a child table would add a join
 * and a migration for no benefit.
 */
@Converter
public class CategoryScoreListJsonConverter implements AttributeConverter<List<ResumeStrength.CategoryScore>, String> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<ResumeStrength.CategoryScore>> LIST_TYPE = new TypeReference<>() {};

    @Override
    public String convertToDatabaseColumn(List<ResumeStrength.CategoryScore> attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(attribute);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to serialize category scores to JSON", e);
        }
    }

    @Override
    public List<ResumeStrength.CategoryScore> convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return MAPPER.readValue(dbData, LIST_TYPE);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to deserialize JSON to category scores", e);
        }
    }
}
