package com.nexus.disasterresponse;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;

/** Uses the same isolated test context and HTTP helpers as the workflow suite. */
class NationwideTest extends ApiTestSupport {

  @Test
  void everyStateAndUnionTerritoryAcceptsReports() throws Exception {
    String citizen = login("citizen");
    var regions = call("GET", "/regions", citizen, null, 200);
    assertEquals(36, regions.size());
    Set<String> codes = new HashSet<>();
    int states = 0,
      territories = 0;
    for (var region : regions) {
      String code = region.get("code").asText();
      assertTrue(codes.add(code));
      if (region.get("kind").asText().equals("STATE")) states++;
      else territories++;
      Map<String, Object> payload = new HashMap<>();
      payload.put("title", "Nationwide test: " + region.get("name").asText());
      payload.put("type", "OTHER");
      payload.put(
        "description",
        "Automated isolated test, not a real incident"
      );
      payload.put("location", region.get("sampleLocation").asText());
      payload.put("latitude", region.get("latitude").asDouble());
      payload.put("longitude", region.get("longitude").asDouble());
      payload.put("severity", "LOW");
      payload.put("affectedPeople", 1);
      payload.put("contact", "Test only");
      payload.put("stateCode", code);
      payload.put("district", "Test district");
      var saved = call("POST", "/incidents", citizen, payload, 201);
      assertEquals(code, saved.get("stateCode").asText());
      assertEquals("Test district", saved.get("district").asText());
      assertEquals("CITIZEN_REPORT", saved.get("dataSource").asText());
      payload.put("stateCode", "INVALID");
      call("POST", "/incidents", citizen, payload, 400);
    }
    assertEquals(28, states);
    assertEquals(8, territories);
  }

  @Test
  void longReviewNotesAndStaleInventoryAreHandled() throws Exception {
    String admin = login("admin"),
      citizen = login("citizen");
    long id = report(citizen).get("id").asLong();
    call(
      "PATCH",
      "/incidents/" + id + "/verify",
      admin,
      Map.of(
        "verification",
        "VERIFIED",
        "priority",
        "HIGH",
        "note",
        "x".repeat(2000)
      ),
      200
    );
    long resource = call(
      "POST",
      "/resources",
      admin,
      Map.of(
        "name",
        "Stale-stock test " + UUID.randomUUID(),
        "category",
        "FOOD",
        "unit",
        "kits",
        "quantity",
        20
      ),
      201
    )
      .get("id")
      .asLong();
    call(
      "PATCH",
      "/resources/" + resource,
      admin,
      Map.of("quantity", 15, "expectedQuantity", 20),
      200
    );
    call(
      "PATCH",
      "/resources/" + resource,
      admin,
      Map.of("quantity", 30, "expectedQuantity", 20),
      400
    );
    call(
      "POST",
      "/resources",
      admin,
      Map.of(
        "name",
        "Invalid category",
        "category",
        "INVALID",
        "unit",
        "kits",
        "quantity",
        1
      ),
      400
    );
  }

  @Test
  void liveRoutesRequireAuthAndValidateCoordinatesBeforeCallingProvider()
    throws Exception {
    call("GET", "/live/earthquakes", null, null, 401);
    String citizen = login("citizen");
    call("GET", "/live/weather?stateCode=INVALID", citizen, null, 400);
    call("GET", "/live/weather?stateCode=DL&latitude=28", citizen, null, 400);
    call(
      "GET",
      "/live/weather?stateCode=DL&latitude=100&longitude=77",
      citizen,
      null,
      400
    );
    call(
      "GET",
      "/live/weather?stateCode=DL&latitude=bad&longitude=77",
      citizen,
      null,
      400
    );
  }
}
