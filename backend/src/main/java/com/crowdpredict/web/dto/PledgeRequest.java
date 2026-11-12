package com.crowdpredict.web.dto;

import java.math.BigDecimal;

public record PledgeRequest(BigDecimal amount, Long rewardId) {
}
