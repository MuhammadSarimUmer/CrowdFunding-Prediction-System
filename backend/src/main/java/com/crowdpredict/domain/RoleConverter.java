package com.crowdpredict.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores {@link Role} as its lowercase code so the DB CHECK constraint and JSON agree. */
@Converter(autoApply = true)
public class RoleConverter implements AttributeConverter<Role, String> {

    @Override
    public String convertToDatabaseColumn(Role attribute) {
        return attribute == null ? null : attribute.code();
    }

    @Override
    public Role convertToEntityAttribute(String dbData) {
        return Role.fromCode(dbData);
    }
}
