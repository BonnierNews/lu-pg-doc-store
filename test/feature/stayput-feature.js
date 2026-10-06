import https from "node:https";
import net from "node:net";

Feature("Network guard", () => {
  Scenario("A test tries to reach a non-local address", () => {
    Then("a raw TCP connection is blocked by stayput", () => {
      (() => net.connect({ host: "8.8.8.8", port: 53 })).should.throw().with.property("code", "EREMOTEBLOCKED");
    });

    And("an HTTPS request is blocked by stayput", () => {
      (() => https.get("https://8.8.8.8/")).should.throw().with.property("code", "EREMOTEBLOCKED");
    });
  });
});
