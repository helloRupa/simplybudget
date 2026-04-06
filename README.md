# SimplyBudget

A budgeting web app that lets you track your expenses against a weekly goal, while tracking how much you've saved (or not) since first using the app.

## Features

- Set a weekly budget
- Add, edit, or delete an expense
- Add or delete custom expense categories
- Add weekly, monthly, or annually recurring expenses
- Track current week's spending against a weekly budget
- Track total saved or overspent for all time (since first app use date)
- Charts:
  - Track spending across categories
  - Compare last 8 weeks of spending
  - Track spending across categories for current month
- Export data as CSV
- Export/Import JSON data backups

## Stack

- Frontend: Next.js/TypeScript
- Styles: Tailwind CSS
- Charts: recharts
- Tests: Jest

## Commands

- `npm i`: install all dependencies
- `npm run dev`: run the app on http://localhost:3000
- `npm test`: run all tests
- `npm lint`: run eslint
- `npm format`: format with prettier

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Deploy to GitHub Pages

If you wish to deploy to GitHub pages, update `.github/workflows/deploy.yml` to match your project's settings.

In `next.config.mjs`, update:

- `basePath`: to your repo's name
- `assetPrefix`: to your repo's name

In `.github/workflows/deploy.yml`, update:

- `branches`: to the branch you wish to auto-deploy from on every push

## Claude Commands

- `refactor {ARGUMENTS}`: provides refactor suggestions for the files or folders provided in `{ARGUMENTS}`
- `review {ARGUMENTS}`: provides a code review for the files or folders provided in `{ARGUMENTS}`
