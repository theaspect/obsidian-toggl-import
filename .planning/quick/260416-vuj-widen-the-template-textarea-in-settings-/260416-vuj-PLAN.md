---
quick_id: 260416-vuj
type: quick
autonomous: true
files_modified:
  - src/settings.ts
---

<objective>
Widen the template textarea in settings so it's full width.
</objective>

<tasks>
<task type="auto">
  <name>Task 1: Set textarea width to 100%</name>
  <files>src/settings.ts</files>
  <action>
    Chain `.then(c => { c.inputEl.style.width = '100%'; })` on the addTextArea call for the template string field.
  </action>
  <done>Template textarea renders at full width in the settings panel.</done>
</task>
</tasks>
