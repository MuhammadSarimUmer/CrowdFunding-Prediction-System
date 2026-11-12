package com.crowdpredict.web.dto;

import com.crowdpredict.domain.Category;

public record CategoryResponse(Long categoryId, String name) {

    public static CategoryResponse of(Category category) {
        return new CategoryResponse(category.getCategoryId(), category.getName());
    }
}
