package com.crowdpredict.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.crowdpredict.service.PredictionService;
import com.crowdpredict.web.dto.PageResponse;
import com.crowdpredict.web.dto.PredictionRequest;
import com.crowdpredict.web.dto.PredictionResponse;
import com.crowdpredict.web.error.ApiException;

@RestController
public class PredictionController {

    private final PredictionService predictionService;

    public PredictionController(PredictionService predictionService) {
        this.predictionService = predictionService;
    }

    @PostMapping("/api/predictions")
    public ResponseEntity<PredictionResponse> create(@RequestBody PredictionRequest request) {
        if (request == null || request.campaignId() == null) {
            throw ApiException.notFound("Campaign not found.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(predictionService.create(request.campaignId()));
    }

    /** Paginated envelope, matching the prediction history screen. */
    @GetMapping("/api/predictions")
    public PageResponse<PredictionResponse> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Long campaignId) {
        return predictionService.list(page, pageSize, campaignId);
    }

    @GetMapping("/api/predictions/{predictionId}")
    public PredictionResponse get(@PathVariable Long predictionId) {
        return predictionService.get(predictionId);
    }
}
