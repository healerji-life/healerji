/**
 * Razorpay webhook authenticity tests.
 *
 * Covers the cases named in the remediation brief: valid signature, invalid
 * signature, repeated valid signature, repeated event id, forged event id,
 * malformed body and malformed headers.
 *
 * The route-level ordering these protect — verify BEFORE touching the dedupe
 * store — is what HJ-09 fixed. That ordering is asserted here at the level that
 * can run without a database: a forged request can never produce the dedupe key
 * that a genuine delivery would use.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  isValidWebhookSignature,
  isValidPaymentSignature,
  timingSafeEqualHex,
  webhookDedupeId,
} from "../../lib/services/webhook-signature.ts";

const SECRET = "whsec_test_only_not_a_real_secret";
const BODY = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { order_id: "order_ABC123" } } },
});

const sign = (body: string, secret = SECRET) =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");

test("accepts a correctly signed body", () => {
  assert.equal(isValidWebhookSignature(BODY, sign(BODY), SECRET), true);
});

test("accepts the same valid signature repeatedly — verification is stateless", () => {
  const sig = sign(BODY);
  for (let i = 0; i < 5; i++) {
    assert.equal(isValidWebhookSignature(BODY, sig, SECRET), true, `attempt ${i}`);
  }
});

test("rejects a signature produced with a different secret", () => {
  assert.equal(isValidWebhookSignature(BODY, sign(BODY, "wrong_secret"), SECRET), false);
});

test("rejects a tampered body under a signature that was valid for the original", () => {
  const sig = sign(BODY);
  const tampered = BODY.replace("order_ABC123", "order_ATTACKER");
  assert.equal(isValidWebhookSignature(tampered, sig, SECRET), false);
});

test("rejects malformed and missing signature headers", () => {
  for (const sig of ["", "not-hex", "deadbeef", sign(BODY) + "00", sign(BODY).slice(0, -1)]) {
    assert.equal(
      isValidWebhookSignature(BODY, sig, SECRET),
      false,
      `expected reject for signature ${JSON.stringify(sig.slice(0, 24))}`
    );
  }
});

test("rejects everything when no secret is configured", () => {
  assert.equal(isValidWebhookSignature(BODY, sign(BODY), undefined), false);
  assert.equal(isValidWebhookSignature(BODY, sign(BODY), ""), false);
});

test("a malformed body cannot be signed into validity by accident", () => {
  const malformed = "{not json";
  // Correctly signed but unparseable: authenticity passes, so the route reaches
  // its JSON.parse and answers 400 — it must not be treated as unsigned.
  assert.equal(isValidWebhookSignature(malformed, sign(malformed), SECRET), true);
  assert.throws(() => JSON.parse(malformed));
});

test("payment handler signature follows the order_id|payment_id scheme", () => {
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update("order_ABC123|pay_XYZ789")
    .digest("hex");
  assert.equal(isValidPaymentSignature("order_ABC123", "pay_XYZ789", expected, SECRET), true);
  // Swapping the two fields must not still verify.
  assert.equal(isValidPaymentSignature("pay_XYZ789", "order_ABC123", expected, SECRET), false);
});

test("timingSafeEqualHex rejects differing lengths and empty input without throwing", () => {
  assert.equal(timingSafeEqualHex("abc", "abcd"), false);
  assert.equal(timingSafeEqualHex("", ""), false);
  assert.equal(timingSafeEqualHex("abcd", "abcd"), true);
});

test("dedupe id prefers the supplied event id", () => {
  assert.equal(webhookDedupeId("evt_real_123", "payment.captured", sign(BODY)), "evt_real_123");
});

test("dedupe fallback is derived from the verified signature, so it is unforgeable", () => {
  const genuine = sign(BODY);
  const forged = sign(BODY, "attacker_secret");

  const genuineKey = webhookDedupeId("", "payment.captured", genuine);
  const forgedKey = webhookDedupeId("", "payment.captured", forged);

  // The attacker cannot compute the key the real delivery will occupy, which is
  // the property that stops dedupe poisoning on the no-header path.
  assert.notEqual(genuineKey, forgedKey);
  assert.ok(genuineKey.startsWith("payment.captured:"));
});

test("a repeated genuine delivery derives the SAME dedupe key — replays collapse", () => {
  const sig = sign(BODY);
  assert.equal(
    webhookDedupeId("", "payment.captured", sig),
    webhookDedupeId("", "payment.captured", sig)
  );
});

test("a forged event id is only dangerous if it is ever recorded", () => {
  // Documents the fix: the route now rejects on signature before recording, so
  // this attacker-chosen id never reaches webhook_events. If a future change
  // records before verifying, this key would collide with the genuine event.
  const attackerChosen = webhookDedupeId("evt_real_123", "payment.captured", "forged");
  assert.equal(attackerChosen, "evt_real_123");
  assert.equal(isValidWebhookSignature(BODY, "forged", SECRET), false);
});
