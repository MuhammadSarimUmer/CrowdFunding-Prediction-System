package com.crowdpredict.web;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.crowdpredict.service.CampaignFilter;
import com.crowdpredict.service.CampaignService;
import com.crowdpredict.service.CategoryService;
import com.crowdpredict.web.dto.CampaignRequest;
import com.crowdpredict.web.dto.CampaignResponse;
import com.crowdpredict.web.dto.CategoryResponse;
import com.crowdpredict.web.dto.PageResponse;

@RestController
public class CampaignController {

    private final CampaignService campaignService;
    private final CategoryService categoryService;

    public CampaignController(CampaignService campaignService, CategoryService categoryService) {
        this.campaignService = campaignService;
        this.categoryService = categoryService;
    }

    @GetMapping("/api/categories")
    public List<CategoryResponse> categories() {
        return categoryService.all();
    }

    @GetMapping("/api/campaigns")
    public PageResponse<CampaignResponse> list(
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(required = false) Long creatorId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) BigDecimal minGoal,
            @RequestParam(required = false) BigDecimal maxGoal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "9") int pageSize) {
        return campaignService.list(new CampaignFilter(
                mine, creatorId, search, category, country, minGoal, maxGoal, page, pageSize));
    }

    @GetMapping("/api/campaigns/{campaignId}")
    public CampaignResponse get(@PathVariable Long campaignId) {
        return campaignService.get(campaignId);
    }

    @PostMapping("/api/campaigns")
    public ResponseEntity<CampaignResponse> create(@RequestBody CampaignRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.create(request));
    }

    @PutMapping("/api/campaigns/{campaignId}")
    public CampaignResponse update(@PathVariable Long campaignId, @RequestBody CampaignRequest request) {
        return campaignService.update(campaignId, request);
    }

    @PatchMapping("/api/campaigns/{campaignId}")
    public CampaignResponse patch(@PathVariable Long campaignId, @RequestBody CampaignRequest request) {
        return campaignService.update(campaignId, request);
    }

    @DeleteMapping("/api/campaigns/{campaignId}")
    public Map<String, Object> delete(@PathVariable Long campaignId) {
        return campaignService.delete(campaignId);
    }
}
