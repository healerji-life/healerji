/**
 * Open-redirect guard tests.
 *
 * Run with `npm test`. No test framework is installed on purpose: Node strips
 * TypeScript natively and ships a test runner, which keeps this in line with
 * the other dependency-free scripts in this directory.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeRedirect, safeRedirectOr } from "../../lib/auth/redirects.ts";

test("accepts same-site absolute paths", () => {
  for (const value of [
    "/",
    "/admin/dashboard",
    "/healer/dashboard",
    "/healers/poonam-khetan",
    "/library/some-article?utm_source=x",
    "/book#slot",
  ]) {
    assert.equal(isSafeRedirect(value), true, `expected safe: ${value}`);
  }
});

test("rejects absolute URLs to another origin", () => {
  for (const value of [
    "https://evil.com",
    "http://evil.com",
    "//evil.com",
    "///evil.com",
    "https:/evil.com",
  ]) {
    assert.equal(isSafeRedirect(value), false, `expected unsafe: ${value}`);
  }
});

test("rejects backslash variants browsers may normalise to a host change", () => {
  for (const value of ["/\\evil.com", "\\\\evil.com", "/\\/evil.com", "/admin\\@evil.com"]) {
    assert.equal(isSafeRedirect(value), false, `expected unsafe: ${value}`);
  }
});

test("rejects control characters and spaces used for header splitting", () => {
  for (const value of ["/admin\r\nLocation: https://evil.com", "/admin\nX: y", "/admin dashboard", "/\tadmin"]) {
    assert.equal(isSafeRedirect(value), false, `expected unsafe: ${JSON.stringify(value)}`);
  }
});

test("rejects empty and non-path values", () => {
  for (const value of ["", "admin", "./admin", "../admin", "javascript:alert(1)", "data:text/html,x"]) {
    assert.equal(isSafeRedirect(value), false, `expected unsafe: ${value}`);
  }
});

test("encoded traversal stays same-origin and is therefore allowed", () => {
  // %2F and friends never leave the origin once the browser resolves them
  // against our host, so they are not an open redirect. Recorded so a future
  // change that starts rejecting them is a deliberate decision.
  assert.equal(isSafeRedirect("/admin/%2E%2E/%2E%2E/evil"), true);
});

test("safeRedirectOr falls back for every rejected value", () => {
  assert.equal(safeRedirectOr("/admin/dashboard", "/"), "/admin/dashboard");
  assert.equal(safeRedirectOr("https://evil.com", "/"), "/");
  assert.equal(safeRedirectOr("//evil.com", "/admin"), "/admin");
  assert.equal(safeRedirectOr(null, "/"), "/");
  assert.equal(safeRedirectOr(undefined, "/"), "/");
  assert.equal(safeRedirectOr("", "/"), "/");
});
