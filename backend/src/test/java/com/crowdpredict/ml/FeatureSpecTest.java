package com.crowdpredict.ml;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.Category;

class FeatureSpecTest {

    @Test
    void featureOrderIsStable() {
        assertEquals(List.of("goalAmount", "durationDays", "goalPerDay", "rewardCount",
                "descriptionLength", "titleLength", "backerCount", "categoryId", "countryIndex"),
                FeatureSpec.FEATURES);
        assertEquals(9, FeatureSpec.FEATURES.size());
        assertEquals(10, FeatureSpec.COUNTRIES.size());
    }

    @Test
    void fromValuesDerivesGoalPerDayAndCountryIndex() {
        double[] features = FeatureSpec.fromValues(15000, 30, 3, 320, 42, 120, 4, "pk");

        assertEquals(15000, features[0]);
        assertEquals(30, features[1]);
        assertEquals(500, features[2], 1e-9);
        assertEquals(3, features[3]);
        assertEquals(320, features[4]);
        assertEquals(42, features[5]);
        assertEquals(120, features[6]);
        assertEquals(4, features[7]);
        assertEquals(FeatureSpec.COUNTRIES.indexOf("PK"), features[8]);
    }

    @Test
    void unknownCountryFallsIntoTheTrailingBucket() {
        assertEquals(FeatureSpec.COUNTRIES.size(), FeatureSpec.countryIndex("ZZ"));
        assertEquals(FeatureSpec.COUNTRIES.size(), FeatureSpec.countryIndex(null));
    }

    @Test
    void countryIndexIsCaseInsensitive() {
        assertEquals(FeatureSpec.COUNTRIES.indexOf("GB"), FeatureSpec.countryIndex("gb"));
    }

    @Test
    void zeroDurationIsGuarded() {
        double[] features = FeatureSpec.fromValues(1000, 0, 1, 80, 10, 0, 1, "US");
        assertEquals(1, features[1]);
        assertEquals(1000, features[2], 1e-9);
    }

    @Test
    void campaignFeaturesMatchTheContract() {
        Campaign campaign = new Campaign();
        campaign.setGoalAmount(BigDecimal.valueOf(9000));
        campaign.setDurationDays(45);
        campaign.setDescription("x".repeat(120));
        campaign.setTitle("A title");
        campaign.setBackerCount(12);
        campaign.setCountry("de");
        Category category = new Category();
        category.setCategoryId(3L);
        campaign.setCategory(category);

        double[] features = FeatureSpec.fromCampaign(campaign);

        assertEquals(9000, features[0]);
        assertEquals(45, features[1]);
        assertEquals(200, features[2], 1e-9);
        assertEquals(0, features[3]);
        assertEquals(120, features[4]);
        assertEquals(7, features[5]);
        assertEquals(12, features[6]);
        assertEquals(3, features[7]);
        assertEquals(FeatureSpec.COUNTRIES.indexOf("DE"), features[8]);
    }

    @Test
    void countriesAreTwoLetterIsoCodes() {
        FeatureSpec.COUNTRIES.forEach(code -> assertEquals(2, code.length()));
        assertEquals("US", FeatureSpec.COUNTRIES.get(0));
        assertThrows(UnsupportedOperationException.class,
                () -> FeatureSpec.COUNTRIES.add("ZZ"));
    }
}
