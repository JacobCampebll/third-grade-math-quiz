# Math quiz

Round 2 is a new 24-question multiplication quiz for an iPad. Twenty-one answers are graded in the browser. Three questions ask for a sentence. An automatic check looks for the math idea in those sentences and leaves unsure ones for a person to read. That check does not change the score out of 21. The first submitted answer is the one that counts. Round 2 is stored separately from the first quiz.

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
