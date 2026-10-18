package com.nexus.disasterresponse.exception;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class Errors {

  @ExceptionHandler(
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class
  )
  ResponseEntity<?> invalidParameter(Exception e) {
    return ResponseEntity.badRequest().body(
      Map.of("message", "Invalid parameter format")
    );
  }

  @ExceptionHandler(org.springframework.dao.CannotAcquireLockException.class)
  ResponseEntity<?> retryConflict(Exception e) {
    return ResponseEntity.status(409).body(
      Map.of("message", "Another update is in progress. Refresh and retry.")
    );
  }

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<?> status(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      Map.of(
        "message",
        e.getReason() == null ? "Request failed" : e.getReason()
      )
    );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> validation(MethodArgumentNotValidException e) {
    return ResponseEntity.badRequest().body(
      Map.of(
        "message",
        e
          .getBindingResult()
          .getFieldErrors()
          .stream()
          .map(f -> f.getField() + ": " + f.getDefaultMessage())
          .findFirst()
          .orElse("Invalid input")
      )
    );
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> conflict(Exception e) {
    return ResponseEntity.status(409).body(
      Map.of(
        "message",
        "This record already exists or conflicts with existing data"
      )
    );
  }

  @ExceptionHandler(
    org.springframework.http.converter.HttpMessageNotReadableException.class
  )
  ResponseEntity<?> malformed(Exception e) {
    return ResponseEntity.badRequest().body(
      Map.of("message", "Invalid request body")
    );
  }
}
