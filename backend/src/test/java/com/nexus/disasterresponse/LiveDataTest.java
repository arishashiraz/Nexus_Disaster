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

  @Test
  @SuppressWarnings("unchecked")
  void failedRefreshKeepsDatedDataAndMarksItStale() throws Exception {
    var service = service(
      "{\"current\":{\"time\":1792252800,\"temperature_2m\":25}}",
      200
    );
    var first = service.weather("DL", null, null);
    Map<String, Object> cache = (Map<
      String,
      Object
    >) ReflectionTestUtils.getField(service, "cache");
    var entry = cache.entrySet().iterator().next();
    Object previous = entry.getValue();
    var constructor = previous.getClass().getDeclaredConstructors()[0];
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
        org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()
      )
    ).thenThrow(new IOException("Provider unavailable"));
    var result = service.weather("DL", null, null);
    assertEquals("STALE", result.get("status"));
    assertEquals(first.get("fetchedAt"), result.get("fetchedAt"));
    assertEquals(first.get("data"), result.get("data"));
  }

  @SuppressWarnings("unchecked")
  private LiveDataService service(String payload, int code) throws Exception {
    ObjectMapper mapper = new ObjectMapper();
    var service = new LiveDataService(mapper, new IndiaRegions(mapper));
    HttpClient client = mock(HttpClient.class);
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(code);
    when(response.body()).thenReturn(payload);
    when(
      client.send(
        any(HttpRequest.class),
        org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()
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
    var service = service(
      "{\"current\":{\"time\":1792252800,\"temperature_2m\":25}}",
      200
    );
    var first = service.weather("TN", null, null);
    var second = service.weather("TN", null, null);
    assertEquals("AVAILABLE", first.get("status"));
    assertEquals("Open-Meteo", first.get("source"));
    assertEquals(first.get("fetchedAt"), second.get("fetchedAt"));
    verify(
      (HttpClient) ReflectionTestUtils.getField(service, "client"),
      times(1)
    ).send(
      any(HttpRequest.class),
      org.mockito.ArgumentMatchers.<HttpResponse.BodyHandler<String>>any()
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
}
