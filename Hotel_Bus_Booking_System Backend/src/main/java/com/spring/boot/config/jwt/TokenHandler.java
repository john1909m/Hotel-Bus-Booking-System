package com.spring.boot.config.jwt;

import com.spring.boot.dto.UserDto;
import com.spring.boot.enums.Role;
import com.spring.boot.helper.JwtToken;
//import com.spring.boot.service.UserService;
import com.spring.boot.service.interfaces.AuthService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Duration;
import java.util.Date;

@Component
@Getter
@Setter
public class TokenHandler {
    private String secret;

    private Duration time;

    private JwtBuilder jwtBuilder;

    private JwtParser jwtParser;

    private AuthService userService;


    @Autowired
    public TokenHandler(JwtToken jwtToken, @Lazy  AuthService userService){
        this.userService = userService;

        this.secret = jwtToken.getSecret();
        this.time = jwtToken.getTime();

        Key key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        jwtBuilder = Jwts.builder().signWith(key);
        jwtParser = Jwts.parserBuilder().setSigningKey(key).build();
    }

    public String createToken(UserDto userDto) {
        Date issuedAt = new Date();
        Date expiryAt = Date.from(issuedAt.toInstant().plus(time));

        Key key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .setSubject(userDto.getName())
                .setIssuedAt(issuedAt)
                .setExpiration(expiryAt)
                .claim("role", userDto.getRole())
                .claim("userId", userDto.getId())
                .signWith(key)
                .compact();
    }

    public UserDto validateToken(String token) {
        try {
            Claims claims = jwtParser.parseClaimsJws(token).getBody();
            Long userId = claims.get("userId", Long.class);
            String role = claims.get("role", String.class);
            UserDto userDto = new UserDto();
            userDto.setId(userId);
            userDto.setName(claims.getSubject());
            userDto.setRole(Role.valueOf(role));

            return userDto;

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

}
