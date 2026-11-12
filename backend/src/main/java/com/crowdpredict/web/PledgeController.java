package com.crowdpredict.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.crowdpredict.service.PledgeService;
import com.crowdpredict.web.dto.PledgeRequest;
import com.crowdpredict.web.dto.PledgeResponse;

@RestController
public class PledgeController {

    private final PledgeService pledgeService;

    public PledgeController(PledgeService pledgeService) {
        this.pledgeService = pledgeService;
    }

    @PostMapping("/api/campaigns/{campaignId}/pledges")
    public ResponseEntity<PledgeResponse> create(@PathVariable Long campaignId,
                                                 @RequestBody PledgeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pledgeService.create(campaignId, request));
    }

    /** The UI expects a plain array here, not the paginated envelope. */
    @GetMapping("/api/pledges/mine")
    public List<PledgeResponse> mine() {
        return pledgeService.mine();
    }
}
