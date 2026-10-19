package com.nexus.disasterresponse.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.time.*;

/** Maps MET Norway point forecasts without inventing observations or daily totals. */
public final class MetWeather {

  private MetWeather() {}

  public static JsonNode normalize(
    ObjectMapper mapper,
    JsonNode raw,
    Instant now
  ) {
    JsonNode series = raw.path("properties").path("timeseries");
    if (
      !series.isArray() || series.isEmpty()
    ) throw new IllegalArgumentException("Missing forecast series");
    Instant updated = Instant.parse(
      raw.path("properties").path("meta").path("updated_at").asText()
    );
    if (
      updated.isBefore(now.minus(Duration.ofHours(24))) ||
      updated.isAfter(now.plus(Duration.ofHours(1)))
    ) throw new IllegalArgumentException("Invalid forecast model age");
    JsonNode selected = null;
    long best = Long.MAX_VALUE;
    for (JsonNode row : series) {
      long distance = Math.abs(
        Duration.between(
          now,
          Instant.parse(row.path("time").asText())
        ).getSeconds()
      );
      if (distance < best) {
        best = distance;
        selected = row;
      }
    }
    if (best > 10800) throw new IllegalArgumentException(
      "No forecast near current time"
    );
    ObjectNode result = mapper.createObjectNode();
    result.put("modelUpdatedAt", updated.toString());
    result.set("current", point(mapper, selected));
    ArrayNode forecast = result.putArray("forecast");
    Instant next = now.plus(Duration.ofHours(3));
    for (JsonNode row : series) {
      Instant time = Instant.parse(row.path("time").asText());
      if (!time.isBefore(next) && forecast.size() < 8) {
        forecast.add(point(mapper, row));
        next = time.plus(Duration.ofHours(6));
      }
    }
    return result;
  }

  private static ObjectNode point(ObjectMapper mapper, JsonNode row) {
    JsonNode details = row.path("data").path("instant").path("details");
    if (
      !details.path("air_temperature").isNumber()
    ) throw new IllegalArgumentException("Missing forecast temperature");
    ObjectNode out = mapper.createObjectNode();
    out.put("time", Instant.parse(row.path("time").asText()).getEpochSecond());
    out.set("temperature_2m", details.get("air_temperature"));
    if (details.path("relative_humidity").isNumber()) out.set(
      "relative_humidity_2m",
      details.get("relative_humidity")
    );
    if (details.path("wind_speed").isNumber()) out.put(
      "wind_speed_10m",
      Math.round(details.path("wind_speed").asDouble() * 36.0) / 10.0
    );
    for (int hours : new int[] { 1, 6, 12 }) {
      JsonNode period = row.path("data").path("next_" + hours + "_hours");
      if (!period.isMissingNode()) {
        out.put("precipitationHours", hours);
        if (
          period.path("details").path("precipitation_amount").isNumber()
        ) out.set(
          "precipitation",
          period.path("details").get("precipitation_amount")
        );
        String symbol = period.path("summary").path("symbol_code").asText("");
        out.put(
          "description",
          symbol.replaceAll("_(day|night|polartwilight)$", "").replace("_", " ")
        );
        break;
      }
    }
    return out;
  }
}
