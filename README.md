**Cybersit — PWA for EMA of Sedentary Behavior**

Cybersit is a lightweight progressive web app designed to monitor sedentary behavior using ecological momentary assessment (EMA). It prompts brief self-report items after detected sedentary bouts so users can reflect on context and receive personalized feedback. The interface and code are intentionally simple so data remain under the user's control and stored locally on their device.

**Overview**
- **Purpose:** Provide an accessible tool to help users track prolonged sitting and related context, and to provide clinicians with temporally-rich, user-consented data for assessment and intervention planning.
- **Mechanism:** The app triggers brief survey prompts following sedentary episodes and records responses alongside timestamps to create an annotated behavioral timeline.
- **Data storage:** All data are retained locally on the user's device (browser storage). Export and sharing are under the user's explicit control.

**Clinical and User Value**
- **For users:** Supports self-awareness and tracking of sedentary patterns to inform behavior change.
- **For clinicians:** Supplies time-stamped EMA records and summaries (exportable by the user) that can augment clinical assessment and behavioral intervention planning while preserving user control over data sharing.

**Research Basis**
- **Item adaptation:** Contextual items were adapted from Dunton et al. (2012).
- **Trigger protocol and validity checks:** Sedentary bout duration and EMA trigger rules follow protocols established by Giurgiu et al. (2020).
- **References:**
  - Dunton, G.F. et al. (2012). https://pubmed.ncbi.nlm.nih.gov/22866046/
  - Giurgiu, M. et al. (2020). https://mhealth.jmir.org/2020/9/e17852/PDF

**Future Directions**
- **Native app:** Build native mobile versions to access device sensors for steps and screen time and to support native notifications.
- **Improved exports:** Add richer, clinician-ready export formats and optional secure transfer workflows controlled by the user.

**Quick Start**
- **Run:** Open `index.html` in a browser to use the app. For the service worker to register, serve the site from `https://` or `localhost`.
- **Files:** Front-end source is at the project root and `js/` (e.g., `js/db.js`, `js/app.js`).

This README is written for general users and clinicians who wish to understand Cybersit's aims, data practices, and research grounding.
