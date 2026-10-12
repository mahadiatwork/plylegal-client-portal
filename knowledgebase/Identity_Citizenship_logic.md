Here is the logic breakdown in Markdown. You can copy and paste this directly to your AI to fix the hallucination.

***

# Identity Section: Conditional Logic Fix

This document outlines the correct conditional rendering logic for the **Identity** section of the questionnaire. The AI is currently hallucinating the visibility rules; strictly follow the branching logic below.

---

## Notes from implementation (problems encountered & solutions)

- **Problem:** Dialog components passed `onSubmit` while `RepeaterTable` called `onSave`, causing runtime errors (`onSubmit is not a function`).  
  **Solution:** Standardized dialogs (`CitizenshipDialog`, `PassportDialog`, `IdentityDocumentDialog`) to accept `onSave` and forwarded it correctly.

- **Problem:** “Have you ever been a Citizen…?” was shown even when the user was already a current citizen.  
  **Solution:** Wrapped the “Have you ever been a Citizen…” block in a condition so it renders only when `Current_Citizen = NO`.

- **Problem:** Citizenships list visibility didn’t follow the required branches.  
  **Solution:** Render the Citizenships list if (`Current_Citizen = YES`) OR (`Current_Citizen = NO` AND `Past_Citizen = YES`). Hide it when both are NO.

---

### Variable Definitions
1.  **`Current_Citizen`**: Response to "Are you currently a Citizen of any Country?"
2.  **`Past_Citizen`**: Response to "Have you ever been a Citizen of any Country?"

---

### Logic Branch 1: User IS a Current Citizen
**Trigger:** `Current_Citizen` = **YES**

* **Logic:** The user holds active citizenship, so stateless details are irrelevant, and we do not need to ask about past status separately.
* **UI Actions:**
    * **HIDE:** "Stateless" explanation text area.
    * **HIDE:** "Have you ever been a Citizen of any Country?" question.
    * **SHOW:** "Citizenships" list section (Title: *Citizenships*, Subtitle: *Enter details of all Citizenships that you hold or have previously held*).

---

### Logic Branch 2: User is NOT a Current Citizen (Stateless)
**Trigger:** `Current_Citizen` = **NO**

* **Logic:** The user is currently stateless. We must capture *why* they are stateless, and then determine if they have historical citizenship data to enter.
* **UI Actions (Immediate):**
    * **SHOW:** "Stateless" explanation text area (Label: *You have answered that you are not a Citizen of any country...*).
    * **SHOW:** "Have you ever been a Citizen of any Country?" question.

#### Sub-Branch 2A: Stateless but has Past Citizenship
**Trigger:** `Current_Citizen` = **NO** AND `Past_Citizen` = **YES**

* **Logic:** Although stateless now, they have history to report.
* **UI Action:**
    * **SHOW:** "Citizenships" list section.

#### Sub-Branch 2B: Stateless and Never was a Citizen
**Trigger:** `Current_Citizen` = **NO** AND `Past_Citizen` = **NO**

* **Logic:** The user is stateless and has no citizenship history to report.
* **UI Action:**
    * **HIDE:** "Citizenships" list section.

---

### Summary of "Citizenships" List Visibility
The "Citizenships" list/table is visible **ONLY** if:
1.  `Current_Citizen` is **YES**.
    **OR**
2.  `Current_Citizen` is **NO** AND `Past_Citizen` is **YES**.

*In all other cases (specifically when both are NO), the list must remain hidden.*