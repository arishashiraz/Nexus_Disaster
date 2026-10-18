package com.nexus.disasterresponse.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

public final class Models {

  @MappedSuperclass
  public abstract static class Base {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false)
    public Instant createdAt = Instant.now();
  }

  @Entity(name = "User")
  @Table(name = "users")
  public static class User extends Base {

    @Column(nullable = false, unique = true)
    public String email;

    @JsonIgnore
    @Column(nullable = false)
    public String password;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false)
    public String role;

    public String phone;

    @Column(length = 500)
    public String skills;

    public boolean available = true;

    @ManyToOne
    public Team team;
  }

  @Entity(name = "Team")
  @Table(name = "rescue_teams")
  public static class Team extends Base {

    public String name;
    public String baseLocation;
  }

  @Entity(name = "Incident")
  @Table(name = "incidents")
  public static class Incident extends Base {

    public String title;
    public String type;

    @Column(length = 4000)
    public String description;

    public String location;

    @Column(length = 10)
    public String stateCode;

    @Column(length = 120)
    public String district;

    @Column(length = 40, nullable = false)
    public String dataSource = "CITIZEN_REPORT";

    public Double latitude;
    public Double longitude;
    public String severity;
    public int affectedPeople;
    public String contact;
    public String priority = "MEDIUM";
    public String verification = "PENDING";
    public String status = "REPORTED";

    @ManyToOne(optional = false)
    public User reporter;
  }

  @Entity(name = "History")
  @Table(name = "incident_status_history")
  public static class History extends Base {

    @ManyToOne(optional = false)
    @JsonIgnore
    public Incident incident;

    @ManyToOne(optional = false)
    public User actor;

    public String status;

    @Column(length = 2400)
    public String note;
  }

  @Entity(name = "Assignment")
  @Table(name = "assignments")
  public static class Assignment extends Base {

    @ManyToOne(optional = false)
    public Incident incident;

    @ManyToOne(optional = false)
    public User assignee;

    public String kind;
    public String task;
    public String status = "ASSIGNED";

    @Column(length = 2000)
    public String note;
  }

  @Entity(name = "AssignmentHistory")
  @Table(name = "assignment_history")
  public static class AssignmentHistory extends Base {

    @ManyToOne(optional = false)
    @JsonIgnore
    public Assignment assignment;

    public String status;

    @Column(length = 2000)
    public String note;
  }

  @Entity(name = "Resource")
  @Table(name = "resources")
  public static class Resource extends Base {

    @Column(unique = true)
    public String name;

    public String category;
    public String unit;
    public int quantity;
  }

  @Entity(name = "ResourceRequest")
  @Table(name = "resource_requests")
  public static class ResourceRequest extends Base {

    @ManyToOne(optional = false)
    public User requester;

    @ManyToOne(optional = false)
    public Resource resource;

    public int quantity;
    public String location;
    public String reason;
    public String status = "PENDING";
    public String reviewNote;
  }

  @Entity(name = "Allocation")
  @Table(name = "resource_allocations")
  public static class Allocation extends Base {

    @OneToOne(optional = false)
    public ResourceRequest request;

    @ManyToOne(optional = false)
    public User approvedBy;

    public int quantity;
  }

  @Entity(name = "Alert")
  @Table(name = "emergency_alerts")
  public static class Alert extends Base {

    public String title;

    @Column(length = 4000)
    public String message;

    public String severity;
    public String location;

    @ManyToOne(optional = false)
    public User author;
  }
}
