package com.nexus.disasterresponse;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.nexus.disasterresponse.service.MetWeather;
import java.time.*;
import org.junit.jupiter.api.Test;

class MetWeatherTest {

  private final ObjectMapper mapper = new ObjectMapper();
  private final Instant now = Instant.parse("2026-10-19T08:20:00Z");

  private ObjectNode sample() {
    ObjectNode root = mapper.createObjectNode();
    ObjectNode properties = root.putObject("properties");
    properties.putObject("meta").put("updated_at", "2026-10-19T06:00:00Z");
    ArrayNode series = properties.putArray("timeseries");
    for (int hour = 6; hour < 24; hour++) {
      ObjectNode row = series.addObject();
      row.put("time", String.format("2026-10-19T%02d:00:00Z", hour));
      ObjectNode data = row.putObject("data");
      data
        .putObject("instant")
        .putObject("details")
        .put("air_temperature", hour)
        .put("wind_speed", 5)
        .put("relative_humidity", 70);
      ObjectNode period = data.putObject("next_6_hours");
      period.putObject("details").put("precipitation_amount", 2.5);
      period.putObject("summary").put("symbol_code", "rain_day");
    }
    return root;
  }

  @Test
  void choosesNearestForecastAndConvertsUnitsWithoutDailyTotals() {
    JsonNode result = MetWeather.normalize(mapper, sample(), now);
    assertEquals(8, result.path("current").path("temperature_2m").asInt());
    assertEquals(18, result.path("current").path("wind_speed_10m").asDouble());
    assertEquals(6, result.path("current").path("precipitationHours").asInt());
    assertEquals("rain", result.path("current").path("description").asText());
    assertEquals(2.5, result.path("current").path("precipitation").asDouble());
    assertFalse(result.has("daily"));
    assertTrue(result.path("forecast").size() > 0);
  }

  @Test
  void missingRainIsUnknownNotZero() {
    ObjectNode raw = sample();
    for (JsonNode row : raw.path("properties").path("timeseries"))
      ((ObjectNode) row.path("data")).remove("next_6_hours");
    assertFalse(
      MetWeather.normalize(mapper, raw, now)
        .path("current")
        .has("precipitation")
    );
  }

  @Test
  void rejectsExpiredModelAndForecastWithoutNearTime() {
    ObjectNode raw = sample();
    ((ObjectNode) raw.path("properties").path("meta")).put(
      "updated_at",
      "2026-10-17T06:00:00Z"
    );
    assertThrows(IllegalArgumentException.class, () ->
      MetWeather.normalize(mapper, raw, now)
    );
    assertThrows(IllegalArgumentException.class, () ->
      MetWeather.normalize(mapper, sample(), now.minus(Duration.ofDays(3)))
    );
  }
}
