# Backlog/Feature Suggestions

## 🗓️ Next Features to Implement

### 1. Advanced Trend Visualization (Analytics)
**Description:** Enhance the dashboard and admin detail views with advanced charting capabilities to provide deeper clinical insights.
**Details:**
*   Line charts showing the rate of change in readings over time for all three PF values.
*   Comparison charting plotting the current reading against the user's personal best *and* potentially against population/age-based prediction charts.
**Priority:** High
**Impact:** High (Significantly enhances utility)

### 2. Symptom and Triggers Logging
**Description:** Expand the peak flow measurement entry form to log associated symptoms and potential triggers.
**Details:**
*   Add optional structured fields to the Entry model for logging symptoms (e.g., 'cough', 'wheezing', 'fatigue') and correlating them with the reading.
*   This connects physiological data with experiential data.
**Priority:** Medium-High
**Impact:** Medium-High (Adds crucial context)

### 3. Automated Alerts and Goal Setting
**Description:** Implement proactive, rule-based alerts for both users and administrators.
**Details:**
*   **User:** Alert if a reading falls below a user-defined threshold OR shows a significant drop compared to the average of the last 3 readings.
*   **Admin:** Alert if a user hasn't logged data for a specified period (e.g., 7 days).
**Priority:** High
**Impact:** High (Improves patient engagement and safety)

### 4. Data Importing/Pre-filling
**Description:** Allow users or administrators to upload a CSV file containing historical measurements.
**Details:**
*   Develop an upload mechanism and parsing logic for both patient and admin flows.
**Priority:** Medium
**Impact:** Medium (Improves onboarding/data completeness)