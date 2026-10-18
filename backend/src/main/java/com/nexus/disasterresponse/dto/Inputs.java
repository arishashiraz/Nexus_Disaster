package com.nexus.disasterresponse.dto;

import jakarta.validation.constraints.*;

public final class Inputs {

  public record Login(
    @NotBlank @Email String email,
    @NotBlank String password
  ) {}

  public record Register(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email @Size(max = 200) String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    @NotBlank String role
  ) {}

  public record Profile(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 40) String phone,
    @Size(max = 500) String skills,
    boolean available
  ) {}

  public record Report(
    @NotBlank @Size(max = 180) String title,
    @NotBlank String type,
    @NotBlank @Size(max = 4000) String description,
    @NotBlank @Size(max = 250) String location,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
    @NotBlank String severity,
    @Min(1) @Max(10000000) int affectedPeople,
    @NotBlank @Size(max = 100) String contact,
    @NotBlank @Size(max = 10) String stateCode,
    @NotBlank @Size(max = 120) String district
  ) {}

  public record Verify(
    @NotBlank String verification,
    @NotBlank String priority,
    @Size(max = 2000) String note,
    String severity
  ) {}

  public record Progress(
    @NotBlank String status,
    @Size(max = 2000) String note
  ) {}

  public record Assign(
    @NotNull Long incidentId,
    @NotNull Long assigneeId,
    @NotBlank @Size(max = 250) String task
  ) {}

  public record ResourceInput(
    @NotBlank @Size(max = 150) String name,
    @NotBlank String category,
    @NotBlank @Size(max = 40) String unit,
    @Min(0) int quantity
  ) {}

  public record Quantity(
    @Min(0) int quantity,
    @Min(0) Integer expectedQuantity
  ) {}

  public record Request(
    @NotNull Long resourceId,
    @Min(1) int quantity,
    @NotBlank @Size(max = 250) String location,
    @NotBlank @Size(max = 255) String reason
  ) {}

  public record Review(@NotBlank String status, @Size(max = 255) String note) {}

  public record AlertInput(
    @NotBlank @Size(max = 180) String title,
    @NotBlank @Size(max = 4000) String message,
    @NotBlank String severity,
    @NotBlank @Size(max = 250) String location
  ) {}
}
