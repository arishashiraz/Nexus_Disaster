package com.nexus.disasterresponse.controller;

import com.nexus.disasterresponse.service.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class LiveDataApi {

  private final LiveDataService live;
  private final IndiaRegions regions;

  public LiveDataApi(LiveDataService live, IndiaRegions regions) {
    this.live = live;
    this.regions = regions;
  }

  @GetMapping("/regions")
  public Object regions() {
    return regions.all();
  }

  @GetMapping("/live/weather")
  public Object weather(
    @RequestParam String stateCode,
    @RequestParam(required = false) Double latitude,
    @RequestParam(required = false) Double longitude
  ) {
    return live.weather(stateCode, latitude, longitude);
  }

  @GetMapping("/live/earthquakes")
  public Object earthquakes() {
    return live.earthquakes();
  }
}
