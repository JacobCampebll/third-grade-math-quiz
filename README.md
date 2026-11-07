# Math quiz

A 24-question multiplication quiz for an iPad. It runs as a static site. Answers are graded in the browser. The first submitted answer for each question is the one that counts, and it stays on that iPad until someone erases it.

There is no account, no database, and no score is sent anywhere.

## Use it

Open the site, tap **Start quiz**, and answer one question at a time. The number pad is on the page, so the iPad keyboard stays out of the way. Reload the page to continue the same quiz.

At the end, the score and the missed questions are shown with explanations. **Practice these questions** checks new tries and does not change the saved score.

## Check it locally

```bash
npm test
npm start
```

Then open `http://127.0.0.1:8765/`.

## GitHub Pages

The site is plain files in this repository (`index.html` and `assets/`). Paths are relative, so it works at `/third-grade-math-quiz/`.

Pushing to `main` runs the tests and publishes with GitHub Actions.
