package com.nexus.disasterresponse.service;

import com.nexus.disasterresponse.dto.Inputs.*;
import com.nexus.disasterresponse.entity.Models.*;
import com.nexus.disasterresponse.repository.Store;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class Operations {

  private final Store db;
  private final PasswordEncoder passwords;
  private final JwtEncoder jwt;
  private final IndiaRegions regions;

  public Operations(
    Store db,
    PasswordEncoder passwords,
    JwtEncoder jwt,
    IndiaRegions regions
  ) {
    this.db = db;
    this.passwords = passwords;
    this.jwt = jwt;
    this.regions = regions;
  }

  public static void require(boolean allowed, String message) {
    if (!allowed) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      message
    );
  }

  public Map<String, String> health() {
    db.count(User.class);
    return Map.of("status", "UP", "application", "NEXUS", "database", "UP");
  }

  public void role(User user, String... roles) {
    if (
      !Arrays.asList(roles).contains(user.role)
    ) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Your role cannot perform this action"
    );
  }

  public User current(String email) {
    User u = db.user(email);
    if (u == null) throw new ResponseStatusException(
      HttpStatus.UNAUTHORIZED,
      "Account not found"
    );
    return u;
  }

  public static void choice(String value, String... values) {
    require(
      Arrays.asList(values).contains(value),
      "Unsupported value: " + value
    );
  }

  public Map<String, Object> login(Login input) {
    User u = db.user(input.email().trim().toLowerCase(Locale.ROOT));
    if (
      u == null || !passwords.matches(input.password(), u.password)
    ) throw new ResponseStatusException(
      HttpStatus.UNAUTHORIZED,
      "Email or password is incorrect"
    );
    return session(u);
  }

  public Map<String, Object> register(Register input) {
    choice(input.role(), "CITIZEN", "VOLUNTEER");
    require(
      input
        .password()
        .getBytes(java.nio.charset.StandardCharsets.UTF_8)
        .length <= 72,
      "Password must be at most 72 UTF-8 bytes"
    );
    String email = input.email().trim().toLowerCase(Locale.ROOT);
    if (db.user(email) != null) throw new ResponseStatusException(
      HttpStatus.CONFLICT,
      "Email is already registered"
    );
    User u = new User();
    u.name = input.name().trim();
    u.email = email;
    u.password = passwords.encode(input.password());
    u.role = input.role();
    db.save(u);
    return session(u);
  }

  private Map<String, Object> session(User u) {
    var claims = JwtClaimsSet.builder()
      .issuer("nexus")
      .subject(u.email)
      .issuedAt(Instant.now())
      .expiresAt(Instant.now().plusSeconds(28800))
      .claim("role", u.role)
      .build();
    return Map.of(
      "token",
      jwt
        .encode(
          JwtEncoderParameters.from(
            JwsHeader.with(MacAlgorithm.HS256).build(),
            claims
          )
        )
        .getTokenValue(),
      "user",
      u
    );
  }

  public User profile(User u, Profile p) {
    u.name = p.name();
    u.phone = p.phone();
    u.skills = p.skills();
    u.available = p.available();
    return db.merge(u);
  }

  public List<User> users(User u) {
    role(u, "ADMIN");
    return db.all(User.class);
  }

  public List<Team> teams(User u) {
    role(u, "ADMIN", "RESPONDER");
    return db.all(Team.class);
  }

  public List<Incident> incidents(User u) {
    var all = db.all(Incident.class);
    if (u.role.equals("ADMIN")) return all;
    if (u.role.equals("CITIZEN")) return all
      .stream()
      .filter(i -> i.reporter.id.equals(u.id))
      .toList();
    var ids = assignments(u)
      .stream()
      .map(a -> a.incident.id)
      .collect(Collectors.toSet());
    return all
      .stream()
      .filter(i -> ids.contains(i.id))
      .toList();
  }

  public Incident incident(User u, Long id) {
    return incidents(u)
      .stream()
      .filter(i -> i.id.equals(id))
      .findFirst()
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Incident not found")
      );
  }

  public List<History> history(User u, Long id) {
    incident(u, id);
    return db
      .all(History.class)
      .stream()
      .filter(h -> h.incident.id.equals(id))
      .toList();
  }

  public void history(Incident i, User actor, String status, String note) {
    History h = new History();
    h.incident = i;
    h.actor = actor;
    h.status = status;
    h.note = note;
    db.save(h);
  }

  public Incident report(User u, Report p) {
    role(u, "CITIZEN");
    choice(
      p.type(),
      "FLOOD",
      "FIRE",
      "EARTHQUAKE",
      "CYCLONE",
      "LANDSLIDE",
      "ACCIDENT",
      "OTHER"
    );
    choice(p.severity(), "LOW", "MEDIUM", "HIGH", "CRITICAL");
    regions.get(p.stateCode());
    require(
      p.latitude() >= 6 &&
        p.latitude() <= 38 &&
        p.longitude() >= 68 &&
        p.longitude() <= 98,
      "Choose a location within the India-region map extent"
    );
    Incident i = new Incident();
    i.stateCode = p.stateCode();
    i.district = p.district().trim();
    i.title = p.title();
    i.type = p.type();
    i.description = p.description();
    i.location = p.location();
    i.latitude = p.latitude();
    i.longitude = p.longitude();
    i.severity = p.severity();
    i.affectedPeople = p.affectedPeople();
    i.contact = p.contact();
    i.reporter = u;
    db.save(i);
    history(i, u, "REPORTED", "Report submitted; awaiting verification");
    return i;
  }

  public Map<String, String> recommendation(User u, Long id) {
    Incident i = incident(u, id);
    int score =
      List.of("LOW", "MEDIUM", "HIGH", "CRITICAL").indexOf(i.severity) + 1;
    if (i.affectedPeople >= 100) score += 2;
    else if (i.affectedPeople >= 20) score++;
    if (List.of("FIRE", "EARTHQUAKE", "CYCLONE").contains(i.type)) score++;
    return Map.of(
      "priority",
      score >= 5
        ? "CRITICAL"
        : score >= 3
          ? "HIGH"
          : score >= 2
            ? "MEDIUM"
            : "LOW",
      "reason",
      "Rule score " +
        score +
        ": reported severity, population (20+/100+), and fire/earthquake/cyclone risk. Administrator makes the final decision."
    );
  }

  public Incident verify(User u, Long id, Verify p) {
    role(u, "ADMIN");
    choice(p.verification(), "VERIFIED", "REJECTED");
    choice(p.priority(), "LOW", "MEDIUM", "HIGH", "CRITICAL");
    Incident i = db.lock(Incident.class, id);
    require(
      !i.status.equals("RESOLVED"),
      "Resolved incidents cannot be reviewed again"
    );
    require(
      !p.verification().equals("REJECTED") ||
        db
          .all(Assignment.class)
          .stream()
          .noneMatch(a -> a.incident.id.equals(id)),
      "An assigned incident cannot be rejected"
    );
    if (p.severity() != null) {
      choice(p.severity(), "LOW", "MEDIUM", "HIGH", "CRITICAL");
      i.severity = p.severity();
    }
    i.verification = p.verification();
    i.priority = p.priority();
    history(
      i,
      u,
      p.verification(),
      "Priority: " +
        i.priority +
        "; severity: " +
        i.severity +
        ". " +
        (p.note() == null ? "" : p.note())
    );
    return i;
  }

  public Incident status(User u, Long id, Progress p) {
    role(u, "ADMIN", "RESPONDER");
    Incident i = incident(u, id);
    db.lock(Incident.class, id);
    require(i.verification.equals("VERIFIED"), "Verify the incident first");
    transition(i.status, p.status(), false);
    i.status = p.status();
    history(i, u, p.status(), p.note());
    for (Assignment a : db.all(Assignment.class))
      if (a.incident.id.equals(id) && a.kind.equals("RESPONDER")) {
        a.status = p.status();
        a.note = p.note();
        assignmentHistory(a);
      }
    return i;
  }

  public List<Assignment> assignments(User u) {
    return db
      .all(Assignment.class)
      .stream()
      .filter(a -> u.role.equals("ADMIN") || a.assignee.id.equals(u.id))
      .toList();
  }

  public Assignment assign(User u, Assign p) {
    role(u, "ADMIN");
    Incident i = db.lock(Incident.class, p.incidentId());
    require(
      i.verification.equals("VERIFIED") && !i.status.equals("RESOLVED"),
      "Only active verified incidents can be assigned"
    );
    User assignee = db.get(User.class, p.assigneeId());
    choice(assignee.role, "VOLUNTEER", "RESPONDER");
    require(assignee.available, "This person is unavailable");
    require(
      db
        .all(Assignment.class)
        .stream()
        .noneMatch(
          a -> a.incident.id.equals(i.id) && a.assignee.id.equals(assignee.id)
        ),
      "Person already assigned to this incident"
    );
    Assignment a = new Assignment();
    a.incident = i;
    a.assignee = assignee;
    a.kind = assignee.role;
    a.task = p.task();
    if (
      assignee.role.equals("RESPONDER") && !i.status.equals("REPORTED")
    ) a.status = i.status;
    db.save(a);
    assignmentHistory(a);
    if (assignee.role.equals("RESPONDER") && i.status.equals("REPORTED")) {
      i.status = "ASSIGNED";
      history(i, u, "ASSIGNED", "Assigned to " + assignee.name);
    }
    return a;
  }

  private void assignmentHistory(Assignment a) {
    AssignmentHistory h = new AssignmentHistory();
    h.assignment = a;
    h.status = a.status;
    h.note = a.note;
    db.save(h);
  }

  public List<AssignmentHistory> assignmentHistory(User u, Long id) {
    Assignment a = db.get(Assignment.class, id);
    if (
      !u.role.equals("ADMIN") && !a.assignee.id.equals(u.id)
    ) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Not your assignment"
    );
    return db
      .all(AssignmentHistory.class)
      .stream()
      .filter(h -> h.assignment.id.equals(id))
      .toList();
  }

  public Assignment progress(User u, Long id, Progress p) {
    Assignment a = db.get(Assignment.class, id);
    if (!a.assignee.id.equals(u.id)) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Only the assigned person may update this task"
    );
    if (a.kind.equals("RESPONDER")) {
      status(u, a.incident.id, p);
      return a;
    }
    a = db.lock(Assignment.class, id);
    transition(a.status, p.status(), true);
    a.status = p.status();
    a.note = p.note();
    assignmentHistory(a);
    return a;
  }

  private void transition(String from, String to, boolean volunteer) {
    Map<String, List<String>> flow = volunteer
      ? Map.of(
          "ASSIGNED",
          List.of("ACCEPTED"),
          "ACCEPTED",
          List.of("IN_PROGRESS"),
          "IN_PROGRESS",
          List.of("COMPLETED")
        )
      : Map.of(
          "REPORTED",
          List.of("ASSIGNED"),
          "ASSIGNED",
          List.of("DISPATCHED", "IN_PROGRESS"),
          "DISPATCHED",
          List.of("IN_PROGRESS"),
          "IN_PROGRESS",
          List.of("RESOLVED")
        );
    require(
      flow.getOrDefault(from, List.of()).contains(to),
      "Invalid status transition from " + from + " to " + to
    );
  }

  public List<Resource> resources() {
    return db.all(Resource.class);
  }

  public Resource resource(User u, ResourceInput p) {
    role(u, "ADMIN");
    choice(
      p.category(),
      "FOOD",
      "WATER",
      "MEDICINE",
      "SHELTER",
      "RESCUE",
      "OTHER"
    );
    Resource r = new Resource();
    r.name = p.name();
    r.category = p.category();
    r.unit = p.unit();
    r.quantity = p.quantity();
    return db.save(r);
  }

  public Resource quantity(User u, Long id, Quantity p) {
    role(u, "ADMIN");
    Resource r = db.lock(Resource.class, id);
    require(
      p.expectedQuantity() == null || r.quantity == p.expectedQuantity(),
      "Stock changed since this form loaded. Refresh before editing inventory."
    );
    r.quantity = p.quantity();
    return r;
  }

  public List<ResourceRequest> requests(User u) {
    role(u, "ADMIN", "CITIZEN");
    return db
      .all(ResourceRequest.class)
      .stream()
      .filter(r -> u.role.equals("ADMIN") || r.requester.id.equals(u.id))
      .toList();
  }

  public ResourceRequest request(User u, Request p) {
    role(u, "CITIZEN");
    ResourceRequest r = new ResourceRequest();
    r.requester = u;
    r.resource = db.get(Resource.class, p.resourceId());
    r.quantity = p.quantity();
    r.location = p.location();
    r.reason = p.reason();
    return db.save(r);
  }

  public ResourceRequest review(User u, Long id, Review p) {
    role(u, "ADMIN");
    choice(p.status(), "APPROVED", "REJECTED");
    ResourceRequest r = db.lock(ResourceRequest.class, id);
    require(
      r.status.equals("PENDING"),
      "This request has already been reviewed"
    );
    if (p.status().equals("APPROVED")) {
      Resource stock = db.lock(Resource.class, r.resource.id);
      require(
        stock.quantity >= r.quantity,
        "Insufficient stock; add inventory before approving"
      );
      stock.quantity -= r.quantity;
      Allocation a = new Allocation();
      a.request = r;
      a.approvedBy = u;
      a.quantity = r.quantity;
      db.save(a);
    }
    r.status = p.status();
    r.reviewNote = p.note();
    return r;
  }

  public List<Alert> alerts() {
    return db.all(Alert.class);
  }

  public Alert alert(User u, AlertInput p) {
    role(u, "ADMIN");
    choice(p.severity(), "LOW", "MEDIUM", "HIGH", "CRITICAL");
    Alert a = new Alert();
    a.title = p.title();
    a.message = p.message();
    a.severity = p.severity();
    a.location = p.location();
    a.author = u;
    return db.save(a);
  }

  private List<Map<String, Object>> grouped(List<String> values) {
    return values
      .stream()
      .collect(
        Collectors.groupingBy(x -> x, TreeMap::new, Collectors.counting())
      )
      .entrySet()
      .stream()
      .map(e ->
        Map.<String, Object>of("name", e.getKey(), "value", e.getValue())
      )
      .toList();
  }

  public Map<String, Object> overview(User u) {
    List<Incident> list = incidents(u);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("total", list.size());
    m.put(
      "pending",
      list
        .stream()
        .filter(i -> i.verification.equals("PENDING"))
        .count()
    );
    m.put(
      "active",
      list
        .stream()
        .filter(
          i -> !i.status.equals("RESOLVED") && i.verification.equals("VERIFIED")
        )
        .count()
    );
    m.put(
      "resolved",
      list
        .stream()
        .filter(i -> i.status.equals("RESOLVED"))
        .count()
    );
    m.put(
      "critical",
      list
        .stream()
        .filter(
          i ->
            i.priority.equals("CRITICAL") &&
            i.verification.equals("VERIFIED") &&
            !i.status.equals("RESOLVED")
        )
        .count()
    );
    m.put("assignments", assignments(u).size());
    if (u.role.equals("ADMIN")) {
      m.put(
        "volunteers",
        db
          .all(User.class)
          .stream()
          .filter(x -> x.role.equals("VOLUNTEER") && x.available)
          .count()
      );
      m.put("teams", db.count(Team.class));
      m.put(
        "requests",
        requests(u)
          .stream()
          .filter(r -> r.status.equals("PENDING"))
          .count()
      );
    }
    return m;
  }

  public Map<String, Object> analytics(User u) {
    role(u, "ADMIN");
    var list = db.all(Incident.class);
    return Map.of(
      "byType",
      grouped(
        list
          .stream()
          .map(i -> i.type)
          .toList()
      ),
      "byPriority",
      grouped(
        list
          .stream()
          .map(i -> i.priority)
          .toList()
      ),
      "byStatus",
      grouped(
        list
          .stream()
          .map(i -> i.status)
          .toList()
      ),
      "monthly",
      grouped(
        list
          .stream()
          .map(i ->
            i.createdAt
              .atZone(ZoneId.of("Asia/Kolkata"))
              .toLocalDate()
              .toString()
              .substring(0, 7)
          )
          .toList()
      ),
      "volunteers",
      grouped(
        db
          .all(Assignment.class)
          .stream()
          .filter(a -> a.kind.equals("VOLUNTEER"))
          .map(a -> a.status)
          .toList()
      )
    );
  }
}
