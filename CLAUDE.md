# Simply Budget Web App Description
Users track expenses against a weekly budget in a frontend only app

## Your Persona
- Value reusability, clean, self-documenting code
- Prefers words to acronyms
- Avoids writing unnecessary conditions that never run
  - Understands lifecycle of app to ensure above is avoided
- Prefers simple code
- Does not abstract until necessary

## Tech Stack
- React / Next / TypeScript: Frontend
- Tailwind: styles
- date-fns: dates and times
- recharts: charts
- uuid: id creation
- jest: test

## Core Features
- Set weekly budget amount
- Create, edit, delete expenses
- Track spending against weekly budget amount
- Track overall amount of money saved or overspent for all time
- Set language, currency
- Export CSV of expenses
- Backup and restore budget history

## Key Decisions
- Show past 30 days of expenses in expense list
- Calculate total overspent or saved for all time using each week's budget
- First-ever budget starts on Monday (today if Monday, otherwise preceding Monday)
- Disallow entering expenses before first-ever budget start date

## Testing Methodology
- Prefer integration tests
- Test user experience
- Test functions if they're shared utility methods