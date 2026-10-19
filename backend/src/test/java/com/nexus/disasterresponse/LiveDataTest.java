package com.nexus.disasterresponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.disasterresponse.service.*;
import java.io.IOException;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class LiveDataTest {

  private String metPayload() {
    String time = java.time.Instant.now().toString();
    return (
      "{\"properties\":{\"meta\":{\"updated_at\":\"" +
      time +
      "\"},\"timeseries\":[{\"time\":\"" +
      time +
      "\",\"data\":{\"instant\":{\"details\":{\"air_temperature\":25,\"wind_speed\":5,\"relative_humidity\":60}},\"next_6_hours\":{\"summary\":{\"symbol_code\":\"rain\"},\"details\":{\"precipitation_amount\":2}}}}]}}"
    );
  }

  @Test
  @SuppressWarnings("unchecked")
  void compressedWeatherHonorsProviderExpiry() throws Exception {
    var service = service(metPayload(), 200);
    HttpClient client = (HttpClient) ReflectionTestUtils.getField(
      service,
      "client"
    );
    HttpResponse<byte[]> response = mock(HttpResponse.class);
    var buffer = new java.io.ByteArrayOutputStream();
    try (var gzip = new java.util.zip.GZIPOutputStream(buffer)) {
      gzip.write(
        metPayload().getBytes(java.nio.charset.StandardCharsets.UTF_8)
      );
    }
    when(response.statusCode()).thenReturn(200);
    when(response.body()).thenReturn(buffer.toByteArray());
    when(response.headers()).thenReturn(
      HttpHeaders.of(
        Map.of(
          "Content-Encoding",
          List.of("gzip"),
          "Expires",
          List.of(
            java.time.ZonedDateTime.now(java.time.ZoneOffset.UTC)
              .plusHours(2)
              .format(java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME)
          )
        ),
        (a, b) -> true
      )
    );
    when(
      client.send(
        any(HttpRequest.class),
        org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
      )
    ).thenReturn(response);
    assertEquals("AVAILABLE", service.weather("DL", null, null).get("status"));
    Map<String, Object> cache = (Map<
      String,
      Object
    >) ReflectionTestUtils.getField(service, "cache");
    var entry = cache.entrySet().iterator().next();
    var previous = entry.getValue();
    var constructor = previous
      .getClass()
      .getDeclaredConstructor(
        com.fasterxml.jackson.databind.JsonNode.class,
        java.time.Instant.class,
        java.time.Instant.class,
        boolean.class
      );
    constructor.setAccessible(true);
    var getData = previous.getClass().getDeclaredMethod("data");
    getData.setAccessible(true);
    cache.put(
      entry.getKey(),
      constructor.newInstance(
        getData.invoke(previous),
        java.time.Instant.now(),
        java.time.Instant.now().minusSeconds(3600),
        false
      )
    );
    assertEquals("AVAILABLE", service.weather("DL", null, null).get("status"));
    verify(client, times(1)).send(
      any(HttpRequest.class),
      org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
    );
  }

  @Test
  void rateLimitPausesOtherLocationsWithoutInventingData() throws Exception {
    var service = service("{}", 429);
    var first = service.weather("DL", null, null);
    var second = service.weather("TN", null, null);
    assertEquals("UNAVAILABLE", second.get("status"));
    assertNull(second.get("data"));
    assertNotNull(first.get("retryAt"));
    assertEquals(first.get("retryAt"), second.get("retryAt"));
    assertTrue(second.get("message").toString().contains("rate limit"));
    HttpClient client = (HttpClient) ReflectionTestUtils.getField(
      service,
      "client"
    );
    verify(client, times(1)).send(
      any(HttpRequest.class),
      org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
    );
  }

  @Test
  @SuppressWarnings("unchecked")
  void failedRefreshKeepsDatedDataAndMarksItStale() throws Exception {
    var service = service(metPayload(), 200);
    var first = service.weather("DL", null, null);
    Map<String, Object> cache = (Map<
      String,
      Object
    >) ReflectionTestUtils.getField(service, "cache");
    var entry = cache.entrySet().iterator().next();
    Object previous = entry.getValue();
    var constructor = previous
      .getClass()
      .getDeclaredConstructor(
        com.fasterxml.jackson.databind.JsonNode.class,
        java.time.Instant.class,
        java.time.Instant.class,
        boolean.class
      );
    constructor.setAccessible(true);
    cache.put(
      entry.getKey(),
      constructor.newInstance(
        first.get("data"),
        first.get("fetchedAt"),
        java.time.Instant.now().minusSeconds(3600),
        false
      )
    );
    HttpClient client = (HttpClient) ReflectionTestUtils.getField(
      service,
      "client"
    );
    when(
      client.send(
        any(HttpRequest.class),
        org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
      )
    ).thenThrow(new IOException("Provider unavailable"));
    var result = service.weather("DL", null, null);
    assertEquals("STALE", result.get("status"));
    assertEquals(first.get("fetchedAt"), result.get("fetchedAt"));
    assertEquals(first.get("data"), result.get("data"));
  }

  @Test
  @SuppressWarnings("unchecked")
  void failedAirRefreshKeepsOriginalTimestamp() throws Exception {
    var service = service(
      "{\"current\":{\"time\":1792252800,\"us_aqi\":110,\"pm2_5\":38.5,\"pm10\":25}}",
      200
    );
    var first = service.airQuality("DL", null, null);
    Map<String, Object> cache = (Map<
      String,
      Object
    >) ReflectionTestUtils.getField(service, "cache");
    var entry = cache.entrySet().iterator().next();
    Object previous = entry.getValue();
    var constructor = previous
      .getClass()
      .getDeclaredConstructor(
        com.fasterxml.jackson.databind.JsonNode.class,
        java.time.Instant.class,
        java.time.Instant.class,
        boolean.class
      );
    constructor.setAccessible(true);
    cache.put(
      entry.getKey(),
      constructor.newInstance(
        first.get("data"),
        first.get("fetchedAt"),
        java.time.Instant.now().minusSeconds(3600),
        false
      )
    );
    HttpClient client = (HttpClient) ReflectionTestUtils.getField(
      service,
      "client"
    );
    when(
      client.send(
        any(HttpRequest.class),
        org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
      )
    ).thenThrow(new IOException("Provider unavailable"));
    var result = service.airQuality("DL", null, null);
    assertEquals("STALE", result.get("status"));
    assertEquals(first.get("fetchedAt"), result.get("fetchedAt"));
    assertEquals(first.get("data"), result.get("data"));
  }

  @SuppressWarnings("unchecked")
  private LiveDataService service(String payload, int code) throws Exception {
    ObjectMapper mapper = new ObjectMapper();
    var service = new LiveDataService(mapper, new IndiaRegions(mapper));
    HttpClient client = mock(HttpClient.class);
    HttpResponse<byte[]> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(code);
    when(response.body()).thenReturn(
      payload.getBytes(java.nio.charset.StandardCharsets.UTF_8)
    );
    when(
      client.send(
        any(HttpRequest.class),
        org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
      )
    ).thenReturn(response);
    ReflectionTestUtils.setField(service, "client", client);
    return service;
  }

  @Test
  void upstreamFailureNeverReturnsInventedWeather() throws Exception {
    var result = service("{}", 503).weather("DL", null, null);
    assertEquals("UNAVAILABLE", result.get("status"));
    assertNull(result.get("data"));
    assertNull(result.get("fetchedAt"));
  }

  @Test
  void validWeatherIsCachedAndAttributed() throws Exception {
    var service = service(metPayload(), 200);
    var first = service.weather("TN", null, null);
    var second = service.weather("TN", null, null);
    assertEquals("AVAILABLE", first.get("status"));
    assertEquals("MET Norway", first.get("source"));
    assertEquals(first.get("fetchedAt"), second.get("fetchedAt"));
    verify(
      (HttpClient) ReflectionTestUtils.getField(service, "client"),
      times(1)
    ).send(
      any(HttpRequest.class),
      org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
    );
  }

  @Test
  void malformedPayloadIsUnavailableAndRegionalBoundsExcludeOtherContinents()
    throws Exception {
    assertEquals(
      "UNAVAILABLE",
      service("{}", 200).weather("MH", null, null).get("status")
    );
    String payload =
      "{\"metadata\":{\"generated\":1792252800000},\"features\":[{\"id\":\"india-region\",\"geometry\":{\"coordinates\":[77,28,10]},\"properties\":{\"time\":1792252800000,\"updated\":1792252800000,\"mag\":4.1,\"url\":\"https://earthquake.usgs.gov/test\"}},{\"id\":\"outside\",\"geometry\":{\"coordinates\":[-120,40,5]},\"properties\":{}}]}";
    var result = service(payload, 200).earthquakes();
    var events = (List<?>) result.get("events");
    assertEquals(1, events.size());
    assertTrue(result.get("coverage").toString().contains("neighbouring"));
  }

  @Test
  void airQualityIsValidatedCachedAndAttributed() throws Exception {
    var service = service(
      "{\"current\":{\"time\":1792252800,\"us_aqi\":110,\"pm2_5\":38.5,\"pm10\":57.2}}",
      200
    );
    var first = service.airQuality("DL", null, null);
    var second = service.airQuality("DL", null, null);
    assertEquals("AVAILABLE", first.get("status"));
    assertEquals("Open-Meteo / CAMS", first.get("source"));
    assertEquals(first.get("fetchedAt"), second.get("fetchedAt"));
    assertTrue(first.get("coverage").toString().contains("CPCB"));
    verify(
      (HttpClient) ReflectionTestUtils.getField(service, "client"),
      times(1)
    ).send(
      any(HttpRequest.class),
      org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<byte[]>>any()
    );
  }

  @Test
  void missingOrNonNumericPollutionNeverAppearsAsRealData() throws Exception {
    for (String payload : List.of(
      "{}",
      "{\"current\":{\"time\":1792252800,\"us_aqi\":\"bad\",\"pm2_5\":4,\"pm10\":8}}"
    )) {
      var result = service(payload, 200).airQuality("TN", null, null);
      assertEquals("UNAVAILABLE", result.get("status"));
      assertNull(result.get("data"));
    }
    assertEquals(
      "UNAVAILABLE",
      service("{}", 503).airQuality("DL", null, null).get("status")
    );
    assertEquals(
      "UNAVAILABLE",
      service(
        "{\"current\":{\"time\":1792252800,\"temperature_2m\":\"bad\"}}",
        200
      )
        .weather("DL", null, null)
        .get("status")
    );
  }
}
