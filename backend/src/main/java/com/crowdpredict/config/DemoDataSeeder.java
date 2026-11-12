package com.crowdpredict.config;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.crowdpredict.domain.Campaign;
import com.crowdpredict.domain.Category;
import com.crowdpredict.domain.Reward;
import com.crowdpredict.domain.Role;
import com.crowdpredict.domain.User;
import com.crowdpredict.repository.CampaignRepository;
import com.crowdpredict.repository.CategoryRepository;
import com.crowdpredict.repository.UserRepository;

/**
 * Seeds the demo data advertised in the README and the frontend login screen:
 * the 10 accounts and the 12 campaigns from {@code frontend/src/lib/mock/seed.ts}
 * (same titles, texts, goals, durations, countries, categories, rewards and counters).
 *
 * <p>Idempotent: only runs when the users table is empty, so a redeploy (or a database
 * that already has real registrations) is never overwritten.
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "app.seed.demo", havingValue = "true", matchIfMissing = true)
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final CampaignRepository campaignRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(UserRepository userRepository,
                          CategoryRepository categoryRepository,
                          CampaignRepository campaignRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.campaignRepository = campaignRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            log.debug("Demo seeding skipped: users already exist");
            return;
        }
        Instant now = Instant.now();
        List<User> users = seedUsers(now);
        userRepository.saveAll(users);
        log.info("Seeded {} demo users", users.size());

        Map<String, User> byEmail = new HashMap<>();
        users.forEach(user -> byEmail.put(user.getEmail(), user));
        Map<String, Category> categories = new HashMap<>();
        categoryRepository.findAll().forEach(category -> categories.put(category.getName(), category));

        List<Campaign> campaigns = List.of(
                campaign(byEmail.get("ayesha@ecobottle.io"), categories.get("Technology"), "EcoBottle Smart Cap",
                        "A self-purifying smart cap that turns any reusable bottle into safe drinking water. The cap combines UV-C purification, hydration tracking, and a 30-day battery in a package that fits in your palm. Our team has shipped two hardware products before and this campaign funds the first production run plus independent lab certification.",
                        15000, 30, "PK", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(12)), 11700, 342,
                        reward(25, "Early-bird cap", "1x EcoBottle Smart Cap with UV-C purification and hydration tracking."),
                        reward(45, "Duo pack", "2x Smart Caps plus custom laser engraving and priority shipping."),
                        reward(100, "Founder backer edition", "2x titanium caps, lifetime analytics, and a factory video call.")),

                campaign(byEmail.get("tariq@solarpack.io"), categories.get("Design"), "SolarPack Nomad",
                        "A weatherproof solar backpack built for remote work and off-grid travel. Integrated 20,000mAh bank, pass-through charging, and a roll-top dry compartment. We are funding tooling for the second-generation fabric and a certified safety test batch.",
                        25000, 30, "US", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(8)), 23000, 514,
                        reward(45, "Explorer pack", "Solar backpack with 20,000mAh solar bank and USB-C fast charge."),
                        reward(95, "Nomad bundle", "Backpack, solar bank, and modular packing cubes."),
                        reward(180, "Expedition kit", "Full travel system with rain shell and repair kit.")),

                campaign(byEmail.get("elena@verdehydro.co"), categories.get("Environment"), "AeroPurifier Pocket HEPA",
                        "A pocket-sized HEPA purifier for shared workspaces and hotel rooms. It filters a 25m³ room in 18 minutes while running quieter than a library. Funds cover injection molds, filter certification, and the first 2,000 units.",
                        8000, 45, "PK", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(18)), 3600, 118,
                        reward(35, "Pocket purifier", "One AeroPurifier with USB-C cable and travel pouch."),
                        reward(65, "Clean air duo", "Two purifiers for home and office.")),

                campaign(byEmail.get("zainab@example.com"), categories.get("Health"), "SoundWave Bio-Acoustic Sleep Mask",
                        "A sleep mask that uses bone conduction and adaptive soundscapes to help shift workers fall asleep faster. Early testing showed a 22% reduction in sleep latency. We are raising funds for a larger clinical pilot and a production-ready electronics build.",
                        40000, 15, "GB", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(6)), 7200, 64,
                        reward(90, "SoundWave mask", "One bio-acoustic sleep mask with six soundscapes."),
                        reward(160, "Duo sleep set", "Two masks plus a travel case and shared app plan.")),

                campaign(byEmail.get("zainab@example.com"), categories.get("Design"), "ModuDesk Modular Ergonomic Desk",
                        "A solid oak standing desk that assembles in four minutes with no tools. The modular rail system supports monitors, lights, and charging without drilling. This campaign funds the first CNC production run and a 10-year warranty reserve.",
                        50000, 30, "CA", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(20)), 52500, 689,
                        reward(80, "Accessory mount kit", "Rail-mounted monitor arm and cable tray."),
                        reward(450, "ModuDesk core", "Solid oak desk with dual motor lift and rail system."),
                        reward(900, "Studio bundle", "Desk, monitor arm, light bar, and cable management.")),

                campaign(byEmail.get("elena@verdehydro.co"), categories.get("Environment"), "VerdeHydro Home Aquaponics",
                        "A countertop aquaponics system that grows herbs and leafy greens with 90% less water than soil. The closed-loop tank is designed for apartments and comes with a starter seed kit. Funds cover food-safe tooling and a 500-home beta program.",
                        12000, 30, "DE", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(10)), 9720, 285,
                        reward(120, "Starter greenhouse", "One aquaponics unit, seed kit, and water test strips."),
                        reward(240, "Family garden", "Two units plus an expanded seed and nutrient kit.")),

                campaign(byEmail.get("ayesha@ecobottle.io"), categories.get("Food"), "Hearth & Grain Sourdough Kit",
                        "A beginner-friendly sourdough kit with a temperature-controlled proofing box, heritage starter, and a guided 21-day course. We are funding a small-batch production run and a new bakery partnership in Lahore.",
                        9000, 21, "US", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(5)), 5400, 190,
                        reward(25, "Starter loaf kit", "Proofing box, heritage starter, and digital course."),
                        reward(60, "Baker's bundle", "Two kits plus a cast-iron loaf pan.")),

                campaign(byEmail.get("ayesha@ecobottle.io"), categories.get("Education"), "NeuroNotes Focus Journal",
                        "A 90-day journal built around cognitive-load research, with weekly focus experiments and a companion app for gentle accountability. This campaign funds the first print run on recycled paper and a free classroom pilot.",
                        6000, 25, "GB", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(9)), 4200, 160,
                        reward(22, "Focus journal", "One 90-day NeuroNotes journal and app access."),
                        reward(40, "Team pack", "Three journals for a study group or team.")),

                campaign(byEmail.get("tariq@solarpack.io"), categories.get("Games"), "Lumen Arcade Controller",
                        "A low-latency arcade controller with hot-swappable switches and per-key RGB, designed for fighting games and retro platforms. Funds cover the aluminum case tooling and a first run of 1,500 units.",
                        30000, 35, "CA", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(14)), 12000, 240,
                        reward(60, "Lumen controller", "One arcade controller with hot-swap switches."),
                        reward(110, "Arcade duo", "Two controllers and a braided USB-C cable set.")),

                campaign(byEmail.get("elena@verdehydro.co"), categories.get("Environment"), "TerraTiles Recycled Desk Mat",
                        "A desk mat made from 100% recycled ocean-bound plastic, with a modular tile system for cable routing and pen storage. We are raising funds for a new press and a closed-loop take-back program.",
                        5000, 14, "PK", Campaign.Status.SUBMITTED, now.minus(Duration.ofDays(4)), 900, 40,
                        reward(30, "TerraTiles mat", "One recycled desk mat with two modular tiles."),
                        reward(55, "Studio pack", "Mat, cable tiles, and pen dock.")),

                campaign(byEmail.get("ayesha@ecobottle.io"), categories.get("Technology"), "EcoBottle Smart Cap v2",
                        "The second-generation smart cap with a replaceable filter cartridge and a solar charging ring. Currently in draft while we finalize the bill of materials and lab partners.",
                        20000, 30, "PK", Campaign.Status.DRAFT, now.minus(Duration.ofDays(2)), 0, 0,
                        reward(30, "Early-bird cap v2", "1x EcoBottle Smart Cap v2 with solar ring.")),

                campaign(byEmail.get("tariq@solarpack.io"), categories.get("Design"), "SolarPack Mini",
                        "A compact 10L solar sling for city commutes. Draft campaign pending final fabric samples.",
                        15000, 21, "US", Campaign.Status.DRAFT, now.minus(Duration.ofDays(1)), 0, 0,
                        reward(40, "SolarPack Mini", "One compact solar sling with 10,000mAh bank.")));

        campaignRepository.saveAll(campaigns);
        log.info("Seeded {} demo campaigns", campaigns.size());
    }

    private List<User> seedUsers(Instant now) {
        return List.of(
                user("Marcus Chen", "admin@crowdpredict.app", "admin123", Role.ADMIN,
                        "CrowdPredict", 2, true, now.minus(Duration.ofDays(400))),
                user("Ayesha Khan", "ayesha@ecobottle.io", "creator123", Role.CREATOR,
                        "EcoTech Labs", null, true, now.minus(Duration.ofDays(320))),
                user("Tariq Mahmood", "tariq@solarpack.io", "creator123", Role.CREATOR,
                        "Apex Gear", null, true, now.minus(Duration.ofDays(280))),
                user("Elena Rostova", "elena@verdehydro.co", "creator123", Role.CREATOR,
                        "EcoLabs", null, true, now.minus(Duration.ofDays(240))),
                user("Sara Ahmed", "backer@crowdpredict.app", "backer123", Role.BACKER,
                        null, null, true, now.minus(Duration.ofDays(180))),
                user("Omar Farooq", "omar@example.com", "backer123", Role.BACKER,
                        null, null, true, now.minus(Duration.ofDays(150))),
                user("Hana Ali", "hana@example.com", "backer123", Role.BACKER,
                        null, null, true, now.minus(Duration.ofDays(120))),
                user("Marcus Vance", "marcus@crowdpredict.app", "admin123", Role.ADMIN,
                        "CrowdPredict", 1, true, now.minus(Duration.ofDays(300))),
                user("Layla Hassan", "layla@example.com", "backer123", Role.BACKER,
                        null, null, false, now.minus(Duration.ofDays(90))),
                user("Zainab Iqbal", "zainab@example.com", "creator123", Role.CREATOR,
                        "Studio Wood", null, true, now.minus(Duration.ofDays(70))));
    }

    private User user(String name, String email, String password, Role role, String organization,
                      Integer adminLevel, boolean active, Instant createdAt) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setOrganization(organization);
        user.setAdminLevel(adminLevel);
        user.setActive(active);
        user.setCreatedAt(createdAt);
        return user;
    }

    private Campaign campaign(User creator, Category category, String title, String description,
                              int goalAmount, int durationDays, String country, Campaign.Status status,
                              Instant createdAt, int pledgedAmount, int backerCount, Reward... rewards) {
        Campaign campaign = new Campaign();
        campaign.setCreator(creator);
        campaign.setCategory(category);
        campaign.setTitle(title);
        campaign.setDescription(description);
        campaign.setGoalAmount(BigDecimal.valueOf(goalAmount));
        campaign.setDurationDays(durationDays);
        campaign.setCountry(country);
        campaign.setStatus(status);
        campaign.setCreatedAt(createdAt);
        campaign.setEndsAt(createdAt.plus(durationDays, ChronoUnit.DAYS));
        campaign.setPledgedAmount(BigDecimal.valueOf(pledgedAmount));
        campaign.setBackerCount(backerCount);

        List<Reward> tiers = new ArrayList<>();
        for (Reward reward : rewards) {
            reward.setCampaign(campaign);
            reward.setQuantity(100);
            tiers.add(reward);
        }
        campaign.setRewards(tiers);
        return campaign;
    }

    private Reward reward(int minPledge, String title, String description) {
        Reward reward = new Reward();
        reward.setMinPledge(BigDecimal.valueOf(minPledge));
        reward.setTitle(title);
        reward.setDescription(description);
        return reward;
    }
}
