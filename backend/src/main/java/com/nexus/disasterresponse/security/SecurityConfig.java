package com.nexus.disasterresponse.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {

  @Bean
  PasswordEncoder passwords() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  JwtEncoder encoder(@Value("${nexus.jwt-secret}") String secret) {
    return new NimbusJwtEncoder(
      new ImmutableSecret<>(secret.getBytes(StandardCharsets.UTF_8))
    );
  }

  @Bean
  JwtDecoder decoder(@Value("${nexus.jwt-secret}") String secret) {
    var decoder = NimbusJwtDecoder.withSecretKey(
      new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256")
    )
      .macAlgorithm(MacAlgorithm.HS256)
      .build();
    decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("nexus"));
    return decoder;
  }

  @Bean
  SecurityFilterChain security(
    HttpSecurity http,
    @Value("${nexus.cors}") String origins
  ) throws Exception {
    var cors = new CorsConfiguration();
    cors.setAllowedOrigins(Arrays.asList(origins.split(",")));
    cors.setAllowedMethods(List.of("GET", "POST", "PATCH", "OPTIONS"));
    cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cors);
    return http
      .csrf(c -> c.disable())
      .cors(c -> c.configurationSource(source))
      .sessionManagement(s ->
        s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      )
      .authorizeHttpRequests(a ->
        a
          .requestMatchers(
            "/api/auth/login",
            "/api/auth/register",
            "/api/health"
          )
          .permitAll()
          .anyRequest()
          .authenticated()
      )
      .oauth2ResourceServer(o ->
        o
          .jwt(j -> {})
          .authenticationEntryPoint((req, res, e) -> {
            res.setStatus(401);
            res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Please sign in again\"}");
          })
      )
      .build();
  }
}
