package com.nexus.disasterresponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:nexus_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false",
    "nexus.seed=true",
  }
)
@AutoConfigureMockMvc
class WorkflowTest extends ApiTestSupport {

  @Test
  void completeFloodWorkflow() throws Exception {
    String citizen = login("citizen"),
      admin = login("admin"),
      responder = login("responder");
    JsonNode i = report(citizen);
    long id = i.get("id").asLong();
    assertEquals("PENDING", i.get("verification").asText());
    JsonNode reviewed = call(
      "PATCH",
      "/incidents/" + id + "/verify",
      admin,
      Map.of(
        "verification",
        "VERIFIED",
        "priority",
        "HIGH",
        "severity",
        "CRITICAL",
        "note",
        "Confirmed by coordinator"
      ),
      200
    );
    assertEquals("CRITICAL", reviewed.get("severity").asText());
    JsonNode a = call(
      "POST",
      "/assignments",
      admin,
      Map.of(
        "incidentId",
        id,
        "assigneeId",
        person(admin, "responder@nexus.demo"),
        "task",
        "Evacuate affected residents"
      ),
      201
    );
    long aid = a.get("id").asLong();
    call(
      "PATCH",
      "/assignments/" + aid + "/status",
      responder,
      Map.of("status", "IN_PROGRESS", "note", "Team arrived"),
      200
    );
    call(
      "PATCH",
      "/assignments/" + aid + "/status",
      responder,
      Map.of("status", "RESOLVED", "note", "Residents safely evacuated"),
      200
    );
    assertEquals(
      "RESOLVED",
      call("GET", "/incidents/" + id, citizen, null, 200)
        .get("status")
        .asText()
    );
    assertTrue(
      call("GET", "/incidents/" + id + "/history", citizen, null, 200).size() >=
        5
    );
    assertTrue(
      call("GET", "/analytics/overview", admin, null, 200)
        .get("resolved")
        .asInt() > 0
    );
  }

  @Test
  void registrationAndAccessControls() throws Exception {
    String email = "test-" + UUID.randomUUID() + "@example.com";
    var body = Map.of(
      "name",
      "Test Citizen",
      "email",
      email,
      "password",
      "TestPassword123!",
      "role",
      "CITIZEN"
    );
    JsonNode registered = call("POST", "/auth/register", null, body, 201);
    assertFalse(registered.get("user").has("password"));
    String token = registered.get("token").asText();
    call("POST", "/auth/register", null, body, 409);
    call(
      "POST",
      "/auth/register",
      null,
      Map.of(
        "name",
        "Imposter",
        "email",
        "bad@example.com",
        "password",
        "TestPassword123!",
        "role",
        "ADMIN"
      ),
      400
    );
    call(
      "POST",
      "/auth/register",
      null,
      Map.of(
        "name",
        "Imposter",
        "email",
        "bad@example.com",
        "password",
        "TestPassword123!",
        "role",
        "RESPONDER"
      ),
      400
    );
    call("GET", "/incidents", null, null, 401);
    call("GET", "/incidents", "invalid.jwt.token", null, 401);
    call("GET", "/users", token, null, 403);
    call("GET", "/analytics/incidents", token, null, 403);
    call(
      "POST",
      "/auth/login",
      null,
      Map.of("email", email, "password", "wrong"),
      401
    );
    var own = report(token);
    String other = login("citizen2");
    call("GET", "/incidents/" + own.get("id").asLong(), other, null, 404);
    call(
      "PATCH",
      "/incidents/" + own.get("id").asLong() + "/verify",
      token,
      Map.of("verification", "VERIFIED", "priority", "LOW"),
      403
    );
  }

  @Test
  void resourceAllocationIsAtomicAndCannotRepeat() throws Exception {
    String admin = login("admin"),
      citizen = login("citizen");
    JsonNode r = call(
      "POST",
      "/resources",
      admin,
      Map.of(
        "name",
        "Test water " + UUID.randomUUID(),
        "category",
        "WATER",
        "unit",
        "liters",
        "quantity",
        10
      ),
      201
    );
    long rid = r.get("id").asLong();
    JsonNode q = call(
      "POST",
      "/resource-requests",
      citizen,
      Map.of(
        "resourceId",
        rid,
        "quantity",
        7,
        "location",
        "Chennai",
        "reason",
        "Test allocation"
      ),
      201
    );
    String path = "/resource-requests/" + q.get("id").asLong() + "/review";
    call("PATCH", path, citizen, Map.of("status", "APPROVED"), 403);
    call("PATCH", path, admin, Map.of("status", "APPROVED"), 200);
    call("PATCH", path, admin, Map.of("status", "APPROVED"), 400);
    JsonNode q2 = call(
      "POST",
      "/resource-requests",
      citizen,
      Map.of(
        "resourceId",
        rid,
        "quantity",
        4,
        "location",
        "Chennai",
        "reason",
        "Exceeds remaining stock"
      ),
      201
    );
    call(
      "PATCH",
      "/resource-requests/" + q2.get("id").asLong() + "/review",
      admin,
      Map.of("status", "APPROVED"),
      400
    );
    for (JsonNode stock : call("GET", "/resources", admin, null, 200))
      if (stock.get("id").asLong() == rid) assertEquals(
        3,
        stock.get("quantity").asInt()
      );
    call("PATCH", "/resources/" + rid, admin, Map.of("quantity", -1), 400);
  }

  @Test
  void volunteerOwnershipAndProgress() throws Exception {
    String admin = login("admin"),
      volunteer = login("volunteer"),
      other = login("volunteer2");
    long id = report(login("citizen")).get("id").asLong();
    call(
      "PATCH",
      "/incidents/" + id + "/verify",
      admin,
      Map.of("verification", "VERIFIED", "priority", "MEDIUM"),
      200
    );
    long aid = call(
      "POST",
      "/assignments",
      admin,
      Map.of(
        "incidentId",
        id,
        "assigneeId",
        person(admin, "volunteer@nexus.demo"),
        "task",
        "Distribute food kits"
      ),
      201
    )
      .get("id")
      .asLong();
    call(
      "PATCH",
      "/assignments/" + aid + "/status",
      other,
      Map.of("status", "ACCEPTED"),
      403
    );
    call(
      "PATCH",
      "/assignments/" + aid + "/status",
      volunteer,
      Map.of("status", "COMPLETED"),
      400
    );
    for (String status : List.of("ACCEPTED", "IN_PROGRESS", "COMPLETED"))
      call(
        "PATCH",
        "/assignments/" + aid + "/status",
        volunteer,
        Map.of("status", status, "note", "Test progress"),
        200
      );
    assertEquals(
      4,
      call(
        "GET",
        "/assignments/" + aid + "/history",
        volunteer,
        null,
        200
      ).size()
    );
  }

  @Test
  void alertsProfilesAndAnalyticsPersist() throws Exception {
    String admin = login("admin"),
      citizen = login("citizen");
    String title = "Test alert " + UUID.randomUUID();
    var alert = Map.of(
      "title",
      title,
      "message",
      "Fictional test bulletin",
      "severity",
      "HIGH",
      "location",
      "Chennai"
    );
    call("POST", "/alerts", citizen, alert, 403);
    call("POST", "/alerts", admin, alert, 201);
    assertTrue(
      call("GET", "/alerts", citizen, null, 200).toString().contains(title)
    );
    call(
      "PATCH",
      "/auth/me",
      citizen,
      Map.of(
        "name",
        "Priya Kumar",
        "phone",
        "Test number",
        "skills",
        "First aid",
        "available",
        true
      ),
      200
    );
    assertEquals(
      "First aid",
      call("GET", "/auth/me", citizen, null, 200).get("skills").asText()
    );
    assertTrue(
      call("GET", "/analytics/incidents", admin, null, 200).has("monthly")
    );
  }

  @Test
  void validationRejectsMalformedIncident() throws Exception {
    call(
      "POST",
      "/incidents",
      login("citizen"),
      Map.of(
        "title",
        "",
        "type",
        "FLOOD",
        "description",
        "Test",
        "location",
        "Chennai",
        "latitude",
        200,
        "longitude",
        500,
        "severity",
        "HIGH",
        "affectedPeople",
        -1,
        "contact",
        "Test"
      ),
      400
    );
    long id = report(login("citizen")).get("id").asLong();
    call(
      "PATCH",
      "/incidents/" + id + "/status",
      login("admin"),
      Map.of("status", "RESOLVED"),
      400
    );
  }

  @Test
  void localFrontendOriginsAreAllowed() throws Exception {
    for (String origin : List.of(
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    )) {
      var response = mvc
        .perform(
          options("/api/incidents")
            .header("Origin", origin)
            .header("Access-Control-Request-Method", "GET")
            .header("Access-Control-Request-Headers", "authorization")
        )
        .andReturn()
        .getResponse();
      assertEquals(200, response.getStatus());
      assertEquals(origin, response.getHeader("Access-Control-Allow-Origin"));
    }
    var denied = mvc
      .perform(
        options("/api/incidents")
          .header("Origin", "https://untrusted.example")
          .header("Access-Control-Request-Method", "GET")
      )
      .andReturn()
      .getResponse();
    assertEquals(403, denied.getStatus());
  }
}
