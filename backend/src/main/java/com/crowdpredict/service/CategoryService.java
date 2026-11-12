package com.crowdpredict.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.repository.CategoryRepository;
import com.crowdpredict.web.dto.CategoryResponse;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> all() {
        return categoryRepository.findAll(Sort.by("categoryId")).stream()
                .map(CategoryResponse::of)
                .toList();
    }
}
