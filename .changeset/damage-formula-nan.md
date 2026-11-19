---
"@rpgjs/server": patch
---

Damage formulas no longer turn HP into `NaN`: a parameter that is not set (such as an `ATK` lost by `changeMap()`) counts as 0, the default skill formula takes a skill without `power` or `coefficient`, and a custom formula that gives no number deals no damage and logs a warning.
