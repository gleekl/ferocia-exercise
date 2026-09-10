# Borrowing Power Calculator

## About

This is my attempt at the Borrowing Power Calculator exercise provided by the Ferocia team. The initial instructions as to what I am assigned to do are written in [this markdown file](ferocia_instructions.md).

## Table of Contents

- [About](#about)
- [Setup](#setup)
- [Process](#process)
    - [Assumptions](#assumptions)
    - [Trade-offs](#trade-offs)
    - [Design Decisions](#design-decisions)

## Setup

Make sure you have Node.js (20.12.0 or later) installed as Node's native [`process.loadEnvFile()`](https://nodejs.org/api/process.html#processloadenvfilepath) is being used to load `.env` variables. Reason provided under [Design Decisions](#load-env-file) below.

1. Install dependencies:

   ```sh
   npm install
   ```

1. Copy-and-paste the `.env.example` to the root folder and rename it to `.env`. 

1. You wil need to run the development API in it's own terminal window.
   (The server will be available at http://localhost:3000/).
   To start the server run the following command:

   ```sh
   npm run api
   ```

   Note: You can stop the server with Ctrl+C

1. Run the calculator in a new terminal tab/window with:

   ```sh
   npm start
   ```

1. Run tests with:
   ```sh
   npm test
   ```

## Process

### Assumptions
- Token to be removed from the main file and represented as an environment variable prior to git intialisation.
- Local developer setup needed, none mentioned about production setup.
- Banking formulas like calculating `borrowing power` are correct and to remain untouched. Main refactoring involves the CLI functions. 
- Negative numbers and non-numbers are invalid inputs and have to be rejected.
    - Inputs:
        - `income`
        - `dependents`
        - `expenses`
        - `creditLimits`
- `income` and `dependents` are validated in the server, `expenses` and `creditLimits` are validated in the client.
- Testing to be worked on in-parallel with the CLI functions.

### Trade-offs

- Decided not to use the `dotenv` library as I usually do with my other projects as I just discovered Node's `process.loadEnvFile()`, which does the job of loading `.env` variables.
    - Choice made to reduce reliance on 3rd party libraries.
    - Will still need a minimum version of Node but it is the 20.12 version which I assume to be readily available.
- Recursive callbacks vs async/await chaining.
    - Recursive callbacks looked less readable than an async/await chain of rl.questions() to collect the inputs in variables then putting those inputs in `calculateBorrowingPower()`. 
    - I did not manage to get an async/await version working due to an undetermined bug so I chose to commit to the recursive version. 
- Redundant client-side guard clause [more details here](#guard-clause).
    - `income` and `dependents` already had server-side guard clauses but I chose to loop the conditional statement to validate if the remaining inputs, `expenses`and `creditLimits` were also valid as it allowed future parameter additions if needed. 
    - Wanted to keep it consistent in how they fail too with the same conditions. 
    - Manage to keep the server-side untouched and still cover the client-side checks.

### Design Decisions

<a name="load-env-file"></a>
- Decided not to use the `dotenv` library as I usually do with my other projects as I just discovered Node's `process.loadEnvFile()`, which does the job of loading `.env` variables.
- Factory/closure:
  - Chose to refactor a few top-level functions into a factory function `createConnection()` instead of a `class` mainly because I am a bit more familiar with factory functions.
  - Private states (`url` and the given `token`) can stay within the function.
    ```js
    function createConnection(url, token) {
      async function handleApi(endpoint, urlParams) {
        // 1. Create new URL using base API_URL and endpoint given (/api/tax)
        // Link: https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
        const url = new URL(endpoint, API_URL);
        // 2. Loop through urlParams given (income/income+dependents) to set params.
        for (const [key, value] of Object.entries(urlParams)) {
          url.searchParams.set(key, value);
        }
        try {
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${PERSONAL_ACCESS_TOKEN}`,
            },
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(
              `${endpoint} failed: ${res.status} ${data.error} - ${data.message || "Unknown error"}`,
            );
          }
          return data;
        } catch (err) {
          throw new Error(err.message);
        }
      }
      async function getTax(sincome) {
        const data = await handleApi("/api/tax", {
          income: income,
        });
        return data.tax;
      }
      async function getHEM(income, dependents) {
        const data = await handleApi("/api/hem", {
          income: income,
          dependents: dependents,
        });
        return data.hem;
      }
      return { getTax, getHEM };
    }
    ```
<a name="guard-clause"></a>
- Guard clause:
  - Aim: Solve test failure (negative number has been inputted)
  - Issue: Test kept failing due to the lack of a guard clause for the
    ```js
    it("should reject when a negative number has been inputted", async () => {
        await assert.rejects(calculateBorrowingPower(-80000, 2, 2000, 1000, 7.5));
        await assert.rejects(calculateBorrowingPower(80000, -2, 2000, 1000, 7.5));
        await assert.rejects(calculateBorrowingPower(80000, 2, -2000, 1000, 7.5)); // <-- Failure point as the 2 above were fine. First 2 tests already had guard clauses against negative numbers in the server-side which were the first 2 (income, dependents) arguments. 3rd (expenses) and 4th (creditLimits) arguments did not have a guard clause.
        await assert.rejects(calculateBorrowingPower(80000, 2, 2000, -1000, 7.5)); // <-- Second failure point. Same as above.
    });
    ```

  - Attempted Solution:
    ```js
    for (const [name, value] of Object.entries({
      income,
      dependents,
      expenses,
      creditLimits,
    })) {
      if (value < 0 || typeof value !== "number") {
        throw new Error(`${name} must be a non-negative number.`);
      }
    }
    ```

- Recursive Function refactor:
  - Aim: Create a catch for any inputs that are `less than 0` or `not numbers`
  - Attempted Solution:

    ```js
    function validateInput(prompt, inputType, callback) {
      // 1. Ask the first question
      rl.question(prompt, (answer) => {
        // 2. Check if Current comparison is between integer and float.
        switch (inputType) {
          case "float":
            if (
              parseFloat(answer) < 0 ||
              Number.isNaN(parseFloat(answer)) ||
              parseFloat(answer) === Infinity
            ) {
              console.log("Please give a non-negative number.");

              // If invalid answer, repeat the current question
              return validateInput(prompt, inputType, callback);
            }
            break;
          case "integer":
            if (
              parseInt(answer) < 0 ||
              !Number.isInteger(parseInt(answer)) ||
              parseInt(answer) === Infinity
            ) {
              console.log("Please give a non-negative number.");

              // If invalid answer, repeat the current question
              return validateInput(prompt, inputType, callback);
            }
            break;
        }
        // 3. If correct, move on to next question
        callback(answer);
      });
    }
    ```

  - Struggle(s):
    - Had issues trying to frame what was needed to be refactored. I could see the pattern of the initial `rl.question > question prompt > callback` but deciding to add a new parameter that accepts an `inputType` (`float`,`integer`, opening up for other types) helped give more clarity as to what I needed to do.
    - Solution is not clean, but due to time constraints, I have accepted that it will do for now.
