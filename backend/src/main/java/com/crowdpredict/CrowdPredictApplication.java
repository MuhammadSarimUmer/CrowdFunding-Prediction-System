package com.crowdpredict;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class CrowdPredictApplication {

    public static void main(String[] args) {
        SpringApplication.run(CrowdPredictApplication.class, args);
    }
}
