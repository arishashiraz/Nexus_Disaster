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
abstract class ApiTestSupport {

  @Autowired
  MockMvc mvc;

  @Autowired
  ObjectMapper json;

  JsonNode call(
    String method,
    String path,
    String token,
    Object body,
    int expected
  ) throws Exception {
    MockHttpServletRequestBuilder b = switch (method) {
      case "POST" -> post("/api" + path);
      case "PATCH" -> patch("/api" + path);
      default -> get("/api" + path);
    };
    if (token != null) b.header("Authorization", "Bearer " + token);
    if (body != null) b.contentType("application/json").content(
      json.writeValueAsString(body)
    );
    var response = mvc.perform(b).andReturn().getResponse();
    assertEquals(expected, response.getStatus(), response.getContentAsString());
    return response.getContentAsString().isEmpty()
      ? json.nullNode()
      : json.readTree(response.getContentAsString());
  }

  String login(String role) throws Exception {
    return call(
      "POST",
      "/auth/login",
      null,
      Map.of("email", role + "@nexus.demo", "password", "NexusDemo123!"),
      200
    )
      .get("token")
      .asText();
  }

  JsonNode report(String token) throws Exception {
    var payload = new HashMap<String, Object>(
      Map.of(
        "title",
        "Test Chennai flood " + UUID.randomUUID(),
        "type",
        "FLOOD",
        "description",
        "Integration test report",
        "location",
        "Velachery, Chennai",
        "latitude",
        12.9815,
        "longitude",
        80.218,
        "severity",
        "HIGH",
        "affectedPeople",
        35,
        "contact",
        "Test contact"
      )
    );
    payload.put("stateCode", "TN");
    payload.put("district", "Chennai");
    return call("POST", "/incidents", token, payload, 201);
  }

  long person(String admin, String email) throws Exception {
    for (JsonNode u : call("GET", "/users", admin, null, 200))
      if (u.get("email").asText().equals(email)) return u.get("id").asLong();
    throw new AssertionError("User not found");
  }
}
