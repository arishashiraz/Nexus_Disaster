package com.nexus.disasterresponse.controller;

import com.nexus.disasterresponse.dto.Inputs.*;
import com.nexus.disasterresponse.entity.Models.*;
import com.nexus.disasterresponse.service.Operations;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class Api {

  private final Operations op;

  public Api(Operations op) {
    this.op = op;
  }

  private User user(Authentication auth) {
    return op.current(auth.getName());
  }

  @GetMapping("/health")
  public Object health() {
    try {
      return op.health();
    } catch (RuntimeException e) {
      throw new org.springframework.web.server.ResponseStatusException(
        org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
        "Database is unavailable"
      );
    }
  }

  @PostMapping("/auth/login")
  public Object login(@Valid @RequestBody Login p) {
    return op.login(p);
  }

  @PostMapping("/auth/register")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object register(@Valid @RequestBody Register p) {
    return op.register(p);
  }

  @GetMapping("/auth/me")
  public Object me(Authentication a) {
    return user(a);
  }

  @PatchMapping("/auth/me")
  public Object profile(Authentication a, @Valid @RequestBody Profile p) {
    return op.profile(user(a), p);
  }

  @GetMapping("/users")
  public Object users(Authentication a) {
    return op.users(user(a));
  }

  @GetMapping("/teams")
  public Object teams(Authentication a) {
    return op.teams(user(a));
  }

  @GetMapping({ "/incidents", "/incidents/my" })
  public Object incidents(Authentication a) {
    return op.incidents(user(a));
  }

  @PostMapping("/incidents")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object report(Authentication a, @Valid @RequestBody Report p) {
    return op.report(user(a), p);
  }

  @GetMapping("/incidents/{id}")
  public Object incident(Authentication a, @PathVariable Long id) {
    return op.incident(user(a), id);
  }

  @GetMapping("/incidents/{id}/history")
  public Object history(Authentication a, @PathVariable Long id) {
    return op.history(user(a), id);
  }

  @GetMapping("/incidents/{id}/recommendation")
  public Object recommendation(Authentication a, @PathVariable Long id) {
    return op.recommendation(user(a), id);
  }

  @PatchMapping("/incidents/{id}/verify")
  public Object verify(
    Authentication a,
    @PathVariable Long id,
    @Valid @RequestBody Verify p
  ) {
    return op.verify(user(a), id, p);
  }

  @PatchMapping("/incidents/{id}/status")
  public Object status(
    Authentication a,
    @PathVariable Long id,
    @Valid @RequestBody Progress p
  ) {
    return op.status(user(a), id, p);
  }

  @GetMapping({ "/assignments", "/assignments/my" })
  public Object assignments(Authentication a) {
    return op.assignments(user(a));
  }

  @PostMapping("/assignments")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object assign(Authentication a, @Valid @RequestBody Assign p) {
    return op.assign(user(a), p);
  }

  @PatchMapping("/assignments/{id}/status")
  public Object progress(
    Authentication a,
    @PathVariable Long id,
    @Valid @RequestBody Progress p
  ) {
    return op.progress(user(a), id, p);
  }

  @GetMapping("/assignments/{id}/history")
  public Object assignmentHistory(Authentication a, @PathVariable Long id) {
    return op.assignmentHistory(user(a), id);
  }

  @GetMapping("/resources")
  public Object resources() {
    return op.resources();
  }

  @PostMapping("/resources")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object resource(
    Authentication a,
    @Valid @RequestBody ResourceInput p
  ) {
    return op.resource(user(a), p);
  }

  @PatchMapping("/resources/{id}")
  public Object quantity(
    Authentication a,
    @PathVariable Long id,
    @Valid @RequestBody Quantity p
  ) {
    return op.quantity(user(a), id, p);
  }

  @GetMapping("/resource-requests")
  public Object requests(Authentication a) {
    return op.requests(user(a));
  }

  @PostMapping("/resource-requests")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object request(Authentication a, @Valid @RequestBody Request p) {
    return op.request(user(a), p);
  }

  @PatchMapping("/resource-requests/{id}/review")
  public Object review(
    Authentication a,
    @PathVariable Long id,
    @Valid @RequestBody Review p
  ) {
    return op.review(user(a), id, p);
  }

  @GetMapping("/alerts")
  public Object alerts() {
    return op.alerts();
  }

  @PostMapping("/alerts")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public Object alert(Authentication a, @Valid @RequestBody AlertInput p) {
    return op.alert(user(a), p);
  }

  @GetMapping("/analytics/overview")
  public Object overview(Authentication a) {
    return op.overview(user(a));
  }

  @GetMapping("/analytics/incidents")
  public Object analytics(Authentication a) {
    return op.analytics(user(a));
  }

  @GetMapping("/analytics/resources")
  public Object resourceAnalytics(Authentication a) {
    op.role(user(a), "ADMIN");
    return op.resources();
  }
}
