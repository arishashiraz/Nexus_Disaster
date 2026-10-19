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

  private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(
    LiveDataService.class
  );
  private final ObjectMapper mapper;
  private final IndiaRegions regions;
  private final HttpClient client = HttpClient.newBuilder()
    .followRedirects(HttpClient.Redirect.NORMAL)
    .connectTimeout(Duration.ofSeconds(5))
    .build();
  private final Object[] locks = java.util.stream.IntStream.range(0, 32)
    .mapToObj(i -> new Object())
    .toArray();
  private final Map<String, JsonNode> weatherRaw = new ConcurrentHashMap<>();
  private final Map<String, Instant> expires = new ConcurrentHashMap<>();
  private final Map<String, String> modified = new ConcurrentHashMap<>();
  private final Map<String, Cached> cache = new ConcurrentHashMap<>();
  private final Map<String, Instant> providerCooldowns =
    new ConcurrentHashMap<>();

  private record Cached(
    JsonNode data,
    Instant fetchedAt,
    Instant attemptedAt,
    boolean failed,
    Instant retryAt
  ) {
    private Cached(
      JsonNode data,
      Instant fetchedAt,
      Instant attemptedAt,
      boolean failed
    ) {
      this(data, fetchedAt, attemptedAt, failed, null);
    }
  }

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
    String host = URI.create(url).getHost();
    Instant retryAt = providerCooldowns.get(host);
    if (retryAt != null && now.isBefore(retryAt)) {
      return new Cached(
        old == null ? null : old.data(),
        old == null ? null : old.fetchedAt(),
        old == null ? null : old.attemptedAt(),
        true,
        retryAt
      );
    }
    if (
      old != null &&
      Duration.between(old.attemptedAt(), now).getSeconds() <
        (old.failed() ? 60 : ttlSeconds)
    ) return old;
    if (
      old != null &&
      !old.failed() &&
      now.isBefore(expires.getOrDefault(key, Instant.MIN))
    ) return old;
    try {
      var builder = HttpRequest.newBuilder(URI.create(url))
        .timeout(Duration.ofSeconds(10))
        .header(
          "User-Agent",
          "NEXUS-India/1.0 https://github.com/arishashiraz/Nexus_Disaster"
        )
        .header("Accept-Encoding", "gzip")
        .GET();
      if (modified.containsKey(key)) builder.header(
        "If-Modified-Since",
        modified.get(key)
      );
      var response = client.send(
        builder.build(),
        HttpResponse.BodyHandlers.ofByteArray()
      );
      if (response.statusCode() == 304 && old != null && old.data() != null) {
        applyCacheHeaders(key, response.headers(), now);
        Cached validated = new Cached(old.data(), old.fetchedAt(), now, false);
        cache.put(key, validated);
        return validated;
      }
      if (response.statusCode() == 429) {
        Instant resume = now.plusSeconds(900);
        String retry =
          response.headers() == null
            ? ""
            : response.headers().firstValue("Retry-After").orElse("");
        try {
          Instant specified;
          try {
            specified = now.plusSeconds(Long.parseLong(retry));
          } catch (NumberFormatException e) {
            specified = ZonedDateTime.parse(
              retry,
              java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME
            ).toInstant();
          }
          if (specified.isAfter(resume)) resume = specified;
        } catch (RuntimeException ignored) {}
        providerCooldowns.put(host, resume);
        Cached limited = new Cached(
          old == null ? null : old.data(),
          old == null ? null : old.fetchedAt(),
          now,
          true,
          resume
        );
        cache.put(key, limited);
        LOG.warn(
          "Live provider {} rate-limited requests; retry after {}",
          host,
          resume
        );
        return limited;
      }
      if (response.statusCode() != 200) throw new java.io.IOException(
        "Upstream HTTP " + response.statusCode()
      );
      byte[] bytes = response.body();
      if (
        response.headers() != null &&
        response
          .headers()
          .firstValue("Content-Encoding")
          .orElse("")
          .equalsIgnoreCase("gzip")
      ) {
        try (
          var input = new java.util.zip.GZIPInputStream(
            new java.io.ByteArrayInputStream(bytes)
          )
        ) {
          bytes = input.readAllBytes();
        }
      }
      JsonNode body = mapper.readTree(bytes);
      if (key.startsWith("weather-")) {
        JsonNode normalized = MetWeather.normalize(mapper, body, now);
        weatherRaw.put(key, body);
        body = normalized;
      }
      applyCacheHeaders(key, response.headers(), now);
      if (
        key.startsWith("weather-") &&
        (!body.path("current").path("time").isIntegralNumber() ||
          !body.path("current").path("temperature_2m").isNumber())
      ) throw new java.io.IOException("Invalid weather payload");
      if (
        key.equals("earthquakes") &&
        (!body.path("features").isArray() ||
          !body.path("metadata").path("generated").isIntegralNumber())
      ) throw new java.io.IOException("Invalid earthquake payload");
      if (
        key.startsWith("air-") &&
        (!body.path("current").path("time").isIntegralNumber() ||
          !body.path("current").path("us_aqi").isNumber() ||
          !body.path("current").path("pm2_5").isNumber() ||
          !body.path("current").path("pm10").isNumber())
      ) throw new java.io.IOException("Invalid air quality payload");
      Cached value = new Cached(body, Instant.now(), now, false);
      cache.put(key, value);
      return value;
    } catch (Exception ex) {
      LOG.warn(
        "Live provider {} failed: {}: {}",
        URI.create(url).getHost(),
        ex.getClass().getSimpleName(),
        ex.getMessage()
      );
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

  private void applyCacheHeaders(String key, HttpHeaders headers, Instant now) {
    if (headers == null) return;
    headers.firstValue("Last-Modified").ifPresent(v -> modified.put(key, v));
    headers.firstValue("Expires").ifPresent(v -> {
      try {
        expires.put(
          key,
          ZonedDateTime.parse(
            v,
            java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME
          ).toInstant()
        );
      } catch (RuntimeException ignored) {
        expires.put(key, now.plusSeconds(600));
      }
    });
    if (weatherRaw.size() > 500) weatherRaw
      .keySet()
      .removeIf(k -> !cache.containsKey(k));
    if (expires.size() > 500) expires
      .keySet()
      .removeIf(k -> !cache.containsKey(k));
    if (modified.size() > 500) modified
      .keySet()
      .removeIf(k -> !cache.containsKey(k));
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
    out.put("retryAt", c.retryAt());
    out.put(
      "message",
      c.retryAt() != null && Instant.now().isBefore(c.retryAt())
        ? "Provider rate limit reached. Requests are paused until " +
            c.retryAt() +
            ". Any displayed values are last-known data."
        : c.failed()
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
    var point = point(stateCode, latitude, longitude);
    var region = point.region();
    double lat = point.latitude(),
      lon = point.longitude();
    String coords = point.key();
    String url = String.format(
      Locale.ROOT,
      "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=%.2f&lon=%.2f",
      lat,
      lon
    );
    Cached c = fetch("weather-" + coords, url, 600);
    var out = envelope(c, "MET Norway", "https://api.met.no/");
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
      "Weather forecasts by MET Norway, CC BY 4.0. NEXUS converts wind units and selects forecast intervals."
    );
    out.put("refreshSeconds", 600);
    JsonNode data = c.data();
    JsonNode raw = weatherRaw.get("weather-" + coords);
    if (raw != null && data != null) {
      try {
        data = MetWeather.normalize(mapper, raw, Instant.now());
      } catch (RuntimeException expired) {
        out.put("status", "STALE");
        out.put(
          "message",
          "The cached forecast is out of date. Check its valid time; fresh provider data is not available yet."
        );
      }
    }
    out.put("data", data);
    return out;
  }

  private record Point(
    IndiaRegions.Region region,
    double latitude,
    double longitude,
    String key
  ) {}

  private Point point(String stateCode, Double latitude, Double longitude) {
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
    return new Point(region, lat, lon, coords);
  }

  public Map<String, Object> airQuality(
    String stateCode,
    Double latitude,
    Double longitude
  ) {
    var point = point(stateCode, latitude, longitude);
    String url = String.format(
      Locale.ROOT,
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=%.2f&longitude=%.2f&current=us_aqi,pm2_5,pm10&domains=cams_global&timezone=Asia%%2FKolkata&timeformat=unixtime",
      point.latitude(),
      point.longitude()
    );
    Cached c = fetch("air-" + point.key(), url, 600);
    var out = envelope(
      c,
      "Open-Meteo / CAMS",
      "https://open-meteo.com/en/docs/air-quality-api"
    );
    out.put("state", point.region());
    out.put("latitude", point.latitude());
    out.put("longitude", point.longitude());
    out.put(
      "locationLabel",
      latitude == null
        ? point.region().sampleLocation() + " sample location"
        : "Selected coordinates"
    );
    out.put(
      "coverage",
      "CAMS global model estimates at approximately 45 km resolution, not a local sensor reading. US AQI is not India's CPCB AQI."
    );
    out.put(
      "attribution",
      "Air quality data by Open-Meteo and Copernicus Atmosphere Monitoring Service (CAMS), CC BY 4.0."
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
        !coords.get(1).isNumber() ||
        !p.path("time").isIntegralNumber() ||
        !p.path("updated").isIntegralNumber()
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
        p.path("mag").isNumber() ? p.path("mag").asDouble() : null
      );
      item.put("latitude", lat);
      item.put("longitude", lon);
      item.put(
        "depthKm",
        coords.size() > 2 && coords.get(2).isNumber()
          ? coords.get(2).asDouble()
          : null
      );
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
