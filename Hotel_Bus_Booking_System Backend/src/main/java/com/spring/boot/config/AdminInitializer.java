package com.spring.boot.config;

import com.spring.boot.enums.Role;
import com.spring.boot.model.User;
import com.spring.boot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

//@Component
@RequiredArgsConstructor
public class AdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${admin.password}")
    private String adminPassword;

    @Value("${admin.name:Admin User}")
    private String adminName;

    @Value("${admin.phoneNumber:}")
    private String adminPhoneNumber;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByEmail(adminEmail)) {
            return;
        }

        User adminUser = new User();
        adminUser.setName(adminName);
        adminUser.setEmail(adminEmail);
        adminUser.setPassword(passwordEncoder.encode(adminPassword));
        adminUser.setPhoneNumber(adminPhoneNumber);
        adminUser.setRole(Role.ADMIN);

        userRepository.save(adminUser);
    }
}