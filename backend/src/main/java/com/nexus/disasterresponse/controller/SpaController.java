package com.nexus.disasterresponse.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Serves the bundled PWA on the same HTTPS origin as the API. */
@Controller
public class SpaController {

  @GetMapping({
    "/",
    "/app",
    "/login",
    "/register",
    "/about",
    "/unauthorized",
    "/{page:[a-zA-Z0-9_-]+}",
    "/citizen",
    "/citizen/{page}",
    "/volunteer",
    "/volunteer/{page}",
    "/responder",
    "/responder/{page}",
    "/admin",
    "/admin/{page}",
  })
  public String app() {
    return "forward:/index.html";
  }
}
