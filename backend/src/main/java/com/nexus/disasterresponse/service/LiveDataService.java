package com.nexus.disasterresponse.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/** External context only: these feeds never create or verify a rescue incident. */
@Service
public class LiveDataService {

  private final ObjectMapper mapper;
  private final IndiaRegions regions;
  private final HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
  private final Object[] locks = java.util.stream.IntStream.range(0, 32)
    .mapToObj(i -> new Object())
    .toArray();
  private final Map<String, Cached> cache = new ConcurrentHashMap<>();

  private record Cached(
    JsonNode data,
    Instant fetchedAt,
    Instant attemptedAt,
    boolean failed
  ) {}

  public LiveDataService(ObjectMapper mapper, IndiaRegions regions) {
    this.mapper = mapper;
    this.regions = regions;
  }

  // Shared bounded cache avoids calling an upstream API on every dashboard refresh.
  private Cached fetch(String key, String url, int ttlSeconds) {
    synchronized (locks[Math.floorMod(key.hashCode(), locks.length)]) {
      return fetchLocked(key, url, ttlSeconds);
    }
  }

  private Cached fetchLocked(String key, String url, int ttlSeconds) {
    Instant now = Instant.now();
    Cached old = cache.get(key);
    if (
      old != null &&
      Duration.between(old.attemptedAt(), now).getSeconds() <
        (old.failed() ? 60 : ttlSeconds)
    ) return old;
    try {
      var request = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(10))
        .header("User-Agent", "NEXUS-Academic-Project/1.0")
        .GET()
        .build();
      var response = client.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) throw new java.io.IOException(
        "Upstream HTTP " + response.statusCode()
      );
      JsonNode body = mapper.readTree(response.body());
      if (
        key.startsWith("weather-") &&
        (!body.path("current").hasNonNull("time") ||
          !body.path("current").hasNonNull("temperature_2m"))
      ) throw new java.io.IOException("Invalid weather payload");
      if (
        key.equals("earthquakes") &&
        (!body.path("features").isArray() ||
          !body.path("metadata").hasNonNull("generated"))
      ) throw new java.io.IOException("Invalid earthquake payload");
      Cached value = new Cached(body, Instant.now(), now, false);
      cache.put(key, value);
      return value;
    } catch (Exception ex) {
      if (
        ex instanceof InterruptedException
      ) Thread.currentThread().interrupt();
      // A dated last-known result is useful; never synthesize weather or events.
      Cached value = new Cached(
        old == null ? null : old.data(),
        old == null ? null : old.fetchedAt(),
        now,
        true
      );
      cache.put(key, value);
      return value;
    }
  }

  private Map<String, Object> envelope(
    Cached c,
    String source,
    String sourceUrl
  ) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put(
      "status",
      c.data() == null ? "UNAVAILABLE" : c.failed() ? "STALE" : "AVAILABLE"
    );
    out.put("source", source);
    out.put("sourceUrl", sourceUrl);
    out.put("fetchedAt", c.fetchedAt());
    out.put("lastAttemptAt", c.attemptedAt());
    out.put(
      "message",
      c.failed()
        ? "Provider is unreachable. Any displayed values are last-known data; check their timestamp."
        : "Fetched from the external provider; publication can lag the event."
    );
    return out;
  }

  public Map<String, Object> weather(
    String stateCode,
    Double latitude,
    Double longitude
  ) {
    var region = regions.get(stateCode);
    Operations.require(
      (latitude == null) == (longitude == null),
      "Provide both latitude and longitude"
    );
    double lat = latitude == null ? region.latitude() : latitude,
      lon = longitude == null ? region.longitude() : longitude;
    Operations.require(
      Double.isFinite(lat) &&
        Double.isFinite(lon) &&
        lat >= 6 &&
        lat <= 38 &&
        lon >= 68 &&
        lon <= 98,
      "Choose coordinates in the India-region map extent"
    );
    // Rounding limits cache keys while retaining useful local context.
    lat = Math.round(lat * 100.0) / 100.0;
    lon = Math.round(lon * 100.0) / 100.0;
    String coords = String.format(Locale.ROOT, "%.2f,%.2f", lat, lon);
    if (cache.size() > 300) cache
      .entrySet()
      .removeIf(
        e ->
          Duration.between(
            e.getValue().attemptedAt(),
            Instant.now()
          ).toMinutes() > 30
      );
    if (
      cache.size() > 500
    ) throw new org.springframework.web.server.ResponseStatusException(
      org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
      "Too many locations requested; retry shortly"
    );
    String url = String.format(
      Locale.ROOT,
      "https://api.open-meteo.com/v1/forecast?latitude=%.2f&longitude=%.2f&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=3&timezone=Asia%%2FKolkata&timeformat=unixtime",
      lat,
      lon
    );
    Cached c = fetch("weather-" + coords, url, 600);
    var out = envelope(c, "Open-Meteo", "https://open-meteo.com/");
    out.put("state", region);
    out.put("latitude", lat);
    out.put("longitude", lon);
    out.put(
      "locationLabel",
      latitude == null
        ? region.sampleLocation() + " sample location"
        : "Selected coordinates"
    );
    out.put(
      "coverage",
      "Point-specific model estimate, not a statewide measurement or an official disaster warning."
    );
    out.put(
      "attribution",
      "Weather data by Open-Meteo, CC BY 4.0. Free API for this non-commercial academic project."
    );
    out.put("refreshSeconds", 600);
    out.put("data", c.data());
    return out;
  }

  public Map<String, Object> earthquakes() {
    Cached c = fetch(
      "earthquakes",
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
      300
    );
    var out = envelope(
      c,
      "USGS Earthquake Hazards Program",
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
    );
    List<Map<String, Object>> events = new ArrayList<>();
    if (c.data() != null) for (JsonNode event : c.data().path("features")) {
      JsonNode coords = event.path("geometry").path("coordinates"),
        p = event.path("properties");
      if (
        coords.size() < 2 ||
        !coords.get(0).isNumber() ||
        !coords.get(1).isNumber()
      ) continue;
      double lon = coords.get(0).asDouble(),
        lat = coords.get(1).asDouble();
      if (lat < 6 || lat > 38 || lon < 68 || lon > 98) continue;
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", event.path("id").asText());
      item.put("title", p.path("title").asText("Earthquake event"));
      item.put("location", p.path("place").asText("Location unavailable"));
      item.put(
        "magnitude",
        p.hasNonNull("mag") ? p.path("mag").asDouble() : null
      );
      item.put("latitude", lat);
      item.put("longitude", lon);
      item.put("depthKm", coords.size() > 2 ? coords.get(2).asDouble() : null);
      item.put("occurredAt", Instant.ofEpochMilli(p.path("time").asLong()));
      item.put("updatedAt", Instant.ofEpochMilli(p.path("updated").asLong()));
      String link = p.path("url").asText();
      item.put(
        "url",
        link.startsWith("https://earthquake.usgs.gov/")
          ? link
          : "https://earthquake.usgs.gov/"
      );
      events.add(item);
    }
    events.sort(
      Comparator.comparing(
        e -> (Instant) e.get("occurredAt"),
        Comparator.reverseOrder()
      )
    );
    out.put("events", events);
    out.put("refreshSeconds", 300);
    out.put(
      "generatedAt",
      c.data() == null
        ? null
        : Instant.ofEpochMilli(
            c.data().path("metadata").path("generated").asLong()
          )
    );
    out.put(
      "coverage",
      "Past 7 days within 6–38°N, 68–98°E. Includes neighbouring countries and offshore areas; this is not an India-border filter. USGS coverage is not exhaustive."
    );
    return out;
  }
}
