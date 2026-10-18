package com.nexus.disasterresponse.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class IndiaRegions {

  public record Region(
    String code,
    String name,
    String kind,
    String sampleLocation,
    double latitude,
    double longitude
  ) {}

  private final List<Region> regions;

  public IndiaRegions(ObjectMapper mapper) throws IOException {
    try (
      var input = new ClassPathResource(
        "data/india-regions.json"
      ).getInputStream()
    ) {
      regions = List.copyOf(
        mapper.readValue(input, new TypeReference<List<Region>>() {})
      );
    }
  }

  public List<Region> all() {
    return regions;
  }

  public Region get(String code) {
    return regions
      .stream()
      .filter(r -> r.code().equals(code))
      .findFirst()
      .orElseThrow(() ->
        new org.springframework.web.server.ResponseStatusException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Select a valid Indian state or union territory"
        )
      );
  }
}
