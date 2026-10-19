package com.nexus.disasterresponse;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;

class SpaTest extends ApiTestSupport {

  @Test
  void publicShellRoutesForwardWithoutExposingApi() throws Exception {
    for (String path : new String[] {
      "/",
      "/app",
      "/login",
      "/unknown",
      "/citizen/live",
      "/admin/dashboard",
    }) {
      mvc
        .perform(get(path))
        .andExpect(status().isOk())
        .andExpect(forwardedUrl("/index.html"));
    }
    call("GET", "/incidents", null, null, 401);
    call("GET", "/live/air-quality?stateCode=DL", null, null, 401);
    call("GET", "/users", login("citizen"), null, 403);
  }
}
