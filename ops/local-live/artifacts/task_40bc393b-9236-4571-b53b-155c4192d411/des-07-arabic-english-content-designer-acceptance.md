<!-- Wejdan local artifact · task=task_40bc393b-9236-4571-b53b-155c4192d411 · trace=trace_47a69562-c2a4-4646-a60d-599ac3c32ccc · role=DES-07 · provider=ollama-local · model=qwen3:8b -->

# Arabic/English Content Designer — Synthetic specialist acceptance artifact

Role: DES-07 · Team: DES · Contract: role.DES-07.v1

## Role output

```markdown
# Bilingual String Catalog & Localization Draft for Personal Planning App

## 1. Bilingual String Catalog

| Key | Arabic | English | Notes |
|-----|--------|---------|-------|
| app_name | تخطيطي | Planify | App name, LTR |
| welcome_message | مرحبًا بك في تخطيطي! | Welcome to Planify! | Greeting message |
| start_planning | ابدأ التخطيط | Start Planning | CTA button |
| plan_title | عنوان التخطيط | Plan Title | Label for plan name |
| plan_description | وصف التخطيط | Plan Description | Label for plan details |
| save_plan | احفظ التخطيط | Save Plan | CTA button |
| cancel_plan | إلغاء التخطيط | Cancel Plan | CTA button |
| plan_saved_successfully | تم حفظ التخطيط بنجاح | Plan saved successfully | Success notification |
| error_saving_plan | حدث خطأ أثناء حفظ التخطيط | Error saving plan | Error notification |
| confirm_delete_plan | هل أنت متأكد من حذف التخطيط؟ | Are you sure you want to delete the plan? | Confirmation dialog |
| delete_plan | حذف التخطيط | Delete Plan | CTA button |
| plan_deleted_successfully | تم حذف التخطيط بنجاح | Plan deleted successfully | Success notification |
| error_deleting_plan | حدث خطأ أثناء حذف التخطيط | Error deleting plan | Error notification |
| consent_message | نحن نستخدم بياناتك لتحسين تجربتك | We use your data to improve your experience | Consent message |
| agree | موافق | Agree | Button for consent |
| disagree | غير موافق | Disagree | Button for consent |
| notification_title | إشعارات | Notifications | Section title |
| notification_message | توجد إشعارات جديدة | You have new notifications | Notification message |
| settings_title | إعدادات | Settings | Section title |
| language_preference | تفضيل اللغة | Language Preference | Settings label |
| arabic | عربي | Arabic | Language option |
| english | إنجليزي | English | Language option |
| logout | تسجيل الخروج | Logout | CTA button |
| logout_confirmation | هل أنت متأكد من تسجيل الخروج؟ | Are you sure you want to log out? | Confirmation dialog |
| logout_success | تم تسجيل الخروج بنجاح | Logged out successfully | Success notification |
| error_logging_out | حدث خطأ أثناء تسجيل الخروج | Error logging out | Error notification |

## 2. Terminology Decisions

- **"Plan"** is used as the central concept, and it is translated as "التخطيط" in Arabic. This term is consistent across all UI elements.
- **"Save"** and **"Delete"** are translated as "احفظ" and "حذف" respectively, to maintain clarity and directness.
- **"Consent"** is translated as "الموافقة" and is used in the context of data usage, ensuring transparency and user control.
- **"Notification"** is translated as "إشعارات" and is used for system alerts and user updates.
- **"Settings"** is translated as "إعدادات" and is used for user preference and account management.

## 3. Localization QA

- All Arabic text is written in **RTL** (Right-to-Left) direction, with proper punctuation and spacing.
- English text is written in **LTR** (Left-to-Right) direction, with standard punctuation.
- All strings are kept concise and fit within standard UI constraints.
- The tone is neutral and professional, suitable for a personal planning app.
- Error and success messages are clear and actionable, with appropriate consequences.
- No Saudi dialect is used in this UI copy, as per the role's constraints.

## 4. Evidence and Assumptions

- **Assumption 1**: The app is a local-first personal planning tool, with no external data sharing.
- **Assumption 2**: The user base includes both Arabic and English speakers, requiring bilingual support.
- **Assumption 3**: The app does not handle sensitive data such as medical or financial information.
- **Assumption 4**: The app does not require legal or financial compliance beyond basic user consent.
- **Assumption 5**: The app is designed for a general audience, with no specific cultural or regional customization beyond language.

## 5. Boundaries and Unknowns

- **Unknown 1**: The exact user base demographics, including age, location, and usage patterns, are not provided.
- **Unknown 2**: The app's full feature set and functionality are not fully described, limiting the scope of localization.
- **Unknown 3**: The app's integration with external services or data sources is not specified.
- **Unknown 4**: The app's branding and visual design are not provided, which may affect the final UI copy.
- **Unknown 5**: The app's release date and target market are not specified, which may affect localization strategy.

## 6. Draft Status

This is a **draft** of the bilingual string catalog and localization plan. It is not approved and should not be used for production. Further review and validation are required before final implementation.

---

**Draft Label**: ✅ Draft - Localization & UI Copy

```

## Independent QA-01 review

{
  "verdict": "PASS",
  "findings": [],
  "missing_requirements": [],
  "evidence_limits": [
    "No real-world validation or user testing data provided, as per the synthetic task constraints."
  ]
}

## Automated acceptance limits

Structural result: PASS.
Matched expected-output cues: bilingual, string, catalog, terminology, decisions, localization, saudi, dialect, copy.
Review parser result: CAPTURED; verdict: PASS.
This artifact records local model outputs and deterministic contract checks. It does not certify factual truth, professional competence, or human approval.