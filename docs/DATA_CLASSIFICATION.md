# Data Classification Inventory

This register maps ComplyEur data stores to classification levels for SOC 2 and GDPR.

## Classification Levels
- **Public**: Approved for public release.
- **Internal**: Non-public business data.
- **Confidential**: Customer data that is not public but not directly identifying.
- **Restricted (PII)**: Personal data or security-sensitive data.

## Inventory

| Table / Store | Example Fields | Classification | Notes |
| --- | --- | --- | --- |
| `profiles` | `email`, `full_name`, `role`, `auth_provider` | Restricted (PII) | User identity and access data |
| `employees` | `name`, `email` | Restricted (PII) | Employee data subject records |
| `trips` | `entry_date`, `exit_date`, `country`, `purpose`, `job_ref` | Restricted (PII) | Travel history tied to an employee |
| `companies` | `name`, `domain` | Confidential | Customer account data |
| `company_settings` | `retention_months` | Internal | Operational settings |
| `alerts` | `message`, `employee_id` | Restricted (PII) | Contains personal context |
| `audit_log` | `details`, `user_id`, `ip_address` | Restricted (PII) | GDPR audit trail |
| `admin_audit_log` | `admin_user_id`, `target_user_id`, `ip_address` | Restricted (PII) | Admin activity trail |
| `import_sessions` | `file_name`, `user_id`, `status` | Confidential | Import metadata |
| `column_mappings` | `mappings`, `created_by` | Internal | User-defined import metadata |
| `notification_log` | `recipient`, `status`, `error_message` | Confidential | Operational messaging data |
| `background_jobs` | `job_type`, `status`, `metadata` | Internal | Async processing metadata |
| `employee_compliance_snapshots` | `days_used`, `risk_level` | Confidential | Derived compliance data |
| `company_entitlements` | `tier_slug`, `can_export_csv` | Internal | Billing/feature flags |
| `tiers` | `display_name`, `limits` | Internal | Product configuration |
| Supabase Storage (`gdpr-exports`) | DSAR ZIP archives | Restricted (PII) | Data subject export files |

## Handling Requirements
- Restricted data requires encryption in transit and access controls (RLS + MFA for admins).
- Confidential data should not be exported outside approved channels.
- Public data is minimal and limited to marketing content.
