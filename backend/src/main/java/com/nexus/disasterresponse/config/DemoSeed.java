package com.nexus.disasterresponse.config;

import com.nexus.disasterresponse.entity.Models.*;
import com.nexus.disasterresponse.repository.Store;
import com.nexus.disasterresponse.service.Operations;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoSeed implements CommandLineRunner {

  private final Store db;
  private final PasswordEncoder passwords;
  private final Operations op;
  private final boolean enabled;

  public DemoSeed(
    Store db,
    PasswordEncoder passwords,
    Operations op,
    @Value("${nexus.seed}") boolean enabled
  ) {
    this.db = db;
    this.passwords = passwords;
    this.op = op;
    this.enabled = enabled;
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (!enabled || db.user("admin@nexus.demo") != null) return;
    Team north = new Team();
    north.name = "Chennai North Rescue";
    north.baseLocation = "Anna Nagar";
    db.save(north);
    Team coast = new Team();
    coast.name = "Coastal Response Unit";
    coast.baseLocation = "Adyar";
    db.save(coast);
    User admin = user("Aarav Raman", "admin", "ADMIN", null);
    User[] citizens = {
      user("Priya Kumar", "citizen", "CITIZEN", null),
      user("Arun Selvam", "citizen2", "CITIZEN", null),
      user("Meena Ravi", "citizen3", "CITIZEN", null),
    };
    User[] volunteers = {
      user("Kavya Raj", "volunteer", "VOLUNTEER", null),
      user("Naveen Das", "volunteer2", "VOLUNTEER", null),
      user("Divya S", "volunteer3", "VOLUNTEER", null),
    };
    User[] responders = {
      user("Vikram Shah", "responder", "RESPONDER", north),
      user("Rani Devi", "responder2", "RESPONDER", coast),
      user("Sanjay Rao", "responder3", "RESPONDER", north),
    };
    String[] places = {
      "Velachery",
      "Adyar",
      "Tambaram",
      "Anna Nagar",
      "T Nagar",
      "Ennore",
      "Porur",
      "Pallikaranai",
      "Mylapore",
      "Guindy",
      "Thiruvanmiyur",
      "Ambattur",
    };
    double[] lat = {
      12.9815,
      13.0012,
      12.9249,
      13.0850,
      13.0418,
      13.2146,
      13.0382,
      12.9344,
      13.0338,
      13.0067,
      12.9830,
      13.1143,
    };
    double[] lon = {
      80.2180,
      80.2565,
      80.1000,
      80.2101,
      80.2341,
      80.3203,
      80.1565,
      80.2081,
      80.2696,
      80.2206,
      80.2594,
      80.1548,
    };
    String[] types = {
      "FLOOD",
      "FIRE",
      "FLOOD",
      "ACCIDENT",
      "OTHER",
      "CYCLONE",
      "FLOOD",
      "FLOOD",
      "FIRE",
      "ACCIDENT",
      "CYCLONE",
      "LANDSLIDE",
    };
    String[] titles = {
      "Rising water near residential blocks",
      "Smoke reported at local warehouse",
      "Families need evacuation support",
      "Road blocked after collision",
      "Community shelter assistance",
      "High winds along coastal roads",
      "Waterlogging near main junction",
      "Floodwater entering low-lying homes",
      "Fire response at market street",
      "Traffic collision near junction",
      "Coastal evacuation assistance",
      "Debris blocking access road",
    };
    for (int n = 0; n < 12; n++) {
      Incident i = new Incident();
      i.stateCode = "TN";
      i.district = "Chennai region";
      i.dataSource = "DEMO";
      i.title = titles[n];
      i.type = types[n];
      i.location = places[n] + ", Chennai";
      i.latitude = lat[n];
      i.longitude = lon[n];
      i.description =
        "FICTIONAL DEMONSTRATION: " +
        titles[n] +
        ". Coordinate local support and confirm conditions before dispatch.";
      i.affectedPeople = 5 + n * 13;
      i.severity = n % 4 == 0 ? "CRITICAL" : n % 3 == 0 ? "HIGH" : "MEDIUM";
      i.priority = i.severity;
      i.reporter = citizens[n % 3];
      i.contact = "Demo contact only";
      i.createdAt = Instant.now().minusSeconds(n * 86400L * 12);
      i.verification = n < 3 ? "PENDING" : "VERIFIED";
      i.status = n >= 10 ? "RESOLVED" : n >= 5 ? "IN_PROGRESS" : "REPORTED";
      db.save(i);
      op.history(
        i,
        admin,
        i.status,
        "Fictional demonstration incident initialized"
      );
      if (n >= 5) {
        Assignment a = new Assignment();
        a.incident = i;
        a.assignee = responders[n % 3];
        a.kind = "RESPONDER";
        a.task = "Coordinate evacuation and on-site assessment";
        a.status = i.status;
        db.save(a);
        Assignment v = new Assignment();
        v.incident = i;
        v.assignee = volunteers[n % 3];
        v.kind = "VOLUNTEER";
        v.task = "Support relief distribution and household checks";
        v.status = n >= 10 ? "COMPLETED" : "ASSIGNED";
        db.save(v);
      }
    }
    String[] names = {
      "Drinking water",
      "Food kits",
      "First-aid kits",
      "Shelter spaces",
      "Rescue assistance",
      "Emergency supplies",
    };
    for (int n = 0; n < names.length; n++) {
      Resource r = new Resource();
      r.name = names[n];
      r.category = new String[] {
        "WATER",
        "FOOD",
        "MEDICINE",
        "SHELTER",
        "RESCUE",
        "OTHER",
      }[n];
      r.unit = n == 3 ? "spaces" : "kits";
      r.quantity = 100 + n * 75;
      db.save(r);
      if (n < 3) {
        ResourceRequest q = new ResourceRequest();
        q.resource = r;
        q.requester = citizens[n];
        q.quantity = 10 + n * 5;
        q.location = places[n];
        q.reason = "Fictional demonstration relief request";
        db.save(q);
      }
    }
    Alert a = new Alert();
    a.title = "Heavy rainfall preparedness";
    a.message =
      "DEMO ALERT: Avoid waterlogged routes. Keep essential supplies ready and follow local authority instructions. This is fictional demonstration data.";
    a.severity = "HIGH";
    a.location = "Chennai district";
    a.author = admin;
    db.save(a);
    Alert b = new Alert();
    b.title = "Relief distribution coordination";
    b.message =
      "DEMO ALERT: Volunteers should check their assigned tasks before travelling to a relief center.";
    b.severity = "MEDIUM";
    b.location = "Tamil Nadu";
    b.author = admin;
    db.save(b);
  }

  private User user(String name, String email, String role, Team team) {
    User u = new User();
    u.name = name;
    u.email = email + "@nexus.demo";
    u.password = passwords.encode("NexusDemo123!");
    u.role = role;
    u.team = team;
    u.skills = role.equals("VOLUNTEER") ? "First aid, relief distribution" : "";
    return db.save(u);
  }
}
