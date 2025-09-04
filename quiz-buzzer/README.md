Quiz Buzzer — WordPress plugin

Install:
- Copy the `quiz-buzzer` folder into `wp-content/plugins/`.
- Activate the plugin in WP admin.
- Create two pages and add `[quiz_buzzer]` to the buzzer page and `[quiz_display]` to the display page.
- Visit Settings → Quiz Buzzer to set REST base or page URLs (optional).

Notes:
- State is stored in `wp-content/uploads/quiz-queue.json`.
- The plugin exposes REST endpoints at `/wp-json/{rest_base}/{action}` (default `quiz/v1`).
