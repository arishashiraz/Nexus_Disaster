package com.nexus.disasterresponse.repository;

import com.nexus.disasterresponse.entity.Models.*;
import jakarta.persistence.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class Store {

  @PersistenceContext
  private EntityManager em;

  public <T> List<T> all(Class<T> type) {
    return em
      .createQuery("from " + type.getSimpleName() + " order by id desc", type)
      .getResultList();
  }

  public <T> T get(Class<T> type, Long id) {
    T value = em.find(type, id);
    if (
      value == null
    ) throw new org.springframework.web.server.ResponseStatusException(
      org.springframework.http.HttpStatus.NOT_FOUND,
      "Record not found"
    );
    return value;
  }

  public <T> T save(T value) {
    em.persist(value);
    return value;
  }

  public <T> T merge(T value) {
    return em.merge(value);
  }

  public User user(String email) {
    return em
      .createQuery("from User where email=:email", User.class)
      .setParameter("email", email)
      .getResultStream()
      .findFirst()
      .orElse(null);
  }

  public <T> T lock(Class<T> type, Long id) {
    T value = get(type, id);
    em.lock(value, LockModeType.PESSIMISTIC_WRITE);
    em.refresh(value);
    return value;
  }

  public long count(Class<?> type) {
    return em
      .createQuery(
        "select count(e) from " + type.getSimpleName() + " e",
        Long.class
      )
      .getSingleResult();
  }
}
