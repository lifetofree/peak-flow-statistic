# PeakFlowStat Test Protocol

## Overview

This document defines the integration test protocol for PeakFlowStat API endpoints covering Admin and User flows.

## Test Environment

- **Framework**: Vitest with Hono Test Client
- **Location**: `worker/src/__tests__/`
- **Database**: In-memory mock using Hono's `var` for testing

## Test Categories

### 1. Admin User Management Flow

| Test ID | Test Case | Method | Endpoint | Expected Result |
|---------|-----------|--------|----------|------------------|
| AU-01 | Create user with valid data | POST | /admin/users | 201, user object with shortToken, shortCode |
| AU-02 | Create user without optional fields | POST | /admin/users | 201, user created with null personalBest |
| AU-03 | Create user with personalBest | POST | /admin/users | 201, personalBest stored correctly |
| AU-04 | Create user missing required field | POST | /admin/users | 400, validation error |
| AU-05 | Create user with invalid personalBest (<50) | POST | /admin/users | 400, validation error |
| AU-06 | Create user with invalid personalBest (>900) | POST | /admin/users | 400, validation error |
| AU-07 | Get existing user | GET | /admin/users/:id | 200, user object |
| AU-08 | Get non-existent user | GET | /admin/users/:id | 404, error |
| AU-09 | List users with pagination | GET | /admin/users | 200, paginated user list |
| AU-10 | List users with search query | GET | /admin/users?q=john | 200, filtered user list |
| AU-11 | Update user firstName | PATCH | /admin/users/:id | 200, updated user |
| AU-12 | Update user personalBest | PATCH | /admin/users/:id | 200, personalBest updated |
| AU-13 | Update non-existent user | PATCH | /admin/users/:id | 404, error |
| AU-14 | Update deleted user | PATCH | /admin/users/:id | 400, user is deleted |
| AU-15 | Soft delete user | DELETE | /admin/users/:id | 200, success |
| AU-16 | Delete non-existent user | DELETE | /admin/users/:id | 404, error |
| AU-17 | Update admin note | PATCH | /admin/users/:id/note | 200, success |
| AU-18 | Update admin note exceeding 5000 chars | PATCH | /admin/users/:id/note | 400, validation error |
| AU-19 | Audit log created on user create | POST | /admin/users | AuditLog entry created |
| AU-20 | Audit log created on user update | PATCH | /admin/users/:id | AuditLog entry created |
| AU-21 | Audit log created on user delete | DELETE | /admin/users/:id | AuditLog entry created |

### 2. Admin Entry Management Flow

| Test ID | Test Case | Method | Endpoint | Expected Result |
|---------|-----------|--------|----------|------------------|
| AE-01 | List all entries | GET | /admin/entries | 200, paginated entries |
| AE-02 | List entries filtered by userId | GET | /admin/entries?userId=:id | 200, filtered entries |
| AE-03 | List entries with date range | GET | /admin/entries?from=&to= | 200, date-filtered entries |
| AE-04 | Update entry date | PATCH | /admin/entries/:id | 200, updated entry |
| AE-05 | Update entry peakFlowReadings | PATCH | /admin/entries/:id | 200, readings updated |
| AE-06 | Update entry spO2 | PATCH | /admin/entries/:id | 200, spO2 updated |
| AE-07 | Update entry with invalid spO2 | PATCH | /admin/entries/:id | 400, validation error |
| AE-08 | Update non-existent entry | PATCH | /admin/entries/:id | 404, error |
| AE-09 | Delete entry | DELETE | /admin/entries/:id | 200, success |
| AE-10 | Delete non-existent entry | DELETE | /admin/entries/:id | 404, error |
| AE-11 | Audit log created on entry update | PATCH | /admin/entries/:id | AuditLog entry created |
| AE-12 | Audit log created on entry delete | DELETE | /admin/entries/:id | AuditLog entry created |

### 3. User Flow

| Test ID | Test Case | Method | Endpoint | Expected Result |
|---------|-----------|--------|----------|------------------|
| UF-01 | Get user profile with valid token | GET | /u/:token | 200, profile object |
| UF-02 | Get user profile with invalid token | GET | /u/:token | 404, error |
| UF-03 | Get user profile with deleted user token | GET | /u/:token | 404, error |
| UF-04 | List user entries | GET | /u/:token/entries | 200, paginated entries with zone |
| UF-05 | List user entries with pagination | GET | /u/:token/entries?page=1&pageSize=10 | 200, paginated entries |
| UF-06 | List user entries with date filter | GET | /u/:token/entries?from=&to= | 200, filtered entries |
| UF-07 | Create valid entry | POST | /u/:token/entries | 201, created entry |
| UF-08 | Create entry with invalid spO2 | POST | /u/:token/entries | 400, validation error |
| UF-09 | Create entry with invalid period | POST | /u/:token/entries | 400, validation error |
| UF-10 | Create entry with missing readings | POST | /u/:token/entries | 400, validation error |
| UF-11 | Export entries as CSV | GET | /u/:token/export | 200, CSV file |

## Input Validation Limits

| Field | Min | Max | Unit |
|-------|-----|-----|------|
| Peak Flow (each reading) | 50 | 900 | L/min |
| SpO2 | 70 | 100 | % |
| Personal Best | 50 | 900 | L/min |
| Admin note | 0 | 5000 | chars |

## Zone Calculation

| Zone | Percentage Range | Color |
|------|------------------|-------|
| Green | >= 80% | #22c55e |
| Yellow | 50-79% | #eab308 |
| Red | < 50% | #ef4444 |

## Test Data Setup

Each test should:
1. Create isolated test data
2. Clean up after test completion
3. Use unique identifiers to avoid conflicts

## Success Criteria

- All tests must pass
- No test should depend on another test
- Tests should be idempotent
- Audit logs must be created for all CREATE, UPDATE, DELETE operations
